import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { __resetRatelimitForTests, getChatRatelimit, getChatDailyRatelimit } from '../rate-limit';

const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  __resetRatelimitForTests();
});

afterEach(() => {
  __resetRatelimitForTests();
  if (ORIG_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIG_URL;
  if (ORIG_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIG_TOKEN;
});

describe('getChatRatelimit', () => {
  it('returns null when env vars are absent', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getChatRatelimit()).toBeNull();
    expect(getChatDailyRatelimit()).toBeNull();
  });

  it('returns a Ratelimit instance when env vars are present', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    const rl = getChatRatelimit();
    expect(rl).not.toBeNull();
    // Memoised across calls
    expect(getChatRatelimit()).toBe(rl);
  });

  it('returns a Ratelimit instance for the daily limiter when env vars present', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    const rl = getChatDailyRatelimit();
    expect(rl).not.toBeNull();
    expect(getChatDailyRatelimit()).toBe(rl);
  });
});
