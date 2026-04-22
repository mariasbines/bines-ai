import 'server-only';

import { readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { TASTE_FRONTMATTER, type Taste } from './types';

interface LoaderOptions {
  contentRoot?: string;
}

export async function getTaste(options: LoaderOptions = {}): Promise<Taste | null> {
  const { tasteFile } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  try {
    return await readMdxFile(tasteFile, TASTE_FRONTMATTER);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
