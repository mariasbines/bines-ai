import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getNow, getCurrentlyLine } from '../now';

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-now-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('getNow', () => {
  it('returns null when file is missing', async () => {
    const out = await getNow({ contentRoot: tmp });
    expect(out).toBeNull();
  });
  it('returns parsed now content when present', async () => {
    await fs.writeFile(
      path.join(tmp, 'now.mdx'),
      `---\nupdated: "2026-04-22"\ncurrently: "memory and attention"\n---\nbody`,
    );
    const out = await getNow({ contentRoot: tmp });
    expect(out?.frontmatter.updated).toBe('2026-04-22');
    expect(out?.frontmatter.currently).toBe('memory and attention');
  });
});

describe('getCurrentlyLine', () => {
  it('returns null when no now file', async () => {
    expect(await getCurrentlyLine({ contentRoot: tmp })).toBeNull();
  });
  it('returns the currently field', async () => {
    await fs.writeFile(
      path.join(tmp, 'now.mdx'),
      `---\nupdated: "2026-04-22"\ncurrently: "test thought"\n---\nbody`,
    );
    expect(await getCurrentlyLine({ contentRoot: tmp })).toBe('test thought');
  });
});
