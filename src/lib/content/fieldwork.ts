import 'server-only';

import { getJudgesForSlug, type PushbackEnrichment } from '@/lib/argue-judge/loader';
import { ContentValidationError, listMdxFiles, readMdxFile } from './mdx';
import { contentPaths, DEFAULT_CONTENT_ROOT } from './paths';
import { FIELDWORK_FRONTMATTER, type Fieldwork, type FieldworkStatus } from './types';

interface LoaderOptions {
  contentRoot?: string;
  /**
   * Filter by status. Accepts a single status (e.g. `'in-rotation'` for the
   * homepage) or an array of statuses (e.g. the gallery's union of
   * `in-rotation` + `changed-my-mind`). Omitted = return all statuses.
   */
  status?: FieldworkStatus | readonly FieldworkStatus[];
}

/**
 * Status union for the /gallery page. Filter-by-status (not by manual list)
 * future-proofs the gallery scope: as pieces retire, they leave the gallery
 * automatically via their `status` field.
 */
export const GALLERY_SCOPE: readonly FieldworkStatus[] = [
  'in-rotation',
  'changed-my-mind',
] as const;

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

  const wanted = options.status
    ? new Set<FieldworkStatus>(
        typeof options.status === 'string' ? [options.status] : options.status,
      )
    : null;
  const filtered = wanted
    ? enriched.filter((p) => wanted.has(p.frontmatter.status))
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

/**
 * Gallery scope helper — returns `in-rotation` + `changed-my-mind` pieces,
 * sorted descending by `published`. Retired pieces (`retired-still-right`,
 * `retired-evolved`) are excluded by design — they live in `/archive`.
 * Used by the `/gallery` route (epic symphony-in-motion-v1, story 005.001).
 */
export async function getGalleryFieldwork(
  options: Omit<LoaderOptions, 'status'> = {},
): Promise<Fieldwork[]> {
  return getAllFieldwork({ ...options, status: GALLERY_SCOPE });
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
