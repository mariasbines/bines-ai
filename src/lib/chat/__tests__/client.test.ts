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

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  vi.restoreAllMocks();
});

describe('postChat', () => {
  it('returns ok:true and invokes onDelta for each text_delta frame', async () => {
    mockFetchResponse(
      200,
      [
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}',
        '',
      ].join('\n'),
    );
    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.join('')).toBe('Hello world');
  });

  it('skips non-text_delta frames silently', async () => {
    mockFetchResponse(
      200,
      ['data: {"type":"message_start"}', 'data: {"type":"ping"}', ''].join('\n'),
    );
    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.length).toBe(0);
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

  it('skips malformed JSON frames silently', async () => {
    mockFetchResponse(
      200,
      [
        'data: {malformed json',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}',
        '',
      ].join('\n'),
    );
    const deltas: string[] = [];
    const r = await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: (t) => deltas.push(t),
    });
    expect(r.ok).toBe(true);
    expect(deltas.join('')).toBe('ok');
  });
});
