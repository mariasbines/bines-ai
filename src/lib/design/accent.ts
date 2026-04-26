import type { AccentToken } from '@/lib/content/types';

export const ACCENT_ORDER: readonly AccentToken[] = [
  'emerald',
  'sapphire',
  'ruby',
  'topaz',
  'amethyst',
] as const;

/** Deterministic accent for a piece — explicit frontmatter first, id % 5 fallback. */
export function accentFor(piece: {
  frontmatter: { accent?: AccentToken; id: number };
}): AccentToken {
  return piece.frontmatter.accent ?? ACCENT_ORDER[piece.frontmatter.id % ACCENT_ORDER.length];
}

/** CSS `var()` reference for a jewel token — lets consumers set --color-accent. */
export function accentVar(token: AccentToken): string {
  return `var(--color-${token})`;
}
