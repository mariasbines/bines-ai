import 'server-only';

import { listMdxFiles, readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { FIELDWORK_FRONTMATTER, type Fieldwork, type FieldworkStatus } from './types';

interface LoaderOptions {
  contentRoot?: string;
  /** Filter by status — e.g. only `in-rotation` pieces for homepage. */
  status?: FieldworkStatus;
}

/**
 * Read every `.mdx` under `content/fieldwork`, validate, return sorted
 * descending by `published`. Empty dir = [].
 */
export async function getAllFieldwork(options: LoaderOptions = {}): Promise<Fieldwork[]> {
  const { fieldworkDir } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  const files = await listMdxFiles(fieldworkDir);

  const pieces = await Promise.all(
    files.map((f) => readMdxFile(f, FIELDWORK_FRONTMATTER)),
  );

  const filtered = options.status
    ? pieces.filter((p) => p.frontmatter.status === options.status)
    : pieces;

  return filtered.sort((a, b) =>
    b.frontmatter.published.localeCompare(a.frontmatter.published),
  );
}

/** Returns null if no piece matches `slug`. Never throws for missing slug. */
export async function getFieldworkBySlug(
  slug: string,
  options: Omit<LoaderOptions, 'status'> = {},
): Promise<Fieldwork | null> {
  const all = await getAllFieldwork({ contentRoot: options.contentRoot });
  return all.find((p) => p.frontmatter.slug === slug) ?? null;
}

/** Shortcut for a single status — used by /archive in 001.009. */
export async function getFieldworkByStatus(
  status: FieldworkStatus,
  options: Omit<LoaderOptions, 'status'> = {},
): Promise<Fieldwork[]> {
  return getAllFieldwork({ ...options, status });
}

/** For /archive grouping (001.009 consumer). Empty categories map to []. */
export async function getFieldworkGroupedByStatus(
  options: Omit<LoaderOptions, 'status'> = {},
): Promise<Record<FieldworkStatus, Fieldwork[]>> {
  const all = await getAllFieldwork({ contentRoot: options.contentRoot });
  const groups: Record<FieldworkStatus, Fieldwork[]> = {
    'in-rotation': [],
    'retired-still-right': [],
    'retired-evolved': [],
    'changed-my-mind': [],
  };
  for (const piece of all) {
    groups[piece.frontmatter.status].push(piece);
  }
  return groups;
}
