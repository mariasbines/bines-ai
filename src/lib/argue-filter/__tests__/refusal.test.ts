import { describe, it, expect } from 'vitest';
import { REFUSAL_TEXT, refusalEventStream } from '../refusal';

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

/**
 * Mirror of the parse logic in src/lib/chat/client.ts — kept inline so the
 * refusal stream is verified against the same `data: ` + JSON + `text_delta`
 * contract the real client uses, without coupling this test to the client
 * module.
 */
function extractTextDeltas(body: string): string[] {
  const deltas: string[] = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6);
    try {
      const evt = JSON.parse(jsonStr) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (
        evt?.type === 'content_block_delta' &&
        evt?.delta?.type === 'text_delta'
      ) {
        deltas.push(evt.delta.text ?? '');
      }
    } catch {
      // skip
    }
  }
  return deltas;
}

describe('REFUSAL_TEXT', () => {
  it('is the exact locked string (AC-001, AC-006)', () => {
    expect(REFUSAL_TEXT).toBe(EXPECTED);
  });

  it('is lowercase and British-English (AC-006, AC-005 rubric (a))', () => {
    // lowercase opener, no capitalisation of the first letter
    expect(REFUSAL_TEXT.charAt(0)).toBe(REFUSAL_TEXT.charAt(0).toLowerCase());
    expect(REFUSAL_TEXT.charAt(0)).not.toBe(
      REFUSAL_TEXT.charAt(0).toUpperCase(),
    );
  });
});

describe('refusalEventStream()', () => {
  it('returns a ReadableStream', () => {
    const s = refusalEventStream();
    expect(s).toBeInstanceOf(ReadableStream);
  });

  it('emits UTF-8-encoded bytes decodable without error (AC-007)', async () => {
    const body = await drainStream(refusalEventStream());
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(0);
  });

  it('contains a content_block_delta frame carrying REFUSAL_TEXT (AC-007)', async () => {
    const body = await drainStream(refusalEventStream());
    expect(body).toMatch(/"type":"content_block_delta"/);
    expect(body).toMatch(/"type":"text_delta"/);
    // The refusal text survives JSON escaping and re-parsing.
    const deltas = extractTextDeltas(body);
    expect(deltas.join('')).toBe(REFUSAL_TEXT);
  });

  it('emits a message_stop frame after the delta (AC-007)', async () => {
    const body = await drainStream(refusalEventStream());
    expect(body).toMatch(/"type":"message_stop"/);
    const deltaIdx = body.indexOf('content_block_delta');
    const stopIdx = body.indexOf('message_stop');
    expect(deltaIdx).toBeGreaterThanOrEqual(0);
    expect(stopIdx).toBeGreaterThan(deltaIdx);
  });

  it('round-trips through the same parse logic the real client uses (AC-002)', async () => {
    const body = await drainStream(refusalEventStream());
    const deltas = extractTextDeltas(body);
    // One or more text_delta frames that, when concatenated, reproduce the
    // refusal verbatim. Single-chunk is the current implementation; allowing
    // for future multi-chunk by concatenating.
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    expect(deltas.join('')).toBe(REFUSAL_TEXT);
  });

  it('closes cleanly after the final chunk', async () => {
    // drainStream() asserts `done:true` on the trailing read — this is a
    // redundancy for readability. If the stream never closed, drainStream
    // would throw; here we just re-run it to confirm the API shape.
    await drainStream(refusalEventStream());
  });
});
