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

/**
 * Replace globalThis.fetch with a capturing stub returning a 200 stream.
 * Returns a getter for the parsed JSON body of the captured request.
 */
function captureFetchBody(): { getBody: () => Record<string, unknown> | undefined } {
  let captured: Record<string, unknown> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('ok'));
      controller.close();
    },
  });
  globalThis.fetch = vi.fn((_url: unknown, init?: RequestInit) => {
    if (init?.body) captured = JSON.parse(init.body as string);
    return Promise.resolve(new Response(stream, { status: 200 }));
  }) as unknown as typeof fetch;
  return { getBody: () => captured };
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

  // Phase A additions (story 003.001).
  it('omits conversation_id and from_slug from the body when not supplied', async () => {
    const cap = captureFetchBody();
    await postChat([{ role: 'user', content: 'hi' }], { onDelta: () => {} });
    const body = cap.getBody();
    expect(body).toBeDefined();
    expect(body!.messages).toBeDefined();
    expect('conversation_id' in body!).toBe(false);
    expect('from_slug' in body!).toBe(false);
  });

  it('threads conversation_id and from_slug into the body when supplied', async () => {
    const cap = captureFetchBody();
    await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: () => {},
      conversation_id: '11111111-1111-4111-8111-111111111111',
      from_slug: 'fw-01',
    });
    const body = cap.getBody();
    expect(body).toBeDefined();
    expect(body!.conversation_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(body!.from_slug).toBe('fw-01');
  });

  it('threads from_slug: null verbatim (not omitted)', async () => {
    const cap = captureFetchBody();
    await postChat([{ role: 'user', content: 'hi' }], {
      onDelta: () => {},
      from_slug: null,
    });
    const body = cap.getBody();
    expect(body).toBeDefined();
    expect('from_slug' in body!).toBe(true);
    expect(body!.from_slug).toBeNull();
  });
});
