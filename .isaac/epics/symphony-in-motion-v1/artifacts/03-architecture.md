# Symphony in Motion — Architecture (Phase 3)

**Epic:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Builds on:** `01-concept.md`, `02-context.md`

---

## TL;DR

A new `/gallery` page renders the 7 gallery-scope Fieldwork pieces (in-rotation + changed-my-mind) as a horizontal scroll-snap of full-viewport panels. Each panel reuses `VideoLoop` for the video, with a small extension (`pauseWhenOffscreen?: boolean`) so only the in-view video plays at a time. Per-panel chrome threads the piece's accent. Server-rendered page shell, client-rendered scroller body. Nav gets a `Gallery` entry. Mobile inherits the same horizontal-snap behaviour via native swipe. No new dependencies.

---

## Layout decision

**Horizontal scroll-snap of full-viewport panels.** One Fieldwork hero video at a time, snapping into place as the user scrolls horizontally. Captions (piece number + title) sit bottom-left of each panel in `font-mono`. Click anywhere on a panel navigates to `/fieldwork/<slug>`.

### Why this pattern

- **Scale not volume.** Each piece occupies the full viewport for the moment it's visible — matches Maria's "scale" rule and the editorial-maximalist register.
- **Symphony, not grid.** Horizontal scroll is genuinely uncommon on personal sites; it gives the visit a sense of motion and traversal that vertical-grid layouts can't.
- **Avoids the stocky-slideshow trap.** No auto-advance, no crossfade rotator — the visitor controls pacing (the symphony is theirs to play).
- **Mobile UX is good.** Horizontal scroll-snap is the native swipe pattern; works identically on touch.
- **Performance discipline forced.** Only one panel is on-screen at a time → pause-when-offscreen lets only one video play at a time → CPU and bandwidth stay bounded.

### Why not the other two

- **Vertical scroll with staggered reveal** (Option B from the brief) is good but reads as a magazine-issue or blog-archive layout; less of a moment per piece. Acceptable runner-up if A doesn't land.
- **Autoplay slideshow with crossfade** (Option C) was explicitly cautioned against in the concept (NON-GOAL: "not autoplay-y in a stocky way"). Off the table.

### Reversibility

The page-level layout pattern is encapsulated in `<Gallery>` and `<GalleryPanel>`. Switching to Option B (vertical stack) later is a single-component rewrite without touching `VideoLoop`, the scope helper, the route, or the nav.

---

## Components

```
src/app/gallery/page.tsx           ← server component shell; calls scope helper, renders <Gallery>
└── <Gallery pieces={...}>         ← client component (scroll container + accessibility/keyboard)
    └── <GalleryPanel piece={...}> ← client component (panel; embeds VideoLoop + caption)
        └── <VideoLoop ... pauseWhenOffscreen />   ← extended client component
```

**Why split into three:** `Gallery` owns the scroll container, keyboard navigation (arrow keys → snap to next/prev panel), and any scroll-position behaviour. `GalleryPanel` owns one piece — full-viewport sizing, accent threading via `--color-accent`, caption, click-through link. `VideoLoop` stays as it is plus one new optional prop.

### `<Gallery>` (new, client)

**File:** `src/components/Gallery.tsx`

Responsibilities:
- Render a horizontal flex container with CSS `scroll-snap-type: x mandatory`
- Each direct child is a snap target (`scroll-snap-align: center`)
- Listen for `ArrowLeft` / `ArrowRight` keys (when the container has focus) and scroll one panel-width in that direction
- Apply `tabIndex={0}` and `aria-label="Fieldwork gallery, horizontal scroll"` for keyboard / SR users
- Render N `<GalleryPanel>` children, passing `priority={index === 0}` so only the first preloads eagerly

### `<GalleryPanel piece>` (new, client)

**File:** `src/components/GalleryPanel.tsx`

Responsibilities:
- Full-viewport panel (`w-screen h-screen` constrained by parent's flex layout; `scroll-snap-align: center` applied per panel)
- Set `--color-accent` from the piece via `accentFor()` + `accentVar()` (same pattern as `FieldworkArticle`)
- Render `<VideoLoop>` with the piece's media; pass `pauseWhenOffscreen={true}` so only the visible panel's video plays
- Render a caption block (bottom-left, ~24px from edges): `font-mono text-xs uppercase tracking-[0.14em]` line reading `fieldwork {idPadded} · {title}` — the `fieldwork {idPadded}` part is `text-accent`
- Wrap the caption + video in a `<Link href={`/fieldwork/${slug}`}>`; the whole panel is the click target

### `<VideoLoop>` (extended, client)

**File:** `src/components/VideoLoop.tsx`

**Single additive change:** new optional prop `pauseWhenOffscreen?: boolean` (default `false`, preserves existing behaviour for Fieldwork detail pages).

When `true`:
- IntersectionObserver continues to track the wrapper; on `isIntersecting` → play, on `!isIntersecting` → pause (instead of just play-on-enter-once)
- The observer no longer disconnects after first intersection — kept alive for the component's lifetime
- Reduced-motion handling unchanged — if user prefers reduced motion, the play button overlay is shown and `pauseWhenOffscreen` is irrelevant (video stays paused regardless)

Test the existing behaviour stays identical when the prop is absent (no regression for Fieldwork detail pages).

---

## Data flow

```
ArchivePage / FieldworkIndex etc.  (existing patterns)
                  │
                  ▼
GalleryPage (new, server)
    │
    ├──> getGalleryFieldwork()  [new helper, sits in src/lib/content/fieldwork.ts]
    │       │
    │       └──> getAllFieldwork({ status: ['in-rotation', 'changed-my-mind'] })  [extended]
    │
    └──> <Gallery pieces={...}>
             │
             └──> map → <GalleryPanel piece={piece} priority={i===0} />
                          │
                          ├──> accentFor(piece)
                          └──> <VideoLoop src={piece.frontmatter.media.headerVideo!}
                                          poster={piece.frontmatter.media.posterFrame!}
                                          alt={`Atmospheric loop for ${piece.frontmatter.title}`}
                                          priority={isFirst}
                                          pauseWhenOffscreen={true} />
```

---

## Scope helper

**Choice: extend `getAllFieldwork` to accept `status?: FieldworkStatus | FieldworkStatus[]`.**

### Why this over a domain helper

- Keeps the API surface minimal — one function, one optional param shape
- Existing callers (`status?: FieldworkStatus`) continue to work — type widening is backward-compatible
- Future surfaces wanting multi-status filters get it for free

### Type change

```ts
// src/lib/content/fieldwork.ts
interface LoaderOptions {
  contentRoot?: string;
  status?: FieldworkStatus | readonly FieldworkStatus[];
}

// internal filter
const wanted = options.status
  ? (Array.isArray(options.status) ? options.status : [options.status])
  : null;
const filtered = wanted
  ? enriched.filter((p) => wanted.includes(p.frontmatter.status))
  : enriched;
```

### Domain wrapper (small, for clarity at the page level)

```ts
// src/lib/content/fieldwork.ts
const GALLERY_SCOPE: readonly FieldworkStatus[] = ['in-rotation', 'changed-my-mind'] as const;

export async function getGalleryFieldwork(
  options: Omit<LoaderOptions, 'status'> = {},
): Promise<Fieldwork[]> {
  return getAllFieldwork({ ...options, status: GALLERY_SCOPE });
}
```

Pieces returned only if they have BOTH `headerVideo` AND `posterFrame` set in `media`. Defensive check in `<GalleryPanel>`: render nothing for pieces missing either asset (and emit a console warning at build time). Today all 7 in-scope pieces have both.

---

## Route and nav

### Route

**File:** `src/app/gallery/page.tsx` — new server component.

```tsx
import type { Metadata } from 'next';
import { getGalleryFieldwork } from '@/lib/content/fieldwork';
import { Gallery } from '@/components/Gallery';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    "Atmospheric loops, one per Fieldwork piece. Scroll across.",
  openGraph: {
    title: 'Gallery — bines.ai',
    description:
      "Atmospheric loops, one per Fieldwork piece. Scroll across.",
    images: ['/media/fw07/poster.jpg'],   // FW07 frog as OG card
    type: 'website',
  },
};

export default async function GalleryPage() {
  const pieces = await getGalleryFieldwork();
  return <Gallery pieces={pieces} />;
}
```

The page is server-rendered (Next.js static / SSG at build time since the input is filesystem-driven content). The `<Gallery>` component hydrates client-side.

### Nav

**File:** `src/lib/content/site.ts`

Add `{ href: '/gallery', label: 'Gallery' }` to the `NAV` array. Place between `/postcards` and `/changed-my-mind` (visual order: Fieldwork → Postcards → Gallery → Changed my mind → Now → Taste → Argue → Archive).

`src/components/Nav.tsx` requires no change — it iterates `NAV` automatically.

Update `src/components/__tests__/Nav.test.tsx` to expect the new entry.

---

## Per-panel chrome

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                                             │
│         [ full-bleed VideoLoop ]            │
│                                             │
│                                             │
│                                             │
│                                             │
│  ◐ fieldwork 08 · precursor                 │  ← font-mono caption, bottom-left
└─────────────────────────────────────────────┘
```

- Panel: `w-screen h-screen` (or `h-[100dvh]` for mobile address-bar friendliness)
- Caption position: absolute, `bottom-6 left-6` (or responsive)
- Caption text: `font-mono text-xs uppercase tracking-[0.14em]` (matches existing Fieldwork article header pattern)
- The `◐` glyph or a small accent-coloured square as a leading mark
- `fieldwork ##` part uses `text-accent` (threaded via `--color-accent` set on the panel root)
- Entire panel is the click target — wrapped in `<Link href={`/fieldwork/${slug}`}>`
- `accent` from `accentFor(piece)` → `style={{ '--color-accent': accentVar(accent) }}` on the panel root

No accent border on the panel itself (would feel chunky against the full-bleed video). The accent lives in the caption only — quiet thread, not loud frame.

---

## Reduced-motion & accessibility

### Reduced-motion users

- `<VideoLoop>` already handles per-video: shows play-button overlay, video paused until user opts in. No change.
- Scroll-snap is a *layout* property — not animation. Stays on for reduced-motion users (they control the scroll themselves, no auto-anything).
- No auto-scroll, no auto-advance, no parallax, no entrance animations. Architecture is intentionally low-motion-trigger.
- `motion-reduce:transition-none` applied to any transitions added (e.g. caption fade-in if used).

### Keyboard

- `<Gallery>` is `tabIndex={0}` and listens for `ArrowLeft` / `ArrowRight`: scrolls one panel-width in that direction
- Each `<GalleryPanel>`'s `<Link>` is focusable and navigable in tab order — Enter activates click-through
- Visible focus ring (Tailwind default + accent-coloured) on focused panel link

### Screen reader

- `<Gallery>` has `role="region"` and `aria-label="Fieldwork gallery, horizontal scroll"`
- Each `<GalleryPanel>` has `<article>` semantic and the caption serves as accessible label
- `<VideoLoop>` already passes `aria-label` to the `<video>` element; gallery passes a descriptive alt per piece

### Touch / mobile

- Native horizontal scroll-snap works as swipe on iOS / Android
- `h-[100dvh]` on the panel to account for address-bar collapse
- `playsInline` already set on `<VideoLoop>` (Safari requirement; existing)

---

## SEO / OG

- Page title: `Gallery · bines.ai` (via the layout template `'%s · bines.ai'`)
- OG image: `/media/fw07/poster.jpg` (frog) — iconic, recognisable, photographs well at small size
- Sitemap: add `/gallery` to whatever sitemap generation exists (verify in implementation phase — likely `src/app/sitemap.xml/route.ts` or similar)
- RSS: not applicable (gallery isn't a feed surface)

---

## Files to create / modify

| File | Action | Purpose |
|---|---|---|
| `src/app/gallery/page.tsx` | Create | New `/gallery` route, server component, calls `getGalleryFieldwork()`, renders `<Gallery>` |
| `src/components/Gallery.tsx` | Create | Client component — horizontal scroll container, keyboard nav, accessibility |
| `src/components/GalleryPanel.tsx` | Create | Client component — full-viewport panel, accent threading, caption, click-through link |
| `src/components/VideoLoop.tsx` | Modify | Add `pauseWhenOffscreen?: boolean` prop; extend IO behaviour when set |
| `src/lib/content/fieldwork.ts` | Modify | Widen `status` param to `FieldworkStatus \| readonly FieldworkStatus[]`; add `getGalleryFieldwork()` + `GALLERY_SCOPE` |
| `src/lib/content/site.ts` | Modify | Add `{ href: '/gallery', label: 'Gallery' }` to `NAV` |
| `src/components/__tests__/Gallery.test.tsx` | Create | Render, keyboard nav, panel ordering, empty-state |
| `src/components/__tests__/GalleryPanel.test.tsx` | Create | Caption render, accent CSS var, click-through link, defensive render when media missing |
| `src/components/__tests__/VideoLoop.test.tsx` | Modify | New case: `pauseWhenOffscreen={true}` pauses on intersection-exit, plays on re-entry |
| `src/lib/content/__tests__/fieldwork.test.ts` | Modify | New case: `status: ['in-rotation', 'changed-my-mind']` returns union; `getGalleryFieldwork()` excludes retired |
| `src/components/__tests__/Nav.test.tsx` | Modify | Expect the new `Gallery` nav entry |
| `src/app/sitemap.xml/route.ts` (path TBD) | Modify | Add `/gallery` to sitemap entries |

**Approximate net diff:** ~6 files created, ~6 modified. Around 400-600 net lines of TS/TSX plus tests. No new dependencies.

---

## Dependencies

### Existing (reused, no new deps)

- `next` 15 — App Router for routing
- `react` 19 — components
- `tailwindcss` v4 — utility classes; already has `motion-reduce:*` variants
- `@/components/VideoLoop` — the workhorse
- `@/lib/design/accent` — `accentFor`, `accentVar`
- `@/lib/content/fieldwork` — content loader
- `@/lib/content/types` — `Fieldwork`, `AccentToken`, `FieldworkStatus`

### New

- None.

---

## Risks & mitigations (pre-assessment)

| Risk | Mitigation |
|---|---|
| Multiple videos auto-playing eats CPU/bandwidth on mobile | `pauseWhenOffscreen={true}` ensures one video at a time. Confirmed in `<VideoLoop>` extension. |
| Horizontal scroll-snap UX confuses some desktop users | Visible scroll affordance (faint progress dots or a "← →" hint glyph in low contrast at the panel edges). Confirm during validation. |
| First panel's video is heavyweight (~1-3 MB) for first paint | `priority={true}` on first panel only; `fetchpriority='high'` is already wired in `<VideoLoop>`. |
| `pauseWhenOffscreen` adds IO behaviour that could regress Fieldwork detail pages | Default is `false`; existing usage unchanged. Test added explicitly for the regression case. |
| Keyboard arrow listener conflicts with browser-default horizontal scroll on focused element | Scope the listener to the gallery container only; `preventDefault()` on Arrow keys when the gallery has focus. |
| FW05 sneaks in or future retired piece sneaks in | Filter is by status, not by id. Status-based exclusion is automatic. `getGalleryFieldwork()` makes the scope explicit and centralised. |
| Address bar collapse on mobile breaks `100vh` panels | Use `100dvh` instead of `100vh`. |

---

## Open items for assessment phase

- Performance budget: full-page weight is bounded by single-video-playing-at-a-time, but the *initial poster loads* for all 7 panels (used as `poster` attr) total ~1.7 MB. Probably fine; assessment phase confirms.
- Accessibility: keyboard navigation pattern (arrow keys) is non-standard for horizontal-scroll; assessment phase should verify it doesn't conflict with screen-reader expectations.
- Reduced-motion users see static posters and a play button per panel — confirm this still reads as "gallery", not "broken page".

---

## Next step

Run `/isaac:assess` for Phase 4 — risk + security review. Likely findings will be low-severity (no auth, no API surface, no PII, no external integration). Performance + accessibility are the main vectors.
