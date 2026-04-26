import { describe, it, expect } from 'vitest';
import {
  ARGUE_JUDGE_VERDICT,
  EXCERPT_MAX_CHARS,
  type ArgueJudgeVerdict,
} from '../schema';

function validVerdict(overrides: Partial<ArgueJudgeVerdict> = {}): ArgueJudgeVerdict {
  return {
    schema_version: 1,
    conversation_id: '11111111-1111-4111-8111-111111111111',
    from_slug: 'fw-01',
    judged_at: '2026-04-25T12:00:00.000Z',
    judge_model: 'claude-sonnet-4-6',
    judge_confidence: 0.85,
    is_pushback: true,
    landed: false,
    excerpt: 'why does this only happen in regulated industries?',
    harm_in_visitor_messages: false,
    reasoning: 'visitor pushed back twice with on-substance points.',
    ...overrides,
  };
}

describe('ARGUE_JUDGE_VERDICT schema', () => {
  it('round-trips a valid verdict', () => {
    const out = ARGUE_JUDGE_VERDICT.parse(validVerdict());
    expect(out.schema_version).toBe(1);
    expect(out.is_pushback).toBe(true);
    expect(out.from_slug).toBe('fw-01');
  });

  it('exports EXCERPT_MAX_CHARS = 240', () => {
    expect(EXCERPT_MAX_CHARS).toBe(240);
  });

  it('rejects judge_confidence below 0', () => {
    expect(() => ARGUE_JUDGE_VERDICT.parse(validVerdict({ judge_confidence: -0.1 }))).toThrow();
  });

  it('rejects judge_confidence above 1', () => {
    expect(() => ARGUE_JUDGE_VERDICT.parse(validVerdict({ judge_confidence: 1.1 }))).toThrow();
  });

  it('accepts judge_confidence at boundary 0.0', () => {
    expect(ARGUE_JUDGE_VERDICT.parse(validVerdict({ judge_confidence: 0 }))).toMatchObject({
      judge_confidence: 0,
    });
  });

  it('accepts judge_confidence at boundary 1.0', () => {
    expect(ARGUE_JUDGE_VERDICT.parse(validVerdict({ judge_confidence: 1 }))).toMatchObject({
      judge_confidence: 1,
    });
  });

  it('rejects excerpt > 240 chars', () => {
    expect(() =>
      ARGUE_JUDGE_VERDICT.parse(validVerdict({ excerpt: 'x'.repeat(EXCERPT_MAX_CHARS + 1) })),
    ).toThrow();
  });

  it('accepts excerpt exactly at the 240-char boundary', () => {
    expect(
      ARGUE_JUDGE_VERDICT.parse(validVerdict({ excerpt: 'x'.repeat(EXCERPT_MAX_CHARS) })).excerpt,
    ).toBe('x'.repeat(EXCERPT_MAX_CHARS));
  });

  it('accepts excerpt: null (no quotable visitor line)', () => {
    expect(ARGUE_JUDGE_VERDICT.parse(validVerdict({ excerpt: null })).excerpt).toBeNull();
  });

  it('rejects missing required field (is_pushback)', () => {
    const bad = validVerdict() as unknown as Record<string, unknown>;
    delete bad.is_pushback;
    expect(() => ARGUE_JUDGE_VERDICT.parse(bad)).toThrow();
  });

  it('accepts optional reasoning absent', () => {
    const v = validVerdict();
    delete (v as { reasoning?: string }).reasoning;
    const out = ARGUE_JUDGE_VERDICT.parse(v);
    expect(out.reasoning).toBeUndefined();
  });

  it('rejects from_slug as a number (must be string-or-null)', () => {
    const bad = { ...validVerdict(), from_slug: 42 as unknown as string };
    expect(() => ARGUE_JUDGE_VERDICT.parse(bad)).toThrow();
  });

  it('accepts from_slug: null (explicit no-origin)', () => {
    expect(ARGUE_JUDGE_VERDICT.parse(validVerdict({ from_slug: null })).from_slug).toBeNull();
  });

  it('rejects schema_version: 2 (future drift)', () => {
    const bad = { ...validVerdict(), schema_version: 2 };
    expect(() => ARGUE_JUDGE_VERDICT.parse(bad)).toThrow();
  });

  it('rejects malformed conversation_id (non-uuid)', () => {
    const bad = { ...validVerdict(), conversation_id: 'not-a-uuid' };
    expect(() => ARGUE_JUDGE_VERDICT.parse(bad)).toThrow();
  });

  it('rejects reasoning > 500 chars', () => {
    expect(() =>
      ARGUE_JUDGE_VERDICT.parse(validVerdict({ reasoning: 'x'.repeat(501) })),
    ).toThrow();
  });
});
