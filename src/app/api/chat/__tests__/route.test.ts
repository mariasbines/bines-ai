import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Anthropic so we never call the real API. Must be a proper class for `new`.
const mockStream = {
  toReadableStream: vi.fn(() => new ReadableStream({ start(c) { c.close(); } })),
};
const mockMessagesStream = vi.fn<(args: unknown) => typeof mockStream>(() => mockStream);

class MockAnthropic {
  public messages = { stream: mockMessagesStream };
}

vi.mock('@anthropic-ai/sdk', () => {
  return { default: MockAnthropic, Anthropic: MockAnthropic };
});

import { __resetRatelimitForTests } from '@/lib/chat/rate-limit';

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  __resetRatelimitForTests();
  mockMessagesStream.mockClear();
  mockMessagesStream.mockImplementation(() => mockStream);
  mockStream.toReadableStream.mockClear();
});

afterEach(() => {
  __resetRatelimitForTests();
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  if (ORIG_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIG_URL;
  if (ORIG_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIG_TOKEN;
});

async function callRoute(body: unknown, headers: HeadersInit = {}): Promise<Response> {
  const { POST } = await import('../route');
  return POST(
    new Request('http://test.local/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

function firstCallArg(): Record<string, unknown> {
  const calls = mockMessagesStream.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[0][0] as Record<string, unknown>;
}

describe('POST /api/chat', () => {
  it('returns 400 for invalid JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const res = await callRoute('{not json');
    expect(res.status).toBe(400);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    const body = await res.json();
    expect(body.category).toBe('input');
  });

  it('returns 400 for missing messages field', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const res = await callRoute({});
    expect(res.status).toBe(400);
  });

  it('returns 413 for over-length message', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const res = await callRoute({
      messages: [{ role: 'user', content: 'x'.repeat(4001) }],
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.category).toBe('input');
  });

  it('returns 500 when ANTHROPIC_API_KEY is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await callRoute({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    const body = await res.json();
    expect(body.category).toBe('upstream');
  });

  it('returns a streaming response on valid input', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const res = await callRoute({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(mockMessagesStream).toHaveBeenCalledOnce();
    const args = firstCallArg();
    expect(args.max_tokens).toBe(1024);
    expect(typeof args.system).toBe('string');
    expect(args.model).toBeDefined();
  });

  it('passes messages through to the stream call after truncation', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `m${i}`,
    }));
    await callRoute({ messages });
    const args = firstCallArg();
    expect((args.messages as unknown[]).length).toBe(10); // MAX_TURNS
  });

  it('returns 500 with "upstream" category when stream throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockMessagesStream.mockImplementationOnce(() => {
      throw new Error('network flap');
    });
    const res = await callRoute({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.category).toBe('upstream');
  });
});
