import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getAllFieldwork,
  getFieldworkBySlug,
  getFieldworkByStatus,
  getFieldworkGroupedByStatus,
  validateChangedMyMindReferences,
} from '../fieldwork';
import type { Fieldwork } from '../types';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-fw-'));
  await fs.mkdir(path.join(tmp, 'fieldwork'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeFw(name: string, front: Record<string, unknown>) {
  const body = `---\n${Object.entries(front)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')}\n---\nBody`;
  await fs.writeFile(path.join(tmp, 'fieldwork', name), body);
}

const BASE = {
  id: 1,
  slug: '01-a',
  title: 'A',
  published: '2026-04-20',
  status: 'in-rotation',
  tags: ['memory'],
  media: { readMinutes: 5 },
  pushback: { count: 0 },
  excerpt: 'ex',
};

describe('getAllFieldwork', () => {
  it('returns empty array for empty directory', async () => {
    const out = await getAllFieldwork({ contentRoot: tmp });
    expect(out).toEqual([]);
  });
  it('returns empty array when content root has no fieldwork subdir', async () => {
    const bare = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-bare-'));
    const out = await getAllFieldwork({ contentRoot: bare });
    expect(out).toEqual([]);
    await fs.rm(bare, { recursive: true, force: true });
  });
  it('sorts by published descending', async () => {
    await writeFw('01.mdx', { ...BASE, id: 1, slug: '01', published: '2026-04-01' });
    await writeFw('02.mdx', { ...BASE, id: 2, slug: '02', published: '2026-04-22' });
    await writeFw('03.mdx', { ...BASE, id: 3, slug: '03', published: '2026-04-15' });
    const out = await getAllFieldwork({ contentRoot: tmp });
    expect(out.map((p) => p.frontmatter.slug)).toEqual(['02', '03', '01']);
  });
  it('filters by status', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a', status: 'in-rotation' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b', status: 'retired-still-right' });
    const out = await getAllFieldwork({ contentRoot: tmp, status: 'in-rotation' });
    expect(out).toHaveLength(1);
    expect(out[0].frontmatter.slug).toBe('a');
  });
});

describe('getFieldworkBySlug', () => {
  it('returns null for unknown slug', async () => {
    await writeFw('a.mdx', { ...BASE, slug: 'a' });
    const out = await getFieldworkBySlug('z', { contentRoot: tmp });
    expect(out).toBeNull();
  });
  it('returns matching piece', async () => {
    await writeFw('a.mdx', { ...BASE, slug: 'a' });
    const out = await getFieldworkBySlug('a', { contentRoot: tmp });
    expect(out?.frontmatter.slug).toBe('a');
  });
});

describe('getFieldworkByStatus', () => {
  it('returns only pieces matching status', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a', status: 'retired-evolved' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b', status: 'in-rotation' });
    const out = await getFieldworkByStatus('retired-evolved', { contentRoot: tmp });
    expect(out).toHaveLength(1);
    expect(out[0].frontmatter.slug).toBe('a');
  });
});

describe('getFieldworkGroupedByStatus', () => {
  it('partitions pieces into status buckets', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a', status: 'in-rotation' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b', status: 'retired-still-right' });
    await writeFw('c.mdx', { ...BASE, id: 3, slug: 'c', status: 'retired-evolved' });
    const out = await getFieldworkGroupedByStatus({ contentRoot: tmp });
    expect(out['in-rotation']).toHaveLength(1);
    expect(out['retired-still-right']).toHaveLength(1);
    expect(out['retired-evolved']).toHaveLength(1);
    expect(out['changed-my-mind']).toEqual([]);
  });
});

describe('malformed frontmatter', () => {
  it('throws with informative message for bad enum', async () => {
    await fs.writeFile(
      path.join(tmp, 'fieldwork', 'broken.mdx'),
      `---\nstatus: archived\n---\nbody`,
    );
    await expect(getAllFieldwork({ contentRoot: tmp })).rejects.toThrow(/broken\.mdx/);
  });
  it('throws with informative message for empty frontmatter', async () => {
    // Addresses L-001 from the grade — harder error-path coverage
    await fs.writeFile(path.join(tmp, 'fieldwork', 'empty.mdx'), `---\n---\nbody`);
    await expect(getAllFieldwork({ contentRoot: tmp })).rejects.toThrow(/empty\.mdx/);
  });
});

function makePiece(extras: {
  slug: string;
  status: Fieldwork['frontmatter']['status'];
  supersedes?: string;
  originalPosition?: string;
  newPosition?: string;
}): Fieldwork {
  const base = {
    id: 1,
    title: 't',
    published: '2026-04-22',
    tags: ['memory'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'e',
    ...extras,
  } as Fieldwork['frontmatter'];
  return { frontmatter: base, body: '', filePath: `/tmp/${extras.slug}.mdx` };
}

describe('validateChangedMyMindReferences', () => {
  it('passes when no changed-my-mind pieces exist', () => {
    expect(() => validateChangedMyMindReferences([])).not.toThrow();
  });
  it('passes when supersedes points at a retired-still-right piece', () => {
    const pieces = [
      makePiece({ slug: 'a', status: 'retired-still-right' }),
      makePiece({
        slug: 'b',
        status: 'changed-my-mind',
        supersedes: 'a',
        originalPosition: 'o',
        newPosition: 'n',
      }),
    ];
    expect(() => validateChangedMyMindReferences(pieces)).not.toThrow();
  });
  it('passes when supersedes points at a retired-evolved piece', () => {
    const pieces = [
      makePiece({ slug: 'a', status: 'retired-evolved' }),
      makePiece({
        slug: 'b',
        status: 'changed-my-mind',
        supersedes: 'a',
        originalPosition: 'o',
        newPosition: 'n',
      }),
    ];
    expect(() => validateChangedMyMindReferences(pieces)).not.toThrow();
  });
  it('throws when supersedes points at a non-existent slug', () => {
    const pieces = [
      makePiece({
        slug: 'b',
        status: 'changed-my-mind',
        supersedes: 'missing',
        originalPosition: 'o',
        newPosition: 'n',
      }),
    ];
    expect(() => validateChangedMyMindReferences(pieces)).toThrow(/missing/);
  });
  it('throws when supersedes points at an in-rotation piece', () => {
    const pieces = [
      makePiece({ slug: 'a', status: 'in-rotation' }),
      makePiece({
        slug: 'b',
        status: 'changed-my-mind',
        supersedes: 'a',
        originalPosition: 'o',
        newPosition: 'n',
      }),
    ];
    expect(() => validateChangedMyMindReferences(pieces)).toThrow(/in-rotation/);
  });
});
