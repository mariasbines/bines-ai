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

