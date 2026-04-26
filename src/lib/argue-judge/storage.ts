import 'server-only';
import { list, put } from '@vercel/blob';
import { ARGUE_JUDGE_VERDICT, type ArgueJudgeVerdict } from './schema';
import { isValidDayKey, dayKeyUtc } from '@/lib/argue-log/day';

const PREFIX = 'argue-judges/';

function filenameFor(day: string): string {
  return `${PREFIX}${day}.jsonl`;
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
 * Append one judge verdict to the day-keyed JSONL in Vercel Blob. The day-key
 * is the day the JUDGE RAN (not the day the conversation happened) — keeps
 * sweep-write logic simple at the cost of a build-time loader that scans all
 * days (architecture §Decisions / Storage layout).
 *
 * Validates against ARGUE_JUDGE_VERDICT before any Blob call — malformed
 * input throws a zod error and nothing is written.
 *
 * Get-then-concat-then-put is NOT atomic. Two concurrent writes can race and
 * lose one verdict. Accepted v1 tradeoff (mirrors argue-log; the loader's
 * dedupe-by-conversation_id step in `loader.ts` partially compensates).
 *
 * Throws if BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function appendArgueJudge(
  verdict: ArgueJudgeVerdict,
  options: AppendOptions = {},
): Promise<void> {
  ARGUE_JUDGE_VERDICT.parse(verdict);

  const token = requireToken();
  const filename = filenameFor(dayKeyUtc(options.now));

  const existing = await list({ prefix: filename, token });
  // Exact pathname match — defends against a sibling like
  // `argue-judges/2026-04-25.jsonl.backup` accidentally being picked up.
  const match = existing.blobs.find((b) => b.pathname === filename);

  let body = JSON.stringify(verdict) + '\n';
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
 * List all argue-judge day keys present in Blob storage, newest first.
 * Malformed keys (anything not matching DAY_KEY_RE) are silently filtered —
 * schema-drift recovery.
 */
export async function listArgueJudgeDays(): Promise<string[]> {
  const token = requireToken();
  const out = await list({ prefix: PREFIX, token });
  const days = out.blobs
    .map((b) => b.pathname.slice(PREFIX.length).replace(/\.jsonl$/, ''))
    .filter(isValidDayKey);
  // Sort desc — lexicographic on YYYY-MM-DD equals chronological.
  return days.sort().reverse();
}

/**
 * Read one day's JSONL file and return its parsed verdicts. Missing or
 * unreadable files return []. Invalid day keys return [] without a Blob
 * call (defence against path-traversal-shaped input).
 *
 * Malformed lines are silently skipped — a single bad verdict shouldn't
 * blank a day's enrichment.
 */
export async function readArgueJudgeDay(day: string): Promise<ArgueJudgeVerdict[]> {
  if (!isValidDayKey(day)) return [];
  const token = requireToken();
  const filename = filenameFor(day);
  const existing = await list({ prefix: filename, token });
  const match = existing.blobs.find((b) => b.pathname === filename);
  if (!match) return [];
  const res = await fetch(match.url);
  if (!res.ok) return [];
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.length > 0);
  const verdicts: ArgueJudgeVerdict[] = [];
  for (const line of lines) {
    try {
      const parsed = ARGUE_JUDGE_VERDICT.safeParse(JSON.parse(line));
      if (parsed.success) verdicts.push(parsed.data);
      // Silently skip malformed lines.
    } catch {
      // Non-JSON line — skip.
    }
  }
  return verdicts;
}

/**
 * Read every day's verdicts and concatenate. Build-time only — typical site
 * has ≤90 days × ≤1KB each (<100KB total read). Naive sequential fan-out is
 * acceptable at v1 scale; concurrency cap deferred per architecture.
 */
export async function readAllArgueJudges(): Promise<ArgueJudgeVerdict[]> {
  const days = await listArgueJudgeDays();
  const out: ArgueJudgeVerdict[] = [];
  for (const day of days) {
    const verdicts = await readArgueJudgeDay(day);
    out.push(...verdicts);
  }
  return out;
}

/**
 * Find the latest verdict for a `conversation_id`. Scans today's and
 * yesterday's day-files only — the architecture's 30-min recency window
 * covers both UTC days for any conversation that has a verdict at all.
 *
 * Returns the verdict with the latest `judged_at` if multiple exist for the
 * same conversation_id (race tolerance — sweep + run could both write).
 *
 * Used by the run-route idempotency check (story 003.004). Returns `null`
 * when no verdict exists for the id within the recency window.
 */
export async function findVerdictByConversationId(
  id: string,
  options: { now?: Date } = {},
): Promise<ArgueJudgeVerdict | null> {
  const now = options.now ?? new Date();
  const today = dayKeyUtc(now);
  const yesterday = dayKeyUtc(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const matches: ArgueJudgeVerdict[] = [];
  for (const day of [today, yesterday]) {
    const verdicts = await readArgueJudgeDay(day);
    for (const v of verdicts) {
      if (v.conversation_id === id) matches.push(v);
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.judged_at.localeCompare(a.judged_at));
  return matches[0];
}
