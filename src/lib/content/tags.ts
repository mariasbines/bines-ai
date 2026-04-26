import 'server-only';
import { getAllFieldwork } from './fieldwork';
import { getAllPostcards } from './postcards';
import type { Fieldwork, Postcard } from './types';

export interface TagPieces {
  tag: string;
  fieldwork: Fieldwork[];
  postcards: Postcard[];
}

/**
 * All distinct tags used across Fieldwork + Postcards, sorted alphabetically.
 * Tags are already lowercase-kebab (validated in `types.ts`), so the tag
 * string IS the URL slug — no transform needed.
 */
export async function getAllTags(): Promise<string[]> {
  const [fw, pc] = await Promise.all([getAllFieldwork(), getAllPostcards()]);
  const set = new Set<string>();
  for (const piece of fw) {
    for (const tag of piece.frontmatter.tags) set.add(tag);
  }
  for (const card of pc) {
    for (const tag of card.frontmatter.tags ?? []) set.add(tag);
  }
  return [...set].sort();
}

/**
 * Every Fieldwork + Postcard carrying the given tag. Returns empty arrays
 * (not throws) for unknown tags — the route is responsible for `notFound()`.
 */
export async function getPiecesByTag(tag: string): Promise<TagPieces> {
  const [fw, pc] = await Promise.all([getAllFieldwork(), getAllPostcards()]);
  return {
    tag,
    fieldwork: fw.filter((p) => p.frontmatter.tags.includes(tag)),
    postcards: pc.filter((p) => p.frontmatter.tags?.includes(tag) ?? false),
  };
}
