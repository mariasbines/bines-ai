import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readVisitStats } from '../vercel-analytics';

const ENV_KEYS = [
  'VERCEL_API_TOKEN',
  'VERCEL_PROJECT_ID',
  'VERCEL_TEAM_ID',
] as const;
const ORIG = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

const NOW = new Date('2026-06-12T12:00:00.000Z');

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.VERCEL_API_TOKEN = 'tok';
  process.env.VERCEL_PROJECT_ID = 'prj_test';
  process.env.VERCEL_TEAM_ID = 'team_test';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIG[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG[k];
  }
  vi.unstubAllGlobals();
});

describe('readVisitStats', () => {
  it('returns null when env vars are not configured', async () => {
    delete process.env.VERCEL_API_TOKEN;
    expect(await readVisitStats(28, { now: NOW })).toBeNull();
  });

  it('maps the dashboard endpoint shapes and tags AI referrers', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/overview')) {
        return jsonResponse({ total: 120, devices: 80, bounceRate: 0.45 });
      }
      if (u.includes('/timeseries')) {
        return jsonResponse({
          data: {
            groups: {
              all: [
                { key: '2026-06-11', total: 60, devices: 40 },
                { key: '2026-06-12', total: 60, devices: 40 },
              ],
            },
          },
        });
      }
      if (u.includes('type=path')) {
        return jsonResponse({ data: [{ key: '/postcards', total: 30 }] });
      }
      return jsonResponse({
        data: [
          { key: 'https://chatgpt.com/', total: 7 },
          { key: 'https://www.google.com/', total: 5 },
          { key: 'https://www.linkedin.com/', total: 4 },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const stats = await readVisitStats(28, { now: NOW });

    expect(stats).not.toBeNull();
    expect(stats?.unavailable).toBe(false);
    expect(stats?.pageViews).toBe(120);
    expect(stats?.visitors).toBe(80);
    expect(stats?.timeSeries).toHaveLength(2);
    expect(stats?.topPages[0]).toEqual({ path: '/postcards', views: 30 });
    expect(stats?.referrers[0].aiSurface).toBe('ChatGPT');
    expect(stats?.referrers[0].socialSurface).toBeNull();
    expect(stats?.referrers[1].aiSurface).toBeNull();
    expect(stats?.referrers[2].socialSurface).toBe('LinkedIn');

    // Every call carries teamId — the endpoints 404 without it.
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toContain('teamId=team_test');
    }
  });

  it('reports unavailable (not zeros) when all endpoints fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 403 })),
    );
    const stats = await readVisitStats(28, { now: NOW });
    expect(stats?.unavailable).toBe(true);
    expect(stats?.pageViews).toBeNull();
    expect(stats?.visitors).toBeNull();
  });

  it('survives a thrown fetch (network down) as unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const stats = await readVisitStats(28, { now: NOW });
    expect(stats?.unavailable).toBe(true);
  });
});
