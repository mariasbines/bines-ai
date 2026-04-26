import { z } from 'zod';
import { hashIp } from '@/lib/argue-log/hash';
import { readArgueLogDay } from '@/lib/argue-log/storage';
import { dayKeyUtc } from '@/lib/argue-log/day';
import {
  appendArgueJudge,
  findVerdictByConversationId,
} from '@/lib/argue-judge/storage';
import { judgeConversation } from '@/lib/argue-judge/runner';
import type { ArgueJudgeVerdict } from '@/lib/argue-judge/schema';

/**
 * Visitor-triggered judge endpoint. Public POST route — no shared secret.
 *
 * Auth model (architecture-locked, story 003.004):
 *  1. IP-bind: hashed request IP must match the latest argue-log entry's
 *     ip_hash for the supplied conversation_id (try-current-then-previous
 *     salt rotation tolerance).
 *  2. Recency: latest argue-log entry must be within 30 minutes.
 *  3. Idempotency: an existing verdict for this conversation_id makes the
 *     call a 200 no-op (no second Sonnet call, no second write).
 *
 * Distinct error codes prevent attacker oracle on which conversation_ids
 * exist:
 *  - 400 validation
 *  - 403 forbidden (we know the id; your IP doesn't match)
 *  - 404 not_found (we don't know the id)
 *  - 410 expired (we know it; latest entry > 30 min)
 *  - 500 upstream (salt unset)
 *  - 502 upstream (judge runner threw)
 *
 * NO 401 status — there is no shared-secret failure mode.
 */
export const runtime = 'edge';

const RECENCY_WINDOW_MS = 30 * 60 * 1000;

const RUN_REQUEST = z.object({
  conversation_id: z.string().uuid(),
});

const GOVERNED_BY_HEADER = { 'X-Governed-By': 'bines.ai' } as const;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...GOVERNED_BY_HEADER },
  });
}

function getIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: Request): Promise<Response> {
  // 1. Parse + validate body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { category: 'validation' });
  }
  const parsed = RUN_REQUEST.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, { category: 'validation' });
  }
  const { conversation_id } = parsed.data;

  // 2. Salt configuration check.
  const saltCurrent = process.env.ARGUE_LOG_IP_SALT_CURRENT;
  if (!saltCurrent) {
    console.error('[argue-judge] salt-unconfigured');
    return jsonResponse(500, { category: 'upstream' });
  }
  const saltPrevious = process.env.ARGUE_LOG_IP_SALT_PREVIOUS;

  const ip = getIp(req);
  const ipHashCurrent = await hashIp(ip, saltCurrent);
  const ipHashPrevious = saltPrevious ? await hashIp(ip, saltPrevious) : null;

  // 3. Conversation lookup — today + yesterday only (30-min recency window
  //    can straddle midnight UTC).
  const now = new Date();
  const today = dayKeyUtc(now);
  const yesterday = dayKeyUtc(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  let allEntries;
  try {
    const [todayEntries, yesterdayEntries] = await Promise.all([
      readArgueLogDay(today),
      readArgueLogDay(yesterday),
    ]);
    allEntries = [...todayEntries, ...yesterdayEntries];
  } catch (err) {
    console.error(
      '[argue-judge] log-read-failed:',
      err instanceof Error ? err.name : 'unknown',
    );
    return jsonResponse(500, { category: 'upstream' });
  }

  const entries = allEntries.filter(
    (e) => e.conversation_id === conversation_id,
  );
  if (entries.length === 0) {
    return jsonResponse(404, { category: 'not_found' });
  }

  // 4. Sort newest-first; recency check on the latest.
  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const latest = entries[0];
  const latestMs = new Date(latest.timestamp).getTime();
  if (
    Number.isNaN(latestMs) ||
    now.getTime() - latestMs > RECENCY_WINDOW_MS
  ) {
    return jsonResponse(410, { category: 'expired' });
  }

  // 5. IP-bind check — try current salt, then previous (rotation tolerance).
  const ipMatched =
    latest.ip_hash === ipHashCurrent ||
    (ipHashPrevious !== null && latest.ip_hash === ipHashPrevious);
  if (!ipMatched) {
    return jsonResponse(403, { category: 'forbidden' });
  }

  // 6. Idempotency — runs AFTER auth so an attacker with the right
  //    conversation_id but wrong IP cannot probe verdict existence.
  const existing = await findVerdictByConversationId(conversation_id, { now });
  if (existing !== null) {
    return jsonResponse(200, { judged: true, verdict: existing });
  }

  // 7. Run the judge. Assemble turns chronologically (entries are desc, but
  //    each entry's `turns` array is already user→assistant order; flatten
  //    after re-sorting entries asc).
  const entriesAsc = entries
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const turns = entriesAsc.flatMap((e) => e.turns);
  const fromSlug = latest.from_slug ?? null;

  let verdict: ArgueJudgeVerdict;
  try {
    verdict = await judgeConversation(conversation_id, fromSlug, turns, { now });
  } catch (err) {
    console.error(
      '[argue-judge] run-failed:',
      err instanceof Error ? err.name : 'unknown',
    );
    return jsonResponse(502, { category: 'upstream' });
  }

  // 8. Persist + respond. Single `await` — no `after()` here because the
  //    response body includes the verdict.
  try {
    await appendArgueJudge(verdict, { now });
  } catch (err) {
    console.error(
      '[argue-judge] write-failed:',
      err instanceof Error ? err.name : 'unknown',
    );
    return jsonResponse(502, { category: 'upstream' });
  }

  return jsonResponse(200, { judged: true, verdict });
}
