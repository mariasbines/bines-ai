import { put } from '@vercel/blob';
import { CRAWLER_HIT, hitPathname, type CrawlerHit } from './schema';

/**
 * Record one AI-crawler hit as its own Blob object.
 *
 * Called from middleware via `event.waitUntil` — this module must stay
 * edge-safe (no `server-only` import, no Node-only APIs) and must never
 * throw into the request path; callers attach a `.catch`.
 *
 * One object per hit means concurrent crawler requests cannot race each
 * other (no read-modify-write).
 */
export async function appendCrawlerHit(hit: CrawlerHit): Promise<void> {
  CRAWLER_HIT.parse(hit);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');

  const ms = Date.parse(hit.timestamp);
  const rand = Math.random().toString(36).slice(2, 8);
  await put(hitPathname(hit, ms, rand), JSON.stringify(hit), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    token,
  });
}
