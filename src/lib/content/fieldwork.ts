import 'server-only';

import { getJudgesForSlug, type PushbackEnrichment } from '@/lib/argue-judge/loader';
import { ContentValidationError, listMdxFiles, readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { FIELDWORK_FRONTMATTER, type Fieldwork, type FieldworkStatus } from './types';

interface LoaderOptions {
  contentRoot?: string;
  /** Filter by status — e.g. only `in-rotation` pieces for homepage. */
  status?: FieldworkStatus;
}

const EMPTY_ENRICHMENT: PushbackEnrichment = { count: 0, landed: 0, excerpts: [] };

/**
 * Read every `.mdx` under `content/fieldwork`, validate, return sorted
 * descending by `published`. Empty dir = [].
 *
 * Each piece is enriched at build time with the judge-derived pushback
 * summary via `getJudgesForSlug`. The `.catch()` makes any enrichment
 * failure non-fatal: build always completes with the empty enrichment
 * shape (count=0, landed=0, excerpts=[]). `getJudgesForSlug` already
 * catches its own internal errors and returns null; the outer `.catch()`
 * is belt-and-braces against module-load failures or unexpected throws
 * outside of `getJudgesForSlug`'s try/catch (PB2-OPS-004).
 */
export async function getAllFieldwork(options: LoaderOptions = {}): Promise<Fieldwork[]> {
  const { fieldworkDir } = contentPaths(options.contentRoot ?? DEFAULT_CONTENT_ROOT);
  const files = await listMdxFiles(fieldworkDir);

  const pieces = await Promise.all(
    files.map((f) => readMdxFile(f, FIELDWORK_FRONTMATTER)),
  );

  const enriched: Fieldwork[] = await Promise.all(
    pieces.map(async (p) => {
      const enrichment = await getJudgesForSlug(p.frontmatter.slug).catch(
        (err: unknown) => {
          console.error(
            '[fieldwork] judge enrichment failed for',
            p.frontmatter.slug,
            '—',
            err instanceof Error ? err.name : 'unknown',
          );
          return null;
        },
      );
      return { ...p, pushback: enrichment ?? EMPTY_ENRICHMENT };
    }),
  );

  const filtered = options.status
    ? enriched.filter((p) => p.frontmatter.status === options.status)
    : enriched;

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

/**
 * Validate that each `changed-my-mind` piece's `supersedes` points at a real
 * Fieldwork slug with a retired status. Throws ContentValidationError on
 * mismatch. Intended for build-time invocation (e.g. from
 * /changed-my-mind/[slug]/generateStaticParams).
 */
export function validateChangedMyMindReferences(pieces: Fieldwork[]): void {
  const bySlug = new Map(pieces.map((p) => [p.frontmatter.slug, p]));
  for (const piece of pieces) {
    if (piece.frontmatter.status !== 'changed-my-mind') continue;
    const supersedes = piece.frontmatter.supersedes;
    const target = bySlug.get(supersedes);
    if (!target) {
      throw new ContentValidationError(
        piece.filePath,
        { supersedes },
        `${piece.filePath}: supersedes references unknown slug "${supersedes}"`,
      );
    }
    if (
      target.frontmatter.status !== 'retired-still-right' &&
      target.frontmatter.status !== 'retired-evolved'
    ) {
      throw new ContentValidationError(
        piece.filePath,
        { supersedes, targetStatus: target.frontmatter.status },
        `${piece.filePath}: supersedes target "${supersedes}" has status "${target.frontmatter.status}"; must be retired`,
      );
    }
  }
}
