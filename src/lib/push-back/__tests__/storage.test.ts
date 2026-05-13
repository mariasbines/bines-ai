import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
}));

import { list, put, get } from '@vercel/blob';
import { appendPushBack } from '../storage';

const listMock = vi.mocked(list);
const putMock = vi.mocked(put);
const getMock = vi.mocked(get);

const ORIG_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function getOk(body: string) {
  return {
    statusCode: 200,
    stream: new Response(body).body,
    headers: {},
    blob: {},
  } as never;
}

beforeEach(() => {
  listMock.mockReset();
  putMock.mockReset();
  getMock.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = 'fake-token';
});

afterEach(() => {
  if (ORIG_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = ORIG_TOKEN;
});

describe('appendPushBack', () => {
  it('throws when BLOB_READ_WRITE_TOKEN is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(
      appendPushBack({
        slug: 's',
        message: 'ten chars!',
        name: '',
        timestamp: 'T',
      }),
    ).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it('writes a single line when the file does not exist', async () => {
    listMock.mockResolvedValue({ blobs: [] } as never);
    putMock.mockResolvedValue(undefined as never);
    await appendPushBack(
      { slug: 'a', message: 'hello world!!', name: '', timestamp: 'T' },
      { now: new Date('2026-04-22T00:00:00Z') },
    );
    expect(putMock).toHaveBeenCalledOnce();
    const [filename, body] = putMock.mock.calls[0];
    expect(filename).toBe('push-back/2026-04-22.jsonl');
    expect(String(body)).toMatch(/"slug":"a"/);
  });

  it('concatenates with existing content when file exists', async () => {
    listMock.mockResolvedValue({
      blobs: [{ url: 'https://blob.example/d.jsonl' }],
    } as never);
    getMock.mockResolvedValue(
      getOk('{"slug":"prev","message":"p","name":"","timestamp":"T0"}\n'),
    );
    putMock.mockResolvedValue(undefined as never);
    await appendPushBack(
      { slug: 'a', message: 'hello world!!', name: '', timestamp: 'T1' },
      { now: new Date('2026-04-22T00:00:00Z') },
    );
    const [, body, opts] = putMock.mock.calls[0];
    const lines = String(body).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).slug).toBe('prev');
    expect(JSON.parse(lines[1]).slug).toBe('a');
    expect(opts).toMatchObject({ access: 'private' });
  });
});
