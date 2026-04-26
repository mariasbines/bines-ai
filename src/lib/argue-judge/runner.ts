import { getAnthropicClient, DEFAULT_MODEL } from '@/lib/chat/anthropic';
import type { Turn } from '@/lib/argue-log/schema';
import { buildJudgePrompt } from './prompt';
import { ARGUE_JUDGE_VERDICT, type ArgueJudgeVerdict } from './schema';

const JUDGE_MAX_TOKENS = 512;
const JUDGE_TIMEOUT_MS = 8_000;

export interface JudgeOptions {
  /** Override "now" for deterministic `judged_at` in tests. */
  now?: Date;
  /** External signal — composed with the internal 8s timeout. */
  signal?: AbortSignal;
}

/**
 * Run the Sonnet judge over a conversation's turns and return a validated
 * verdict.
 *
 * Implementation notes:
 *  - Uses `messages.create` (not stream) — verdict is small, single-shot.
 *  - Forces JSON output via the system prompt; parses + Zod-validates.
 *  - 8-second timeout via AbortController. Caller can also pass a signal
 *    that aborts independently.
 *  - **Fail-shut**: every error path throws. Callers (run + sweep routes)
 *    catch + log + skip. There is no default verdict — a missed judgment
 *    means the conversation contributes nothing to the public summary.
 *  - Server-controlled fields (`schema_version`, `conversation_id`,
 *    `from_slug`, `judged_at`, `judge_model`) are filled in AFTER JSON.parse
 *    so a hostile model cannot override them.
 */
export async function judgeConversation(
  conversation_id: string,
  from_slug: string | null,
  turns: Turn[],
  options: JudgeOptions = {},
): Promise<ArgueJudgeVerdict> {
  const { system, user } = buildJudgePrompt(turns, from_slug);
  const client = getAnthropicClient();
  const now = options.now ?? new Date();

  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onCallerAbort, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);

  let response;
  try {
    response = await client.messages.create(
      {
        model: DEFAULT_MODEL,
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: JUDGE_MAX_TOKENS,
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) options.signal.removeEventListener('abort', onCallerAbort);
  }

  // First text content block. Anthropic SDK returns content as an array of
  // typed blocks (`text`, `tool_use`, etc.). Pick the first text block.
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('judge response: no text content block');
  }
  const raw = block.text;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('judge response: not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('judge response: not a JSON object');
  }

  // Server-controlled fields override anything the model may have stuffed in.
  const candidate = {
    ...(parsed as Record<string, unknown>),
    schema_version: 1,
    conversation_id,
    from_slug,
    judged_at: now.toISOString(),
    judge_model: DEFAULT_MODEL,
  };

  return ARGUE_JUDGE_VERDICT.parse(candidate);
}
