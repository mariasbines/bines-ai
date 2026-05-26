# Symphony in Motion — Context Analysis (Phase 2)

**Epic:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Status:** Codebase analysed for reuse; architecture phase can proceed with high confidence.

---

## TL;DR

Excellent reuse story. The header video pattern is already a polished, reusable client component (`VideoLoop`) with lazy-loading, reduced-motion handling, Safari-compliant autoplay, and noscript fallback all built in. The Fieldwork loader supports status filtering. Accent tokens are themable via CSS variable. The only net-new code is the gallery page itself, a small scope-filter helper for the in-rotation + changed-my-mind union, and whatever motion-design layer the architecture phase commits to.

---

## Reusable patterns identified

### 1. `VideoLoop` — the header video component

**File:** `src/components/VideoLoop.tsx`
**Import:** `import { VideoLoop } from '@/components/VideoLoop';`
**Type:** Client component (`'use client'` at top)

**Props:**

```ts
interface VideoLoopProps {
  src: string;        // headerVideo path
  poster: string;     // posterFrame path
  captions?: string;  // .vtt path (optional; none exist today)
  alt: string;        // aria-label
  priority?: boolean; // true = above-the-fold; preload, no IO wait
  className?: string; // outer wrapper class
}
```

**What it already handles (no architectural work needed):**

- **Lazy load via IntersectionObserver** — `rootMargin: '200px'` so videos start loading 200px before viewport. Falls back to immediate load if `IntersectionObserver` is unavailable.
- **Reduced-motion** — checks `prefers-reduced-motion: reduce` via `matchMedia`. Pauses the video and shows a play button overlay (`▶ play`) that lets the user opt in.
- **Safari / mobile compliance** — `muted`, `loop`, `playsInline` attrs all set; autoplay caught with `.catch()` to handle browser block silently.
- **Noscript fallback** — renders a native `<video>` with `autoplay muted loop playsInline` so no-JS visitors still get the loop.
- **Aspect ratio** — wrapper enforces `aspectRatio: '16 / 9'`. Hardcoded.
- **`fetchpriority='high'`** — when `priority={true}`, hints the browser to fetch eagerly. Useful for the first video in the gallery.
- **Pause-on-out-of-view** — *not implemented*. Videos that come into view start playing and continue even after scrolling away. This is a candidate refinement (see open questions).

**How the gallery uses it:** drop it in for each Fieldwork piece's video. Set `priority={true}` ONLY on the first piece (above the fold). Pass `src`, `poster`, `alt` from the Fieldwork frontmatter.

### 2. `accentFor()` + `accentVar()` — accent token resolution

**File:** `src/lib/design/accent.ts`

```ts
accentFor(piece): AccentToken         // explicit frontmatter.accent, falls back to id % 5
accentVar(token): string              // returns `var(--color-${token})`
```

**Pattern from `FieldworkArticle.tsx`:**

```tsx
<article
  style={{ ['--color-accent' as string]: accentVar(accent) } as React.CSSProperties}
>
```

This sets the local `--color-accent` CSS variable; child components reference `text-accent`, `bg-accent`, etc. via Tailwind utilities defined in `globals.css`.

**How the gallery uses it:** if architecture wants per-tile chrome to thread accent colours, wrap each gallery slot in a `<div>` with the same `style` pattern and use `text-accent`-style utilities inside.

### 3. `getAllFieldwork({ status })` — content loader with status filter

**File:** `src/lib/content/fieldwork.ts`

Already supports `status` as a single value:

```ts
const inRotation = await getAllFieldwork({ status: 'in-rotation' });
```

Returns Fieldwork[] sorted descending by `published`, enriched with pushback data.

**Gap for the gallery:** scope is *in-rotation + changed-my-mind*. Current loader is single-status. Three options:

- **(a)** Call twice and concat: `[...await getAllFieldwork({ status: 'in-rotation' }), ...await getAllFieldwork({ status: 'changed-my-mind' })]` — works, two file walks
- **(b)** Filter post-fetch: `(await getAllFieldwork()).filter(p => p.frontmatter.status === 'in-rotation' || p.frontmatter.status === 'changed-my-mind')` — one walk, simple
- **(c)** Extend the loader to accept `status?: FieldworkStatus | FieldworkStatus[]` — most reusable, slight API surface

**Recommendation: (c)** — small change, no other consumers break, future-proof. Or wrap in a domain-specific helper `getGalleryFieldwork()` that internally does (b). Architecture phase calls it.

### 4. Reduced-motion handling

- `VideoLoop` handles it for videos (covered above).
- `src/app/globals.css` has `@media (prefers-reduced-motion: reduce) { ... }` block — read it during architecture to see what's already disabled site-wide.
- Tailwind utilities `motion-reduce:transition-none` are used in several places (e.g. `FieldworkArticleFooter`, `ChatInterface`). The gallery should follow this idiom for any non-video animations (scroll-driven motion, transitions, hovers).

### 5. Sort + grouping helpers

`/archive` (`src/app/archive/page.tsx`) shows the established pattern for sorting retired pieces by `retiredAt ?? published`. Gallery doesn't need the same — its scope (in-rotation + changed-my-mind) sorts naturally by `published`. The loader already returns sorted descending.

---

## Net-new code expected

| Surface | What's needed |
|---|---|
| `src/app/gallery/page.tsx` | New page route. Server component. Calls the scope-filter helper, renders the gallery component(s). |
| Scope helper | Either extend `getAllFieldwork` to take `status?: FieldworkStatus[]`, or add `getGalleryFieldwork()`. |
| Gallery component(s) | Depends on architecture decision (motion pattern). Likely 1-3 client components — outer layout, per-piece tile/slot, possibly a transition/intersection orchestrator. |
| Nav entry | Update site nav to include `/gallery`. Find existing nav component (probably `Header.tsx` or similar; architecture phase confirms). |
| Tests | Vitest specs for the scope helper, the page (basic render), and the gallery component(s) per existing test patterns in `src/components/__tests__/`. |
| (Optional) | `.vtt` caption files for each header video, if architecture decides to surface captions. None exist today. |

**No infrastructure changes:** no new dependencies, no env vars, no API routes, no MDX schema changes, no migration.

---

## Architectural constraints discovered

1. **`VideoLoop` is client-side only** — gallery slots using it become client-rendered. The page shell can stay server-rendered; the gallery body is hydrated. Fine for performance.
2. **`VideoLoop` enforces 16:9** — gallery treatments wanting portrait or square would need a forked component or a `aspectRatio` prop addition. Recommend the latter if needed (one-line change).
3. **Videos don't pause out-of-view** — current behaviour is play-on-enter, never pause. For a gallery with multiple videos visible simultaneously this is potentially expensive (CPU + bandwidth). Architecture decision: keep as-is (simple) or extend `VideoLoop` with optional `pauseWhenOffscreen` prop.
4. **`priority` flag should be used on first video only** — having `priority={true}` on all gallery videos would defeat lazy-loading.
5. **No existing `.vtt` caption files** — `VideoLoop` supports them; FieldworkArticle doesn't pass any today. If gallery wants captions, that's a content-generation task (not blocking).
6. **Routes are file-based Next.js App Router** — adding `src/app/gallery/page.tsx` automatically registers `/gallery`. No router config to touch.
7. **Tests use vitest + jsdom; `IntersectionObserver` and video APIs are mocked** — see existing `VideoLoop.test.tsx` and `FieldworkArticle.test.tsx` for patterns. New gallery tests should follow these mocks rather than re-invent.

---

## Open questions for the architecture phase

1. **Layout / motion pattern.** *The big one.* Horizontal scroll-snap? Vertical scroll with parallax / staggered reveal? Autoplay slideshow with crossfade? Ken Burns drift over each video? Hybrid? Prototype 2-3 lo-fi explorations before committing.
2. **One-at-a-time playback vs all-visible-playback.** If multiple videos are simultaneously in view (likely in any grid or scroll layout), do they all autoplay? CPU/network concern especially on mobile. Decision shapes whether `VideoLoop` needs a `pauseWhenOffscreen` extension.
3. **Caption presence per tile.** Show the Fieldwork number + title alongside each video, or pure visual with hover/tap reveal, or nothing at all (visual-only)?
4. **Click-through.** Click on a video tile → navigate to `/fieldwork/<slug>`, open the asset full-bleed in a modal, or no interaction?
5. **Sort order.** Default = chronological newest-first (matches loader). Worth offering reverse-chronological or random-per-visit for repeat visits?
6. **Accent threading.** Should each tile's chrome (border, caption colour, etc.) use the piece's accent? Free with the `accentFor()` pattern.
7. **Mobile pattern.** Same motion design as desktop, or a different (perhaps more grid-like) mobile treatment?
8. **Page title and intro copy.** Per the concept doc — "Gallery"? Something more bines.ai? Any intro paragraph, or open straight into the art?
9. **OG image for `/gallery` route.** Probably the FW07 frog or another iconic poster — pick during architecture.
10. **Pause-on-`prefers-reduced-motion`** — already handled per-video. Does the gallery also need any non-video reduced-motion handling (e.g. disable scroll-driven parallax for reduced-motion users)? Likely yes.

---

## Files the architecture phase should read in detail

- `src/app/globals.css` — accent CSS variables, reduced-motion CSS, Tailwind v4 theme setup
- `src/components/FieldworkCard.tsx` — how Fieldwork pieces are tile-presented on `/fieldwork` index (might inform gallery tile shape, or be deliberately diverged from)
- `src/components/Header.tsx` (or wherever site nav lives) — to add `/gallery` to navigation
- `src/app/page.tsx` — homepage; check if it already surfaces any gallery-like elements that the new page would echo or replace
- `src/lib/content/site.ts` — site config / stats; gallery count might surface here
- One existing `VideoLoop.test.tsx` — to mirror the testing pattern for any new components

---

## Tech stack summary (for downstream agents)

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 (CSS-based theme, no `tailwind.config.*` file)
- pnpm + Turbopack
- Vitest + jsdom for tests (570 specs passing as of 2026-05-26)
- Vercel hosting (auto-deploy from master)
- Branch protection on master: PR required + green CI (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`) + approval
- Claude PR review bot runs advisory on every PR

---

## Next step

Run `/isaac:architect` for Phase 3 — design exploration. Pre-cast for that phase:

- Start with prototyping 2-3 motion patterns at low fidelity (probably markdown sketches or quick paper mocks Maria can react to, *not* full implementations).
- Once Maria picks one, write the architecture doc covering: component tree, scope helper choice (a/b/c above), playback strategy (pause-on-out-of-view yes/no), layout breakpoints, accent threading decision, nav update, OG strategy.
- Surface the remaining open questions from this doc as decisions for the architecture doc to record.
