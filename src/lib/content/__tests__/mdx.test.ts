import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readMdxFile, listMdxFiles, ContentValidationError } from '../mdx';
import { FIELDWORK_FRONTMATTER } from '../types';

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bines-content-'));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

const VALID_FRONTMATTER = `---
id: 1
slug: "01-foo"
title: "Foo"
published: "2026-04-22"
status: "in-rotation"
tags: [memory]
media:
  readMinutes: 5
pushback:
  count: 0
excerpt: "Short"
---
Body text here.`;

describe('readMdxFile', () => {
  it('parses valid frontmatter and body', async () => {
    const file = path.join(tmp, 'piece.mdx');
    await fs.writeFile(file, VALID_FRONTMATTER);
    const out = await readMdxFile(file, FIELDWORK_FRONTMATTER);
    expect(out.frontmatter.id).toBe(1);
    expect(out.body.trim()).toBe('Body text here.');
    expect(out.filePath).toBe(file);
  });
  it('throws ContentValidationError with file path on bad frontmatter', async () => {
    const file = path.join(tmp, 'bad.mdx');
    await fs.writeFile(file, '---\ntitle: missing-everything\n---\nbody');
    await expect(readMdxFile(file, FIELDWORK_FRONTMATTER)).rejects.toThrow(ContentValidationError);
    await expect(readMdxFile(file, FIELDWORK_FRONTMATTER)).rejects.toThrow(file);
  });
});

describe('listMdxFiles', () => {
  it('returns [] for missing directory', async () => {
    const out = await listMdxFiles(path.join(tmp, 'does-not-exist'));
    expect(out).toEqual([]);
  });
  it('returns absolute paths sorted alphabetically', async () => {
    await fs.writeFile(path.join(tmp, 'b.mdx'), '');
    await fs.writeFile(path.join(tmp, 'a.mdx'), '');
    await fs.writeFile(path.join(tmp, 'c.txt'), ''); // should be ignored
    const out = await listMdxFiles(tmp);
    expect(out).toEqual([path.join(tmp, 'a.mdx'), path.join(tmp, 'b.mdx')]);
  });
  it('ignores non-.mdx files and subdirectories', async () => {
    await fs.writeFile(path.join(tmp, '.gitkeep'), '');
    await fs.mkdir(path.join(tmp, 'sub'));
    await fs.writeFile(path.join(tmp, 'sub', 'ignore.mdx'), '');
    await fs.writeFile(path.join(tmp, 'keep.mdx'), '');
    const out = await listMdxFiles(tmp);
    expect(out).toEqual([path.join(tmp, 'keep.mdx')]);
  });
});
