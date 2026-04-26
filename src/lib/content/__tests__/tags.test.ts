import { describe, it, expect } from 'vitest';
import path from 'node:path';

vi.mock('server-only', () => ({}));

import { getAllTags, getPiecesByTag } from '../tags';
import { vi } from 'vitest';

const FIXTURES = path.resolve(__dirname, '../../../../content');

describe('getAllTags', () => {
  it('returns the union of Fieldwork + Postcard tags, sorted alphabetically, deduped', async () => {
    const tags = await getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    // Sorted ascending
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
    // Deduped (Set semantics — every tag appears at most once)
    expect(new Set(tags).size).toBe(tags.length);
    // At least the canonical Fieldwork tags exist
    expect(tags).toContain('memory');
    expect(tags).toContain('attention');
  });
});

describe('getPiecesByTag', () => {
  it('returns matching Fieldwork and Postcards for a known tag', async () => {
    const result = await getPiecesByTag('ai');
    expect(result.tag).toBe('ai');
    // Both surfaces use 'ai' — at least one piece should match
    const total = result.fieldwork.length + result.postcards.length;
    expect(total).toBeGreaterThan(0);
  });

  it('returns empty arrays for an unknown tag', async () => {
    const result = await getPiecesByTag('xyzzy-not-a-tag');
    expect(result.fieldwork).toEqual([]);
    expect(result.postcards).toEqual([]);
  });

  it('does not include pieces that lack the tag', async () => {
    const result = await getPiecesByTag('memory');
    for (const piece of result.fieldwork) {
      expect(piece.frontmatter.tags).toContain('memory');
    }
    for (const card of result.postcards) {
      expect(card.frontmatter.tags ?? []).toContain('memory');
    }
  });
});

void FIXTURES; // silence unused-import warning if later refactor uses fixtures
