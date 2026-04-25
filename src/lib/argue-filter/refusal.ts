/**
 * The single locked refusal string. Shown to a visitor verbatim when the
 * Haiku pre-flight classifier (wired in 002.004) flags a conversation as
 * off-brand for any of the seven Q6 categories defined in the argue-hardening
 * epic.
 *
 * Voice rules (from docs/argue-voice-check.md rubric):
 *   - lowercase opener
 *   - no corporate hedging
 *   - no apology-stacking
 *   - carries a question-hook ending
 *   - doesn't lecture
 *
 * SINGLE SOURCE OF TRUTH. The system prompt (src/lib/chat/system-prompt.ts)
 * describes the *shape* of the refusal but does NOT duplicate this string —
 * prompt-injection attacks that exfiltrate the system prompt shouldn't hand
 * out the exact refusal copy, and copy-drift between two locations would
 * silently bifurcate the filter's voice.
 *
 * Locked for v1. Rotation / variation is a post-launch follow-up.
 */
export const REFUSAL_TEXT =
  "not my lane — maria doesn't have a public position on this, and i don't invent them. what else have you got?";

/**
 * One-shot ReadableStream emitting REFUSAL_TEXT as raw UTF-8 bytes. The
 * /api/chat route streams plain text — no framing, no JSON envelope — so
 * the refusal path produces the same wire shape as the Sonnet path.
 */
export function refusalStream(): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(REFUSAL_TEXT);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
