import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readSearchConsoleStats,
  splitBrandQueries,
  type SearchRow,
} from '../search-console';

const ENV_KEYS = [
  'GSC_CLIENT_ID',
  'GSC_CLIENT_SECRET',
  'GSC_REFRESH_TOKEN',
] as const;
const ORIG = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

const NOW = new Date('2026-06-12T12:00:00.000Z');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  process.env.GSC_CLIENT_ID = 'test-client.apps.googleusercontent.com';
  process.env.GSC_CLIENT_SECRET = 'test-secret';
  process.env.GSC_REFRESH_TOKEN = '1//test-refresh-token';
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (ORIG[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG[k];
  }
});

describe('readSearchConsoleStats', () => {
  it('returns unconfigured when any of the three env vars is absent', async () => {
    delete process.env.GSC_REFRESH_TOKEN;
    expect(await readSearchConsoleStats(28, { now: NOW })).toEqual({
      status: 'unconfigured',
    });
  });

  it('exchanges the refresh token and maps the three queries', async () => {
    const row = (keys: string[] | undefined, impressions: number) => ({
      ...(keys ? { keys } : {}),
      clicks: 3,
      impressions,
      ctr: 0.1,
      position: 7.43,
    });
    const fetchMock = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.includes('oauth2.googleapis.com/token')) {
          const body = new URLSearchParams(String(init?.body));
          expect(body.get('grant_type')).toBe('refresh_token');
          expect(body.get('refresh_token')).toBe('1//test-refresh-token');
          expect(body.get('client_id')).toBe(
            'test-client.apps.googleusercontent.com',
          );
          return jsonResponse({ access_token: 'ya29.test' });
        }
        expect(u).toContain(encodeURIComponent('sc-domain:bines.ai'));
        expect(
          (init?.headers as Record<string, string>).Authorization,
        ).toBe('Bearer ya29.test');
        const body = JSON.parse(String(init?.body)) as {
          dimensions?: string[];
        };
        if (!body.dimensions) {
          return jsonResponse({ rows: [row(undefined, 200)] });
        }
        if (body.dimensions[0] === 'query') {
          return jsonResponse({ rows: [row(['boring ai'], 120)] });
        }
        return jsonResponse({
          rows: [row(['https://bines.ai/fieldwork/10-excellent-manners'], 80)],
        });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const stats = await readSearchConsoleStats(28, { now: NOW });

    expect(stats.status).toBe('ok');
    if (stats.status !== 'ok') return;
    expect(stats.totals).toEqual({
      clicks: 3,
      impressions: 200,
      position: 7.4,
    });
    expect(stats.queries[0].keys[0]).toBe('boring ai');
    expect(stats.pages[0].impressions).toBe(80);
  });

  it('returns an error status when the token exchange fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'invalid_grant' }, 400)),
    );
    const stats = await readSearchConsoleStats(28, { now: NOW });
    expect(stats.status).toBe('error');
    if (stats.status === 'error') {
      expect(stats.message).toMatch(/token exchange failed/);
    }
  });

  it('handles an empty property (no rows) without inventing totals', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return jsonResponse({ access_token: 'ya29.test' });
      }
      return jsonResponse({}); // GSC omits `rows` entirely for empty windows
    });
    vi.stubGlobal('fetch', fetchMock);

    const stats = await readSearchConsoleStats(28, { now: NOW });
    expect(stats.status).toBe('ok');
    if (stats.status !== 'ok') return;
    expect(stats.totals).toEqual({
      clicks: 0,
      impressions: 0,
      position: null,
    });
    expect(stats.queries).toEqual([]);
  });

  it('normalises a null position from GSC to a number at the parse boundary', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return jsonResponse({ access_token: 'ya29.test' });
      }
      return jsonResponse({
        rows: [
          { keys: ['x'], clicks: 0, impressions: 0, ctr: 0, position: null },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const stats = await readSearchConsoleStats(28, { now: NOW });
    expect(stats.status).toBe('ok');
    if (stats.status !== 'ok') return;
    expect(stats.queries[0].position).toBe(0);
  });
});

describe('splitBrandQueries', () => {
  const row = (
    q: string,
    impressions: number,
    position: number,
  ): SearchRow => ({
    keys: [q],
    clicks: 1,
    impressions,
    ctr: 0.1,
    position,
  });

  it('splits name queries from topic queries', () => {
    const { brand, topic } = splitBrandQueries([
      row('maria bines', 100, 1.2),
      row('bines.ai', 50, 1.0),
      row('ai essays uk', 200, 40),
      row('submarine movies', 10, 80), // contains "marine", not "maria"
    ]);
    expect(brand.map((r) => r.keys[0])).toEqual(['maria bines', 'bines.ai']);
    expect(topic.map((r) => r.keys[0])).toEqual([
      'ai essays uk',
      'submarine movies',
    ]);
  });

  it('weights brand position by impressions, 1dp', () => {
    const { brandPosition } = splitBrandQueries([
      row('maria bines', 100, 1.0),
      row('who is maria bines', 50, 4.0),
    ]);
    // (1.0*100 + 4.0*50) / 150 = 2.0
    expect(brandPosition).toBe(2);
  });

  it('returns null position when no brand impressions exist', () => {
    const { brandPosition } = splitBrandQueries([row('ai essays', 10, 5)]);
    expect(brandPosition).toBeNull();
  });
});
