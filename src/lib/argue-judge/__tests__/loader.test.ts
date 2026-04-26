import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArgueJudgeVerdict } from '../schema';

// Mock the storage layer so the loader gets fixture data without touching Blob.
const { mockReadAll } = vi.hoisted(() => ({
  mockReadAll: vi.fn<() => Promise<ArgueJudgeVerdict[]>>(),
}));

vi.mock('../storage', () => ({
  readAllArgueJudges: () => mockReadAll(),
}));

import { getJudgesForSlug } from '../loader';

function makeVerdict(overrides: Partial<ArgueJudgeVerdict> = {}): ArgueJudgeVerdict {
  return {
    schema_version: 1,
    conversation_id: '11111111-1111-4111-8111-111111111111',
    from_slug: 'fw-01',
    judged_at: '2026-04-25T12:00:00.000Z',
    judge_model: 'claude-sonnet-4-6',
    judge_confidence: 0.7,
    is_pushback: true,
    landed: false,
    excerpt: 'a clean line.',
    harm_in_visitor_messages: false,
    ...overrides,
  };
}

let conversationCounter = 0;
function uniqueConversationId(): string {
  conversationCounter++;
  const hex = conversationCounter.toString(16).padStart(8, '0');
  return `${hex}-1111-4111-8111-111111111111`;
}

beforeEach(() => {
  mockReadAll.mockReset();
  conversationCounter = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getJudgesForSlug — filtering', () => {
  it('returns empty enrichment on an empty corpus', async () => {
    mockReadAll.mockResolvedValueOnce([]);
    const out = await getJudgesForSlug('fw-01');
    expect(out).toEqual({ count: 0, landed: 0, excerpts: [] });
  });

  it('filters out verdicts with a different from_slug', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), from_slug: 'fw-01' }),
      makeVerdict({ conversation_id: uniqueConversationId(), from_slug: 'fw-02' }),
      makeVerdict({ conversation_id: uniqueConversationId(), from_slug: null }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(1);
  });

  it('filters out harm-flagged verdicts', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), harm_in_visitor_messages: false }),
      makeVerdict({ conversation_id: uniqueConversationId(), harm_in_visitor_messages: true, excerpt: 'hostile content' }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(1);
    expect(out!.excerpts).not.toContain('hostile content');
  });

  it('filters out non-pushback verdicts', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), is_pushback: true }),
      makeVerdict({ conversation_id: uniqueConversationId(), is_pushback: false, excerpt: 'just chatting' }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(1);
    expect(out!.excerpts).not.toContain('just chatting');
  });
});

describe('getJudgesForSlug — sorting + counting', () => {
  it('sorts excerpts by judge_confidence desc and takes top 3', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.5, excerpt: 'mid' }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.95, excerpt: 'best' }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.3, excerpt: 'low' }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.8, excerpt: 'good' }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.1, excerpt: 'lowest' }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(5);
    expect(out!.excerpts).toEqual(['best', 'good', 'mid']);
  });

  it('counts landed = subset where landed === true', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), landed: true }),
      makeVerdict({ conversation_id: uniqueConversationId(), landed: false }),
      makeVerdict({ conversation_id: uniqueConversationId(), landed: true }),
      makeVerdict({ conversation_id: uniqueConversationId(), landed: false }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(4);
    expect(out!.landed).toBe(2);
  });

  it('low-confidence + null-excerpt verdicts contribute to count but no excerpt surfaces', async () => {
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.0, excerpt: null }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.0, excerpt: null }),
      makeVerdict({ conversation_id: uniqueConversationId(), judge_confidence: 0.95, excerpt: 'sharp line' }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(3);
    expect(out!.excerpts).toEqual(['sharp line']);
  });
});

describe('getJudgesForSlug — dedupe (race tolerance)', () => {
  it('dedupes by conversation_id; latest judged_at wins', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({
        conversation_id: id,
        judged_at: '2026-04-25T10:00:00.000Z',
        excerpt: 'old',
        landed: false,
      }),
      makeVerdict({
        conversation_id: id,
        judged_at: '2026-04-25T11:00:00.000Z',
        excerpt: 'new',
        landed: true,
      }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(1); // not 2
    expect(out!.landed).toBe(1);
    expect(out!.excerpts).toEqual(['new']);
  });

  it('handles three writes for the same conversation_id by keeping only the latest', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    mockReadAll.mockResolvedValueOnce([
      makeVerdict({ conversation_id: id, judged_at: '2026-04-25T10:00:00.000Z', excerpt: 'first' }),
      makeVerdict({ conversation_id: id, judged_at: '2026-04-25T12:00:00.000Z', excerpt: 'third' }),
      makeVerdict({ conversation_id: id, judged_at: '2026-04-25T11:00:00.000Z', excerpt: 'second' }),
    ]);
    const out = await getJudgesForSlug('fw-01');
    expect(out!.count).toBe(1);
    expect(out!.excerpts).toEqual(['third']);
  });
});

describe('getJudgesForSlug — error handling', () => {
  it('returns null when readAllArgueJudges throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadAll.mockRejectedValueOnce(new Error('blob fetch failed'));

    const out = await getJudgesForSlug('fw-01');
    expect(out).toBeNull();
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('enrichment-failed')),
    ).toBe(true);
  });

  it('does not leak the error message into console (logs error name only)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadAll.mockRejectedValueOnce(new Error('https://blob.example/secret-url-that-must-not-leak'));

    await getJudgesForSlug('fw-01');

    const captured = errSpy.mock.calls.flat().map((x) => String(x)).join(' ');
    expect(captured).not.toContain('https://blob.example');
    expect(captured).not.toContain('secret-url-that-must-not-leak');
  });
});
