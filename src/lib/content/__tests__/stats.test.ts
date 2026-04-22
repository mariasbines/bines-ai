import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getSiteStats } from '../stats';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-stats-'));
  await fs.mkdir(path.join(tmp, 'fieldwork'));
  await fs.mkdir(path.join(tmp, 'postcards'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeFw(
  name: string,
  slug: string,
  id: number,
  status: string,
  published: string,
) {
  const front = {
    id,
    slug,
    title: slug,
    published,
    status,
    tags: ['memory'],
    media: { readMinutes: 5 },
    pushback: { count: 0 },
    excerpt: 'ex',
  };
  await fs.writeFile(
    path.join(tmp, 'fieldwork', name),
    `---\n${Object.entries(front)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n')}\n---\nBody`,
  );
}

describe('getSiteStats', () => {
  it('returns zeros for empty site', async () => {
    const out = await getSiteStats({ contentRoot: tmp });
    expect(out.fieldworkCount).toBe(0);
    expect(out.postcardCount).toBe(0);
    expect(out.changedMyMindCount).toBe(0);
    expect(out.updated.toISOString().startsWith('1970')).toBe(true);
  });
  it('counts fieldwork pieces and changed-my-mind separately', async () => {
    await writeFw('1.mdx', 'a', 1, 'in-rotation', '2026-04-01');
    await writeFw('2.mdx', 'b', 2, 'changed-my-mind', '2026-03-01');
    const out = await getSiteStats({ contentRoot: tmp });
    expect(out.fieldworkCount).toBe(2);
    expect(out.changedMyMindCount).toBe(1);
  });
  it('derives updated from most recent publish', async () => {
    await writeFw('1.mdx', 'a', 1, 'in-rotation', '2026-04-22');
    await writeFw('2.mdx', 'b', 2, 'in-rotation', '2026-03-01');
    const out = await getSiteStats({ contentRoot: tmp });
    expect(out.updated.toISOString().startsWith('2026-04-22')).toBe(true);
  });
});
