import { readArgueLogDay } from '@/lib/argue-log/storage';
import { dayKeyUtc, isValidDayKey } from '@/lib/argue-log/day';
import {
  appendArgueJudge,
  readArgueJudgeDay,
} from '@/lib/argue-judge/storage';
import { judgeConversation } from '@/lib/argue-judge/runner';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';

/**
 * Nightly cron sweep — the resilience net for the judge.
 *
 * Schedule: `30 4 * * *` UTC (one hour after argue-log/cleanup at `30 3 * * *`).
 * Auth: `Authorization: Bearer ${CRON_SECRET}` via timing-safe compare.
 * Override: `?day=YYYY-MM-DD` for manual replay (Maria runbook in
 * docs/argue-judge-ops.md).
 *
 * Selection (architecture-locked):
 *   1. Read yesterday's argue-log entries.
 *   2. Skip pre-Phase-A entries (no conversation_id).
 *   3. Group by conversation_id.
 *   4. Build judged-ids set from target-day + today verdict files (verdict
 *      day-keys may straddle the UTC boundary).
 *   5. For each un-judged conversation: assemble turns chronologically,
 *      run judgeConversation, write the verdict. Per-conversation isolation
 *      in try/catch — one runner failure does NOT abort the sweep.
 *
 * Response envelope: { day, judged, skipped_already_judged, errors }.
 */
export const runtime = 'edge';

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

/**
 * Length-normalised, XOR-accumulator string comparison — same pattern as
 * `src/app/api/argue-log/cleanup/route.ts`. CRON_SECRET is documented as
 * ASCII hex only; BMP-range `charCodeAt` is exact for ASCII.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request): Promise<Response> {
  // 1. CRON_SECRET configuration check.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[argue-judge] cron-secret-unconfigured');
    return jsonResponse(500, { category: 'upstream' });
  }

  // 2. Bearer auth.
  const auth = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (
    !auth.startsWith(prefix) ||
    !timingSafeEqual(auth.slice(prefix.length), secret)
  ) {
    return jsonResponse(401, { category: 'unauthorized' });
  }

  // 3. Target day — yesterday by default; `?day=` override (regex-validated).
  const url = new URL(req.url);
  const queryDay = url.searchParams.get('day');
  let targetDay: string;
  if (queryDay !== null) {
    if (!isValidDayKey(queryDay)) {
      return jsonResponse(400, { category: 'validation' });
    }
    targetDay = queryDay;
  } else {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    targetDay = dayKeyUtc(yesterday);
  }

  // 4. Read argue-log entries for the target day.
  const entries = await readArgueLogDay(targetDay);

  // 5. Group by conversation_id; skip entries with no id (pre-Phase-A shape).
  const groups = new Map<string, ArgueLogEntry[]>();
  for (const e of entries) {
    if (!e.conversation_id) continue;
    const arr = groups.get(e.conversation_id) ?? [];
    arr.push(e);
    groups.set(e.conversation_id, arr);
  }

  // 6. Build the judged-ids set across target day + today.
  const today = dayKeyUtc();
  const existingDays = targetDay === today ? [targetDay] : [targetDay, today];
  const existingJudges = (
    await Promise.all(existingDays.map((d) => readArgueJudgeDay(d)))
  ).flat();
  const judgedIds = new Set(existingJudges.map((v) => v.conversation_id));

  // 7. Iterate groups with per-conversation isolation.
  let judged = 0;
  let skippedAlreadyJudged = 0;
  let errors = 0;
  for (const [convId, convEntries] of groups) {
    if (judgedIds.has(convId)) {
      skippedAlreadyJudged++;
      continue;
    }
    try {
      convEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const turns = convEntries.flatMap((e) => e.turns);
      const fromSlug = convEntries[0]?.from_slug ?? null;
      const verdict = await judgeConversation(convId, fromSlug, turns);
      await appendArgueJudge(verdict);
      judged++;
    } catch (err) {
      errors++;
      console.error(
        `[argue-judge] sweep-failed conv_id=${convId} reason=${
          err instanceof Error ? err.name : 'unknown'
        }`,
      );
      // Continue — per-conversation isolation. One failure cannot kill
      // the whole nightly job.
    }
  }

  return jsonResponse(200, {
    day: targetDay,
    judged,
    skipped_already_judged: skippedAlreadyJudged,
    errors,
  });
}
