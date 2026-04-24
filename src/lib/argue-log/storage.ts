import 'server-only';
import { list, put, del } from '@vercel/blob';
import { ARGUE_LOG_ENTRY, type ArgueLogEntry } from './schema';

const PREFIX = 'argue-log/';
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(s: string): boolean {
  return DAY_KEY_RE.test(s);
}

function filenameFor(day: string): string {
  return `${PREFIX}${day}.jsonl`;
}

function dayKeyUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function requireToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing');
  return token;
}

export interface AppendOptions {
  now?: Date;
}

/**
 * Append one argue-log entry to today's daily JSONL in Vercel Blob.
 *
 * Validates against ARGUE_LOG_ENTRY before any Blob call — malformed input
 * throws a zod error and nothing is written.
 *
 * Get-then-concat-then-put is NOT atomic — two concurrent writes can race
 * and lose one entry. Accepted v1 tradeoff (mirrors push-back storage and
 * ARGUE-OPS-003 in the risk register). Post-launch migration path: one
 * file per entry under argue-log/YYYY-MM-DD/<timestamp>.json.
 *
 * Throws if BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function appendArgueLog(
  entry: ArgueLogEntry,
  options: AppendOptions = {},
): Promise<void> {
  // Schema-validate BEFORE hitting Blob. Rejects malformed input early.
  ARGUE_LOG_ENTRY.parse(entry);

  const token = requireToken();
  const filename = filenameFor(dayKeyUtc(options.now));

  const existing = await list({ prefix: filename, token });
  // L-002: exact pathname match — defends against a sibling like
  // `argue-log/2026-04-24.jsonl.backup` accidentally being picked up.
  const match = existing.blobs.find((b) => b.pathname === filename);

  let body = JSON.stringify(entry) + '\n';
  if (match) {
    const res = await fetch(match.url);
    if (res.ok) body = (await res.text()) + body;
  }

  await put(filename, body, {
    access: 'public',
    contentType: 'application/x-ndjson',
    addRandomSuffix: false,
    token,
    allowOverwrite: true,
  });
}

/**
 * List all argue-log day keys (YYYY-MM-DD) present in Blob storage,
 * newest first. Malformed keys (anything not matching DAY_KEY_RE)
 * are silently filtered — schema-drift recovery.
 */
export async function listArgueLogDays(): Promise<string[]> {
  const token = requireToken();
  const out = await list({ prefix: PREFIX, token });
  const days = out.blobs
    .map((b) => b.pathname.slice(PREFIX.length).replace(/\.jsonl$/, ''))
    .filter(isValidDayKey);
  // Sort desc — lexicographic sort on YYYY-MM-DD equals chronological sort.
  return days.sort().reverse();
}

/**
 * Read one day's JSONL file and return its parsed entries. Missing or
 * unreadable files return []. Invalid day keys return [] without a Blob
 * call (no user input is ever concatenated into a path — AC-005 guardrail
 * also applies here as defence-in-depth).
 *
 * Malformed lines are silently skipped so a single bad entry doesn't kill
 * a day's admin view.
 */
export async function readArgueLogDay(day: string): Promise<ArgueLogEntry[]> {
  if (!isValidDayKey(day)) return [];
  const token = requireToken();
  const filename = filenameFor(day);
  const existing = await list({ prefix: filename, token });
  // L-002: exact pathname match.
  const match = existing.blobs.find((b) => b.pathname === filename);
  if (!match) return [];
  const res = await fetch(match.url);
  if (!res.ok) return [];
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.length > 0);
  const entries: ArgueLogEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = ARGUE_LOG_ENTRY.safeParse(JSON.parse(line));
      if (parsed.success) entries.push(parsed.data);
      // Silently skip malformed lines.
    } catch {
      // Non-JSON line — skip.
    }
  }
  return entries;
}

/**
 * Delete one day's argue-log file. Invalid day keys are no-ops (no Blob
 * call, no throw) — AC-005 regex guard against path traversal. Missing
 * files are silently idempotent.
 */
export async function deleteArgueLogDay(day: string): Promise<void> {
  if (!isValidDayKey(day)) return;
  const token = requireToken();
  const filename = filenameFor(day);
  const existing = await list({ prefix: filename, token });
  // L-002: exact pathname match — siblings like `.backup` are left alone.
  for (const blob of existing.blobs) {
    if (blob.pathname !== filename) continue;
    await del(blob.url, { token });
  }
}
