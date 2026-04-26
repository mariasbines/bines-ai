import 'server-only';

import { readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { NOW_FRONTMATTER, type Now } from './types';

interface LoaderOptions {
  contentRoot?: string;
}

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
