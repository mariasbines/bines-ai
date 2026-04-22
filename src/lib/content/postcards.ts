import 'server-only';

import { listMdxFiles, readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { POSTCARD_FRONTMATTER, type Postcard } from './types';

interface LoaderOptions {
  contentRoot?: string;
}

export async function getAllPostcards(options: LoaderOptions = {}): Promise<Postcard[]> {
  const { postcardsDir } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  const files = await listMdxFiles(postcardsDir);
  const cards = await Promise.all(
    files.map((f) => readMdxFile(f, POSTCARD_FRONTMATTER)),
  );
  return cards.sort(
    (a, b) => b.frontmatter.number - a.frontmatter.number,
  );
}

/** Returns null if no postcard has that number. */
export async function getPostcardByNumber(
  number: number,
  options: LoaderOptions = {},
): Promise<Postcard | null> {
  const all = await getAllPostcards(options);
  return all.find((p) => p.frontmatter.number === number) ?? null;
}
