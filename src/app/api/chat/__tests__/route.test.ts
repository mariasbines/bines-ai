import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type StreamEvent =
  | {
      type: 'content_block_delta';
      index: number;
      delta: { type: 'text_delta'; text: string };
    }
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: 'ping' };

function makeIterableStream(events: StreamEvent[]) {
  return {
    [Symbol.asyncIterator]: () => {
      let i = 0;
      return {
        async next() {
          if (i < events.length) return { value: events[i++], done: false };
          return { value: undefined, done: true };
        },
        async return() {
          i = events.length;
          return { value: undefined, done: true };
        },
      };
    },
  };
}

function deltaEvents(...texts: string[]): StreamEvent[] {
  const out: StreamEvent[] = [{ type: 'message_start' }];
  for (const text of texts) {
    out.push({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    });
  }
  out.push({ type: 'message_stop' });
  return out;
}

// Hoist mocks so vi.mock factories can reference them.
const {
  mockMessagesStream,
  mockMessagesCreate,
  mockAppendArgueLog,
  afterCallbacks,
  mockAfter,
} = vi.hoisted(() => {
  const afterCallbacks: Array<() => Promise<void> | void> = [];
  return {
    mockMessagesStream: vi.fn<(args: unknown) => unknown>(),
    mockMessagesCreate: vi.fn(),
    mockAppendArgueLog: vi.fn(),
    afterCallbacks,
    mockAfter: vi.fn((cb: () => Promise<void> | void) => {
      afterCallbacks.push(cb);
    }),
  };
});

// Anthropic SDK mock — supports both `messages.stream` (Sonnet path) and
// `messages.create` (Haiku classifier path).
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    public messages = {
      stream: mockMessagesStream,
      create: mockMessagesCreate,
    };
  }
  return { default: MockAnthropic, Anthropic: MockAnthropic };
});

// Argue-log storage mock — route should `after(() => appendArgueLog(entry))`.
vi.mock('@/lib/argue-log/storage', () => ({
  appendArgueLog: mockAppendArgueLog,
}));

// next/server — preserve all other exports, only stub `after`.
vi.mock('next/server', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return { ...mod, after: mockAfter };
});

import { __resetRatelimitForTests } from '@/lib/chat/rate-limit';

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIG_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ORIG_SALT = process.env.ARGUE_LOG_IP_SALT_CURRENT;

// A valid classifier response that the route should treat as "on-brand".
function onBrandClassifierResponse() {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ harm: 'none', off_brand: [] }),
      },
    ],
  };
}

function offBrandClassifierResponse(category: string = 'electoral_politics') {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          harm: 'none',
          off_brand: [category],
          reasoning: 'user asked about politics',
        }),
      },
    ],
  };
}

beforeEach(() => {
  __resetRatelimitForTests();
  mockMessagesStream.mockClear();
  // Default: an empty event-stream so route closes cleanly without errors.
  mockMessagesStream.mockImplementation(() => makeIterableStream([]));
  mockMessagesCreate.mockReset();
  mockMessagesCreate.mockResolvedValue(onBrandClassifierResponse());
  mockAppendArgueLog.mockReset();
  mockAppendArgueLog.mockResolvedValue(undefined);
  afterCallbacks.length = 0;
  mockAfter.mockClear();
  // Salt is required for all tests except the dedicated "missing salt" one.
  process.env.ARGUE_LOG_IP_SALT_CURRENT = 'a'.repeat(64);
});

afterEach(() => {
  __resetRatelimitForTests();
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  if (ORIG_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = ORIG_URL;
  if (ORIG_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = ORIG_TOKEN;
  if (ORIG_SALT === undefined) delete process.env.ARGUE_LOG_IP_SALT_CURRENT;
  else process.env.ARGUE_LOG_IP_SALT_CURRENT = ORIG_SALT;
});

async function callRoute(
  body: unknown,
  headers: HeadersInit = {},
): Promise<Response> {
  const { POST } = await import('../route');
  return POST(
    new Request('http://test.local/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

function firstStreamCallArg(): Record<string, unknown> {
  const calls = mockMessagesStream.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[0][0] as Record<string, unknown>;
}

/**
 * Drain a refusal / Sonnet stream response into a string.
 */
async function bodyOf(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

// Existing tests — these must continue to pass.
describe('POST /api/chat — existing behaviour (regression guard)', () => {
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

  it('returns a streaming response on valid on-brand input', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const res = await callRoute({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(mockMessagesStream).toHaveBeenCalledOnce();
    const args = firstStreamCallArg();
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
    const args = firstStreamCallArg();
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

// Story 002.004 new behaviour.

describe('POST /api/chat — argue-hardening filter (story 002.004)', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  describe('AC-004(d) salt-unconfigured 500-upstream', () => {
    it('returns 500 upstream when ARGUE_LOG_IP_SALT_CURRENT is unset', async () => {
      delete process.env.ARGUE_LOG_IP_SALT_CURRENT;
      const errSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const res = await callRoute({
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(res.status).toBe(500);
      expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
      const body = await res.json();
      expect(body.category).toBe('upstream');
      const calls = errSpy.mock.calls;
      expect(
        calls.some((args) =>
          String(args[0] ?? '').includes('salt-unconfigured'),
        ),
      ).toBe(true);
      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(mockMessagesStream).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe('AC-004(a) off-brand verdict → refusal + log', () => {
    it('returns refusal text and schedules after() with refused:true', async () => {
      mockMessagesCreate.mockResolvedValueOnce(offBrandClassifierResponse());

      const res = await callRoute({
        messages: [{ role: 'user', content: 'who should I vote for?' }],
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(res.headers.get('X-Governed-By')).toBe('bines.ai');

      const body = await bodyOf(res);
      expect(body).toMatch(/not my lane/);
      // No SSE/JSON envelope — body is exactly the refusal copy.
      expect(body).not.toMatch(/^data: /);
      expect(body).not.toMatch(/"type":/);

      expect(mockMessagesStream).not.toHaveBeenCalled();
      expect(mockAfter).toHaveBeenCalledTimes(1);

      await afterCallbacks[0]();
      expect(mockAppendArgueLog).toHaveBeenCalledTimes(1);
      const entry = mockAppendArgueLog.mock.calls[0][0];
      expect(entry.refused).toBe(true);
      expect(entry.verdict.off_brand).toContain('electoral_politics');
      expect(entry.model).toBe('');
      expect(entry.turns).toEqual([
        { role: 'user', content: 'who should I vote for?' },
      ]);
      expect(entry.latency_ms.stream).toBeNull();
      expect(entry.salt_version).toBe('current');
      expect(entry.schema_version).toBe(1);
    });
  });

  describe('AC-004(b) on-brand verdict → Sonnet stream + log on close', () => {
    it('streams Sonnet text and schedules after() with the accumulated assistant content', async () => {
      mockMessagesCreate.mockResolvedValueOnce(onBrandClassifierResponse());
      mockMessagesStream.mockImplementationOnce(() =>
        makeIterableStream(deltaEvents('hello', ' world')),
      );

      const res = await callRoute({
        messages: [{ role: 'user', content: 'argue with me' }],
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(mockMessagesStream).toHaveBeenCalledOnce();

      const body = await bodyOf(res);
      // Wire body is the concatenated text deltas, no framing.
      expect(body).toBe('hello world');

      expect(mockAfter).toHaveBeenCalledTimes(1);
      await afterCallbacks[0]();
      expect(mockAppendArgueLog).toHaveBeenCalledTimes(1);
      const entry = mockAppendArgueLog.mock.calls[0][0];
      expect(entry.refused).toBe(false);
      expect(entry.turns).toHaveLength(2);
      expect(entry.turns[0]).toEqual({
        role: 'user',
        content: 'argue with me',
      });
      expect(entry.turns[1]).toEqual({
        role: 'assistant',
        content: 'hello world',
      });
      expect(entry.verdict.off_brand).toEqual([]);
      expect(entry.model).toBeDefined();
      expect(entry.model).not.toBe('');
      expect(entry.latency_ms.pre_flight).toBeTypeOf('number');
    });
  });

  describe('AC-004(c) classifier error → fail-open → Sonnet stream', () => {
    it('proceeds to Sonnet with classifier_error reasoning when Haiku throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('network flap'));
      const errSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockMessagesStream.mockImplementationOnce(() =>
        makeIterableStream(deltaEvents('reply')),
      );

      const res = await callRoute({
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(res.status).toBe(200);
      expect(mockMessagesStream).toHaveBeenCalledOnce();
      expect(await bodyOf(res)).toBe('reply');

      await afterCallbacks[0]();
      const entry = mockAppendArgueLog.mock.calls[0][0];
      expect(entry.verdict.reasoning).toBe('classifier_error');
      expect(entry.refused).toBe(false);

      errSpy.mockRestore();
    });
  });

  describe('AC-005 after() called exactly once per request', () => {
    it('happy path: one after()', async () => {
      mockMessagesCreate.mockResolvedValueOnce(onBrandClassifierResponse());
      mockMessagesStream.mockImplementationOnce(() =>
        makeIterableStream(deltaEvents('x')),
      );

      const res = await callRoute({
        messages: [{ role: 'user', content: 'hi' }],
      });
      await bodyOf(res);
      expect(mockAfter).toHaveBeenCalledTimes(1);
    });

    it('refusal path: one after()', async () => {
      mockMessagesCreate.mockResolvedValueOnce(offBrandClassifierResponse());
      const res = await callRoute({
        messages: [{ role: 'user', content: 'who to vote for?' }],
      });
      await bodyOf(res);
      expect(mockAfter).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC-004(f) IP hashing', () => {
    it('produces a 64-hex ip_hash different from the raw IP', async () => {
      mockMessagesCreate.mockResolvedValueOnce(offBrandClassifierResponse());
      const rawIp = '203.0.113.42';
      const res = await callRoute(
        { messages: [{ role: 'user', content: 'electoral question' }] },
        { 'x-forwarded-for': rawIp },
      );
      await bodyOf(res);
      await afterCallbacks[0]();

      const entry = mockAppendArgueLog.mock.calls[0][0];
      expect(entry.ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.ip_hash).not.toContain(rawIp);
    });
  });

  describe('AC-007 rate-limit runs BEFORE classifier', () => {
    it('classifier is not called when message validation fails', async () => {
      const res = await callRoute({ messages: [] });
      expect(res.status).toBe(400);
      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(mockMessagesStream).not.toHaveBeenCalled();
    });
  });

  describe('AC-008 X-Governed-By header everywhere', () => {
    it('refusal path carries X-Governed-By', async () => {
      mockMessagesCreate.mockResolvedValueOnce(offBrandClassifierResponse());
      const res = await callRoute({
        messages: [{ role: 'user', content: 'electoral question' }],
      });
      expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    });

    it('stream path carries X-Governed-By', async () => {
      mockMessagesCreate.mockResolvedValueOnce(onBrandClassifierResponse());
      const res = await callRoute({
        messages: [{ role: 'user', content: 'hi' }],
      });
      expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    });
  });
});
