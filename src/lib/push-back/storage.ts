import 'server-only';
import { get, list, put } from '@vercel/blob';
import type { PushBack } from './schema';

const JSONL_PREFIX = 'push-back/';

function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface AppendOptions {
  now?: Date;
}

/**
 * Append one push-back entry to today's daily JSONL in Vercel Blob.
 *
 * Get-then-concat-then-put is NOT atomic — two concurrent writes can race.
 * Accepted v1 tradeoff; post-launch migration to per-submission files is
 * an option if real concurrency materialises.
 *
 * Throws if BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function appendPushBack(
  entry: PushBack & { timestamp: string },
  options: AppendOptions = {},
): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');
  const filename = `${JSONL_PREFIX}${dateKey(options.now)}.jsonl`;

  // Check if a file exists at this path
  const existing = await list({ prefix: filename, token });
  let body = JSON.stringify(entry) + '\n';
  if (existing.blobs.length > 0) {
    // Private store — `fetch(blob.url)` returns 403. Use SDK `get()`.
    const got = await get(filename, { access: 'private', token });
    if (got && got.statusCode === 200) {
      body = (await new Response(got.stream).text()) + body;
    }
  }

  await put(filename, body, {
    access: 'private',
    contentType: 'application/x-ndjson',
    addRandomSuffix: false,
    token,
    allowOverwrite: true,
  });
}
