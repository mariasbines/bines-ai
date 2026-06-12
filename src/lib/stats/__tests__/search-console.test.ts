import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync, webcrypto } from 'node:crypto';
import {
  readSearchConsoleStats,
  splitBrandQueries,
  type SearchRow,
} from '../search-console';

const ORIG_EMAIL = process.env.GSC_CLIENT_EMAIL;
const ORIG_KEY = process.env.GSC_PRIVATE_KEY;

const NOW = new Date('2026-06-12T12:00:00.000Z');

// A real (throwaway) RSA key so the WebCrypto RS256 signing path runs for
// real — only the network is mocked. jsdom lacks crypto.subtle; use Node's.
const { privateKey: TEST_PEM } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  process.env.GSC_CLIENT_EMAIL = 'stats@test-project.iam.gserviceaccount.com';
  // Vercel env vars flatten newlines to literal \n — exercise that path.
  process.env.GSC_PRIVATE_KEY = TEST_PEM.replace(/\n/g, '\\n');
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIG_EMAIL === undefined) delete process.env.GSC_CLIENT_EMAIL;
  else process.env.GSC_CLIENT_EMAIL = ORIG_EMAIL;
  if (ORIG_KEY === undefined) delete process.env.GSC_PRIVATE_KEY;
  else process.env.GSC_PRIVATE_KEY = ORIG_KEY;
});

describe('readSearchConsoleStats', () => {
  it('returns unconfigured when env vars are absent', async () => {
    delete process.env.GSC_CLIENT_EMAIL;
    delete process.env.GSC_PRIVATE_KEY;
    expect(await readSearchConsoleStats(28, { now: NOW })).toEqual({
      status: 'unconfigured',
    });
  });

  it('signs a JWT, exchanges it, and maps the three queries', async () => {
    const row = (keys: string[] | undefined, impressions: number) => ({
      ...(keys ? { keys } : {}),
      clicks: 3,
      impressions,
      ctr: 0.1,
      position: 7.43,
    });
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) {
        const body = String(init?.body);
        expect(body).toContain('jwt-bearer');
        // assertion=<header>.<claims>.<sig>
        expect(body.split('assertion=')[1].split('.').length).toBe(3);
        return jsonResponse({ access_token: 'ya29.test' });
      }
      expect(u).toContain(encodeURIComponent('sc-domain:bines.ai'));
      const body = JSON.parse(String(init?.body)) as {
        dimensions?: string[];
      };
      if (!body.dimensions) return jsonResponse({ rows: [row(undefined, 200)] });
      if (body.dimensions[0] === 'query') {
        return jsonResponse({ rows: [row(['boring ai'], 120)] });
      }
      return jsonResponse({
        rows: [row(['https://bines.ai/fieldwork/10-excellent-manners'], 80)],
      });
    });
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
      vi.fn(async () => jsonResponse({ error: 'invalid_grant' }, 403)),
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
});

describe('splitBrandQueries', () => {
  const row = (q: string, impressions: number, position: number): SearchRow => ({
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
