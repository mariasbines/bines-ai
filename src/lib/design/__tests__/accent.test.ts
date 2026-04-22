import { describe, it, expect } from 'vitest';
import { accentFor, accentVar, ACCENT_ORDER } from '../accent';
import type { Fieldwork } from '@/lib/content/types';

function mkPiece(id: number, accent?: Fieldwork['frontmatter']['accent']): Fieldwork {
  return {
    frontmatter: {
      id,
      slug: 'x',
      title: 'x',
      published: '2026-04-22',
      status: 'in-rotation',
      tags: ['memory'],
      media: { readMinutes: 5 },
      pushback: { count: 0 },
      excerpt: 'ex',
      ...(accent ? { accent } : {}),
    } as Fieldwork['frontmatter'],
    body: '',
    filePath: '',
  };
}

describe('accentFor', () => {
  it('uses explicit frontmatter accent when present', () => {
    expect(accentFor(mkPiece(3, 'ruby'))).toBe('ruby');
  });
  it('falls back to id % 5 when accent absent', () => {
    for (let i = 0; i < 10; i++) {
      expect(accentFor(mkPiece(i))).toBe(ACCENT_ORDER[i % ACCENT_ORDER.length]);
    }
  });
  it('rotates deterministically (same id → same accent across calls)', () => {
    expect(accentFor(mkPiece(7))).toBe(accentFor(mkPiece(7)));
  });
});

describe('accentVar', () => {
  it('emits var(--color-<token>)', () => {
    expect(accentVar('emerald')).toBe('var(--color-emerald)');
    expect(accentVar('amethyst')).toBe('var(--color-amethyst)');
  });
});

describe('ACCENT_ORDER', () => {
  it('contains exactly 5 jewels in fixed order', () => {
    expect(ACCENT_ORDER).toEqual(['emerald', 'sapphire', 'ruby', 'topaz', 'amethyst']);
  });
});
