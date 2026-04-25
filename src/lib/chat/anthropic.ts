import Anthropic from '@anthropic-ai/sdk';

/**
 * Lazy Anthropic-client accessor. Reads `ANTHROPIC_API_KEY` at call time,
 * NOT at module load — so unset env vars don't crash the build.
 *
 * The key is read ONLY here and ONLY on the server (edge runtime).
 * Never import this module from a client component (SEC-005).
 */
export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not configured; chat endpoint cannot function.');
  }
  return new Anthropic({ apiKey: key });
}

/**
 * Env-tunable model. Maria can override via Vercel env var without redeploy.
 * Defaults to claude-sonnet-4-6 (architecture-doc choice; see 03-architecture.md).
 * If the short form resolves incorrectly, set CHAT_MODEL to the fully-qualified
 * dated model id (e.g. "claude-sonnet-4-6-20250115").
 */
export const DEFAULT_MODEL = process.env.CHAT_MODEL ?? 'claude-sonnet-4-6';

/**
 * Per-response token cap. ~250 words. The system prompt aims 40-120 words;
 * 350 is the hard ceiling. Tightened post-launch — Hemingway voice, plus
 * SEC-002 cost amplification mitigation.
 */
export const MAX_TOKENS = 350;

/**
 * Haiku pre-flight classifier model (story 002.004).
 *
 * Env-tunable. Defaults to the current Haiku generation. Used by
 * src/lib/argue-filter/haiku.ts to classify incoming conversations as
 * off-brand / harm / clean before the Sonnet stream fires.
 */
export const FILTER_MODEL = process.env.FILTER_MODEL ?? 'claude-haiku-4-5';

/**
 * Max tokens for the classifier response. The verdict is a small JSON
 * object; 256 gives comfortable headroom without wasting spend
 * (ARGUE-OPS-002 cost mitigation).
 */
export const FILTER_MAX_TOKENS = 256;
