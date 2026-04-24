import { z } from 'zod';

/**
 * Per-turn shape within an argue-log entry.
 * Restricted to user/assistant roles — system prompts are not logged
 * (they live in source code and are redundant per entry).
 */
export const TURN = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type Turn = z.infer<typeof TURN>;

/**
 * Verdict returned by the Haiku classifier (wired in 002.004).
 * `harm` is a single enum; `off_brand` is a (possibly empty) array.
 * `reasoning` is optional, capped at 500 chars to keep log lines bounded.
 */
export const ARGUE_VERDICT = z.object({
  harm: z.enum(['none', 'hate', 'threat', 'sexual', 'violence', 'self_harm']),
  off_brand: z.array(
    z.enum([
      'electoral_politics',
      'hot_button_social',
      'race_identity_politics',
      'religion',
      'named_private_people',
      'family_beyond_site',
      'conspiracy_crypto_hype',
    ]),
  ),
  reasoning: z.string().max(500).optional(),
});
export type ArgueVerdict = z.infer<typeof ARGUE_VERDICT>;

/**
 * One argue-log entry = one full /argue round-trip (user turn → assistant turn
 * or refusal). Written as a single JSONL line to argue-log/YYYY-MM-DD.jsonl.
 * `schema_version: 1` is a literal so v2 drift can be caught at parse-time.
 */
export const ARGUE_LOG_ENTRY = z.object({
  schema_version: z.literal(1),
  timestamp: z.iso.datetime(),
  ip_hash: z.string().length(64),
  salt_version: z.enum(['current', 'previous']),
  turns: z.array(TURN).min(1),
  guard_signals: z.array(z.string()),
  verdict: ARGUE_VERDICT,
  refused: z.boolean(),
  model: z.string(),
  latency_ms: z.object({
    pre_flight: z.number().int().nonnegative(),
    stream: z.number().int().nonnegative().nullable(),
  }),
});
export type ArgueLogEntry = z.infer<typeof ARGUE_LOG_ENTRY>;
