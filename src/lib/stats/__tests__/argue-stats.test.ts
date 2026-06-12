import { describe, it, expect } from 'vitest';
import { aggregateArgueStats } from '../argue-stats';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';

const CONV_A = '11111111-1111-4111-8111-111111111111';
const CONV_B = '22222222-2222-4222-8222-222222222222';

function entry(overrides: Partial<ArgueLogEntry> = {}): ArgueLogEntry {
  return {
    schema_version: 1,
    timestamp: '2026-06-12T09:00:00.000Z',
    ip_hash: 'a'.repeat(64),
    salt_version: 'current',
    turns: [{ role: 'user', content: 'hello' }],
    guard_signals: [],
    verdict: { harm: 'none', off_brand: [] },
    refused: false,
    model: 'claude-sonnet-4-6',
    latency_ms: { pre_flight: 10, stream: 100 },
    conversation_id: CONV_A,
    from_slug: null,
    ...overrides,
  };
}

describe('aggregateArgueStats', () => {
  it('counts distinct conversations across days, exchanges and refusals', () => {
    const stats = aggregateArgueStats([
      {
        day: '2026-06-11',
        entries: [
          entry({ conversation_id: CONV_A }),
          entry({ conversation_id: CONV_A, refused: true }),
        ],
      },
      {
        day: '2026-06-12',
        entries: [
          entry({ conversation_id: CONV_A }),
          entry({ conversation_id: CONV_B }),
        ],
      },
    ]);

    expect(stats.conversations).toBe(2); // A spans both days, counted once
    expect(stats.exchanges).toBe(4);
    expect(stats.refusals).toBe(1);
    expect(stats.byDay).toEqual([
      { day: '2026-06-11', conversations: 1, exchanges: 2 },
      { day: '2026-06-12', conversations: 2, exchanges: 2 },
    ]);
  });

  it('counts pre-Phase-A entries (no conversation_id) as one conversation each', () => {
    const legacy = entry();
    delete (legacy as Partial<ArgueLogEntry>).conversation_id;
    const stats = aggregateArgueStats([
      { day: '2026-06-12', entries: [legacy, legacy, entry()] },
    ]);
    expect(stats.conversations).toBe(3); // 2 unthreaded + 1 threaded
  });

  it('buckets origins: from_slug, null → direct, sorted desc', () => {
    const stats = aggregateArgueStats([
      {
        day: '2026-06-12',
        entries: [
          entry({ from_slug: '10-excellent-manners' }),
          entry({ from_slug: '10-excellent-manners' }),
          entry({ from_slug: null }),
        ],
      },
    ]);
    expect(stats.topOrigins).toEqual([
      { origin: '10-excellent-manners', exchanges: 2 },
      { origin: 'direct', exchanges: 1 },
    ]);
  });

  it('skips empty models (refusals) in the model table and handles empty input', () => {
    const stats = aggregateArgueStats([
      { day: '2026-06-12', entries: [entry({ model: '', refused: true })] },
    ]);
    expect(stats.models).toEqual([]);

    const empty = aggregateArgueStats([]);
    expect(empty.conversations).toBe(0);
    expect(empty.byDay).toEqual([]);
  });
});
