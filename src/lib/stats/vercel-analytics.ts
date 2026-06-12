import 'server-only';
import { identifyAiReferrer } from './ai-crawlers';

/**
 * Read-back from Vercel Web Analytics for the /stats visits panel.
 *
 * Collection (the <Analytics /> script in layout.tsx) and read-back are
 * separate systems. These are the same endpoints the Vercel dashboard
 * uses — NOT part of the documented public REST API, so shapes can drift.
 * Verified working on the Morgan site (1 Jun 2026):
 *   overview   → { total, devices, bounceRate }          (range totals)
 *   timeseries → { data: { groups: { all: [{ key, total, devices }] } } }
 *   stats      → { data: [{ key, total, devices }] }     (type=path|referrer)
 * All three 404 without a `teamId` query param.
 *
 * Every fetch is `no-store`: /stats is a single-viewer admin page, so live
 * round-trips per view are cheaper than cache-staleness bookkeeping. When
 * the endpoints fail (token revoked, Vercel locks them down) we return
 * `unavailable: true` rather than zeros — a confident "0 page views" would
 * read as "no traffic" when the truth is "couldn't reach the data".
 */

export interface VisitStats {
  unavailable: boolean;
  pageViews: number | null;
  visitors: number | null;
  bounceRate: number | null;
  timeSeries: Array<{ date: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  referrers: Array<{ source: string; views: number; aiSurface: string | null }>;
}

interface VercelEnv {
  token: string;
  projectId: string;
  teamId: string;
}

function vercelEnv(): VercelEnv | null {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId || !teamId) return null;
  return { token, projectId, teamId };
}

const BASE_URL = 'https://vercel.com/api/web-analytics';

async function getJson(url: string, token: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch visit stats for the trailing `days` window.
 * Returns null when the three VERCEL_* env vars are not configured —
 * the page renders an honest "not configured" state for that.
 */
export async function readVisitStats(
  days: number,
  options: { now?: Date } = {},
): Promise<VisitStats | null> {
  const env = vercelEnv();
  if (!env) return null;

  const now = options.now ?? new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    projectId: env.projectId,
    teamId: env.teamId,
    from: from.toISOString(),
    to: now.toISOString(),
    environment: 'production',
  });

  const [overview, series, pages, referrers] = (await Promise.all([
    getJson(`${BASE_URL}/overview?${params}`, env.token),
    getJson(`${BASE_URL}/timeseries?${params}`, env.token),
    getJson(`${BASE_URL}/stats?${params}&type=path&limit=10`, env.token),
    getJson(`${BASE_URL}/stats?${params}&type=referrer&limit=20`, env.token),
    // Shapes are upstream-controlled and undocumented; parsed defensively below.
  ])) as Array<Record<string, any> | null>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const unavailable = !overview && !series && !pages && !referrers;

  const seriesRows: Array<Record<string, unknown>> =
    series?.data?.groups?.all ?? [];
  const pageRows: Array<Record<string, unknown>> = pages?.data ?? [];
  const referrerRows: Array<Record<string, unknown>> = referrers?.data ?? [];

  return {
    unavailable,
    pageViews: unavailable ? null : Number(overview?.total ?? 0),
    visitors: unavailable ? null : Number(overview?.devices ?? 0),
    bounceRate: unavailable ? null : Number(overview?.bounceRate ?? 0),
    timeSeries: seriesRows.map((d) => ({
      date: String(d.key ?? ''),
      views: Number(d.total ?? 0),
    })),
    topPages: pageRows.map((d) => ({
      path: String(d.key ?? ''),
      views: Number(d.total ?? 0),
    })),
    referrers: referrerRows.map((d) => {
      const source = String(d.key ?? '');
      return {
        source,
        views: Number(d.total ?? 0),
        aiSurface: identifyAiReferrer(source),
      };
    }),
  };
}
