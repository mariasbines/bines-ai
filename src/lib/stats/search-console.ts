import 'server-only';

/**
 * Google Search Console read-back for the /stats SEO panel.
 *
 * Auth model: a Google service account added as a (restricted) user on the
 * `sc-domain:bines.ai` Search Console property. Service-account JWTs never
 * expire the way user OAuth refresh flows do — no re-auth ceremony, which
 * is the right shape for a single-owner personal site.
 *
 * Env:
 *   GSC_CLIENT_EMAIL  service account email
 *   GSC_PRIVATE_KEY   PKCS#8 PEM; literal `\n` sequences are tolerated
 *                     (Vercel env vars flatten newlines)
 *
 * No googleapis dependency — the JWT is signed with WebCrypto (RS256) and
 * the two HTTP calls are plain fetch. ~60 lines beats a 100MB SDK.
 */

const PROPERTY = 'sc-domain:bines.ai';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export interface SearchRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Queries containing Maria's name — the "do you own your own name" set.
 * Matched per word so "maria bines site", "bines.ai", "maria ai blog" all
 * count, but "submarine" does not. */
const BRAND_QUERY_RE = /\b(maria|bines)\b|bines\.ai/i;

export interface BrandSplit {
  brand: SearchRow[];
  topic: SearchRow[];
  /** Impressions-weighted average position across brand queries, 1dp.
   * null when there are no brand impressions yet. */
  brandPosition: number | null;
}

/** Pure: split GSC query rows into brand (her name) vs topic queries.
 * Exported separately so the page can render the "being found as a
 * person" readout the AEO strategy centres on. */
export function splitBrandQueries(rows: SearchRow[]): BrandSplit {
  const brand: SearchRow[] = [];
  const topic: SearchRow[] = [];
  for (const row of rows) {
    (BRAND_QUERY_RE.test(row.keys[0] ?? '') ? brand : topic).push(row);
  }
  const impressions = brand.reduce((sum, r) => sum + r.impressions, 0);
  const brandPosition =
    impressions > 0
      ? Math.round(
          (brand.reduce((sum, r) => sum + r.position * r.impressions, 0) /
            impressions) *
            10,
        ) / 10
      : null;
  return { brand, topic, brandPosition };
}

export type SearchConsoleStats =
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      totals: { clicks: number; impressions: number; position: number | null };
      queries: SearchRow[];
      pages: SearchRow[];
    };

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

async function signJwt(
  clientEmail: string,
  privateKeyPem: string,
  now: Date,
): Promise<string> {
  const header = b64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
  );
  const iat = Math.floor(now.getTime() / 1000);
  const claims = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat,
        exp: iat + 3600,
      }),
    ),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKeyPem).buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

async function accessToken(
  clientEmail: string,
  privateKeyPem: string,
  now: Date,
): Promise<string> {
  const assertion = await signJwt(clientEmail, privateKeyPem, now);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('token exchange returned no token');
  return json.access_token;
}

async function searchAnalyticsQuery(
  token: string,
  body: Record<string, unknown>,
): Promise<SearchRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`searchAnalytics query failed: ${res.status}`);
  }
  const json = (await res.json()) as { rows?: SearchRow[] };
  // GSC can return null position on zero-impression rows; normalise at the
  // parse boundary so downstream arithmetic never sees a non-number.
  return (json.rows ?? []).map((r) => ({
    ...r,
    position: typeof r.position === 'number' ? r.position : 0,
  }));
}

/**
 * Fetch SEO performance for the trailing `days` window (GSC data lags
 * ~2 days; the window is shifted back accordingly so the tail isn't a
 * misleading dip of not-yet-processed days).
 */
export async function readSearchConsoleStats(
  days: number,
  options: { now?: Date } = {},
): Promise<SearchConsoleStats> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY;
  if (!clientEmail || !privateKey) return { status: 'unconfigured' };

  const now = options.now ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const end = new Date(now.getTime() - 2 * dayMs);
  const start = new Date(end.getTime() - days * dayMs);
  const range = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };

  try {
    const token = await accessToken(clientEmail, privateKey, now);
    const [totalRows, queries, pages] = await Promise.all([
      searchAnalyticsQuery(token, { ...range }),
      searchAnalyticsQuery(token, {
        ...range,
        dimensions: ['query'],
        rowLimit: 15,
      }),
      searchAnalyticsQuery(token, {
        ...range,
        dimensions: ['page'],
        rowLimit: 10,
      }),
    ]);
    const total = totalRows[0];
    return {
      status: 'ok',
      totals: {
        clicks: total?.clicks ?? 0,
        impressions: total?.impressions ?? 0,
        position: total ? Math.round(total.position * 10) / 10 : null,
      },
      queries,
      pages,
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'unknown error',
    };
  }
}
