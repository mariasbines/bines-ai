import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';
import type { ArgueJudgeVerdict } from '@/lib/argue-judge/schema';

const {
  mockReadArgueLogDay,
  mockReadArgueJudgeDay,
  mockAppendArgueJudge,
  mockJudgeConversation,
} = vi.hoisted(() => ({
  mockReadArgueLogDay: vi.fn<(day: string) => Promise<ArgueLogEntry[]>>(),
  mockReadArgueJudgeDay: vi.fn<(day: string) => Promise<ArgueJudgeVerdict[]>>(),
  mockAppendArgueJudge: vi.fn<(v: ArgueJudgeVerdict) => Promise<void>>(),
  mockJudgeConversation: vi.fn<
    (id: string, slug: string | null, turns: unknown[]) => Promise<ArgueJudgeVerdict>
  >(),
}));

vi.mock('@/lib/argue-log/storage', () => ({
  readArgueLogDay: (day: string) => mockReadArgueLogDay(day),
}));
vi.mock('@/lib/argue-judge/storage', () => ({
  readArgueJudgeDay: (day: string) => mockReadArgueJudgeDay(day),
  appendArgueJudge: (v: ArgueJudgeVerdict) => mockAppendArgueJudge(v),
}));
vi.mock('@/lib/argue-judge/runner', () => ({
  judgeConversation: (id: string, slug: string | null, turns: unknown[]) =>
    mockJudgeConversation(id, slug, turns),
}));

const ORIG_CRON_SECRET = process.env.CRON_SECRET;
const SECRET = 'test-secret-deadbeef';

const HEX64 = 'a'.repeat(64);

function uuid(prefix: number): string {
  const hex = prefix.toString(16).padStart(8, '0');
  return `${hex}-1111-4111-8111-111111111111`;
}

function logEntry(overrides: Partial<ArgueLogEntry> = {}): ArgueLogEntry {
  return {
    schema_version: 1,
    timestamp: '2026-04-25T12:00:00.000Z',
    ip_hash: HEX64,
    salt_version: 'current',
    turns: [{ role: 'user', content: 'hi' }],
    guard_signals: [],
    verdict: { harm: 'none', off_brand: [] },
    refused: false,
    model: 'claude-sonnet-4-6',
    latency_ms: { pre_flight: 10, stream: 100 },
    conversation_id: uuid(1),
    from_slug: 'fw-01',
    ...overrides,
  };
}

function judgeVerdict(overrides: Partial<ArgueJudgeVerdict> = {}): ArgueJudgeVerdict {
  return {
    schema_version: 1,
    conversation_id: uuid(1),
    from_slug: 'fw-01',
    judged_at: '2026-04-25T12:00:00.000Z',
    judge_model: 'claude-sonnet-4-6',
    judge_confidence: 0.85,
    is_pushback: true,
    landed: false,
    excerpt: 'a clean line.',
    harm_in_visitor_messages: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockReadArgueLogDay.mockReset();
  mockReadArgueLogDay.mockResolvedValue([]);
  mockReadArgueJudgeDay.mockReset();
  mockReadArgueJudgeDay.mockResolvedValue([]);
  mockAppendArgueJudge.mockReset();
  mockAppendArgueJudge.mockResolvedValue(undefined);
  mockJudgeConversation.mockReset();
  mockJudgeConversation.mockImplementation(async (id) => judgeVerdict({ conversation_id: id }));
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  if (ORIG_CRON_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIG_CRON_SECRET;
});

async function callRoute(
  headers: HeadersInit = { Authorization: `Bearer ${SECRET}` },
  query = '',
): Promise<Response> {
  const { GET } = await import('../route');
  return GET(
    new Request(`http://test.local/api/argue-judge/sweep${query}`, {
      method: 'GET',
      headers,
    }),
  );
}

describe('GET /api/argue-judge/sweep — auth', () => {
  it('returns 500 when CRON_SECRET is unconfigured', async () => {
    delete process.env.CRON_SECRET;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute();
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    const json = await res.json();
    expect(json.category).toBe('upstream');
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('cron-secret-unconfigured')),
    ).toBe(true);
    errSpy.mockRestore();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await callRoute({});
    expect(res.status).toBe(401);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
  });

  it('returns 401 on wrong scheme (Basic xxx)', async () => {
    const res = await callRoute({ Authorization: `Basic ${SECRET}` });
    expect(res.status).toBe(401);
  });

  it('returns 401 on wrong token value', async () => {
    const res = await callRoute({ Authorization: 'Bearer wrong-secret-deadbeef' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on equal-length but mismatched token (timing-safe path)', async () => {
    const wrong = SECRET.replace(/.$/, 'X'); // same length, last char differs
    const res = await callRoute({ Authorization: `Bearer ${wrong}` });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/argue-judge/sweep — day override', () => {
  it('400 on malformed ?day= input', async () => {
    const res = await callRoute(
      { Authorization: `Bearer ${SECRET}` },
      '?day=not-a-day',
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.category).toBe('validation');
  });

  it('400 on path-traversal-shaped ?day= input (PB2-SEC-005 regression)', async () => {
    const res = await callRoute(
      { Authorization: `Bearer ${SECRET}` },
      '?day=../../etc/passwd',
    );
    expect(res.status).toBe(400);
    expect(mockReadArgueLogDay).not.toHaveBeenCalled();
  });

  it('default targets yesterday (UTC)', async () => {
    const res = await callRoute();
    expect(res.status).toBe(200);
    expect(mockReadArgueLogDay).toHaveBeenCalledOnce();
    const [day] = mockReadArgueLogDay.mock.calls[0];
    // Yesterday is one calendar day before today UTC.
    const today = new Date().toISOString().slice(0, 10);
    expect(day).not.toBe(today);
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('honours valid ?day=YYYY-MM-DD override', async () => {
    const res = await callRoute(
      { Authorization: `Bearer ${SECRET}` },
      '?day=2026-04-20',
    );
    expect(res.status).toBe(200);
    expect(mockReadArgueLogDay).toHaveBeenCalledWith('2026-04-20');
    const json = await res.json();
    expect(json.day).toBe('2026-04-20');
  });
});

describe('GET /api/argue-judge/sweep — selection + isolation', () => {
  it('200 + zero counts on empty argue-log day', async () => {
    mockReadArgueLogDay.mockResolvedValue([]);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.judged).toBe(0);
    expect(json.skipped_already_judged).toBe(0);
    expect(json.errors).toBe(0);
    expect(mockJudgeConversation).not.toHaveBeenCalled();
  });

  it('skips entries with no conversation_id (pre-Phase-A shape)', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: undefined }),
      logEntry({ conversation_id: uuid(2) }),
    ]);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.judged).toBe(1);
    expect(json.skipped_already_judged).toBe(0);
    expect(json.errors).toBe(0);
    // The pre-Phase-A entry was skipped — only one judge call.
    expect(mockJudgeConversation).toHaveBeenCalledOnce();
  });

  it('skips already-judged conversations and counts skipped', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1) }),
      logEntry({ conversation_id: uuid(2) }),
      logEntry({ conversation_id: uuid(3) }),
    ]);
    // Two already judged; one isn't.
    mockReadArgueJudgeDay.mockResolvedValue([
      judgeVerdict({ conversation_id: uuid(1) }),
      judgeVerdict({ conversation_id: uuid(2) }),
    ]);

    const res = await callRoute();
    const json = await res.json();
    expect(json.judged).toBe(1);
    expect(json.skipped_already_judged).toBe(2);
    expect(json.errors).toBe(0);
    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    const [judgedId] = mockJudgeConversation.mock.calls[0];
    expect(judgedId).toBe(uuid(3));
  });

  it('judges + writes for un-judged conversations + counts judged', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1) }),
      logEntry({ conversation_id: uuid(2) }),
    ]);
    const res = await callRoute();
    const json = await res.json();
    expect(json.judged).toBe(2);
    expect(json.skipped_already_judged).toBe(0);
    expect(json.errors).toBe(0);
    expect(mockJudgeConversation).toHaveBeenCalledTimes(2);
    expect(mockAppendArgueJudge).toHaveBeenCalledTimes(2);
  });

  it('isolates per-conversation errors — one runner failure does NOT abort the sweep', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1) }),
      logEntry({ conversation_id: uuid(2) }),
      logEntry({ conversation_id: uuid(3) }),
    ]);
    let callIdx = 0;
    mockJudgeConversation.mockImplementation(async (id) => {
      callIdx++;
      if (callIdx === 2) throw new Error('simulated upstream timeout');
      return judgeVerdict({ conversation_id: id });
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute();
    const json = await res.json();
    expect(json.judged).toBe(2);
    expect(json.errors).toBe(1);
    // The sweep continued past the failure — third id was processed.
    expect(mockJudgeConversation).toHaveBeenCalledTimes(3);
    expect(mockAppendArgueJudge).toHaveBeenCalledTimes(2);
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('sweep-failed conv_id=')),
    ).toBe(true);
    errSpy.mockRestore();
  });

  it('counts multiple errors correctly (errors === 2)', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1) }),
      logEntry({ conversation_id: uuid(2) }),
      logEntry({ conversation_id: uuid(3) }),
    ]);
    let callIdx = 0;
    mockJudgeConversation.mockImplementation(async (id) => {
      callIdx++;
      if (callIdx <= 2) throw new Error('upstream blip');
      return judgeVerdict({ conversation_id: id });
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute();
    const json = await res.json();
    expect(json.judged).toBe(1);
    expect(json.errors).toBe(2);
  });

  it('groups multiple argue-log entries for the same conversation_id and judges once', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({
        conversation_id: uuid(1),
        timestamp: '2026-04-25T10:00:00.000Z',
        turns: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'reply 1' },
        ],
      }),
      logEntry({
        conversation_id: uuid(1),
        timestamp: '2026-04-25T11:00:00.000Z',
        turns: [
          { role: 'user', content: 'second' },
          { role: 'assistant', content: 'reply 2' },
        ],
      }),
    ]);

    const res = await callRoute();
    const json = await res.json();
    expect(json.judged).toBe(1);
    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    const [, , turns] = mockJudgeConversation.mock.calls[0];
    expect((turns as Array<{ content: string }>).map((t) => t.content)).toEqual([
      'first',
      'reply 1',
      'second',
      'reply 2',
    ]);
  });

  it('passes the sticky from_slug from the first entry into the runner', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1), from_slug: 'fw-04' }),
    ]);
    await callRoute();
    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    const [, fromSlug] = mockJudgeConversation.mock.calls[0];
    expect(fromSlug).toBe('fw-04');
  });

  it('reads judges from BOTH target day + today (verdict day-key may straddle UTC boundary)', async () => {
    mockReadArgueLogDay.mockResolvedValue([
      logEntry({ conversation_id: uuid(1) }),
    ]);
    await callRoute();
    // readArgueJudgeDay called for both target day (yesterday) and today.
    expect(mockReadArgueJudgeDay).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/argue-judge/sweep — response envelope', () => {
  it('includes the resolved day in the response', async () => {
    const res = await callRoute(
      { Authorization: `Bearer ${SECRET}` },
      '?day=2026-04-20',
    );
    const json = await res.json();
    expect(json.day).toBe('2026-04-20');
  });

  it('emits X-Governed-By: bines.ai on every response', async () => {
    const r1 = await callRoute({ Authorization: 'Bearer wrong' });
    expect(r1.headers.get('X-Governed-By')).toBe('bines.ai');

    const r2 = await callRoute(
      { Authorization: `Bearer ${SECRET}` },
      '?day=invalid',
    );
    expect(r2.headers.get('X-Governed-By')).toBe('bines.ai');

    const r3 = await callRoute();
    expect(r3.headers.get('X-Governed-By')).toBe('bines.ai');

    delete process.env.CRON_SECRET;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r4 = await callRoute();
    expect(r4.headers.get('X-Governed-By')).toBe('bines.ai');
  });
});

describe('vercel.json — cron registration (AC-006)', () => {
  it('registers both the cleanup and the sweep cron entries', () => {
    const raw = readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      crons?: Array<{ path: string; schedule: string }>;
      functions?: Record<string, { maxDuration?: number }>;
    };
    expect(parsed.crons).toBeDefined();
    const paths = parsed.crons!.map((c) => c.path);
    expect(paths).toContain('/api/argue-log/cleanup');
    expect(paths).toContain('/api/argue-judge/sweep');
  });

  it('schedules sweep one hour after cleanup (30 4 * * *)', () => {
    const raw = readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const sweep = parsed.crons.find((c) => c.path === '/api/argue-judge/sweep');
    expect(sweep?.schedule).toBe('30 4 * * *');
  });

  it('sets maxDuration: 300 on the sweep route', () => {
    const raw = readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      functions?: Record<string, { maxDuration?: number }>;
    };
    const fnConfig = parsed.functions?.['src/app/api/argue-judge/sweep/route.ts'];
    expect(fnConfig?.maxDuration).toBe(300);
  });
});
