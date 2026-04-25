import { describe, it, expect, vi, afterEach } from 'vitest';
import { postChat } from '../client';

const ORIG_FETCH = globalThis.fetch;

function mockFetchResponse(status: number, body: string): void {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(new Response(stream, { status })),
  ) as unknown as typeof fetch;
}

function mockFetchChunks(status: number, chunks: string[]): void {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(new Response(stream, { status })),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  vi.restoreAllMocks();
});

describe('postChat', () => {
  it('returns ok:true and forwards each chunk verbatim to onDelta', async () => {
    mockFetchChunks(200, ['Hello ', 'world']);
    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.join('')).toBe('Hello world');
  });

  it('handles a single-chunk response', async () => {
    mockFetchResponse(200, 'one shot');
    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.join('')).toBe('one shot');
  });

  it('handles multi-byte UTF-8 split across chunk boundaries', async () => {
    // The em-dash (U+2014) is 3 bytes in UTF-8: 0xE2 0x80 0x94. Split it
    // mid-codepoint to verify TextDecoder streaming holds the partial bytes
    // until the next chunk completes the codepoint.
    const fullText = 'a — b';
    const allBytes = new TextEncoder().encode(fullText);
    const split = 2; // mid-emdash
    const part1 = allBytes.slice(0, split);
    const part2 = allBytes.slice(split);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(part1);
        controller.enqueue(part2);
        controller.close();
      },
    });
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(stream, { status: 200 })),
    ) as unknown as typeof fetch;

    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.join('')).toBe(fullText);
  });

  it('maps 429 to rate-limited errorCode', async () => {
    mockFetchResponse(429, '{"error":"rate"}');
    const r = await postChat([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('rate-limited');
  });

  it('maps 5xx to upstream errorCode', async () => {
    mockFetchResponse(500, '{"error":"upstream"}');
    const r = await postChat([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('upstream');
  });

  it('maps network failure to network errorCode', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network'))) as unknown as typeof fetch;
    const r = await postChat([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('network');
  });

  it('returns ok:false with no errorCode on AbortError', async () => {
    globalThis.fetch = vi.fn(() => {
      const e = new Error('aborted');
      (e as { name?: string }).name = 'AbortError';
      return Promise.reject(e);
    }) as unknown as typeof fetch;
    const r = await postChat([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBeUndefined();
  });
});
