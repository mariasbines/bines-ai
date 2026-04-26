import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Upstash-backed rate limits for /api/chat.
 *
 *   - Baseline: 10 messages / 10 min / IP (AC-003)
 *   - Hard cap: 50 messages / day / IP
 *
 * Both return `null` when UPSTASH_REDIS_REST_URL/TOKEN env vars are absent —
 * in that case the route is permissive (dev/CI). Production MUST set these;
 * Vercel env config happens in 001.016.
 *
 * The numeric thresholds are env-tunable so previews can run a generous
 * limit for QA without burning the production posture:
 *   - CHAT_RATELIMIT_BASELINE_MAX (default 10) — requests per 10 min
 *   - CHAT_RATELIMIT_DAILY_MAX (default 50) — requests per day
 *
 * The window lengths (10m / 1d) stay fixed.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

let _baseline: Ratelimit | null = null;
let _daily: Ratelimit | null = null;

function getRedisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function getChatRatelimit(): Ratelimit | null {
  if (_baseline) return _baseline;
  const redis = getRedisFromEnv();
  if (!redis) return null;
  _baseline = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(envInt('CHAT_RATELIMIT_BASELINE_MAX', 10), '10 m'),
    analytics: false,
    prefix: 'bines:chat:10m',
  });
  return _baseline;
}

export function getChatDailyRatelimit(): Ratelimit | null {
  if (_daily) return _daily;
  const redis = getRedisFromEnv();
  if (!redis) return null;
  _daily = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(envInt('CHAT_RATELIMIT_DAILY_MAX', 50), '1 d'),
    analytics: false,
    prefix: 'bines:chat:1d',
  });
  return _daily;
}

/**
 * Reset cached instances. Test-only — production relies on module-level
 * memoisation across requests.
 */
export function __resetRatelimitForTests(): void {
  _baseline = null;
  _daily = null;
}
