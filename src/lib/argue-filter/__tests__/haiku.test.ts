import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock the Anthropic SDK. `messages.create` is the classifier entrypoint.
 * Per-test overrides use `mockMessagesCreate.mockImplementationOnce(...)`.
 *
 * vi.mock is hoisted above imports — the factory must be self-contained,
 * so we capture the mock function via vi.hoisted() and reference it both
 * inside the factory and in the test body.
 */
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    public messages = { create: mockMessagesCreate };
  }
  return { default: MockAnthropic, Anthropic: MockAnthropic };
});

import { classifyConversation } from '../haiku';

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockMessagesCreate.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
});

/**
 * Build an Anthropic-shaped successful response given the JSON body the
 * classifier should have returned.
 */
function mockResponse(text: string) {
  return {
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
  };
}

describe('classifyConversation — success path', () => {
  it('returns the parsed verdict on a valid JSON + valid shape response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          harm: 'none',
          off_brand: ['electoral_politics'],
          reasoning: 'user asked who to vote for',
        }),
      ),
    );

    const verdict = await classifyConversation([
      { role: 'user', content: 'who should I vote for?' },
    ]);

    expect(verdict.harm).toBe('none');
    expect(verdict.off_brand).toEqual(['electoral_politics']);
    expect(verdict.reasoning).toBe('user asked who to vote for');
  });

  it('calls the SDK exactly once per invocation', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ harm: 'none', off_brand: [] })),
    );

    await classifyConversation([{ role: 'user', content: 'hi' }]);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('passes the FILTER_MODEL + FILTER_MAX_TOKENS to the SDK call', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ harm: 'none', off_brand: [] })),
    );

    await classifyConversation([{ role: 'user', content: 'hi' }]);
    const args = mockMessagesCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(args.model).toBe('claude-haiku-4-5');
    expect(args.max_tokens).toBe(256);
    expect(typeof args.system).toBe('string');
    // System prompt instructs JSON-only, err-toward-allow.
    expect(args.system).toMatch(/JSON/i);
  });
});

describe('classifyConversation — fail-open paths (AC-003, AC-011)', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  function assertFailOpenAndLogged(v: Awaited<ReturnType<typeof classifyConversation>>) {
    expect(v).toEqual({
      harm: 'none',
      off_brand: [],
      reasoning: 'classifier_error',
    });
    const calls = errSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const matched = calls.some((args: unknown[]) =>
      String(args[0] ?? '').startsWith('[argue-filter] classifier-error'),
    );
    expect(matched).toBe(true);
  }

  it('fails open on SDK timeout / AbortError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );

    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });

  it('fails open on arbitrary SDK throw', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('network flap'));

    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });

  it('fails open on non-JSON response text', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      mockResponse('here is a prose answer, not JSON'),
    );

    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });

  it('fails open on valid JSON but invalid shape', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      mockResponse(
        JSON.stringify({
          harm: 'not_a_valid_harm_category',
          off_brand: [],
        }),
      ),
    );

    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });

  it('fails open on empty content array', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [],
      stop_reason: 'end_turn',
    });

    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });

  it('fails open on missing ANTHROPIC_API_KEY without throwing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const v = await classifyConversation([{ role: 'user', content: 'hi' }]);
    assertFailOpenAndLogged(v);
  });
});

describe('classifyConversation — timeout behaviour', () => {
  it('aborts the request after 3 seconds (observed via AbortController.signal)', async () => {
    let capturedSignal: AbortSignal | undefined;
    mockMessagesCreate.mockImplementation(
      async (_args: unknown, opts?: { signal?: AbortSignal }) => {
        capturedSignal = opts?.signal;
        return await new Promise((_, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        });
      },
    );

    vi.useFakeTimers();

    try {
      const errSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const promise = classifyConversation([{ role: 'user', content: 'hi' }]);

      await vi.advanceTimersByTimeAsync(3_100);
      const v = await promise;

      expect(v.reasoning).toBe('classifier_error');
      expect(capturedSignal?.aborted).toBe(true);
      errSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });
});
