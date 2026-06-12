import { z } from 'zod';
import { botSlug } from '../ai-crawlers';

/**
 * Crawler-hit log: one Blob object per AI-crawler page fetch.
 *
 * One-file-per-hit (not a daily JSONL) is deliberate — middleware writes
 * are concurrent and a get-then-concat-then-put append would race (the
 * known argue-log v1 tradeoff; this store starts on the migration path
 * that storage.ts documents).
 *
 * The pathname carries the aggregation dimensions (day, bot, path) so the
 * /stats AEO panel can be computed from a single `list()` call without
 * fetching any blob bodies — the store is private, so every body read is
 * a signed SDK round-trip we'd rather not multiply by hit count. The JSON
 * body keeps the full record (exact timestamp + raw UA) for forensics.
 *
 * Pathname shape:
 *   crawler-hits/YYYY-MM-DD/<bot-slug>/<ms>-<rand>_<b64url(path)>.json
 */

export const CRAWLER_HIT = z.object({
  schema_version: z.literal(1),
  timestamp: z.iso.datetime(),
  bot: z.string().min(1),
  path: z.string().min(1).max(500),
  ua: z.string().max(300),
});
export type CrawlerHit = z.infer<typeof CRAWLER_HIT>;

export const CRAWLER_HIT_PREFIX = 'crawler-hits/';

/** Base64url without padding — pathname-safe encoding of the request path. */
export function encodePath(path: string): string {
  const bytes = new TextEncoder().encode(path);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePath(encoded: string): string | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export interface ParsedHitPathname {
  day: string;
  botSlug: string;
  path: string;
}

const HIT_PATHNAME_RE = new RegExp(
  `^${CRAWLER_HIT_PREFIX}(\\d{4}-\\d{2}-\\d{2})/([a-z0-9-]+)/\\d+-[a-z0-9]+_([A-Za-z0-9_-]*)\\.json$`,
);

/**
 * Build the Blob pathname for one hit. `rand` keeps two same-millisecond
 * hits from colliding; callers pass something short and lowercase.
 */
export function hitPathname(
  hit: CrawlerHit,
  ms: number,
  rand: string,
): string {
  const day = hit.timestamp.slice(0, 10);
  // Path is capped BEFORE encoding so a hostile query-string-laden URL
  // can't blow past Blob pathname limits, and the b64 stays decodable
  // (a post-encoding cap could cut mid-quantum). The JSON body keeps the
  // uncapped value.
  const encoded = encodePath(hit.path.slice(0, 140));
  return `${CRAWLER_HIT_PREFIX}${day}/${botSlug(hit.bot)}/${ms}-${rand}_${encoded}.json`;
}

/** Parse a hit pathname back into its aggregation dimensions. Returns null
 * for anything that doesn't match the v1 shape (schema-drift tolerant). */
export function parseHitPathname(pathname: string): ParsedHitPathname | null {
  const m = HIT_PATHNAME_RE.exec(pathname);
  if (!m) return null;
  const decoded = decodePath(m[3]);
  // A truncated b64 tail can still decode to a usable path prefix; a fully
  // undecodable one degrades to '(unknown)' rather than dropping the hit.
  return { day: m[1], botSlug: m[2], path: decoded ?? '(unknown)' };
}
