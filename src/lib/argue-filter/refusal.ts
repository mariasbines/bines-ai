import type { ArgueVerdict } from '@/lib/argue-log/schema';

/**
 * The off-brand refusal — fires when Haiku flags a Q6 category. Voice rules
 * (from docs/argue-voice-check.md): lowercase opener, no corporate hedging,
 * no apology stack, question-hook ending, no lecture.
 *
 * SINGLE SOURCE OF TRUTH for the off-brand refusal copy. The system prompt
 * describes the *shape*, never the exact string.
 */
export const REFUSAL_TEXT =
  "not my lane — maria doesn't have a public position on this, and i don't invent them. what else have you got?";

/**
 * Generic harm refusal — fires when Haiku flags hate / threat / sexual /
 * violence. Curt; doesn't moralise.
 */
export const HARM_REFUSAL_DEFAULT =
  "no. wrong house for that one. try elsewhere.";

/**
 * Self-harm refusal — points the visitor at a real human resource. Samaritans
 * is the right call for the UK audience this site primarily serves.
 */
export const HARM_REFUSAL_SELF_HARM =
  "i'm not the right place for this. please reach out — samaritans.org, 116 123 (UK, free, 24/7). there are real humans on the other end.";

/**
 * Pick the refusal copy for a given verdict. Off-brand wins over harm if
 * both are flagged, because off-brand is the more visible signal and the
 * harm copy is reserved for the hard categories.
 */
export function refusalTextFor(verdict: ArgueVerdict): string | null {
  if (verdict.off_brand.length > 0) return REFUSAL_TEXT;
  if (verdict.harm === 'self_harm') return HARM_REFUSAL_SELF_HARM;
  if (verdict.harm !== 'none') return HARM_REFUSAL_DEFAULT;
  return null;
}

/**
 * One-shot ReadableStream emitting `text` as raw UTF-8 bytes. Same wire
 * shape as the Sonnet streaming path — no framing.
 */
export function refusalStream(text: string = REFUSAL_TEXT): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
