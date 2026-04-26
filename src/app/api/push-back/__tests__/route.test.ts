import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const appendMock = vi.fn();
vi.mock('@/lib/push-back/storage', () => ({
  appendPushBack: appendMock,
}));

import { __resetPushBackRatelimitForTests } from '@/lib/push-back/rate-limit';

const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  __resetPushBackRatelimitForTests();
  appendMock.mockReset();
  appendMock.mockResolvedValue(undefined);
});

afterEach(() => {
  __resetPushBackRatelimitForTests();
  if (ORIG_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIG_URL;
  if (ORIG_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIG_TOKEN;
});

async function call(body: unknown, headers: HeadersInit = {}): Promise<Response> {
  const { POST } = await import('../route');
  return POST(
    new Request('http://test.local/api/push-back', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/push-back', () => {
  const valid = {
    slug: '01-thing',
    message: 'ten or more characters of pushback here.',
    name: '',
  };

  it('returns 400 on invalid JSON body', async () => {
    const res = await call('{not json');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.category).toBe('input');
  });

  it('returns 400 on honeypot filled', async () => {
    const res = await call({ ...valid, website: 'http://spammer' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on too-short message', async () => {
    const res = await call({ ...valid, message: 'nope' });
    expect(res.status).toBe(400);
  });

  it('returns 200 on valid submission and appends', async () => {
    const res = await call(valid);
    expect(res.status).toBe(200);
    expect(appendMock).toHaveBeenCalledOnce();
    const arg = appendMock.mock.calls[0][0];
    expect(arg.slug).toBe(valid.slug);
    expect(arg.message).toBe(valid.message);
    expect(arg.timestamp).toMatch(/^\d{4}-/);
  });

  it('returns 500 when storage throws', async () => {
    appendMock.mockRejectedValueOnce(new Error('blob down'));
    const res = await call(valid);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe('upstream');
  });

  it('response includes X-Governed-By header', async () => {
    const res = await call(valid);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
  });
});
