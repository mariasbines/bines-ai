import 'server-only';

import { getAllFieldwork } from './fieldwork';
import { getAllPostcards } from './postcards';
import { getNow } from './now';
import { DEFAULT_CONTENT_ROOT } from './paths';
import type { SiteStats } from './types';

interface LoaderOptions {
  contentRoot?: string;
}

/**
 * Aggregate counts for <CurrentlyStrip> + archive header.
 *
 * `updated` = max of:
 *   - /now `updated` if present
 *   - latest `published` across Fieldwork
 *   - latest `published` across Postcards
 *   - falls back to epoch 0 if the site is completely empty
 */
export async function getSiteStats(options: LoaderOptions = {}): Promise<SiteStats> {
  const root = options.contentRoot ?? DEFAULT_CONTENT_ROOT;
  const [fw, pc, now] = await Promise.all([
    getAllFieldwork({ contentRoot: root }),
    getAllPostcards({ contentRoot: root }),
    getNow({ contentRoot: root }),
  ]);

  const changedMyMindCount = fw.filter(
    (p) => p.frontmatter.status === 'changed-my-mind',
  ).length;
  // Strip count == /fieldwork visible count (in-rotation only). Retired and
  // changed-my-mind pieces live at /archive and /changed-my-mind respectively
  // and are surfaced through their own counters / nav entries.
  const fieldworkCount = fw.filter(
    (p) => p.frontmatter.status === 'in-rotation',
  ).length;

  const candidates: string[] = [];
  if (now) candidates.push(now.frontmatter.updated);
  if (fw[0]) candidates.push(fw[0].frontmatter.published);
  if (pc[0]) candidates.push(pc[0].frontmatter.published);

  const latestIso =
    candidates.length === 0
      ? '1970-01-01'
      : candidates.sort().reverse()[0];

  return {
    fieldworkCount,
    postcardCount: pc.length,
    changedMyMindCount,
    updated: new Date(`${latestIso}T00:00:00Z`),
  };
}
