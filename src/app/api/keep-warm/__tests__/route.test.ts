import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/chat/rate-limit', () => ({
  touchChatRedis: vi.fn(),
}));

import { touchChatRedis } from '@/lib/chat/rate-limit';
import { GET } from '../route';

const touchMock = vi.mocked(touchChatRedis);

const ORIG_SECRET = process.env.CRON_SECRET;

function makeRequest(auth?: string): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers.authorization = auth;
  return new Request('https://bines.ai/api/keep-warm', {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  touchMock.mockReset();
  process.env.CRON_SECRET = 'super-secret-value';
});

afterEach(() => {
  if (ORIG_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIG_SECRET;
});

describe('GET /api/keep-warm — auth', () => {
  it('returns 500 when CRON_SECRET is unset (misconfiguration)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest('Bearer anything'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('misconfigured');
    expect(touchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(touchMock).not.toHaveBeenCalled();
  });

  it('returns 401 on wrong scheme (e.g. Basic)', async () => {
    const res = await GET(makeRequest('Basic super-secret-value'));
    expect(res.status).toBe(401);
    expect(touchMock).not.toHaveBeenCalled();
  });

  it('returns 401 on wrong bearer token', async () => {
    const res = await GET(makeRequest('Bearer wrong-value-here-'));
    expect(res.status).toBe(401);
    expect(touchMock).not.toHaveBeenCalled();
  });

  it('returns 401 on equal-length-but-differing token (timing-safe)', async () => {
    const almost = 'super-secret-valuX'.slice(0, 'super-secret-value'.length);
    expect(almost).toHaveLength('super-secret-value'.length);
    const res = await GET(makeRequest(`Bearer ${almost}`));
    expect(res.status).toBe(401);
    expect(touchMock).not.toHaveBeenCalled();
  });

  it('includes X-Governed-By header on 401', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('x-governed-by')).toBe('bines.ai');
  });
});

describe('GET /api/keep-warm — warming', () => {
  it('pings Redis and reports the timestamp on success', async () => {
    const ts = Date.UTC(2026, 5, 29, 5, 0, 0);
    touchMock.mockResolvedValue(ts);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ warmed: true, at: new Date(ts).toISOString() });
    expect(touchMock).toHaveBeenCalledTimes(1);
  });

  it('reports warmed:false when no Redis is configured (dev/CI)', async () => {
    touchMock.mockResolvedValue(null);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ warmed: false, reason: 'no-redis' });
  });
});
