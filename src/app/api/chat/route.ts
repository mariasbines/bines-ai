import { getAnthropicClient, DEFAULT_MODEL, MAX_TOKENS } from '@/lib/chat/anthropic';
import { SYSTEM_PROMPT } from '@/lib/chat/system-prompt';
import { detectAgentBehaviour } from '@/lib/chat/agent-guard';
import { getChatRatelimit, getChatDailyRatelimit } from '@/lib/chat/rate-limit';
import { validateRequest } from '@/lib/chat/validate';

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
  const guard = detectAgentBehaviour(v.messages);
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

  // 6. Stream the response
  try {
    const stream = client.messages.stream({
      model: DEFAULT_MODEL,
      system: SYSTEM_PROMPT,
      messages: v.messages,
      max_tokens: MAX_TOKENS,
    });

    // NOTE: mid-stream errors (network drop, upstream rate-limit) surface
    // as truncated client streams, NOT as HTTP 500. Client-side UX in
    // 001.012 handles that with the "that didn't go through — try once
    // more" message.
    return new Response(stream.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        ...GOVERNED_BY_HEADER,
      },
    });
  } catch (err) {
    console.error(
      '[chat] anthropic stream error:',
      err instanceof Error ? err.message : 'unknown',
    );
    return errorResponse(500, "Claude's having a moment, try again in a sec", 'upstream');
  }
}
