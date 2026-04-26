import { z } from 'zod';

/**
 * Single source of truth for the verdict excerpt cap.
 *
 * The judge's system prompt (`prompt.ts`) instructs Sonnet to emit excerpts
 * ≤240 chars. The schema below enforces it at parse time. Story 003.007 will
 * import this same constant for component-side truncation in
 * `<PushbackSummary>`. Defence-in-depth at three layers — model, schema,
 * component — anchored on one constant so they can never drift.
 */
export const EXCERPT_MAX_CHARS = 240;

/**
 * One judge verdict — produced by `runner.ts`, persisted by `storage.ts`,
 * filtered + ranked by `loader.ts`. Stored as a single JSONL line under
 * `argue-judges/YYYY-MM-DD.jsonl` in Vercel Blob.
 *
 * `schema_version: 1` literal enables future-drift detection (matches the
 * argue-log pattern). `from_slug` is **nullable**, not optional — explicitly
 * recording "no origin" simplifies the build-time loader filter (architecture
 * §Components / `schema.ts`).
 *
 * Server-controlled fields (`schema_version`, `conversation_id`, `from_slug`,
 * `judged_at`, `judge_model`) are filled in by `runner.ts` AFTER JSON-parsing
 * Sonnet's response — so a hostile model cannot override them.
 */
export const ARGUE_JUDGE_VERDICT = z.object({
  schema_version: z.literal(1),
  conversation_id: z.string().uuid(),
  from_slug: z.string().nullable(),
  judged_at: z.iso.datetime(),
  judge_model: z.string(),
  judge_confidence: z.number().min(0).max(1),
  is_pushback: z.boolean(),
  landed: z.boolean(),
  excerpt: z.string().max(EXCERPT_MAX_CHARS).nullable(),
  harm_in_visitor_messages: z.boolean(),
  reasoning: z.string().max(500).optional(),
});
export type ArgueJudgeVerdict = z.infer<typeof ARGUE_JUDGE_VERDICT>;
