import { describe, it, expect } from 'vitest';
import { REFUSAL_TEXT, refusalStream } from '../refusal';

const EXPECTED =
  "not my lane — maria doesn't have a public position on this, and i don't invent them. what else have you got?";

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  // Confirm the stream closes cleanly — a second read must yield done:true.
  const after = await reader.read();
  expect(after.done).toBe(true);

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(merged);
}

describe('REFUSAL_TEXT', () => {
  it('is the exact locked string (AC-001, AC-006)', () => {
    expect(REFUSAL_TEXT).toBe(EXPECTED);
  });

  it('is lowercase and British-English (AC-006, AC-005 rubric (a))', () => {
    expect(REFUSAL_TEXT.charAt(0)).toBe(REFUSAL_TEXT.charAt(0).toLowerCase());
    expect(REFUSAL_TEXT.charAt(0)).not.toBe(
      REFUSAL_TEXT.charAt(0).toUpperCase(),
    );
  });
});

describe('refusalStream()', () => {
  it('returns a ReadableStream', () => {
    const s = refusalStream();
    expect(s).toBeInstanceOf(ReadableStream);
  });

  it('emits exactly REFUSAL_TEXT as UTF-8 bytes (AC-007)', async () => {
    const body = await drainStream(refusalStream());
    expect(body).toBe(REFUSAL_TEXT);
  });

  it('contains no framing or JSON envelope (AC-002)', async () => {
    const body = await drainStream(refusalStream());
    expect(body).not.toMatch(/^data: /);
    expect(body).not.toMatch(/"type":/);
  });

  it('closes cleanly after the final chunk', async () => {
    // drainStream() asserts `done:true` on the trailing read.
    await drainStream(refusalStream());
  });
});
