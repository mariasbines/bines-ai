import { touchChatRedis } from '@/lib/chat/rate-limit';

export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;

/**
 * Weekly keep-alive ping for the Upstash rate-limit database.
 *
 * Schedule: `0 5 * * 1` UTC (Mondays, after the daily cleanup/sweep crons).
 * Auth: `Authorization: Bearer ${CRON_SECRET}` via timing-safe compare —
 * same posture as argue-log/cleanup and argue-judge/sweep.
 *
 * Why: the free-tier Vercel Marketplace Upstash store (`upstash-kv-yellow-
 * pocket`) is archived after a few weeks with no traffic. The limiter only
 * writes keys when someone uses /api/chat, so a low-traffic week leaves the
 * store idle. This sends one cheap write to reset Upstash's inactivity clock
 * and keep the abuse-protection limiter alive. See docs/keep-warm-ops.md.
 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

/**
 * Length-normalised, XOR-accumulator string comparison — no early-out on
 * content. Length-dependent early return is an accepted leak (reveals token
 * length, not content). No Node crypto.timingSafeEqual on edge runtime.
 * Mirrors argue-log/cleanup; CRON_SECRET is ASCII hex (BMP charCodeAt exact).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[keep-warm] CRON_SECRET unconfigured');
    return jsonResponse(500, { error: 'misconfigured' });
  }

  const auth = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (
    !auth.startsWith(prefix) ||
    !timingSafeEqual(auth.slice(prefix.length), secret)
  ) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  const at = await touchChatRedis();
  if (at === null) {
    // No Redis configured (dev/CI) — nothing to keep warm, not an error.
    return jsonResponse(200, { warmed: false, reason: 'no-redis' });
  }
  return jsonResponse(200, { warmed: true, at: new Date(at).toISOString() });
}
