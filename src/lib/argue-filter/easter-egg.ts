/**
 * Pre-filter easter eggs. Matched against the latest user turn before the
 * Haiku classifier and Sonnet stream — bypasses both, returns a fixed line,
 * burns zero model tokens.
 *
 * Add new eggs by adding to the EGGS array. Each egg is a single regex
 * matched against the most recent user message; first match wins.
 */

const EGGS: Array<{ id: string; pattern: RegExp; response: string }> = [
  {
    id: 'brownie',
    pattern: /\bbrownies?\b/i,
    response:
      "tested every chatbot. tried it on me. fine — butter, sugar, cocoa, eggs, flour. bake. now argue with me about something else.",
  },
];

export interface EasterEggMatch {
  id: string;
  response: string;
}

/**
 * Inspect the most recent user turn. Returns the matched egg, or null.
 */
export function matchEasterEgg(
  messages: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>,
): EasterEggMatch | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    for (const egg of EGGS) {
      if (egg.pattern.test(m.content)) {
        return { id: egg.id, response: egg.response };
      }
    }
    return null;
  }
  return null;
}

/**
 * One-shot ReadableStream emitting `text` as raw UTF-8 bytes. Same wire
 * shape as the Sonnet streaming path — no framing.
 */
export function easterEggStream(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
