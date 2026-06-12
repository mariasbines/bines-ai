import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  list: vi.fn(),
}));

import { put } from '@vercel/blob';
import { appendCrawlerHit } from '../append';
import { parseHitPathname, type CrawlerHit } from '../schema';

const putMock = vi.mocked(put);
const ORIG_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function hit(): CrawlerHit {
  return {
    schema_version: 1,
    timestamp: '2026-06-12T09:00:00.000Z',
    bot: 'ClaudeBot',
    path: '/postcards',
    ua: 'ClaudeBot/1.0',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
});

afterEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = ORIG_TOKEN;
});

describe('appendCrawlerHit', () => {
  it('writes one private JSON object with a parseable pathname', async () => {
    putMock.mockResolvedValue({} as never);
    await appendCrawlerHit(hit());

    expect(putMock).toHaveBeenCalledTimes(1);
    const [pathname, body, opts] = putMock.mock.calls[0];
    expect(parseHitPathname(pathname as string)).toEqual({
      day: '2026-06-12',
      botSlug: 'claudebot',
      path: '/postcards',
    });
    expect(JSON.parse(body as string)).toEqual(hit());
    expect(opts).toMatchObject({
      access: 'private',
      addRandomSuffix: false,
      token: 'test-token',
    });
  });

  it('rejects malformed hits before any Blob call', async () => {
    await expect(
      appendCrawlerHit({ ...hit(), bot: '' }),
    ).rejects.toThrow();
    expect(putMock).not.toHaveBeenCalled();
  });

  it('throws when BLOB_READ_WRITE_TOKEN is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(appendCrawlerHit(hit())).rejects.toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
    expect(putMock).not.toHaveBeenCalled();
  });
});
