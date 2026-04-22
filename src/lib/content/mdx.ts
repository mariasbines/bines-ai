import 'server-only';

import matter from 'gray-matter';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ZodType } from 'zod';

export class ContentValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly zodIssues: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

/**
 * Read an MDX file and parse its frontmatter against the given Zod schema.
 *
 * Throws `ContentValidationError` with file path + Zod issues if frontmatter
 * fails validation. Missing files throw `ENOENT`, caller decides whether
 * to return null or propagate.
 */
export async function readMdxFile<T>(
  filePath: string,
  schema: ZodType<T>,
): Promise<{ frontmatter: T; body: string; filePath: string }> {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = matter(raw);

  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    const summary = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new ContentValidationError(
      filePath,
      result.error.issues,
      `Invalid frontmatter in ${filePath}:\n${summary}`,
    );
  }

  return {
    frontmatter: result.data,
    body: parsed.content,
    filePath,
  };
}

/**
 * List all `.mdx` files in a directory (non-recursive).
 * Returns absolute paths sorted alphabetically for determinism.
 */
export async function listMdxFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
    .map((e) => path.join(dir, e.name))
    .sort();
}
