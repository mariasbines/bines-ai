import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  list: vi.fn(),
}));

import { list } from '@vercel/blob';
import { readCrawlerStats } from '../read';
import { hitPathname } from '../schema';

const listMock = vi.mocked(list);
const ORIG_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

const NOW = new Date('2026-06-12T12:00:00.000Z');

function blobFor(day: string, bot: string, path: string, rand: string) {
  return {
    pathname: hitPathname(
      {
        schema_version: 1,
        timestamp: `${day}T09:00:00.000Z`,
        bot,
        path,
        ua: 'x',
      },
      Date.parse(`${day}T09:00:00.000Z`),
      rand,
    ),
  };
}

function page(blobs: Array<{ pathname: string }>, cursor?: string) {
  return {
    blobs,
    hasMore: Boolean(cursor),
    cursor,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
});

afterEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = ORIG_TOKEN;
});

describe('readCrawlerStats', () => {
  it('aggregates by bot, day and path from pathnames alone', async () => {
    listMock.mockImplementation(async (opts) => {
      const prefix = opts?.prefix;
      if (prefix === 'crawler-hits/2026-06-12/') {
        return page([
          blobFor('2026-06-12', 'GPTBot', '/postcards', 'r1'),
          blobFor('2026-06-12', 'GPTBot', '/postcards', 'r2'),
          blobFor('2026-06-12', 'ClaudeBot', '/', 'r3'),
        ]);
      }
      if (prefix === 'crawler-hits/2026-06-11/') {
        return page([
          blobFor('2026-06-11', 'GPTBot', '/about', 'r4'),
          blobFor('2026-06-11', 'ClaudeBot', '/llms.txt', 'r5'),
        ]);
      }
      return page([]);
    });

    const stats = await readCrawlerStats(3, { now: NOW });

    expect(stats.totalHits).toBe(5);
    expect(stats.byBot).toEqual([
      { botSlug: 'gptbot', hits: 3 },
      { botSlug: 'claudebot', hits: 2 },
    ]);
    expect(stats.byDay).toEqual([
      { day: '2026-06-10', hits: 0 },
      { day: '2026-06-11', hits: 2 },
      { day: '2026-06-12', hits: 3 },
    ]);
    expect(stats.topPaths[0]).toEqual({ path: '/postcards', hits: 2 });
    expect(stats.llmsTxtHits).toBe(1);
  });

  it('follows pagination cursors within a day', async () => {
    listMock
      .mockResolvedValueOnce(
        page([blobFor('2026-06-12', 'GPTBot', '/a', 'r1')], 'cursor-1'),
      )
      .mockResolvedValueOnce(
        page([blobFor('2026-06-12', 'GPTBot', '/b', 'r2')]),
      );

    const stats = await readCrawlerStats(1, { now: NOW });
    expect(stats.totalHits).toBe(2);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[1][0]).toMatchObject({ cursor: 'cursor-1' });
  });

  it('skips foreign pathnames and throws without a token', async () => {
    listMock.mockResolvedValue(
      page([{ pathname: 'crawler-hits/2026-06-12/readme.txt' }]),
    );
    const stats = await readCrawlerStats(1, { now: NOW });
    expect(stats.totalHits).toBe(0);

    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(readCrawlerStats(1, { now: NOW })).rejects.toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
  });
});
