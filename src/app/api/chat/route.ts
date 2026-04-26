import { after } from 'next/server';
import { getAnthropicClient, DEFAULT_MODEL, MAX_TOKENS } from '@/lib/chat/anthropic';
import { SYSTEM_PROMPT } from '@/lib/chat/system-prompt';
import { detectAgentBehaviour } from '@/lib/chat/agent-guard';
import { getChatRatelimit, getChatDailyRatelimit } from '@/lib/chat/rate-limit';
import { validateRequest } from '@/lib/chat/validate';
import { matchEasterEgg, easterEggStream } from '@/lib/argue-filter/easter-egg';
import { hashIp } from '@/lib/argue-log/hash';
import { appendArgueLog } from '@/lib/argue-log/storage';
import type { ArgueLogEntry, ArgueVerdict } from '@/lib/argue-log/schema';

/**
 * Sentinel verdict written to argue-log entries now that the Haiku pre-flight
 * classifier has been retired. Voice-check 26 Apr confirmed Sonnet's belt
 * (system prompt) handles every off-brand and harm category cleanly. The
 * verdict field stays in the log schema so historical entries still parse.
 */
const RETIRED_VERDICT: ArgueVerdict = {
  harm: 'none',
  off_brand: [],
  reasoning: 'haiku-retired',
};

export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;
const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  ...GOVERNED_BY_HEADER,
} as const;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

function errorResponse(
  status: number,
  error: string,
  category: 'rate-limited' | 'input' | 'upstream' | 'unknown',
) {
  return jsonResponse(status, { error, category });
}

/**
 * Extract the client IP from the request. On Vercel, the first entry in
 * `x-forwarded-for` is the injected client IP (downstream additions may be
 * client-controlled but the first is trusted). Non-Vercel deployments may
 * need a different strategy.
 */
function getIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: Request) {
  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body', 'input');
  }

  // 2. Validate shape + length + turn cap
  const v = validateRequest(body);
  if (!v.ok) return errorResponse(v.status, v.error, v.category);
  const messages = v.messages;

  const ip = getIp(req);

  // 3. Rate-limit: baseline (10 / 10 min) + hard cap (50 / day)
  const baseline = getChatRatelimit();
  if (baseline) {
    const { success } = await baseline.limit(ip);
    if (!success) {
      return errorResponse(
        429,
        "ease up — we've had a lot of arguing today",
        'rate-limited',
      );
    }
  }
  const daily = getChatDailyRatelimit();
  if (daily) {
    const { success } = await daily.limit(`day:${ip}`);
    if (!success) {
      return errorResponse(
        429,
        "that's your 50 for today. come back tomorrow",
        'rate-limited',
      );
    }
  }

  // 4. Agent-guard: detect-and-log only (SEC-001; not a hard block)
  const guard = detectAgentBehaviour(messages);
  if (guard.isLikelyAgent && process.env.NODE_ENV !== 'test') {
    // Log signals only; do not log message content (privacy).
    console.log(`[chat] agent-likely signals: ${guard.signals.join(',')}`);
  }

  // 5. Ensure Anthropic client is configured
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    // Missing ANTHROPIC_API_KEY. Don't leak details.
    console.error('[chat] anthropic client not configured');
    return errorResponse(500, 'chat is temporarily unavailable', 'upstream');
  }

  // 6. Argue-log: IP salt is mandatory for logging (ARGUE-SEC-003).
  const salt = process.env.ARGUE_LOG_IP_SALT_CURRENT;
  if (!salt) {
    console.error('[chat] salt-unconfigured');
    return errorResponse(500, 'chat is temporarily unavailable', 'upstream');
  }
  const ipHashPromise = hashIp(ip, salt);
  const t0 = Date.now();

  // 7. Easter-egg pre-filter. Bypasses Sonnet entirely on a regex match
  //    against the latest user turn.
  const egg = matchEasterEgg(messages);
  if (egg) {
    const ipHash = await ipHashPromise;
    const eggEntry: ArgueLogEntry = {
      schema_version: 1,
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
      salt_version: 'current',
      turns: messages,
      guard_signals: guard.signals,
      verdict: { harm: 'none', off_brand: [], reasoning: `easter_egg:${egg.id}` },
      refused: true,
      model: '',
      latency_ms: { pre_flight: 0, stream: null },
    };
    after(async () => {
      try {
        await appendArgueLog(eggEntry);
      } catch (err) {
        console.error(
          '[chat] log-append failed (easter-egg):',
          err instanceof Error ? err.name : 'unknown',
        );
      }
    });
    return new Response(easterEggStream(egg.response), { headers: STREAM_HEADERS });
  }

  // 8. Haiku classifier retired (26 Apr 2026). Voice-check sweep proved
  //    Sonnet's system-prompt belt catches every off-brand and harm category
  //    in voice. The verdict field stays in the log schema for historical
  //    parse compatibility but is now a fixed sentinel.
  const verdict = RETIRED_VERDICT;
  const preFlightMs = 0;
  const ipHash = await ipHashPromise;

  // 9. Sonnet stream. Iterate the SDK's typed events directly,
  //    extract text_delta payloads, push raw UTF-8 bytes to the client and
  //    accumulate server-side for the argue-log.
  let stream;
  try {
    stream = client.messages.stream({
      model: DEFAULT_MODEL,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: MAX_TOKENS,
    });
  } catch (err) {
    console.error(
      '[chat] anthropic stream error:',
      err instanceof Error ? err.message : 'unknown',
    );
    return errorResponse(500, "Claude's having a moment, try again in a sec", 'upstream');
  }

  const encoder = new TextEncoder();
  const accumulator: string[] = [];
  let logScheduled = false;

  function scheduleLog(): void {
    if (logScheduled) return;
    logScheduled = true;
    const entry: ArgueLogEntry = {
      schema_version: 1,
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
      salt_version: 'current',
      turns: [
        ...messages,
        { role: 'assistant', content: accumulator.join('') },
      ],
      guard_signals: guard.signals,
      verdict,
      refused: false,
      model: DEFAULT_MODEL,
      latency_ms: {
        pre_flight: preFlightMs,
        stream: Date.now() - t0 - preFlightMs,
      },
    };
    after(async () => {
      try {
        await appendArgueLog(entry);
      } catch (err) {
        console.error(
          '[chat] log-append failed (stream):',
          err instanceof Error ? err.name : 'unknown',
        );
      }
    });
  }

  const iter = stream[Symbol.asyncIterator]();

  const output = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value: event } = await iter.next();
          if (done) {
            scheduleLog();
            controller.close();
            return;
          }
          if (
            event?.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta'
          ) {
            const text = event.delta.text ?? '';
            if (text.length === 0) continue;
            accumulator.push(text);
            controller.enqueue(encoder.encode(text));
            return;
          }
          // Non-text event (message_start, ping, content_block_stop,
          // message_delta, message_stop, …). Skip and pull again.
        }
      } catch (err) {
        scheduleLog();
        controller.error(err);
      }
    },
    async cancel(reason) {
      scheduleLog();
      try {
        await iter.return?.(reason);
      } catch {
        // swallow — nothing actionable here
      }
    },
  });

  return new Response(output, { headers: STREAM_HEADERS });
}
