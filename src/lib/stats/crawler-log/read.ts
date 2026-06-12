import 'server-only';
import { list } from '@vercel/blob';
import { CRAWLER_HIT_PREFIX, parseHitPathname } from './schema';
import { dayKeyUtc } from '@/lib/argue-log/day';

export interface CrawlerStats {
  totalHits: number;
  /** Display-slug → hit count, sorted desc. */
  byBot: Array<{ botSlug: string; hits: number }>;
  /** Oldest → newest within the window; days with zero hits included. */
  byDay: Array<{ day: string; hits: number }>;
  /** Most-fetched paths, sorted desc, capped at `topN`. */
  topPaths: Array<{ path: string; hits: number }>;
}

function utcDaysBack(days: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(dayKeyUtc(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return out;
}

/**
 * Aggregate AI-crawler hits over the trailing `days` window.
 *
 * Works entirely from `list()` pathnames — the aggregation dimensions
 * (day, bot, path) are encoded in each object's name, so no blob bodies
 * are fetched (the store is private; body reads are signed round-trips).
 * One `list()` per day keeps each call's result set small and naturally
 * scopes the window; pagination within a day is followed via `cursor`.
 */
export async function readCrawlerStats(
  days: number,
  options: { now?: Date; topN?: number } = {},
): Promise<CrawlerStats> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');
  const now = options.now ?? new Date();
  const topN = options.topN ?? 10;

  const dayKeys = utcDaysBack(days, now);
  const byBot = new Map<string, number>();
  const byPath = new Map<string, number>();
  const byDay: Array<{ day: string; hits: number }> = [];
  let totalHits = 0;

  for (const day of dayKeys) {
    let dayHits = 0;
    let cursor: string | undefined;
    do {
      const page = await list({
        prefix: `${CRAWLER_HIT_PREFIX}${day}/`,
        token,
        cursor,
      });
      for (const blob of page.blobs) {
        const parsed = parseHitPathname(blob.pathname);
        if (!parsed) continue;
        dayHits += 1;
        byBot.set(parsed.botSlug, (byBot.get(parsed.botSlug) ?? 0) + 1);
        byPath.set(parsed.path, (byPath.get(parsed.path) ?? 0) + 1);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    byDay.push({ day, hits: dayHits });
    totalHits += dayHits;
  }

  const sortDesc = <T extends { hits: number }>(arr: T[]) =>
    arr.sort((a, b) => b.hits - a.hits);

  return {
    totalHits,
    byBot: sortDesc(
      [...byBot.entries()].map(([botSlug, hits]) => ({ botSlug, hits })),
    ),
    byDay,
    topPaths: sortDesc(
      [...byPath.entries()].map(([path, hits]) => ({ path, hits })),
    ).slice(0, topN),
  };
}
