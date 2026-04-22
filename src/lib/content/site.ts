/**
 * Locked copy and site constants. Do not improvise — voice comes from
 * 02-state-of-play.md via CLAUDE.md non-negotiables.
 */

export const BIO_LINE =
  'Kentucky-raised, London-based, accidentally Canadian-sounding. I build AI for regulated industries by day and argue with it by night.' as const;

export const SITE = {
  name: 'bines.ai',
  canonicalUrl: 'https://bines.ai',
  bio: BIO_LINE,
} as const;

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly hideInMainNav?: boolean;
}

export const NAV: readonly NavItem[] = [
  { href: '/', label: 'Home', hideInMainNav: true },
  { href: '/fieldwork', label: 'Fieldwork' },
  { href: '/postcards', label: 'Postcards' },
  { href: '/archive', label: 'Archive' },
  { href: '/now', label: 'Now' },
  { href: '/argue', label: 'Argue' },
] as const;

// Placeholder values — story 001.008 replaces these with live data from /now MDX
export const CURRENTLY_PLACEHOLDER =
  'AI memory is quietly eating one of the biggest features of human friendship';

export const SITE_STATS_PLACEHOLDER = {
  fieldwork: 1,
  postcards: 1,
  changedMyMind: 0,
  updated: new Date('2026-04-22T00:00:00Z'),
};
