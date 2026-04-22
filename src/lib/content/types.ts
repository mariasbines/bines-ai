import { z } from 'zod';

/** Deterministic five-jewel accent tokens from Palette A. */
export const ACCENT_TOKEN = z.enum([
  'emerald',
  'sapphire',
  'ruby',
  'topaz',
  'amethyst',
]);
export type AccentToken = z.infer<typeof ACCENT_TOKEN>;

/** A non-empty lowercase-kebab string — e.g. `memory`, `change-my-mind`. */
const TAG = z
  .string()
  .min(1, 'tag cannot be empty')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'tag must be lowercase-kebab (alphanumeric + single hyphens)',
  );

const FIELDWORK_STATUS = z.enum([
  'in-rotation',
  'retired-still-right',
  'retired-evolved',
  'changed-my-mind',
]);
export type FieldworkStatus = z.infer<typeof FIELDWORK_STATUS>;

const MEDIA = z.object({
  readMinutes: z.number().int().positive(),
  watchMinutes: z.number().int().positive().optional(),
  headerVideo: z.string().url().optional(),
  posterFrame: z.string().url().optional(),
  captions: z.string().url().optional(),
  testimonial: z.string().url().optional(),
  testimonialCaptions: z.string().url().optional(),
});
export type Media = z.infer<typeof MEDIA>;

const PUSHBACK = z.object({
  count: z.number().int().nonnegative(),
  landed: z.number().int().nonnegative().optional(),
});

const CHANGE_MY_MIND = z.object({
  count: z.number().int().nonnegative(),
  note: z.string().optional(),
});

/**
 * Fieldwork frontmatter — base schema.
 *
 * NOTE: 001.010 will extend this into a discriminated union on `status`.
 * For 001.003 we accept all four enum values on `status` and leave the
 * changed-my-mind extension fields (`supersedes`, `originalPosition`,
 * `newPosition`) as optional top-level fields. Callers that don't care
 * (001.004 - 001.009) simply ignore them.
 */
export const FIELDWORK_FRONTMATTER = z.object({
  id: z.number().int().positive(),
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'slug must be lowercase-kebab',
    ),
  title: z.string().min(1),
  published: z.iso.date(),
  revised: z.array(z.iso.date()).optional(),
  status: FIELDWORK_STATUS,
  retiredAt: z.iso.date().optional(),
  retiredReason: z.string().optional(),
  retiredReplacedBy: z.string().optional(),
  supersedes: z.string().optional(),
  originalPosition: z.string().optional(),
  newPosition: z.string().optional(),
  tags: z.array(TAG).min(1, 'fieldwork must have at least one tag'),
  media: MEDIA,
  pushback: PUSHBACK,
  changeMyMind: CHANGE_MY_MIND.optional(),
  excerpt: z.string().min(1),
  accent: ACCENT_TOKEN.optional(),
});
export type FieldworkFrontmatter = z.infer<typeof FIELDWORK_FRONTMATTER>;

export interface Fieldwork {
  frontmatter: FieldworkFrontmatter;
  body: string;
  filePath: string;
}

/** Postcard frontmatter — simple numbered vanity-card style. */
export const POSTCARD_FRONTMATTER = z.object({
  number: z.number().int().positive(),
  published: z.iso.date(),
  tags: z.array(TAG).optional(),
  accent: ACCENT_TOKEN.optional(),
});
export type PostcardFrontmatter = z.infer<typeof POSTCARD_FRONTMATTER>;

export interface Postcard {
  frontmatter: PostcardFrontmatter;
  body: string;
  filePath: string;
}

/** /now frontmatter — single file, monthly edit. */
export const NOW_FRONTMATTER = z.object({
  updated: z.iso.date(),
  currently: z.string().min(1),
  accent: ACCENT_TOKEN.optional(),
});
export type NowFrontmatter = z.infer<typeof NOW_FRONTMATTER>;

export interface Now {
  frontmatter: NowFrontmatter;
  body: string;
  filePath: string;
}

/** Taste shelf item — 3-5 per /taste page. */
const TASTE_ITEM = z.object({
  title: z.string().min(1),
  by: z.string().optional(),
  link: z.string().url().optional(),
  note: z.string().optional(),
  kind: z.enum(['book', 'essay', 'show', 'film', 'album', 'track', 'other']).optional(),
});
export type TasteItem = z.infer<typeof TASTE_ITEM>;

export const TASTE_FRONTMATTER = z.object({
  updated: z.iso.date(),
  items: z.array(TASTE_ITEM).min(1).max(8),
  accent: ACCENT_TOKEN.optional(),
});
export type TasteFrontmatter = z.infer<typeof TASTE_FRONTMATTER>;

export interface Taste {
  frontmatter: TasteFrontmatter;
  body: string;
  filePath: string;
}

/** Aggregate counts for the <CurrentlyStrip> + archive header. */
export interface SiteStats {
  fieldworkCount: number;
  postcardCount: number;
  changedMyMindCount: number;
  updated: Date;
}
