import { describe, it, expect } from 'vitest';
import { matchEasterEgg, easterEggStream } from '../easter-egg';

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(merged);
}

describe('matchEasterEgg — brownie', () => {
  it('matches "give me a brownie recipe"', () => {
    const m = matchEasterEgg([{ role: 'user', content: 'give me a brownie recipe' }]);
    expect(m?.id).toBe('brownie');
  });

  it('matches "how do you make brownies?"', () => {
    const m = matchEasterEgg([{ role: 'user', content: 'how do you make brownies?' }]);
    expect(m?.id).toBe('brownie');
  });

  it('matches "what is the best brownie recipe"', () => {
    const m = matchEasterEgg([
      { role: 'user', content: 'what is the best brownie recipe' },
    ]);
    expect(m?.id).toBe('brownie');
  });

  it('matches "Brownie" case-insensitively', () => {
    const m = matchEasterEgg([{ role: 'user', content: 'Brownie' }]);
    expect(m?.id).toBe('brownie');
  });

  it('only inspects the latest user turn', () => {
    const m = matchEasterEgg([
      { role: 'user', content: 'tell me about brownies' },
      { role: 'assistant', content: 'tested every chatbot...' },
      { role: 'user', content: 'how about politics instead' },
    ]);
    expect(m).toBeNull();
  });

  it('returns null when no brownie mention', () => {
    const m = matchEasterEgg([
      { role: 'user', content: 'argue with me about memory' },
    ]);
    expect(m).toBeNull();
  });

  it('returns null when the only user mention is in an old turn', () => {
    const m = matchEasterEgg([
      { role: 'user', content: 'brownies please' },
      { role: 'assistant', content: 'tested...' },
      { role: 'user', content: 'fine, what about AI in finance' },
    ]);
    expect(m).toBeNull();
  });

  it('does NOT match "browning" (word-boundary safety)', () => {
    const m = matchEasterEgg([
      { role: 'user', content: 'browning meat for stew' },
    ]);
    expect(m).toBeNull();
  });

  it('returns the canonical cheeky response on match', () => {
    const m = matchEasterEgg([{ role: 'user', content: 'best brownie recipe' }]);
    expect(m?.response).toMatch(/tested every chatbot/);
    expect(m?.response).toMatch(/butter, sugar, cocoa, eggs, flour/);
    expect(m?.response).toMatch(/argue with me about something else/);
  });

  it('response starts lowercase (voice rule)', () => {
    const m = matchEasterEgg([{ role: 'user', content: 'brownies' }]);
    const first = m?.response.charAt(0) ?? '';
    expect(first).toBe(first.toLowerCase());
  });
});

describe('easterEggStream', () => {
  it('emits exactly the supplied text as UTF-8 bytes', async () => {
    const text = 'cheeky line';
    expect(await drainStream(easterEggStream(text))).toBe(text);
  });

  it('emits no framing', async () => {
    const body = await drainStream(easterEggStream('hi'));
    expect(body).not.toMatch(/^data: /);
    expect(body).not.toMatch(/"type":/);
  });
});
