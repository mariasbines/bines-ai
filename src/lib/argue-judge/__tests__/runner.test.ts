import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Turn } from '@/lib/argue-log/schema';

const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    public messages = { create: mockMessagesCreate };
  }
  return { default: MockAnthropic, Anthropic: MockAnthropic };
});

import { judgeConversation } from '../runner';

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

const TURNS: Turn[] = [
  { role: 'user', content: 'why only regulated industries?' },
  { role: 'assistant', content: 'asymmetric cost of error.' },
  { role: 'user', content: 'medicine has the same cost — why is it different?' },
];

const CONV_ID = '11111111-1111-4111-8111-111111111111';
const FIXED_NOW = new Date('2026-04-25T12:00:00Z');

function validJudgeJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    is_pushback: true,
    landed: false,
    excerpt: 'medicine has the same cost — why is it different?',
    harm_in_visitor_messages: false,
    judge_confidence: 0.85,
    ...overrides,
  });
}

function textContentResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  mockMessagesCreate.mockReset();
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  vi.useRealTimers();
});

describe('judgeConversation — happy path', () => {
  it('returns a validated ArgueJudgeVerdict on a well-formed JSON response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(textContentResponse(validJudgeJson()));

    const out = await judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW });

    expect(out.schema_version).toBe(1);
    expect(out.conversation_id).toBe(CONV_ID);
    expect(out.from_slug).toBe('fw-01');
    expect(out.judged_at).toBe(FIXED_NOW.toISOString());
    expect(out.judge_model).toBeDefined();
    expect(out.is_pushback).toBe(true);
    expect(out.judge_confidence).toBe(0.85);
  });

  it('passes the locked system prompt and the wrapped transcript to the SDK', async () => {
    mockMessagesCreate.mockResolvedValueOnce(textContentResponse(validJudgeJson()));

    await judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW });

    expect(mockMessagesCreate).toHaveBeenCalledOnce();
    const [args] = mockMessagesCreate.mock.calls[0];
    expect(args.system).toContain('you are an internal classifier for bines.ai');
    expect(args.messages[0].role).toBe('user');
    expect(args.messages[0].content).toContain('<transcript from_slug="fw-01">');
    expect(args.messages[0].content).toContain('visitor: why only regulated industries?');
    expect(args.max_tokens).toBe(512);
  });

  it('overrides server-controlled fields even if the model tries to stuff its own values in', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      textContentResponse(
        validJudgeJson({
          schema_version: 99,
          conversation_id: 'attacker-supplied',
          from_slug: 'attacker-slug',
          judged_at: '1999-01-01T00:00:00.000Z',
          judge_model: 'attacker-model',
        }),
      ),
    );

    const out = await judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW });

    // Server values win.
    expect(out.schema_version).toBe(1);
    expect(out.conversation_id).toBe(CONV_ID);
    expect(out.from_slug).toBe('fw-01');
    expect(out.judged_at).toBe(FIXED_NOW.toISOString());
    expect(out.judge_model).not.toBe('attacker-model');
  });
});

describe('judgeConversation — error paths (fail-shut)', () => {
  it('throws when the response has no text content block', async () => {
    mockMessagesCreate.mockResolvedValueOnce({ content: [] });
    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW }),
    ).rejects.toThrow(/no text content block/);
  });

  it('throws on JSON parse failure', async () => {
    mockMessagesCreate.mockResolvedValueOnce(textContentResponse('I am prose, not JSON.'));
    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW }),
    ).rejects.toThrow(/not valid JSON/);
  });

  it('throws on Zod rejection (judge_confidence out of [0, 1])', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      textContentResponse(validJudgeJson({ judge_confidence: 1.5 })),
    );
    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW }),
    ).rejects.toThrow();
  });

  it('throws on Zod rejection (excerpt > 240 chars)', async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      textContentResponse(validJudgeJson({ excerpt: 'x'.repeat(300) })),
    );
    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW }),
    ).rejects.toThrow();
  });

  it('throws when the SDK throws', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('upstream gone'));
    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW }),
    ).rejects.toThrow(/upstream gone/);
  });

  it('throws when the AbortController timeout fires (8s)', async () => {
    vi.useFakeTimers();
    mockMessagesCreate.mockImplementation((_args, opts: { signal?: AbortSignal } = {}) => {
      return new Promise((_, reject) => {
        opts.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          (e as { name?: string }).name = 'AbortError';
          reject(e);
        });
      });
    });

    const promise = judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW });
    // Attach the catch BEFORE advancing timers — otherwise the rejection
    // surfaces as an unhandled rejection in vitest's default config.
    const assertion = expect(promise).rejects.toThrow(/aborted/);
    await vi.advanceTimersByTimeAsync(JUDGE_TIMEOUT_PROBE_MS + 1);
    await assertion;
  });

  it('throws immediately when caller-supplied signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    mockMessagesCreate.mockImplementation((_args, opts: { signal?: AbortSignal } = {}) => {
      return new Promise((_, reject) => {
        if (opts.signal?.aborted) {
          const e = new Error('aborted');
          (e as { name?: string }).name = 'AbortError';
          reject(e);
          return;
        }
        opts.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          (e as { name?: string }).name = 'AbortError';
          reject(e);
        });
      });
    });

    await expect(
      judgeConversation(CONV_ID, 'fw-01', TURNS, { now: FIXED_NOW, signal: ac.signal }),
    ).rejects.toThrow(/aborted/);
  });
});

// Module-level constant for the timeout-test probe — the runner uses 8000ms,
// we advance just past that.
const JUDGE_TIMEOUT_PROBE_MS = 8000;
