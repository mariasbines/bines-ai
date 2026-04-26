import 'server-only';
import { readAllArgueJudges } from './storage';
import type { ArgueJudgeVerdict } from './schema';

/**
 * Derived enrichment shape consumed by `<PushbackSummary>` and
 * `<FieldworkCard>` (story 003.007). Override-and-replace semantics versus
 * the static frontmatter `pushback.count` — the loader is the new
 * authoritative source from 003.007 onward.
 */
export interface PushbackEnrichment {
  count: number;
  landed: number;
  excerpts: string[];
}

const TOP_EXCERPTS = 3;

/**
 * Build-time enrichment helper. Reads every verdict in `argue-judges/`,
 * filters to the slug + harm-clean + pushback subset, dedupes by
 * conversation_id (latest judged_at wins — race tolerance for the
 * append-without-locking storage layer), sorts by judge_confidence desc, and
 * returns the count, landed-count, and top-3 excerpts.
 *
 * Returns `null` (not throws, not empty enrichment) on any read error so
 * the caller can decide between "render empty summary" and "skip the
 * summary block entirely". Logs the error name only — never the Blob URL,
 * never visitor content (PB2-SEC-006 / AC-012).
 */
export async function getJudgesForSlug(
  slug: string,
): Promise<PushbackEnrichment | null> {
  let all: ArgueJudgeVerdict[];
  try {
    all = await readAllArgueJudges();
  } catch (err) {
    console.error(
      '[argue-judge] enrichment-failed:',
      err instanceof Error ? err.name : 'unknown',
    );
    return null;
  }

  // Filter — only verdicts that should contribute to the public summary.
  const filtered = all.filter(
    (v) =>
      v.from_slug === slug &&
      v.harm_in_visitor_messages === false &&
      v.is_pushback === true,
  );

  // Dedupe by conversation_id — latest judged_at wins.
  const byId = new Map<string, ArgueJudgeVerdict>();
  for (const v of filtered) {
    const existing = byId.get(v.conversation_id);
    if (!existing || v.judged_at > existing.judged_at) {
      byId.set(v.conversation_id, v);
    }
  }
  const deduped = Array.from(byId.values());

  // Sort by judge_confidence desc.
  deduped.sort((a, b) => b.judge_confidence - a.judge_confidence);

  const count = deduped.length;
  const landed = deduped.filter((v) => v.landed === true).length;
  const excerpts = deduped
    .filter((v) => v.excerpt !== null)
    .slice(0, TOP_EXCERPTS)
    .map((v) => v.excerpt as string);

  return { count, landed, excerpts };
}
