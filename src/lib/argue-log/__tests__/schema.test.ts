import { describe, it, expect } from 'vitest';
import {
  TURN,
  ARGUE_VERDICT,
  ARGUE_LOG_ENTRY,
  type ArgueLogEntry,
} from '../schema';

const HEX64 = 'a'.repeat(64);

function validEntry(): ArgueLogEntry {
  return {
    schema_version: 1,
    timestamp: '2026-04-24T12:00:00.000Z',
    ip_hash: HEX64,
    salt_version: 'current',
    turns: [{ role: 'user', content: 'hello' }],
    guard_signals: [],
    verdict: { harm: 'none', off_brand: [] },
    refused: false,
    model: 'claude-sonnet-4-5',
    latency_ms: { pre_flight: 12, stream: 340 },
  };
}

describe('TURN schema', () => {
  it('accepts valid user turn', () => {
    expect(TURN.parse({ role: 'user', content: 'hi' })).toEqual({
      role: 'user',
      content: 'hi',
    });
  });

  it('accepts valid assistant turn', () => {
    expect(TURN.parse({ role: 'assistant', content: 'hi back' })).toEqual({
      role: 'assistant',
      content: 'hi back',
    });
  });

  it('rejects unknown role', () => {
    expect(() =>
      TURN.parse({ role: 'system', content: 'hi' }),
    ).toThrow();
  });
});

describe('ARGUE_VERDICT schema', () => {
  it('accepts empty off_brand array', () => {
    const v = ARGUE_VERDICT.parse({ harm: 'none', off_brand: [] });
    expect(v.off_brand).toEqual([]);
  });

  it('accepts optional reasoning', () => {
    const v = ARGUE_VERDICT.parse({
      harm: 'none',
      off_brand: [],
      reasoning: 'because',
    });
    expect(v.reasoning).toBe('because');
  });

  it('rejects unknown harm value', () => {
    expect(() =>
      ARGUE_VERDICT.parse({ harm: 'nonsense', off_brand: [] }),
    ).toThrow();
  });

  it('rejects unknown off_brand value', () => {
    expect(() =>
      ARGUE_VERDICT.parse({ harm: 'none', off_brand: ['made_up'] }),
    ).toThrow();
  });

  it('rejects reasoning longer than 500 chars', () => {
    expect(() =>
      ARGUE_VERDICT.parse({
        harm: 'none',
        off_brand: [],
        reasoning: 'x'.repeat(501),
      }),
    ).toThrow();
  });
});

describe('ARGUE_LOG_ENTRY schema', () => {
  it('round-trips a valid entry', () => {
    const parsed = ARGUE_LOG_ENTRY.parse(validEntry());
    expect(parsed.schema_version).toBe(1);
    expect(parsed.ip_hash).toBe(HEX64);
    expect(parsed.turns).toHaveLength(1);
  });

  it('requires schema_version = 1', () => {
    const bad = { ...validEntry(), schema_version: 2 };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });

  it('requires ip_hash length = 64', () => {
    const bad = { ...validEntry(), ip_hash: 'deadbeef' };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });

  it('rejects empty turns array', () => {
    const bad = { ...validEntry(), turns: [] };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });

  it('rejects non-ISO timestamp', () => {
    const bad = { ...validEntry(), timestamp: 'yesterday' };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });

  it('allows stream latency to be null', () => {
    const e = { ...validEntry(), latency_ms: { pre_flight: 10, stream: null } };
    const parsed = ARGUE_LOG_ENTRY.parse(e);
    expect(parsed.latency_ms.stream).toBeNull();
  });

  it('rejects negative latency', () => {
    const bad = {
      ...validEntry(),
      latency_ms: { pre_flight: -1, stream: 10 },
    };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });

  it('accepts salt_version "previous"', () => {
    const e = { ...validEntry(), salt_version: 'previous' as const };
    expect(ARGUE_LOG_ENTRY.parse(e).salt_version).toBe('previous');
  });

  it('rejects salt_version outside enum', () => {
    const bad = { ...validEntry(), salt_version: 'v2' };
    expect(() => ARGUE_LOG_ENTRY.parse(bad)).toThrow();
  });
});
