import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  put: vi.fn(),
}));

import { list, put } from '@vercel/blob';
import {
  appendArgueJudge,
  listArgueJudgeDays,
  readArgueJudgeDay,
  readAllArgueJudges,
  findVerdictByConversationId,
} from '../storage';
import type { ArgueJudgeVerdict } from '../schema';

const listMock = vi.mocked(list);
const putMock = vi.mocked(put);

const ORIG_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const ORIG_FETCH = globalThis.fetch;

function validVerdict(overrides: Partial<ArgueJudgeVerdict> = {}): ArgueJudgeVerdict {
  return {
    schema_version: 1,
    conversation_id: '11111111-1111-4111-8111-111111111111',
    from_slug: 'fw-01',
    judged_at: '2026-04-25T12:00:00.000Z',
    judge_model: 'claude-sonnet-4-6',
    judge_confidence: 0.9,
    is_pushback: true,
    landed: false,
    excerpt: 'a clean visitor line.',
    harm_in_visitor_messages: false,
    ...overrides,
  };
}

/**
 * Spy over console.log/console.error for the duration of a test case.
 * Returns captured args joined to a searchable string so the URL-leak
 * audit (AC-012) can assert no blob URL substring ever appears.
 */
function spyConsole(): {
  captured: () => string;
  restore: () => void;
} {
  const logs: unknown[][] = [];
  const errs: unknown[][] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = ((...args: unknown[]) => {
    logs.push(args);
  }) as typeof console.log;
  console.error = ((...args: unknown[]) => {
    errs.push(args);
  }) as typeof console.error;
  return {
    captured: () =>
      [...logs, ...errs]
        .flat()
        .map((x) => {
          try {
            return typeof x === 'string' ? x : JSON.stringify(x);
          } catch {
            return String(x);
          }
        })
        .join(' | '),
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

beforeEach(() => {
  listMock.mockReset();
  putMock.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = 'fake-token';
});

afterEach(() => {
  if (ORIG_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIG_TOKEN;
  globalThis.fetch = ORIG_FETCH;
});

describe('appendArgueJudge', () => {
  it('throws when BLOB_READ_WRITE_TOKEN is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(appendArgueJudge(validVerdict())).rejects.toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
  });

  it('rejects malformed verdict before any Blob call', async () => {
    // @ts-expect-error — intentionally bad shape
    await expect(appendArgueJudge({ schema_version: 2 })).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });

  it('writes a single JSONL line when the day file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    putMock.mockResolvedValue(undefined as never);

    await appendArgueJudge(validVerdict(), {
      now: new Date('2026-04-25T09:00:00Z'),
    });

    expect(putMock).toHaveBeenCalledOnce();
    const [filename, body, opts] = putMock.mock.calls[0];
    expect(filename).toBe('argue-judges/2026-04-25.jsonl');
    expect(String(body).trim().split('\n')).toHaveLength(1);
    expect(opts).toMatchObject({
      access: 'public',
      contentType: 'application/x-ndjson',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: 'fake-token',
    });
  });

  it('concatenates with existing content when the day file exists', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-judges/2026-04-25.jsonl',
          url: 'https://blob.example/argue-judges/2026-04-25.jsonl',
        },
      ],
    } as never);
    const previousLine =
      JSON.stringify(validVerdict({ conversation_id: '22222222-2222-4222-8222-222222222222' })) +
      '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(previousLine, { status: 200 })),
    ) as unknown as typeof fetch;
    putMock.mockResolvedValue(undefined as never);

    await appendArgueJudge(validVerdict(), {
      now: new Date('2026-04-25T09:00:00Z'),
    });

    const [, body] = putMock.mock.calls[0];
    expect(String(body).trim().split('\n')).toHaveLength(2);
  });

  it('ignores a sibling pathname (e.g. .backup) when checking for the day file', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-judges/2026-04-25.jsonl.backup',
          url: 'https://blob.example/argue-judges/2026-04-25.jsonl.backup',
        },
      ],
    } as never);
    putMock.mockResolvedValue(undefined as never);

    await appendArgueJudge(validVerdict(), { now: new Date('2026-04-25T09:00:00Z') });

    // Single fresh line — sibling not concatenated.
    const [, body] = putMock.mock.calls[0];
    expect(String(body).trim().split('\n')).toHaveLength(1);
  });
});

describe('listArgueJudgeDays', () => {
  it('returns [] on empty namespace', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    expect(await listArgueJudgeDays()).toEqual([]);
  });

  it('sorts day-keys descending (newest first)', async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: 'argue-judges/2026-04-23.jsonl', url: '' },
        { pathname: 'argue-judges/2026-04-25.jsonl', url: '' },
        { pathname: 'argue-judges/2026-04-24.jsonl', url: '' },
      ],
    } as never);
    expect(await listArgueJudgeDays()).toEqual(['2026-04-25', '2026-04-24', '2026-04-23']);
  });

  it('filters out malformed keys', async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: 'argue-judges/2026-04-25.jsonl', url: '' },
        { pathname: 'argue-judges/garbage.jsonl', url: '' },
        { pathname: 'argue-judges/.DS_Store.jsonl', url: '' },
      ],
    } as never);
    expect(await listArgueJudgeDays()).toEqual(['2026-04-25']);
  });
});

describe('readArgueJudgeDay', () => {
  it('returns [] for an invalid day key without making a Blob call', async () => {
    expect(await readArgueJudgeDay('not-a-day')).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('returns [] when the file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    expect(await readArgueJudgeDay('2026-04-25')).toEqual([]);
  });

  it('parses two valid JSONL lines', async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: 'argue-judges/2026-04-25.jsonl', url: 'https://blob.example/x' },
      ],
    } as never);
    const lines =
      JSON.stringify(validVerdict()) +
      '\n' +
      JSON.stringify(validVerdict({ conversation_id: '22222222-2222-4222-8222-222222222222' })) +
      '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(lines, { status: 200 })),
    ) as unknown as typeof fetch;

    const out = await readArgueJudgeDay('2026-04-25');
    expect(out).toHaveLength(2);
    expect(out[0].schema_version).toBe(1);
  });

  it('silently skips a malformed JSONL line', async () => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url: 'https://blob.example/x' }],
    } as never);
    const text =
      JSON.stringify(validVerdict()) +
      '\n' +
      'not-json-at-all\n' +
      JSON.stringify({ schema_version: 99, broken: true }) +
      '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(text, { status: 200 })),
    ) as unknown as typeof fetch;

    const out = await readArgueJudgeDay('2026-04-25');
    expect(out).toHaveLength(1);
  });

  it('ignores a sibling .backup file when reading a day', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-judges/2026-04-25.jsonl.backup',
          url: 'https://blob.example/backup',
        },
      ],
    } as never);
    expect(await readArgueJudgeDay('2026-04-25')).toEqual([]);
  });
});

describe('readAllArgueJudges', () => {
  it('fans out across all days and concatenates', async () => {
    // First listMock call: listArgueJudgeDays
    listMock.mockResolvedValueOnce({
      blobs: [
        { pathname: 'argue-judges/2026-04-25.jsonl', url: '' },
        { pathname: 'argue-judges/2026-04-24.jsonl', url: '' },
      ],
    } as never);
    // Subsequent listMock calls inside readArgueJudgeDay
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url: 'https://blob.example/d1' }],
    } as never);
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: 'argue-judges/2026-04-24.jsonl', url: 'https://blob.example/d2' }],
    } as never);

    const day1 = JSON.stringify(validVerdict({ conversation_id: '11111111-1111-4111-8111-111111111111' })) + '\n';
    const day2 =
      JSON.stringify(validVerdict({ conversation_id: '22222222-2222-4222-8222-222222222222' })) +
      '\n' +
      JSON.stringify(validVerdict({ conversation_id: '33333333-3333-4333-8333-333333333333' })) +
      '\n';
    let n = 0;
    globalThis.fetch = vi.fn(() => {
      const body = ++n === 1 ? day1 : day2;
      return Promise.resolve(new Response(body, { status: 200 }));
    }) as unknown as typeof fetch;

    const out = await readAllArgueJudges();
    expect(out).toHaveLength(3);
  });
});

describe('findVerdictByConversationId', () => {
  it('returns null on no match', async () => {
    // listArgueJudgeDays is NOT called by findVerdictByConversationId — it
    // calls readArgueJudgeDay(today) and readArgueJudgeDay(yesterday) directly.
    // Each readArgueJudgeDay does its own list() call internally.
    listMock.mockResolvedValue({ blobs: [] } as never);

    const out = await findVerdictByConversationId('11111111-1111-4111-8111-111111111111', {
      now: new Date('2026-04-25T12:00:00Z'),
    });
    expect(out).toBeNull();
  });

  it('returns the verdict when found in today', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    // First list() inside today's readArgueJudgeDay
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url: 'https://blob.example/today' }],
    } as never);
    // Second list() inside yesterday's readArgueJudgeDay
    listMock.mockResolvedValueOnce({ blobs: [] } as never);

    const todayLine = JSON.stringify(validVerdict({ conversation_id: id })) + '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(todayLine, { status: 200 })),
    ) as unknown as typeof fetch;

    const out = await findVerdictByConversationId(id, {
      now: new Date('2026-04-25T12:00:00Z'),
    });
    expect(out?.conversation_id).toBe(id);
  });

  it('returns the latest verdict when multiple exist for the same id across days', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    // Today's list call
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url: 'https://blob.example/today' }],
    } as never);
    // Yesterday's list call
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: 'argue-judges/2026-04-24.jsonl', url: 'https://blob.example/yesterday' }],
    } as never);

    const todayLine =
      JSON.stringify(validVerdict({ conversation_id: id, judged_at: '2026-04-25T11:00:00.000Z', excerpt: 'newer' })) +
      '\n';
    const yesterdayLine =
      JSON.stringify(validVerdict({ conversation_id: id, judged_at: '2026-04-24T11:00:00.000Z', excerpt: 'older' })) +
      '\n';
    let n = 0;
    globalThis.fetch = vi.fn(() => {
      const body = ++n === 1 ? todayLine : yesterdayLine;
      return Promise.resolve(new Response(body, { status: 200 }));
    }) as unknown as typeof fetch;

    const out = await findVerdictByConversationId(id, {
      now: new Date('2026-04-25T12:00:00Z'),
    });
    expect(out?.excerpt).toBe('newer');
  });

  it('does not scan day-3-ago — only today and yesterday', async () => {
    // Only two readArgueJudgeDay calls = two list() calls.
    listMock.mockResolvedValue({ blobs: [] } as never);

    await findVerdictByConversationId('11111111-1111-4111-8111-111111111111', {
      now: new Date('2026-04-25T12:00:00Z'),
    });
    expect(listMock).toHaveBeenCalledTimes(2);
  });
});

describe('URL-leak guard (AC-012)', () => {
  it('never emits a blob URL via console.log/console.error during append/list/read/find', async () => {
    const spy = spyConsole();
    try {
      const url = 'https://example-blob.public.blob.vercel-storage.com/argue-judges/2026-04-25.jsonl';

      // appendArgueJudge — single write, no concat
      listMock.mockResolvedValueOnce({ blobs: [] } as never);
      putMock.mockResolvedValueOnce(undefined as never);
      await appendArgueJudge(validVerdict(), { now: new Date('2026-04-25T09:00:00Z') });

      // appendArgueJudge — concat path
      listMock.mockResolvedValueOnce({
        blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url }],
      } as never);
      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(validVerdict()) + '\n', { status: 200 })),
      ) as unknown as typeof fetch;
      putMock.mockResolvedValueOnce(undefined as never);
      await appendArgueJudge(validVerdict(), { now: new Date('2026-04-25T09:00:00Z') });

      // listArgueJudgeDays
      listMock.mockResolvedValueOnce({
        blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url }],
      } as never);
      await listArgueJudgeDays();

      // readArgueJudgeDay
      listMock.mockResolvedValueOnce({
        blobs: [{ pathname: 'argue-judges/2026-04-25.jsonl', url }],
      } as never);
      await readArgueJudgeDay('2026-04-25');

      // findVerdictByConversationId
      listMock.mockResolvedValueOnce({ blobs: [] } as never);
      listMock.mockResolvedValueOnce({ blobs: [] } as never);
      await findVerdictByConversationId('11111111-1111-4111-8111-111111111111', {
        now: new Date('2026-04-25T12:00:00Z'),
      });

      const out = spy.captured();
      expect(out).not.toContain('blob.vercel-storage.com');
      expect(out).not.toContain('https://');
    } finally {
      spy.restore();
    }
  });
});
