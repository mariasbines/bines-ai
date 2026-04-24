import {
  getAnthropicClient,
  FILTER_MODEL,
  FILTER_MAX_TOKENS,
} from '@/lib/chat/anthropic';
import { ARGUE_VERDICT, type ArgueVerdict } from '@/lib/argue-log/schema';

/**
 * Haiku pre-flight classifier. Takes the incoming conversation and emits
 * a structured verdict (harm + off_brand + optional reasoning).
 *
 * Fail-open policy (ARGUE-SEC-002): on ANY failure — timeout, parse error,
 * schema mismatch, SDK throw, missing API key — return
 * { harm: 'none', off_brand: [], reasoning: 'classifier_error' }
 * and log `[argue-filter] classifier-error: <reason>` to console.error.
 *
 * Anthropic outage MUST NOT DOS the chat. The tightened Sonnet prompt
 * from story 002.003 is the independent belt-and-braces deflection layer.
 */

const TIMEOUT_MS = 3_000;

const FAIL_OPEN_VERDICT: ArgueVerdict = {
  harm: 'none',
  off_brand: [],
  reasoning: 'classifier_error',
};

const CLASSIFIER_SYSTEM_PROMPT = `You classify conversations for a personal website's chat. Return JSON only. Never include prose, code fences, or markdown.

JSON shape:
{
  "harm": "none" | "hate" | "threat" | "sexual" | "violence" | "self_harm",
  "off_brand": Array<"electoral_politics" | "hot_button_social" | "race_identity_politics" | "religion" | "named_private_people" | "family_beyond_site" | "conspiracy_crypto_hype">,
  "reasoning": string (optional, max 500 chars)
}

off_brand categories:
- electoral_politics — parties, candidates, voting advice, elections
- hot_button_social — abortion, gun control, immigration policy, trans debate
- race_identity_politics — race as identity politics (NOT the lived-experience side)
- religion — doctrine, practice, which faith is correct
- named_private_people — specific real people beyond what Maria has published on the site (excludes passing cultural references; think "what do you think of Dario Amodei as a CEO")
- family_beyond_site — Maria's family members beyond what the site already discloses (husband's employer, sister's address, etc.)
- conspiracy_crypto_hype — pump-and-dump culture, price predictions, flat earth

Err toward allow on borderline turns. Only flag off_brand when the topic is clearly in one of the seven categories. Legitimate work / tech / AI / life questions get harm:'none' + off_brand:[] + clean.

Be strict on harm — real threats, hate speech, sexual content, violence, self-harm go in the harm field.

Return ONLY the JSON object. No prefix. No suffix. No explanation.`;

function logErr(reason: string, extra?: unknown): void {
  if (extra !== undefined) {
    console.error(`[argue-filter] classifier-error: ${reason}`, extra);
  } else {
    console.error(`[argue-filter] classifier-error: ${reason}`);
  }
}

/**
 * Classify a conversation. See module doc for fail-open semantics.
 */
export async function classifyConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ArgueVerdict> {
  // Get the SDK client. Missing API key → fail-open (the route surfaces
  // 500 upstream first in practice, but defence-in-depth).
  let client;
  try {
    client = getAnthropicClient();
  } catch (err) {
    logErr('no-client', err instanceof Error ? err.name : 'unknown');
    return FAIL_OPEN_VERDICT;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // The classifier receives the conversation as a single user message.
    // Sending the actual `messages` array would give Haiku the chance to
    // treat earlier "assistant" turns as authoritative — we want it to
    // judge the whole thing as one artefact.
    const conversationJson = JSON.stringify(messages);

    const response = await client.messages.create(
      {
        model: FILTER_MODEL,
        max_tokens: FILTER_MAX_TOKENS,
        system: CLASSIFIER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Conversation to classify:\n${conversationJson}`,
          },
        ],
      },
      { signal: controller.signal },
    );

    clearTimeout(timer);

    // Extract text from the first text block in the response.
    const content = (response as { content?: Array<{ type?: string; text?: string }> }).content;
    if (!Array.isArray(content) || content.length === 0) {
      logErr('empty-content');
      return FAIL_OPEN_VERDICT;
    }
    const textBlock = content.find((b) => b?.type === 'text');
    const raw = textBlock?.text;
    if (typeof raw !== 'string' || raw.length === 0) {
      logErr('no-text-block');
      return FAIL_OPEN_VERDICT;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logErr('json-parse');
      return FAIL_OPEN_VERDICT;
    }

    const validated = ARGUE_VERDICT.safeParse(parsed);
    if (!validated.success) {
      logErr('schema-invalid');
      return FAIL_OPEN_VERDICT;
    }

    return validated.data;
  } catch (err) {
    clearTimeout(timer);
    const name = err instanceof Error ? err.name : 'unknown';
    if (name === 'AbortError') {
      logErr('timeout');
    } else {
      logErr('sdk-error', name);
    }
    return FAIL_OPEN_VERDICT;
  }
}
