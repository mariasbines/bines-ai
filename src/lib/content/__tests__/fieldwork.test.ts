import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock the judge enrichment loader before importing the module under test.
// Default behaviour: returns null (no enrichment) — matches the "no judges
// yet" baseline so existing tests are unaffected. Individual tests in the
// new pushback-enrichment describe block override the resolved value.
const { mockGetJudgesForSlug } = vi.hoisted(() => ({
  mockGetJudgesForSlug: vi.fn(),
}));

vi.mock('@/lib/argue-judge/loader', () => ({
  getJudgesForSlug: (slug: string) => mockGetJudgesForSlug(slug),
}));

import {
  GALLERY_SCOPE,
  getAllFieldwork,
  getFieldworkBySlug,
  getFieldworkByStatus,
  getFieldworkGroupedByStatus,
  getGalleryFieldwork,
  validateChangedMyMindReferences,
} from '../fieldwork';
import type { Fieldwork } from '../types';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-fw-'));
  await fs.mkdir(path.join(tmp, 'fieldwork'));
  mockGetJudgesForSlug.mockReset();
  // Default: enrichment returns null (loader convention for "no data /
  // error suppressed"). The loader handles this by substituting the empty
  // shape.
  mockGetJudgesForSlug.mockResolvedValue(null);
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
  it('accepts an array of statuses and returns the union', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a', status: 'in-rotation' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b', status: 'retired-still-right' });
    await writeFw('c.mdx', {
      ...BASE,
      id: 3,
      slug: 'c',
      status: 'changed-my-mind',
      supersedes: 'b',
      originalPosition: 'o',
      newPosition: 'n',
    });
    const out = await getAllFieldwork({
      contentRoot: tmp,
      status: ['in-rotation', 'changed-my-mind'],
    });
    expect(out.map((p) => p.frontmatter.slug).sort()).toEqual(['a', 'c']);
  });
  it('treats a single-element array status the same as a single-string status', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a', status: 'in-rotation' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b', status: 'retired-still-right' });
    const single = await getAllFieldwork({ contentRoot: tmp, status: 'in-rotation' });
    const arrayed = await getAllFieldwork({ contentRoot: tmp, status: ['in-rotation'] });
    expect(arrayed.map((p) => p.frontmatter.slug)).toEqual(single.map((p) => p.frontmatter.slug));
  });
});

describe('getGalleryFieldwork', () => {
  it('returns the union of in-rotation + changed-my-mind, sorted descending by published', async () => {
    await writeFw('a.mdx', {
      ...BASE,
      id: 1,
      slug: 'a',
      status: 'in-rotation',
      published: '2026-05-10',
    });
    await writeFw('b.mdx', {
      ...BASE,
      id: 2,
      slug: 'b',
      status: 'retired-still-right',
      published: '2026-04-01',
    });
    await writeFw('c.mdx', {
      ...BASE,
      id: 3,
      slug: 'c',
      status: 'changed-my-mind',
      supersedes: 'b',
      originalPosition: 'o',
      newPosition: 'n',
      published: '2026-05-20',
    });
    const out = await getGalleryFieldwork({ contentRoot: tmp });
    expect(out.map((p) => p.frontmatter.slug)).toEqual(['c', 'a']);
  });
  it('excludes retired pieces (FW05 guard — story 005.001 AC-001.6)', async () => {
    await writeFw('rot.mdx', { ...BASE, id: 1, slug: 'rot', status: 'in-rotation' });
    await writeFw('still.mdx', { ...BASE, id: 2, slug: 'still', status: 'retired-still-right' });
    await writeFw('evolved.mdx', {
      ...BASE,
      id: 5,
      slug: 'fw05',
      status: 'retired-evolved',
    });
    const out = await getGalleryFieldwork({ contentRoot: tmp });
    const slugs = out.map((p) => p.frontmatter.slug);
    expect(slugs).not.toContain('fw05');
    expect(slugs).not.toContain('still');
    expect(slugs).toContain('rot');
  });
});

describe('GALLERY_SCOPE constant', () => {
  it('contains exactly in-rotation + changed-my-mind', () => {
    expect([...GALLERY_SCOPE].sort()).toEqual(['changed-my-mind', 'in-rotation']);
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

// Story 003.007 — getJudgesForSlug enrichment. Verifies the loader merges
// judge-derived data into each returned piece's `pushback` field, the
// loader is authoritative over frontmatter, and enrichment failures are
// non-fatal.
describe('getAllFieldwork — pushback enrichment (story 003.007)', () => {
  it('(a) merges enrichment shape into pushback when getJudgesForSlug returns data', async () => {
    mockGetJudgesForSlug.mockResolvedValue({
      count: 4,
      landed: 1,
      excerpts: ['line one', 'line two', 'line three'],
    });
    await writeFw('a.mdx', { ...BASE, slug: 'a' });
    const [piece] = await getAllFieldwork({ contentRoot: tmp });
    expect(piece.pushback).toEqual({
      count: 4,
      landed: 1,
      excerpts: ['line one', 'line two', 'line three'],
    });
    expect(mockGetJudgesForSlug).toHaveBeenCalledWith('a');
  });

  it('(b) defaults to empty enrichment when getJudgesForSlug returns null', async () => {
    mockGetJudgesForSlug.mockResolvedValue(null);
    await writeFw('a.mdx', { ...BASE, slug: 'a' });
    const [piece] = await getAllFieldwork({ contentRoot: tmp });
    expect(piece.pushback).toEqual({ count: 0, landed: 0, excerpts: [] });
  });

  it('(c) caught: getJudgesForSlug throws → empty enrichment, no throw escapes', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetJudgesForSlug.mockRejectedValue(new Error('blob unreachable'));
    await writeFw('a.mdx', { ...BASE, slug: 'a' });

    const result = await getAllFieldwork({ contentRoot: tmp });
    expect(result).toHaveLength(1);
    expect(result[0].pushback).toEqual({ count: 0, landed: 0, excerpts: [] });
    expect(
      errSpy.mock.calls.some((args) =>
        String(args[0] ?? '').includes('judge enrichment failed'),
      ),
    ).toBe(true);
    errSpy.mockRestore();
  });

  it('(d) loader is authoritative: frontmatter pushback.count is overridden by enrichment', async () => {
    // Frontmatter says count: 5, enrichment says count: 2 — enrichment wins.
    mockGetJudgesForSlug.mockResolvedValue({ count: 2, landed: 0, excerpts: ['from judges'] });
    await writeFw('a.mdx', { ...BASE, slug: 'a', pushback: { count: 5 } });
    const [piece] = await getAllFieldwork({ contentRoot: tmp });
    // The frontmatter Zod field still says 5 — but the runtime pushback
    // shape is the loader's. v2 consumers read piece.pushback, not
    // piece.frontmatter.pushback.
    expect(piece.frontmatter.pushback.count).toBe(5);
    expect(piece.pushback.count).toBe(2);
    expect(piece.pushback.excerpts).toEqual(['from judges']);
  });

  it('calls getJudgesForSlug once per piece (no over-fetching)', async () => {
    await writeFw('a.mdx', { ...BASE, id: 1, slug: 'a' });
    await writeFw('b.mdx', { ...BASE, id: 2, slug: 'b' });
    await writeFw('c.mdx', { ...BASE, id: 3, slug: 'c' });
    await getAllFieldwork({ contentRoot: tmp });
    expect(mockGetJudgesForSlug).toHaveBeenCalledTimes(3);
    const slugsRequested = mockGetJudgesForSlug.mock.calls.map((c) => c[0]).sort();
    expect(slugsRequested).toEqual(['a', 'b', 'c']);
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
  return { frontmatter: base, body: '', filePath: `/tmp/${extras.slug}.mdx`, pushback: { count: 0, landed: 0, excerpts: [] } };
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
