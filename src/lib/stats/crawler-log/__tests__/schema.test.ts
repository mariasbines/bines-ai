import { describe, it, expect } from 'vitest';
import {
  CRAWLER_HIT,
  encodePath,
  decodePath,
  hitPathname,
  parseHitPathname,
  type CrawlerHit,
} from '../schema';

function hit(overrides: Partial<CrawlerHit> = {}): CrawlerHit {
  return {
    schema_version: 1,
    timestamp: '2026-06-12T09:00:00.000Z',
    bot: 'GPTBot',
    path: '/fieldwork/10-excellent-manners',
    ua: 'GPTBot/1.2',
    ...overrides,
  };
}

describe('CRAWLER_HIT schema', () => {
  it('accepts a valid hit', () => {
    expect(CRAWLER_HIT.safeParse(hit()).success).toBe(true);
  });

  it('rejects missing bot and over-long fields', () => {
    expect(CRAWLER_HIT.safeParse(hit({ bot: '' })).success).toBe(false);
    expect(
      CRAWLER_HIT.safeParse(hit({ path: '/'.padEnd(501, 'x') })).success,
    ).toBe(false);
    expect(
      CRAWLER_HIT.safeParse(hit({ ua: 'u'.repeat(301) })).success,
    ).toBe(false);
  });
});

describe('encodePath / decodePath', () => {
  it('round-trips paths including unicode', () => {
    for (const p of ['/', '/fieldwork/10-excellent-manners', '/tag/café']) {
      expect(decodePath(encodePath(p))).toBe(p);
    }
  });

  it('produces pathname-safe output (no +, /, =)', () => {
    const encoded = encodePath('/a?b=c&d=e/f');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('decodePath returns null on garbage', () => {
    expect(decodePath('!!!not-base64!!!')).toBeNull();
  });
});

describe('hitPathname / parseHitPathname', () => {
  it('round-trips day, bot slug and path', () => {
    const pathname = hitPathname(hit(), 1781254800000, 'ab12cd');
    const parsed = parseHitPathname(pathname);
    expect(parsed).toEqual({
      day: '2026-06-12',
      botSlug: 'gptbot',
      path: '/fieldwork/10-excellent-manners',
    });
  });

  it('caps hostile long paths before encoding (still parseable)', () => {
    const long = '/x?q=' + 'a'.repeat(400);
    const pathname = hitPathname(hit({ path: long }), 1781254800000, 'ab12cd');
    expect(pathname.length).toBeLessThan(300);
    const parsed = parseHitPathname(pathname);
    expect(parsed?.path).toBe(long.slice(0, 140));
  });

  it('returns null for foreign pathnames', () => {
    expect(parseHitPathname('argue-log/2026-06-12.jsonl')).toBeNull();
    expect(parseHitPathname('crawler-hits/2026-06-12/readme.txt')).toBeNull();
  });
});
