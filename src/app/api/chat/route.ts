import { after } from 'next/server';
import { getAnthropicClient, DEFAULT_MODEL, MAX_TOKENS } from '@/lib/chat/anthropic';
import { SYSTEM_PROMPT } from '@/lib/chat/system-prompt';
import { detectAgentBehaviour } from '@/lib/chat/agent-guard';
import { getChatRatelimit, getChatDailyRatelimit } from '@/lib/chat/rate-limit';
import { validateRequest } from '@/lib/chat/validate';
import { classifyConversation } from '@/lib/argue-filter/haiku';
import { refusalEventStream } from '@/lib/argue-filter/refusal';
import { hashIp } from '@/lib/argue-log/hash';
import { appendArgueLog } from '@/lib/argue-log/storage';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';

export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;

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

  // 7. Haiku pre-flight classifier (fail-open — see argue-filter/haiku.ts).
  const t0 = Date.now();
  const verdict = await classifyConversation(messages);
  const preFlightMs = Date.now() - t0;

  const ipHash = await ipHashPromise;

  // 8. Off-brand verdict → refusal path.
  if (verdict.off_brand.length > 0) {
    const refusalEntry: ArgueLogEntry = {
      schema_version: 1,
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
      salt_version: 'current',
      turns: messages,
      guard_signals: guard.signals,
      verdict,
      refused: true,
      model: '',
      latency_ms: { pre_flight: preFlightMs, stream: null },
    };
    after(async () => {
      try {
        await appendArgueLog(refusalEntry);
      } catch (err) {
        console.error(
          '[chat] log-append failed (refusal):',
          err instanceof Error ? err.name : 'unknown',
        );
      }
    });

    return new Response(refusalEventStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        ...GOVERNED_BY_HEADER,
      },
    });
  }

  // 9. On-brand → Sonnet stream, wrapped in a ReadableStream that
  //    passes through verbatim while server-side-accumulating the
  //    assistant text for logging on close.
  //
  //    Using a ReadableStream (not TransformStream) lets us hook
  //    `cancel()` for the client-abort case as well as natural close —
  //    this mitigates the AC-006 concern around partial content on
  //    abort.
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

  // Single-fire latch so both natural-close and cancel paths schedule
  // the log exactly once.
  let logScheduled = false;
  const accumulator: string[] = [];
  const decoder = new TextDecoder();
  let buffer = '';

  function ingestChunk(chunk: Uint8Array): void {
    buffer += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data: ')) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        if (
          evt?.type === 'content_block_delta' &&
          evt?.delta?.type === 'text_delta'
        ) {
          accumulator.push(evt.delta.text ?? '');
        }
      } catch {
        // skip malformed frames
      }
    }
  }

  function scheduleLog(): void {
    if (logScheduled) return;
    logScheduled = true;

    buffer += decoder.decode();
    const pending = buffer.trim();
    if (pending.startsWith('data: ')) {
      try {
        const evt = JSON.parse(pending.slice(6));
        if (
          evt?.type === 'content_block_delta' &&
          evt?.delta?.type === 'text_delta'
        ) {
          accumulator.push(evt.delta.text ?? '');
        }
      } catch {
        // skip
      }
    }

    const assistantContent = accumulator.join('');
    const entry: ArgueLogEntry = {
      schema_version: 1,
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
      salt_version: 'current',
      turns: [
        ...messages,
        { role: 'assistant', content: assistantContent },
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

  const upstream = stream.toReadableStream();
  const upstreamReader = upstream.getReader();

  const output = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await upstreamReader.read();
        if (done) {
          scheduleLog();
          controller.close();
          return;
        }
        if (value) {
          ingestChunk(value);
          controller.enqueue(value);
        }
      } catch (err) {
        // Upstream error — log the assistant content we have so far,
        // then propagate the error downstream.
        scheduleLog();
        controller.error(err);
      }
    },
    cancel(reason) {
      // Client aborted. Log what we have, then cancel the upstream.
      scheduleLog();
      upstreamReader.cancel(reason).catch(() => {
        // swallow — nothing we can do at this point
      });
    },
  });

  return new Response(output, {
    headers: {
      'Content-Type': 'text/event-stream',
      ...GOVERNED_BY_HEADER,
    },
  });
}
