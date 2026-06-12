import 'server-only';

/**
 * Google Search Console read-back for the /stats SEO panel.
 *
 * Auth model: OAuth refresh token from Maria's own Google account (the
 * Search Console property owner). The service-account path was the first
 * choice but Google's Secure-by-Default org policy
 * (iam.disableServiceAccountKeyCreation) blocks key downloads on her org —
 * refresh tokens need no key file, so there is nothing for the policy to
 * block. Same pattern as the Morgan site.
 *
 * Env:
 *   GSC_CLIENT_ID      OAuth client (Desktop app) id
 *   GSC_CLIENT_SECRET  its secret
 *   GSC_REFRESH_TOKEN  one-time consent grant, webmasters.readonly scope
 *
 * No googleapis dependency — two plain fetches beat a 100MB SDK.
 */

// The refresh token must carry the webmasters.readonly scope — granted at
// consent time, not requested here.
const PROPERTY = 'sc-domain:bines.ai';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

interface OauthEnv {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

async function accessToken(env: OauthEnv): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
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
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refreshToken = process.env.GSC_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return { status: 'unconfigured' };
  }

  const now = options.now ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const end = new Date(now.getTime() - 2 * dayMs);
  const start = new Date(end.getTime() - days * dayMs);
  const range = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };

  try {
    const token = await accessToken({ clientId, clientSecret, refreshToken });
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
