import { describe, it, expect } from 'vitest';
import {
  FIELDWORK_FRONTMATTER,
  POSTCARD_FRONTMATTER,
  NOW_FRONTMATTER,
  TASTE_FRONTMATTER,
  ACCENT_TOKEN,
} from '../types';

const VALID_FIELDWORK = {
  id: 1,
  slug: '01-best-thing-not-at-work',
  title: 'The best thing AI has done for me this year was not at work.',
  published: '2026-04-22',
  status: 'in-rotation',
  tags: ['memory', 'attention', 'specificity'],
  media: { readMinutes: 5, watchMinutes: 4 },
  pushback: { count: 0 },
  excerpt: 'First sentence of the piece.',
  accent: 'emerald',
};

describe('FIELDWORK_FRONTMATTER', () => {
  it('accepts a valid piece', () => {
    expect(() => FIELDWORK_FRONTMATTER.parse(VALID_FIELDWORK)).not.toThrow();
  });
  it('rejects invalid status enum', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, status: 'archived' });
    expect(r.success).toBe(false);
  });
  it('rejects empty tags array', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, tags: [] });
    expect(r.success).toBe(false);
  });
  it('rejects tags with uppercase or spaces', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, tags: ['Memory'] });
    expect(r.success).toBe(false);
    const r2 = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, tags: ['a b'] });
    expect(r2.success).toBe(false);
  });
  it('rejects missing required fields', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, title: undefined });
    expect(r.success).toBe(false);
  });
  it('rejects non-ISO-date published (wrong format)', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, published: '22/04/2026' });
    expect(r.success).toBe(false);
  });
  it('rejects calendar-invalid date (month 13)', () => {
    // Addresses M-001 from the grade: explicit calendar-invalid test
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, published: '2026-13-01' });
    expect(r.success).toBe(false);
  });
  it('accepts optional accent omitted', () => {
    const { accent, ...rest } = VALID_FIELDWORK;
    void accent;
    expect(() => FIELDWORK_FRONTMATTER.parse(rest)).not.toThrow();
  });
  it('rejects unknown accent', () => {
    const r = FIELDWORK_FRONTMATTER.safeParse({ ...VALID_FIELDWORK, accent: 'teal' });
    expect(r.success).toBe(false);
  });
  it('accepts all four status values', () => {
    for (const status of [
      'in-rotation',
      'retired-still-right',
      'retired-evolved',
      'changed-my-mind',
    ] as const) {
      const fixture = status === 'changed-my-mind'
        ? { ...VALID_FIELDWORK, status, supersedes: 's', originalPosition: 'o', newPosition: 'n' }
        : { ...VALID_FIELDWORK, status };
      const r = FIELDWORK_FRONTMATTER.safeParse(fixture);
      expect(r.success).toBe(true);
    }
  });
  describe('changed-my-mind discriminated variant', () => {
    it('rejects changed-my-mind without supersedes', () => {
      const r = FIELDWORK_FRONTMATTER.safeParse({
        ...VALID_FIELDWORK,
        status: 'changed-my-mind',
        originalPosition: 'o',
        newPosition: 'n',
      });
      expect(r.success).toBe(false);
    });
    it('rejects changed-my-mind without originalPosition', () => {
      const r = FIELDWORK_FRONTMATTER.safeParse({
        ...VALID_FIELDWORK,
        status: 'changed-my-mind',
        supersedes: 's',
        newPosition: 'n',
      });
      expect(r.success).toBe(false);
    });
    it('rejects changed-my-mind without newPosition', () => {
      const r = FIELDWORK_FRONTMATTER.safeParse({
        ...VALID_FIELDWORK,
        status: 'changed-my-mind',
        supersedes: 's',
        originalPosition: 'o',
      });
      expect(r.success).toBe(false);
    });
    it('accepts changed-my-mind with all three extra fields', () => {
      const r = FIELDWORK_FRONTMATTER.safeParse({
        ...VALID_FIELDWORK,
        status: 'changed-my-mind',
        supersedes: 's',
        originalPosition: 'o',
        newPosition: 'n',
      });
      expect(r.success).toBe(true);
    });
  });

});

describe('POSTCARD_FRONTMATTER', () => {
  it('accepts number + ISO date', () => {
    const r = POSTCARD_FRONTMATTER.safeParse({ number: 1, published: '2026-04-22' });
    expect(r.success).toBe(true);
  });
  it('accepts optional tags', () => {
    const r = POSTCARD_FRONTMATTER.safeParse({
      number: 1,
      published: '2026-04-22',
      tags: ['meta'],
    });
    expect(r.success).toBe(true);
  });
  it('rejects number = 0', () => {
    const r = POSTCARD_FRONTMATTER.safeParse({ number: 0, published: '2026-04-22' });
    expect(r.success).toBe(false);
  });
});

describe('NOW_FRONTMATTER', () => {
  it('requires currently line', () => {
    const r = NOW_FRONTMATTER.safeParse({ updated: '2026-04-22' });
    expect(r.success).toBe(false);
  });
  it('accepts valid shape', () => {
    const r = NOW_FRONTMATTER.safeParse({
      updated: '2026-04-22',
      currently: 'thinking about memory',
    });
    expect(r.success).toBe(true);
  });
});

describe('TASTE_FRONTMATTER', () => {
  it('requires at least one item', () => {
    const r = TASTE_FRONTMATTER.safeParse({ updated: '2026-04-22', items: [] });
    expect(r.success).toBe(false);
  });
  it('caps at 8 items', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ title: `${i}` }));
    const r = TASTE_FRONTMATTER.safeParse({ updated: '2026-04-22', items });
    expect(r.success).toBe(false);
  });
  it('accepts well-formed 3-item shelf', () => {
    const r = TASTE_FRONTMATTER.safeParse({
      updated: '2026-04-22',
      items: [
        { title: 'A', kind: 'book' },
        { title: 'B', by: 'Someone', link: 'https://example.com' },
        { title: 'C', note: 'note here' },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('ACCENT_TOKEN', () => {
  it('contains exactly five jewels', () => {
    expect(ACCENT_TOKEN.options.length).toBe(5);
    expect(new Set(ACCENT_TOKEN.options)).toEqual(
      new Set(['emerald', 'sapphire', 'ruby', 'topaz', 'amethyst']),
    );
  });
});
