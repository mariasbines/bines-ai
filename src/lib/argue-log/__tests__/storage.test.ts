import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

import { list, put, del } from '@vercel/blob';
import {
  appendArgueLog,
  listArgueLogDays,
  readArgueLogDay,
  deleteArgueLogDay,
} from '../storage';
import type { ArgueLogEntry } from '../schema';

const listMock = vi.mocked(list);
const putMock = vi.mocked(put);
const delMock = vi.mocked(del);

const ORIG_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const ORIG_FETCH = globalThis.fetch;

const HEX64 = 'a'.repeat(64);

function validEntry(overrides: Partial<ArgueLogEntry> = {}): ArgueLogEntry {
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
    latency_ms: { pre_flight: 10, stream: 120 },
    ...overrides,
  };
}

/**
 * Spy over console.log/console.error for the duration of a test case.
 * Returns captured args joined to a searchable string so AC-010's URL-leak
 * guard can assert no blob URL substring ever appears.
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
  delMock.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = 'fake-token';
});

afterEach(() => {
  if (ORIG_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIG_TOKEN;
  globalThis.fetch = ORIG_FETCH;
});

describe('appendArgueLog', () => {
  it('throws when BLOB_READ_WRITE_TOKEN is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(appendArgueLog(validEntry())).rejects.toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
  });

  it('rejects malformed entry before any Blob call', async () => {
    // @ts-expect-error — intentionally bad shape
    await expect(appendArgueLog({ schema_version: 2 })).rejects.toThrow();
    expect(listMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });

  it('writes a single JSONL line when the day file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    putMock.mockResolvedValue(undefined as never);

    await appendArgueLog(validEntry(), {
      now: new Date('2026-04-24T09:00:00Z'),
    });

    expect(putMock).toHaveBeenCalledOnce();
    const [filename, body, opts] = putMock.mock.calls[0];
    expect(filename).toBe('argue-log/2026-04-24.jsonl');
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
          pathname: 'argue-log/2026-04-24.jsonl',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl',
        },
      ],
    } as never);
    const previousLine =
      JSON.stringify(validEntry({ timestamp: '2026-04-24T08:00:00.000Z' })) +
      '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(previousLine)),
    ) as unknown as typeof fetch;
    putMock.mockResolvedValue(undefined as never);

    await appendArgueLog(
      validEntry({ timestamp: '2026-04-24T09:00:00.000Z' }),
      { now: new Date('2026-04-24T09:00:00Z') },
    );

    const [, body] = putMock.mock.calls[0];
    const lines = String(body).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).timestamp).toBe('2026-04-24T08:00:00.000Z');
    expect(JSON.parse(lines[1]).timestamp).toBe('2026-04-24T09:00:00.000Z');
  });

  it('uses UTC day key regardless of local timezone', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    putMock.mockResolvedValue(undefined as never);
    // 23:30 UTC on 2026-04-24 — would be a different local day in many TZs.
    await appendArgueLog(validEntry(), {
      now: new Date('2026-04-24T23:30:00Z'),
    });
    expect(putMock.mock.calls[0][0]).toBe('argue-log/2026-04-24.jsonl');
  });
});

describe('listArgueLogDays', () => {
  it('throws when token missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(listArgueLogDays()).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it('returns day keys sorted newest first, filtering malformed', async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: 'argue-log/2026-04-22.jsonl' },
        { pathname: 'argue-log/2026-04-24.jsonl' },
        { pathname: 'argue-log/2026-04-23.jsonl' },
        { pathname: 'argue-log/not-a-date.jsonl' }, // malformed — must be filtered
      ],
    } as never);
    const days = await listArgueLogDays();
    expect(days).toEqual(['2026-04-24', '2026-04-23', '2026-04-22']);
  });
});

describe('readArgueLogDay', () => {
  it('returns [] without hitting Blob when day key is invalid', async () => {
    const out = await readArgueLogDay('not-a-date');
    expect(out).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('returns [] when the file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    const out = await readArgueLogDay('2026-04-24');
    expect(out).toEqual([]);
  });

  it('parses multiple JSONL lines into entries', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-log/2026-04-24.jsonl',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl',
        },
      ],
    } as never);
    const body =
      JSON.stringify(validEntry({ timestamp: '2026-04-24T01:00:00.000Z' })) +
      '\n' +
      JSON.stringify(validEntry({ timestamp: '2026-04-24T02:00:00.000Z' })) +
      '\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(body)),
    ) as unknown as typeof fetch;

    const out = await readArgueLogDay('2026-04-24');
    expect(out).toHaveLength(2);
    expect(out[0].timestamp).toBe('2026-04-24T01:00:00.000Z');
    expect(out[1].timestamp).toBe('2026-04-24T02:00:00.000Z');
  });

  it('skips malformed lines rather than throwing', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-log/2026-04-24.jsonl',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl',
        },
      ],
    } as never);
    const body =
      '{"not":"valid"}\n' +
      JSON.stringify(validEntry()) +
      '\n' +
      'not-even-json\n';
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(body)),
    ) as unknown as typeof fetch;

    const out = await readArgueLogDay('2026-04-24');
    expect(out).toHaveLength(1);
  });

  it('ignores sibling blobs whose pathname is not the exact day file', async () => {
    // L-002 mitigation: prefix match can in theory return siblings like
    // argue-log/2026-04-24.jsonl.backup. The equality filter must reject them.
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-log/2026-04-24.jsonl.backup',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl.backup',
        },
      ],
    } as never);
    const out = await readArgueLogDay('2026-04-24');
    expect(out).toEqual([]);
  });
});

describe('deleteArgueLogDay', () => {
  it('is a no-op when the day key is invalid (no Blob call)', async () => {
    await deleteArgueLogDay('../etc/passwd');
    expect(listMock).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });

  it('deletes the matching blob by URL when the file exists', async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-log/2026-04-24.jsonl',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl',
        },
      ],
    } as never);
    delMock.mockResolvedValue(undefined as never);

    await deleteArgueLogDay('2026-04-24');
    expect(delMock).toHaveBeenCalledOnce();
    expect(delMock.mock.calls[0][0]).toBe(
      'https://blob.example/argue-log/2026-04-24.jsonl',
    );
  });

  it('is silently idempotent when the file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    await expect(deleteArgueLogDay('2026-04-24')).resolves.toBeUndefined();
    expect(delMock).not.toHaveBeenCalled();
  });

  it('ignores sibling blobs whose pathname is not the exact day file', async () => {
    // L-002 mitigation for delete path.
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: 'argue-log/2026-04-24.jsonl.backup',
          url: 'https://blob.example/argue-log/2026-04-24.jsonl.backup',
        },
      ],
    } as never);
    await deleteArgueLogDay('2026-04-24');
    expect(delMock).not.toHaveBeenCalled();
  });
});

describe('URL-leak guard (AC-010)', () => {
  it('never emits a blob URL via console.log/console.error across append/list/read/delete', async () => {
    const spy = spyConsole();
    try {
      // Append path
      listMock.mockResolvedValue({ blobs: [] } as never);
      putMock.mockResolvedValue(undefined as never);
      await appendArgueLog(validEntry());

      // Second append on existing day (goes through fetch → concat → put)
      listMock.mockResolvedValue({
        blobs: [
          {
            pathname: 'argue-log/2026-04-24.jsonl',
            url: 'https://secret.blob.vercel-storage.com/argue-log/2026-04-24.jsonl',
          },
        ],
      } as never);
      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(validEntry()) + '\n')),
      ) as unknown as typeof fetch;
      await appendArgueLog(validEntry(), {
        now: new Date('2026-04-24T09:00:00Z'),
      });

      // List path
      listMock.mockResolvedValue({
        blobs: [
          {
            pathname: 'argue-log/2026-04-24.jsonl',
            url: 'https://secret.blob.vercel-storage.com/argue-log/2026-04-24.jsonl',
          },
        ],
      } as never);
      await listArgueLogDays();

      // Read path
      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(validEntry()) + '\n')),
      ) as unknown as typeof fetch;
      await readArgueLogDay('2026-04-24');

      // Delete path
      delMock.mockResolvedValue(undefined as never);
      await deleteArgueLogDay('2026-04-24');
    } finally {
      spy.restore();
    }

    const captured = spy.captured();
    expect(captured).not.toMatch(/https:\/\//);
    expect(captured).not.toMatch(/blob\.vercel-storage\.com/);
  });
});
