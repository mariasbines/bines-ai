# PRD — Symphony in Motion (Phase 5)

**Epic:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Synthesises:** `01-concept.md`, `02-context.md`, `03-architecture.md`, `04-assessment.md`

---

## Executive summary

A new `/gallery` page on bines.ai that surfaces every Fieldwork hero video as a horizontal scroll-snap of full-viewport panels. Reuses the existing `VideoLoop` component (with one additive prop), the accent-token system, and the Fieldwork content loader (with one additive type widening). Net-new code: page route + two new components + nav entry + tests. Zero new dependencies, zero security surface, zero PII. Ships as one mid-size PR.

---

## Problem statement

bines.ai has built up a body of AI-assisted art — every Fieldwork hero video is generated through a deliberate Veo prompt tied to its piece's content; every poster is a still from that take. The collection is worth more than the sum of its parts but currently lives scattered across individual Fieldwork detail pages. There is no place to revisit the visual work as a *body of work*.

Maria wants a "gallery wall" she can visit just to look at — a quiet room where the visual side of bines.ai gets to live as itself. The framing she landed on is *"a symphony in motion"*: motion design and scroll-driven rhythm, not a flat grid; editorial-maximalist, curated, not autoplay-y screensaver.

---

## Design decision (locked)

**Horizontal scroll-snap of full-viewport panels.** One Fieldwork piece per panel, snapping into place as the visitor scrolls horizontally. Caption (piece number + title) sits bottom-left of each panel in `font-mono` over a linear-gradient scrim for legibility. Click anywhere on a panel navigates to `/fieldwork/<slug>`.

Rationale: each piece gets a moment (matches *scale not volume*); horizontal scroll is genuinely uncommon and matches the editorial-maximalist register; mobile UX is native swipe; only one video plays at a time (bandwidth + CPU bounded); avoids both the gridded-enumeration trap and the autoplay-screensaver trap. Reversible to a vertical-stack layout if it doesn't land — switching is a single-component rewrite.

---

## Goals & success metrics

| Goal | Metric | Target |
|---|---|---|
| Maria visits for pleasure | Repeat visits over 30 days post-launch | ≥1 / week (informal — Maria's call) |
| Visitor experiences the body of work as a whole | Time on `/gallery` | ≥30s median (informal — needs analytics; not added in v1) |
| Performance: page is fast | LCP on Slow 4G | <2.5s |
| Performance: bandwidth bounded | Cumulative video bytes loaded | ≤ user-controlled (only-visible-video plays) |
| Accessibility: WCAG 2.1 AA passable | Manual a11y audit | Pass: keyboard, focus-visible, contrast, reduced-motion |
| Scales over time | Adding FW09 in future | Zero gallery code changes (just frontmatter + media file drop) |

---

## Functional requirements

### FR-001 — Route exists at `/gallery`

The page is reachable at `https://bines.ai/gallery`. Static-rendered at build time. Linked from the site nav.

### FR-002 — Gallery scope is filter-by-status

The gallery surfaces all Fieldwork pieces with `status === 'in-rotation'` OR `status === 'changed-my-mind'`. Retired pieces (`retired-still-right`, `retired-evolved`) are excluded. The filter is by status, not by manual list, so future additions/retirements flow through automatically.

### FR-003 — Each piece renders as a full-viewport panel

Each scoped Fieldwork piece occupies a full viewport (`100dvh` height, `100vw` width) panel in the gallery. Panels are arranged horizontally; the gallery container scroll-snaps on the X axis.

### FR-004 — Each panel embeds the piece's hero video

The video is rendered via `<VideoLoop>` (existing component), using the piece's `media.headerVideo` and `media.posterFrame`. Autoplay-muted-loop-playsInline per existing `VideoLoop` behaviour.

### FR-005 — Only the in-view video plays

When a video panel scrolls out of view, its video pauses. When it scrolls back in, it resumes. Achieved via a new additive `pauseWhenOffscreen` prop on `<VideoLoop>` (default `false` to preserve Fieldwork detail-page behaviour).

### FR-006 — First panel preloads eagerly

The first panel sets `priority={true}` on its `<VideoLoop>`, which triggers `preload='auto'` and `fetchpriority='high'`. Subsequent panels lazy-load via IntersectionObserver.

### FR-007 — Each panel has a caption

A caption block sits bottom-left of each panel, ~24px from the edges. Text: `fieldwork {idPadded} · {title}` (where `idPadded` is two-digit zero-padded). Style: `font-mono text-xs uppercase tracking-[0.14em]`. The `fieldwork ##` portion uses `text-accent`, threaded from the piece's accent via `--color-accent` set on the panel root.

### FR-008 — Caption sits over a scrim for legibility

A linear-gradient scrim (warm ink at ~60-80% opacity at the caption baseline, fading to 0 above) sits between the video and the caption text. Ensures contrast across varied video frames. Scrim is part of the panel chrome, not the video itself.

### FR-009 — Each panel is a click target

Clicking anywhere on a panel navigates to `/fieldwork/<slug>` for that piece. The panel is wrapped in a `<Link>`; the entire surface is the click target. Visible `focus-visible` ring when the link is keyboard-focused.

### FR-010 — Keyboard navigation

When the gallery container has focus, `ArrowLeft` / `ArrowRight` keys scroll the container by one panel-width in that direction. `preventDefault()` is called on these key events to prevent default browser scroll behaviour from interfering.

### FR-011 — Scroll affordance for non-touch desktop

A faint right-edge gradient on the first visible panel hints at content off-screen. A small `← →` glyph in low-contrast `font-mono` (matching the existing site register) sits top-right of the gallery container as a secondary cue.

### FR-012 — Sort order is chronological newest-first

Pieces appear left-to-right in descending `published` order — newest first. Matches the default sort of `getAllFieldwork()`.

### FR-013 — Nav includes Gallery

The site primary nav has a `Gallery` entry, positioned between `Postcards` and `Changed my mind` in the `NAV` array. Renders automatically via the existing `<Nav>` component.

### FR-014 — Page metadata

Title: `Gallery · bines.ai` (via the existing layout template).
Description: `Atmospheric loops, one per Fieldwork piece. Scroll across.`
OG image: `/media/fw07/poster.jpg` (FW07's poison-dart-frog poster).
OG type: `website`.

### FR-015 — Page intro copy

Page body opens with a minimal heading + one-line intro before the gallery itself:
- `<h1>Gallery</h1>` styled in the existing serif-black register
- One-line caption beneath: `Atmospheric loops, one per Fieldwork piece. Scroll across.`

---

## Non-functional requirements

### NFR-001 — Performance: LCP under 2.5s on Slow 4G

First panel's poster is the LCP candidate (~80-410 KB JPG depending on which piece is newest at build time). With `priority={true}` + `fetchpriority='high'`, target is <2.5s on a Slow 4G profile.

### NFR-002 — Performance: only one decoded video resident at a time

`pauseWhenOffscreen={true}` on every panel except the first ensures only the currently-visible video is actively playing/decoding. Cumulative network usage scales with user scroll behaviour, not page load.

### NFR-003 — Accessibility: WCAG 2.1 AA passable

Keyboard navigable (FR-010); focus-visible ring on the link (FR-009); caption contrast via scrim (FR-008); reduced-motion handled per existing `<VideoLoop>` (shows play button overlay when `prefers-reduced-motion: reduce`); semantic structure (`<article>` per panel, `role="region"` + `aria-label` on container).

### NFR-004 — Reduced motion: no auto-animation triggers

No auto-advance, no auto-scroll, no parallax, no entrance animations. Scroll-snap is layout (not animation); stays on for reduced-motion users. Existing `VideoLoop` reduced-motion handling covers the videos.

### NFR-005 — Mobile parity

Same horizontal scroll-snap pattern on mobile via native swipe. `100dvh` for address-bar friendliness. `playsInline` on video (already in `<VideoLoop>`).

### NFR-006 — Browser support floor

Safari 15.4+, Chrome 108+, Firefox 101+ — matches bines.ai's existing floor. No polyfills needed.

### NFR-007 — Zero new dependencies

Implementation uses only existing project dependencies. No new npm packages introduced.

### NFR-008 — Zero security surface

No API routes, no user input, no auth, no client-side fetches, no third-party scripts, no cookies, no localStorage. Pure content rendering from the bundled filesystem.

### NFR-009 — No regression on existing Fieldwork detail pages

The `<VideoLoop>` extension and `getAllFieldwork` widening must preserve existing behaviour exactly when callers don't use the new options. Validated by existing test suite continuing to pass without modification beyond the new test cases.

### NFR-010 — All four quality gates pass

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green before merge.

---

## Acceptance criteria

- [ ] **AC-001** Visiting `/gallery` returns 200 with the gallery rendered, on production and preview deploys.
- [ ] **AC-002** Gallery contains exactly the in-rotation + changed-my-mind Fieldwork pieces — 7 pieces at time of writing (FW01, FW02, FW03, FW04, FW06, FW07, FW08).
- [ ] **AC-003** FW05 (`retired-evolved`) does NOT appear in the gallery, even though it exists in `content/fieldwork/`. Explicit test asserts this.
- [ ] **AC-004** Panels render in descending `published` order (newest first). FW08 (May 2026) appears as the first panel today.
- [ ] **AC-005** Each panel is `100dvh` × `100vw`; the gallery container scroll-snaps horizontally with `scroll-snap-type: x mandatory` and per-panel `scroll-snap-align: center`.
- [ ] **AC-006** First panel's `<VideoLoop>` has `priority={true}`; all other panels have `priority={false}`.
- [ ] **AC-007** Every panel's `<VideoLoop>` has `pauseWhenOffscreen={true}`. The currently-visible video plays; off-screen videos are paused.
- [ ] **AC-008** Caption text `fieldwork {idPadded} · {title}` renders bottom-left of each panel in `font-mono text-xs uppercase tracking-[0.14em]`. The `fieldwork ##` portion uses `text-accent`.
- [ ] **AC-009** A linear-gradient scrim sits between video and caption, providing readable contrast across varied video frames. Manually verified on all 7 panels.
- [ ] **AC-010** Clicking a panel anywhere navigates to `/fieldwork/<slug>` for that piece.
- [ ] **AC-011** Keyboard: focusing the gallery container and pressing `ArrowLeft` / `ArrowRight` scrolls one panel-width in that direction. Default browser scroll is prevented.
- [ ] **AC-012** Visible focus ring appears on the focused panel link, readable against varied video backgrounds.
- [ ] **AC-013** A faint right-edge gradient on the first panel and a `← →` glyph top-right of the gallery indicate scrollability for non-touch desktop users.
- [ ] **AC-014** Site nav has a `Gallery` entry between `Postcards` and `Changed my mind`. The entry renders in `<Nav>` automatically.
- [ ] **AC-015** Page metadata: title `Gallery · bines.ai`; description `Atmospheric loops, one per Fieldwork piece. Scroll across.`; OG image `/media/fw07/poster.jpg`; OG type `website`.
- [ ] **AC-016** Page header renders `<h1>Gallery</h1>` (existing serif-black register) and the one-line intro caption before the gallery container.
- [ ] **AC-017** With `prefers-reduced-motion: reduce` set, every panel's video stays paused; the `▶ play` overlay appears on each. Scroll-snap layout remains.
- [ ] **AC-018** Mobile (≤640px width): scroll-snap works via native swipe; `100dvh` accounts for address bar; no horizontal scrollbar artefacts.
- [ ] **AC-019** Adding `pauseWhenOffscreen={true}` to `<VideoLoop>` keeps the existing IO behaviour exactly identical when the prop is `false` (default). Existing `VideoLoop.test.tsx` cases pass without modification.
- [ ] **AC-020** `getAllFieldwork({ status: ['in-rotation', 'changed-my-mind'] })` returns the union; existing single-string callers (`{ status: 'in-rotation' }`) continue to work unchanged.
- [ ] **AC-021** `getGalleryFieldwork()` returns the gallery-scope pieces in descending `published` order.
- [ ] **AC-022** All four quality gates green: typecheck, lint, test, build.
- [ ] **AC-023** No new npm dependencies introduced (verified via `pnpm install --frozen-lockfile` showing no diff).
- [ ] **AC-024** Sitemap includes `/gallery` (if a sitemap route exists; implementation phase confirms file path).

---

## PRD-phase decisions (locked)

| Decision | Choice | Reasoning |
|---|---|---|
| Caption legibility treatment | Linear-gradient scrim (ink at ~60-80% opacity at caption baseline, fading to 0 above) | Robust across all video frames; less intrusive than text-shadow or opaque card; sits in panel chrome layer, not the video |
| Scroll affordance for non-touch desktop | Right-edge gradient on first panel + `← →` glyph top-right of gallery | Two cues at different visibility tiers — the gradient is ambient, the glyph is explicit; both quiet enough to not distract |
| Sort order | Chronological, newest-first | Matches loader default; matches `/fieldwork` index pattern; lets the latest piece be first impression |
| Page title | `Gallery` | Simple, clear, matches site nav label |
| Page intro one-liner | `Atmospheric loops, one per Fieldwork piece. Scroll across.` | Reused as OG description; tells the visitor what they're looking at and what to do; no preciousness |
| FW05 exclusion | Filter-by-status (not manual list) | Future-proofs as pieces retire; explicit AC-003 test guards against regression |

---

## Out of scope (explicit non-goals)

- **No CMS / admin UI** — assets added by dropping files into `public/media/` and updating Fieldwork frontmatter
- **No sharing / social cards beyond the OG image** — no "share this gallery" widget, no per-panel deep-link sharing
- **No analytics or client-side telemetry** — preserves bines.ai's no-tracking posture
- **No third-party embeds** — no YouTube, no Vimeo, no external CDN; all assets local
- **No commentary / curator notes** — visual is the focal element; captions are minimal navigation only
- **No regeneration of art at view time** — no Veo/Gemini calls; the gallery surfaces what's in `public/media/` at build time
- **No postcard art** — postcards are text-only and stay out of the gallery
- **No /now or /taste imagery** — those surfaces don't have hero art today
- **No FW05 backfill** — retired piece, stays out of the gallery's scope contract
- **No alternative motion patterns in v1** — the architecture phase committed to horizontal scroll-snap; alternative explorations (parallax, slideshow) are v2+ if v1 doesn't land
- **No captions (.vtt) for videos** — videos are silent atmospheric loops; not strictly required by WCAG; can be added in v2 if needed
- **No video codec optimisation** — H.264 stays; HEVC/AV1 transcoding deferred to v2 if real-world LCP measurements come back hot

---

## Dependencies

### External

None. No third-party APIs, services, or libraries introduced.

### Internal — existing infrastructure reused

- `next` 15 App Router for `/gallery` route
- `react` 19 for components
- `tailwindcss` v4 for utilities (already configured)
- `@/components/VideoLoop` — extended with one prop
- `@/lib/design/accent` — `accentFor()`, `accentVar()`
- `@/lib/content/fieldwork` — extended with `getGalleryFieldwork()` + status array support
- `@/lib/content/site` — extended with new nav entry

### Pre-requisite epics

- **pushback-v2** — already shipped (PR #40, 21 May 2026). Was the only blocker for starting this epic.

---

## Risks & mitigations summary

(Full catalog in `04-assessment.md`. Headline summary here.)

| Risk | Severity | Mitigation |
|---|---|---|
| Caption legibility on full-bleed video | Medium | Linear-gradient scrim (locked in FR-008) |
| `<VideoLoop>` regression on Fieldwork detail pages | Medium | Additive prop default `false`; regression test required (AC-019) |
| First-paint poster weight | Low | `priority={true}` on first panel only; lazy load others |
| Keyboard arrow-nav vs browser default scroll | Low | `preventDefault()` on Arrow keys when gallery has focus (FR-010) |
| Non-touch desktop UX | Low | Edge gradient + `← →` glyph (FR-011) |
| `100dvh` browser support floor | Low | Universal in target floor; optional `100vh` CSS fallback |
| `getAllFieldwork` type widening | Low | Backward-compatible union; existing callers unaffected |

No risks block proceeding to stories.

---

## Definition of done

A merged PR to `master` that, when deployed:

1. Renders the gallery at `https://bines.ai/gallery` with all 7 scoped Fieldwork pieces present, in correct order
2. Passes all 24 acceptance criteria above
3. Passes all four quality gates (typecheck, lint, test, build) with no warnings introduced
4. Adds a `Gallery` entry to the site nav that resolves to the new page
5. Adds tests for: the gallery component family, the `pauseWhenOffscreen` branch of `<VideoLoop>`, the array-status branch of `getAllFieldwork`, the `getGalleryFieldwork` helper, the updated `<Nav>`, and the FW05-exclusion guard
6. Does NOT regress: existing Fieldwork detail pages (videos still play correctly), existing `/archive` behaviour, existing `<Nav>` (other entries still render)
7. Earns Claude PR review bot approval at advisory tier; human approval (Maria) is the final gate

---

## Next step

Run `/isaac:stories` for Phase 6 — break the PRD into implementation stories with a dependency DAG. Estimated story count: 4-6 stories.
