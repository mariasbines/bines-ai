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
 * Build a one-shot `ReadableStream` whose body matches the Anthropic SDK's
 * SSE stream shape, so the refusal surfaces to the client exactly as if it
 * had come out of `client.messages.stream(...)`.
 *
 * Frame shape — consumed by src/lib/chat/client.ts which looks for lines
 * beginning `data: ` and parses the JSON:
 *
 *   data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"<REFUSAL_TEXT>"}}
 *
 *   data: {"type":"message_stop"}
 *
 * A single-chunk enqueue keeps the implementation deterministic and the test
 * straightforward. The client parses line-by-line regardless, so chunking is
 * a non-concern.
 *
 * Pure function: no env reads, no side effects, no network.
 */
export function refusalEventStream(): ReadableStream<Uint8Array> {
  const deltaFrame = {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: REFUSAL_TEXT },
  };
  const stopFrame = { type: 'message_stop' };

  const body =
    `data: ${JSON.stringify(deltaFrame)}\n\n` +
    `data: ${JSON.stringify(stopFrame)}\n\n`;

  const bytes = new TextEncoder().encode(body);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
