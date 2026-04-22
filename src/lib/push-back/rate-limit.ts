import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let _rl: Ratelimit | null = null;

/**
 * 5 submissions per hour per IP (AC-005). Returns null when Upstash
 * env vars absent — endpoint becomes permissive (dev/CI).
 */
export function getPushBackRatelimit(): Ratelimit | null {
  if (_rl) return _rl;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _rl = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: false,
    prefix: 'bines:pushback:1h',
  });
  return _rl;
}

export function __resetPushBackRatelimitForTests(): void {
  _rl = null;
}
