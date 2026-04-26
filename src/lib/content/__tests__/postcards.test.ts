import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getAllPostcards, getPostcardByNumber } from '../postcards';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-pc-'));
  await fs.mkdir(path.join(tmp, 'postcards'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writePc(name: string, front: Record<string, unknown>) {
  const body = `---\n${Object.entries(front)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')}\n---\nBody`;
  await fs.writeFile(path.join(tmp, 'postcards', name), body);
}

describe('getAllPostcards', () => {
  it('returns [] for empty dir', async () => {
    const out = await getAllPostcards({ contentRoot: tmp });
    expect(out).toEqual([]);
  });
  it('sorts by number descending', async () => {
    await writePc('001.mdx', { number: 1, published: '2026-01-01' });
    await writePc('002.mdx', { number: 2, published: '2026-02-01' });
    await writePc('003.mdx', { number: 3, published: '2026-03-01' });
    const out = await getAllPostcards({ contentRoot: tmp });
    expect(out.map((p) => p.frontmatter.number)).toEqual([3, 2, 1]);
  });
});

describe('getPostcardByNumber', () => {
  it('returns null for unknown number', async () => {
    await writePc('001.mdx', { number: 1, published: '2026-01-01' });
    expect(await getPostcardByNumber(42, { contentRoot: tmp })).toBeNull();
  });
  it('returns matching postcard', async () => {
    await writePc('001.mdx', { number: 1, published: '2026-01-01' });
    const out = await getPostcardByNumber(1, { contentRoot: tmp });
    expect(out?.frontmatter.number).toBe(1);
  });
});
