import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { __resetRatelimitForTests, getChatRatelimit, getChatDailyRatelimit } from '../rate-limit';

const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ORIG_KV_URL = process.env.KV_REST_API_URL;
const ORIG_KV_TOKEN = process.env.KV_REST_API_TOKEN;

function restore(name: string, orig: string | undefined) {
  if (orig === undefined) delete process.env[name];
  else process.env[name] = orig;
}

beforeEach(() => {
  __resetRatelimitForTests();
  // Start each test from a known-clean credential state.
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

afterEach(() => {
  __resetRatelimitForTests();
  restore('UPSTASH_REDIS_REST_URL', ORIG_URL);
  restore('UPSTASH_REDIS_REST_TOKEN', ORIG_TOKEN);
  restore('KV_REST_API_URL', ORIG_KV_URL);
  restore('KV_REST_API_TOKEN', ORIG_KV_TOKEN);
});

describe('getChatRatelimit', () => {
  it('returns null when env vars are absent', () => {
    expect(getChatRatelimit()).toBeNull();
    expect(getChatDailyRatelimit()).toBeNull();
  });

  it('builds a limiter from the Marketplace KV_REST_API_* vars', () => {
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'kv-token';
    expect(getChatRatelimit()).not.toBeNull();
    expect(getChatDailyRatelimit()).not.toBeNull();
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
