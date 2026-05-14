import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';

import { readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { NOW_FRONTMATTER, type Now } from './types';

interface LoaderOptions {
  contentRoot?: string;
}

/** Filenames in `content/now-archive/` must match YYYY-MM-DD.mdx. */
const NOW_ARCHIVE_FILE = /^(\d{4}-\d{2}-\d{2})\.mdx$/;

/**
 * Returns the /now content. Returns null if `content/now.mdx` does not
 * exist yet (story 001.008 seeds it). Callers can decide: 001.008's
 * page throws, the <CurrentlyStrip> composer falls back to placeholder.
 */
export async function getNow(options: LoaderOptions = {}): Promise<Now | null> {
  const { nowFile } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  try {
    return await readMdxFile(nowFile, NOW_FRONTMATTER);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function getCurrentlyLine(options: LoaderOptions = {}): Promise<string | null> {
  const now = await getNow(options);
  return now?.frontmatter.currently ?? null;
}

/**
 * Returns past /now entries from `content/now-archive/`, newest first.
 * Each filename must match YYYY-MM-DD.mdx; the date drives both sort
 * order and the `/now/[date]` route slug.
 */
export async function listNowArchive(options: LoaderOptions = {}): Promise<Now[]> {
  const { nowArchiveDir } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  let entries: string[];
  try {
    entries = await fs.readdir(nowArchiveDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const dated = entries
    .map((name) => NOW_ARCHIVE_FILE.exec(name))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ date: m[1], file: path.join(nowArchiveDir, m[0]) }));

  const loaded = await Promise.all(
    dated.map(async ({ file }) => readMdxFile(file, NOW_FRONTMATTER)),
  );
  return loaded.sort((a, b) =>
    b.frontmatter.updated.localeCompare(a.frontmatter.updated),
  );
}

/** Returns a single archived /now by its YYYY-MM-DD date slug. */
export async function getNowByDate(
  date: string,
  options: LoaderOptions = {},
): Promise<Now | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const { nowArchiveDir } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  try {
    return await readMdxFile(path.join(nowArchiveDir, `${date}.mdx`), NOW_FRONTMATTER);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
