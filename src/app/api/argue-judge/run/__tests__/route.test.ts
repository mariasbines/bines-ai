import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArgueLogEntry } from '@/lib/argue-log/schema';
import type { ArgueJudgeVerdict } from '@/lib/argue-judge/schema';

// Hoisted mocks for vi.mock factories.
const {
  mockReadArgueLogDay,
  mockHashIp,
  mockFindVerdictByConversationId,
  mockAppendArgueJudge,
  mockJudgeConversation,
} = vi.hoisted(() => ({
  mockReadArgueLogDay: vi.fn<(day: string) => Promise<ArgueLogEntry[]>>(),
  mockHashIp: vi.fn<(ip: string, salt: string) => Promise<string>>(),
  mockFindVerdictByConversationId:
    vi.fn<(id: string, opts?: { now?: Date }) => Promise<ArgueJudgeVerdict | null>>(),
  mockAppendArgueJudge: vi.fn<(v: ArgueJudgeVerdict, opts?: { now?: Date }) => Promise<void>>(),
  mockJudgeConversation:
    vi.fn<
      (
        id: string,
        slug: string | null,
        turns: unknown[],
        opts?: { now?: Date },
      ) => Promise<ArgueJudgeVerdict>
    >(),
}));

vi.mock('@/lib/argue-log/storage', () => ({
  readArgueLogDay: (day: string) => mockReadArgueLogDay(day),
}));
vi.mock('@/lib/argue-log/hash', () => ({
  hashIp: (ip: string, salt: string) => mockHashIp(ip, salt),
}));
vi.mock('@/lib/argue-judge/storage', () => ({
  findVerdictByConversationId: (id: string, opts?: { now?: Date }) =>
    mockFindVerdictByConversationId(id, opts),
  appendArgueJudge: (v: ArgueJudgeVerdict, opts?: { now?: Date }) =>
    mockAppendArgueJudge(v, opts),
}));
vi.mock('@/lib/argue-judge/runner', () => ({
  judgeConversation: (
    id: string,
    slug: string | null,
    turns: unknown[],
    opts?: { now?: Date },
  ) => mockJudgeConversation(id, slug, turns, opts),
}));

const ORIG_SALT_CURRENT = process.env.ARGUE_LOG_IP_SALT_CURRENT;
const ORIG_SALT_PREVIOUS = process.env.ARGUE_LOG_IP_SALT_PREVIOUS;

const HEX64_A = 'a'.repeat(64);
const HEX64_B = 'b'.repeat(64);
const HEX64_C = 'c'.repeat(64);

const VALID_CONV_ID = '11111111-1111-4111-8111-111111111111';

function validLogEntry(overrides: Partial<ArgueLogEntry> = {}): ArgueLogEntry {
  return {
    schema_version: 1,
    timestamp: '2026-04-25T12:00:00.000Z',
    ip_hash: HEX64_A,
    salt_version: 'current',
    turns: [{ role: 'user', content: 'hi' }],
    guard_signals: [],
    verdict: { harm: 'none', off_brand: [] },
    refused: false,
    model: 'claude-sonnet-4-6',
    latency_ms: { pre_flight: 10, stream: 100 },
    conversation_id: VALID_CONV_ID,
    from_slug: 'fw-01',
    ...overrides,
  };
}

function validVerdict(overrides: Partial<ArgueJudgeVerdict> = {}): ArgueJudgeVerdict {
  return {
    schema_version: 1,
    conversation_id: VALID_CONV_ID,
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
  mockHashIp.mockReset();
  mockHashIp.mockImplementation(async (_ip, salt) => (salt === 'salt-current' ? HEX64_A : HEX64_B));
  mockFindVerdictByConversationId.mockReset();
  mockFindVerdictByConversationId.mockResolvedValue(null);
  mockAppendArgueJudge.mockReset();
  mockAppendArgueJudge.mockResolvedValue(undefined);
  mockJudgeConversation.mockReset();
  mockJudgeConversation.mockResolvedValue(validVerdict());

  process.env.ARGUE_LOG_IP_SALT_CURRENT = 'salt-current';
  delete process.env.ARGUE_LOG_IP_SALT_PREVIOUS;
});

afterEach(() => {
  if (ORIG_SALT_CURRENT === undefined) delete process.env.ARGUE_LOG_IP_SALT_CURRENT;
  else process.env.ARGUE_LOG_IP_SALT_CURRENT = ORIG_SALT_CURRENT;
  if (ORIG_SALT_PREVIOUS === undefined) delete process.env.ARGUE_LOG_IP_SALT_PREVIOUS;
  else process.env.ARGUE_LOG_IP_SALT_PREVIOUS = ORIG_SALT_PREVIOUS;
});

async function callRoute(
  body: unknown,
  headers: HeadersInit = {},
): Promise<Response> {
  const { POST } = await import('../route');
  return POST(
    new Request('http://test.local/api/argue-judge/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/argue-judge/run — body validation', () => {
  it('returns 400 for invalid JSON body', async () => {
    const res = await callRoute('{not json');
    expect(res.status).toBe(400);
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    const json = await res.json();
    expect(json.category).toBe('validation');
  });

  it('returns 400 for missing conversation_id', async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.category).toBe('validation');
  });

  it('returns 400 for malformed conversation_id (non-uuid)', async () => {
    const res = await callRoute({ conversation_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.category).toBe('validation');
  });

  it('does not call any downstream library on a 400', async () => {
    await callRoute({});
    expect(mockReadArgueLogDay).not.toHaveBeenCalled();
    expect(mockHashIp).not.toHaveBeenCalled();
    expect(mockFindVerdictByConversationId).not.toHaveBeenCalled();
    expect(mockJudgeConversation).not.toHaveBeenCalled();
    expect(mockAppendArgueJudge).not.toHaveBeenCalled();
  });
});

describe('POST /api/argue-judge/run — salt configuration', () => {
  it('returns 500 when ARGUE_LOG_IP_SALT_CURRENT is unset', async () => {
    delete process.env.ARGUE_LOG_IP_SALT_CURRENT;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.category).toBe('upstream');
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('salt-unconfigured')),
    ).toBe(true);
    errSpy.mockRestore();
  });
});

describe('POST /api/argue-judge/run — conversation lookup', () => {
  it('returns 404 when no argue-log entries match the conversation_id', async () => {
    mockReadArgueLogDay.mockResolvedValue([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.category).toBe('not_found');
    // No runner / writer called.
    expect(mockJudgeConversation).not.toHaveBeenCalled();
    expect(mockAppendArgueJudge).not.toHaveBeenCalled();
  });

  it('returns 500 when readArgueLogDay throws (Blob unreachable)', async () => {
    mockReadArgueLogDay.mockRejectedValueOnce(new Error('blob fetch failed'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.category).toBe('upstream');
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('log-read-failed')),
    ).toBe(true);
    errSpy.mockRestore();
  });
});

describe('POST /api/argue-judge/run — recency check', () => {
  it('returns 410 when the latest entry is > 30 min old', async () => {
    const oldEntry = validLogEntry({
      timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    });
    mockReadArgueLogDay.mockResolvedValueOnce([oldEntry]).mockResolvedValueOnce([]);
    const res = await callRoute(
      { conversation_id: VALID_CONV_ID },
      { 'x-forwarded-for': '203.0.113.42' },
    );
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.category).toBe('expired');
  });

  it('accepts entries within 30 min', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(200);
  });

  it('returns 410 when the latest entry timestamp is unparseable (fail-closed)', async () => {
    const badEntry = {
      ...validLogEntry(),
      // Force unparseable by hand — bypasses schema since we already validated at write time.
      timestamp: 'not-a-date',
    } as ArgueLogEntry;
    mockReadArgueLogDay.mockResolvedValueOnce([badEntry]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(410);
  });
});

describe('POST /api/argue-judge/run — IP-bind check', () => {
  it('returns 403 when ip_hash matches neither current nor previous salt', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_C, // neither current (A) nor previous (B)
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    process.env.ARGUE_LOG_IP_SALT_PREVIOUS = 'salt-previous';

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.category).toBe('forbidden');
    // Idempotency lookup must NOT be called on a 403 — auth runs first.
    expect(mockFindVerdictByConversationId).not.toHaveBeenCalled();
    expect(mockJudgeConversation).not.toHaveBeenCalled();
  });

  it('passes IP-bind via the CURRENT salt hash', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(200);
  });

  it('passes IP-bind via the PREVIOUS salt hash (rotation tolerance)', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_B, // matches previous salt
      salt_version: 'previous',
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    process.env.ARGUE_LOG_IP_SALT_PREVIOUS = 'salt-previous';

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(200);
  });

  it('does NOT match previous when ARGUE_LOG_IP_SALT_PREVIOUS is unset', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_B, // would match previous if salt were set
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    delete process.env.ARGUE_LOG_IP_SALT_PREVIOUS;

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/argue-judge/run — idempotency', () => {
  it('returns 200 + existing verdict on replay; runner not called', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    const existing = validVerdict({ judge_confidence: 0.9 });
    mockFindVerdictByConversationId.mockResolvedValueOnce(existing);

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.judged).toBe(true);
    expect(json.verdict.judge_confidence).toBe(0.9);
    expect(mockJudgeConversation).not.toHaveBeenCalled();
    expect(mockAppendArgueJudge).not.toHaveBeenCalled();
  });

  it('idempotency check does NOT leak verdict existence on wrong IP (returns 403, not 200)', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_C, // wrong IP
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    // Even though a verdict exists, attacker's IP doesn't match — should NOT see 200.
    mockFindVerdictByConversationId.mockResolvedValue(validVerdict());

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(403);
    expect(mockFindVerdictByConversationId).not.toHaveBeenCalled();
  });
});

describe('POST /api/argue-judge/run — runner failure', () => {
  it('returns 502 on judgeConversation throw; appendArgueJudge not called', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    mockJudgeConversation.mockRejectedValueOnce(new Error('upstream timeout'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.category).toBe('upstream');
    expect(mockAppendArgueJudge).not.toHaveBeenCalled();
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('run-failed')),
    ).toBe(true);
    errSpy.mockRestore();
  });

  it('returns 502 on appendArgueJudge throw', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    mockAppendArgueJudge.mockRejectedValueOnce(new Error('blob put failed'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(502);
    expect(
      errSpy.mock.calls.some((args) => String(args[0] ?? '').includes('write-failed')),
    ).toBe(true);
    errSpy.mockRestore();
  });
});

describe('POST /api/argue-judge/run — success', () => {
  it('runs judge, writes verdict, returns 200 + verdict', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);
    const judged = validVerdict({ judge_confidence: 0.92 });
    mockJudgeConversation.mockResolvedValueOnce(judged);

    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.judged).toBe(true);
    expect(json.verdict.judge_confidence).toBe(0.92);

    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    expect(mockAppendArgueJudge).toHaveBeenCalledOnce();
    expect(mockAppendArgueJudge.mock.calls[0][0]).toEqual(judged);
  });

  it('flattens turns across multiple argue-log entries in chronological order', async () => {
    const t1 = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const t2 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const t3 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const e1 = validLogEntry({
      timestamp: t1,
      ip_hash: HEX64_A,
      turns: [
        { role: 'user', content: 'turn 1 user' },
        { role: 'assistant', content: 'turn 1 assistant' },
      ],
    });
    const e2 = validLogEntry({
      timestamp: t2,
      ip_hash: HEX64_A,
      turns: [
        { role: 'user', content: 'turn 2 user' },
        { role: 'assistant', content: 'turn 2 assistant' },
      ],
    });
    const e3 = validLogEntry({
      timestamp: t3,
      ip_hash: HEX64_A,
      turns: [
        { role: 'user', content: 'turn 3 user' },
        { role: 'assistant', content: 'turn 3 assistant' },
      ],
    });
    // Entries returned in jumbled order — route must sort.
    mockReadArgueLogDay.mockResolvedValueOnce([e2, e1]).mockResolvedValueOnce([e3]);

    await callRoute({ conversation_id: VALID_CONV_ID });

    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    const [, , turns] = mockJudgeConversation.mock.calls[0];
    expect(turns).toEqual([
      { role: 'user', content: 'turn 1 user' },
      { role: 'assistant', content: 'turn 1 assistant' },
      { role: 'user', content: 'turn 2 user' },
      { role: 'assistant', content: 'turn 2 assistant' },
      { role: 'user', content: 'turn 3 user' },
      { role: 'assistant', content: 'turn 3 assistant' },
    ]);
  });

  it('passes the latest entry from_slug into judgeConversation', async () => {
    const recentEntry = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
      from_slug: 'fw-04',
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recentEntry]).mockResolvedValueOnce([]);

    await callRoute({ conversation_id: VALID_CONV_ID });

    expect(mockJudgeConversation).toHaveBeenCalledOnce();
    const [, fromSlug] = mockJudgeConversation.mock.calls[0];
    expect(fromSlug).toBe('fw-04');
  });
});

describe('POST /api/argue-judge/run — X-Governed-By + no-401 invariants', () => {
  async function statusOnPath(setup: () => Promise<Response>): Promise<Response> {
    return setup();
  }

  it('emits X-Governed-By: bines.ai on 400', async () => {
    const res = await statusOnPath(() => callRoute('{not json'));
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 500 (salt unset)', async () => {
    delete process.env.ARGUE_LOG_IP_SALT_CURRENT;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 404', async () => {
    mockReadArgueLogDay.mockResolvedValue([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 410 (expired)', async () => {
    const old = validLogEntry({
      timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    });
    mockReadArgueLogDay.mockResolvedValueOnce([old]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).toBe(410);
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 403 (IP mismatch)', async () => {
    const recent = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_C,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recent]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 502 (runner throw)', async () => {
    const recent = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recent]).mockResolvedValueOnce([]);
    mockJudgeConversation.mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).toBe(502);
    expect(res.status).not.toBe(401);
  });

  it('emits X-Governed-By on 200 success', async () => {
    const recent = validLogEntry({
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      ip_hash: HEX64_A,
    });
    mockReadArgueLogDay.mockResolvedValueOnce([recent]).mockResolvedValueOnce([]);
    const res = await callRoute({ conversation_id: VALID_CONV_ID });
    expect(res.headers.get('X-Governed-By')).toBe('bines.ai');
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
  });
});
