import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/argue-log/storage', () => ({
  listArgueLogDays: vi.fn(),
  deleteArgueLogDay: vi.fn(),
}));

import { listArgueLogDays, deleteArgueLogDay } from '@/lib/argue-log/storage';
import { GET } from '../route';

const listDaysMock = vi.mocked(listArgueLogDays);
const deleteDayMock = vi.mocked(deleteArgueLogDay);

const ORIG_SECRET = process.env.CRON_SECRET;

function utcDaysAgo(days: number, now: Date): string {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function makeRequest(auth?: string): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers.authorization = auth;
  return new Request('https://bines.ai/api/argue-log/cleanup', {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  listDaysMock.mockReset();
  deleteDayMock.mockReset();
  process.env.CRON_SECRET = 'super-secret-value';
});

afterEach(() => {
  if (ORIG_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIG_SECRET;
  vi.useRealTimers();
});

describe('GET /api/argue-log/cleanup — auth', () => {
  it('returns 500 when CRON_SECRET is unset (misconfiguration)', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest('Bearer anything'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('misconfigured');
  });

  it('returns 401 when no Authorization header is present', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(listDaysMock).not.toHaveBeenCalled();
  });

  it('returns 401 on wrong scheme (e.g. Basic)', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest('Basic super-secret-value'));
    expect(res.status).toBe(401);
  });

  it('returns 401 on wrong bearer token', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest('Bearer wrong-value-here-'));
    expect(res.status).toBe(401);
  });

  it('returns 401 on equal-length-but-differing token (timing-safe)', async () => {
    listDaysMock.mockResolvedValue([]);
    // Same length as 'super-secret-value' (18 chars), one char different.
    const almost = 'super-secret-valuX'.slice(0, 'super-secret-value'.length);
    expect(almost).toHaveLength('super-secret-value'.length);
    const res = await GET(makeRequest(`Bearer ${almost}`));
    expect(res.status).toBe(401);
  });

  it('accepts correct bearer token', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
  });

  it('includes X-Governed-By header on 200', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.headers.get('x-governed-by')).toBe('bines.ai');
  });

  it('includes X-Governed-By header on 401', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('x-governed-by')).toBe('bines.ai');
  });

  it('includes X-Governed-By header on 500', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest('Bearer anything'));
    expect(res.headers.get('x-governed-by')).toBe('bines.ai');
  });
});

describe('GET /api/argue-log/cleanup — age filter', () => {
  it('returns empty summary when no days exist', async () => {
    listDaysMock.mockResolvedValue([]);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: [], skipped: 0 });
    expect(deleteDayMock).not.toHaveBeenCalled();
  });

  it('deletes days strictly older than 90 days, keeps others', async () => {
    const NOW = new Date('2026-07-23T03:30:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const day91 = utcDaysAgo(91, NOW);
    const day90 = utcDaysAgo(90, NOW);
    const day89 = utcDaysAgo(89, NOW);

    listDaysMock.mockResolvedValue([day91, day90, day89]);
    deleteDayMock.mockResolvedValue(undefined);

    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Exactly 90 days old must be KEPT (strictly-older boundary).
    expect(body.deleted).toEqual([day91]);
    expect(body.skipped).toBe(2);
    expect(deleteDayMock).toHaveBeenCalledTimes(1);
    expect(deleteDayMock).toHaveBeenCalledWith(day91);
  });

  it('deletes multiple eligible days', async () => {
    const NOW = new Date('2026-07-23T03:30:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const day200 = utcDaysAgo(200, NOW);
    const day95 = utcDaysAgo(95, NOW);
    const day10 = utcDaysAgo(10, NOW);

    listDaysMock.mockResolvedValue([day200, day95, day10]);
    deleteDayMock.mockResolvedValue(undefined);

    const res = await GET(makeRequest('Bearer super-secret-value'));
    const body = await res.json();
    expect(body.deleted.sort()).toEqual([day200, day95].sort());
    expect(body.skipped).toBe(1);
  });
});

describe('GET /api/argue-log/cleanup — key hygiene', () => {
  it('skips a malformed day key (if storage ever returns one)', async () => {
    // listArgueLogDays already filters to well-formed keys; this is
    // defence-in-depth — if it ever leaks a bad string, the route
    // skips rather than passing to deleteArgueLogDay.
    const NOW = new Date('2026-07-23T03:30:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    listDaysMock.mockResolvedValue(['not-a-date']);
    const res = await GET(makeRequest('Bearer super-secret-value'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toEqual([]);
    expect(body.skipped).toBe(1);
    expect(deleteDayMock).not.toHaveBeenCalled();
  });
});
