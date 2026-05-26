# Symphony in Motion — Assessment (Phase 4)

**Epic:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Builds on:** `01-concept.md`, `02-context.md`, `03-architecture.md`

---

## TL;DR

Low-risk content feature. **Zero security surface** (no API, no user input, no auth, no PII, no third-party scripts). The non-trivial risks are all in two clusters: **performance** (video bandwidth + first-paint) and **accessibility** (horizontal scroll pattern is non-standard; caption legibility over video; reduced-motion fallback). Both clusters have mitigations already baked into the architecture; this doc identifies the residual gaps and the validation steps that need to happen during story implementation.

**Overall risk profile:** 2 medium-severity, 5 low-severity, 0 high-severity. No blockers for proceeding to PRD.

---

## Severity-ranked risks

### RISK-001 (medium) — Caption legibility on full-bleed video backgrounds

| Field | Value |
|---|---|
| Category | Accessibility |
| Likelihood | High — video frames vary in luminance over the 8-second loop; the bottom-left caption area will sometimes land on light frames, sometimes dark |
| Impact | Medium — caption becomes hard or impossible to read at moments; fails WCAG 2.1 SC 1.4.3 (contrast minimum) and 1.4.11 (non-text contrast) |
| Mitigation in plan | None explicit yet — architecture mentions caption position but not contrast strategy |
| Residual risk | Medium until story-level decision lands |
| Action | Stories must specify: scrim (linear-gradient overlay from bottom up, ink-on-cream readable, 60-80% opacity at the caption baseline fading to 0 above), OR text-shadow on the caption, OR a small opaque card behind the text. Recommend **scrim** — least intrusive visually, most robust across video content. |

### RISK-002 (medium) — `VideoLoop` extension introduces regression on Fieldwork detail pages

| Field | Value |
|---|---|
| Category | Regression |
| Likelihood | Low — change is additive (new `pauseWhenOffscreen?: boolean` prop, default `false`); existing call sites omit the prop |
| Impact | High if it lands — every existing Fieldwork detail page uses `VideoLoop`; a regression here breaks the home of the videos as well as the gallery |
| Mitigation in plan | Default `false` preserves existing behaviour; new test case covers the gated branch |
| Residual risk | Low after explicit regression test for the legacy (no-prop) path is added |
| Action | Story implementing the `VideoLoop` change must add a test asserting: with no `pauseWhenOffscreen` prop, the IO disconnects after first intersection (matches existing behaviour). Existing `VideoLoop.test.tsx` cases must continue to pass without modification beyond the new branch. |

### RISK-003 (low) — First-paint poster loads aggregate to ~1.7 MB across 7 panels

| Field | Value |
|---|---|
| Category | Performance |
| Likelihood | High — every poster is set on its `<video poster=...>` attribute and may begin loading on page mount regardless of viewport position |
| Impact | Low — posters are static JPGs (80-410 KB each); modern browsers handle the load gracefully; only the first panel's poster is above the fold |
| Mitigation in plan | First panel has `priority={true}` + `fetchpriority='high'`; other panels' videos are lazy-loaded (`preload='metadata'`) but posters are not |
| Residual risk | Low — the gallery feels lighter than an image-heavy index page; total page weight is comparable to existing Fieldwork detail pages |
| Action | Stories should use Next.js `<Image>` for posters where feasible (auto-WebP, responsive sizes). If `<VideoLoop>`'s `poster` attribute can accept a Next-optimised image URL, prefer that. Otherwise, accept the JPG load cost — it's still under 2 MB and only one panel's worth is visible on first paint. |

### RISK-004 (low) — Keyboard arrow-key navigation conflicts with browser-default scroll

| Field | Value |
|---|---|
| Category | Accessibility / UX |
| Likelihood | Medium — when the gallery container has focus, default browser behaviour for ArrowLeft/Right is horizontal scroll by ~40px; the custom listener wants to scroll by one panel-width |
| Impact | Low — worst case is jumpy scroll behaviour; doesn't break the page |
| Mitigation in plan | Architecture mentions `preventDefault()` on Arrow keys when gallery has focus |
| Residual risk | Low after correct `preventDefault()` + focus-management |
| Action | Story implementing `<Gallery>` must: (a) call `preventDefault()` on ArrowLeft/Right inside the listener; (b) ensure listener is scoped to the gallery container, not the document; (c) verify with manual test on Safari + Chrome that scroll is precisely one panel-width per keypress, no jitter. |

### RISK-005 (low) — Horizontal scroll on non-touch desktops without visible affordance

| Field | Value |
|---|---|
| Category | UX |
| Likelihood | Medium — desktop users without trackpads (mouse-only) may not realise horizontal scroll is the interaction; vertical scroll won't do anything |
| Impact | Low — visitor may bounce, thinking the page is broken |
| Mitigation in plan | Architecture mentions "visible scroll affordance (faint progress dots or a '← →' hint glyph)" as a recommendation; not yet committed |
| Residual risk | Low after explicit affordance is added |
| Action | Stories must include: at minimum, a faint right-edge gradient on the first panel hinting at content off-screen; ideally also a small `← →` glyph in low-contrast at the top-right of the gallery (font-mono per existing register). Validate on desktop without a trackpad. |

### RISK-006 (low) — Mobile viewport — `100dvh` browser support

| Field | Value |
|---|---|
| Category | Browser compatibility |
| Likelihood | Low — `100dvh` has been supported in iOS Safari 15.4+, Chrome 108+, Firefox 101+ (all 2022+); current support is >95% globally |
| Impact | Low — fallback `100vh` still renders the panel, just with address-bar overlap |
| Mitigation in plan | Architecture uses `100dvh` explicitly |
| Residual risk | Low |
| Action | Stories may add a `100vh` fallback CSS rule before the `100dvh` rule for very old mobile Safari, but it's optional. No polyfill needed. |

### RISK-007 (low) — `getAllFieldwork` status-param widening — type narrowing in callers

| Field | Value |
|---|---|
| Category | Regression / TypeScript |
| Likelihood | Low — TS narrowing typically widens cleanly when adding an array variant to a union; existing single-status callers stay valid |
| Impact | Low if it lands — TS error at build time, caught before merge |
| Mitigation in plan | Type change is `FieldworkStatus \| readonly FieldworkStatus[]` — a discriminated union shape |
| Residual risk | Negligible — `pnpm typecheck` gate catches any caller issue |
| Action | None beyond running the standard typecheck gate. |

---

## Privacy / data risk

**Status: none.**

- No client-side analytics added (gallery does not call any tracking endpoint)
- No cookies set
- No localStorage / sessionStorage writes
- No third-party scripts loaded
- No PII collected or rendered
- All videos are statically hosted from `public/media/`; no external CDN, no remote fetches

The gallery is a pure GET-from-bundle surface. Same privacy posture as `/fieldwork` and `/archive`.

---

## Security review

| Vector | Applies? | Reasoning |
|---|---|---|
| Authentication bypass | No | No auth on `/gallery` |
| Authorisation gaps | No | No protected resource |
| XSS | No | No user input rendered; content from typed MDX frontmatter only; no `dangerouslySetInnerHTML` in any new component |
| SQL / NoSQL injection | No | No database |
| CSRF | No | No state-changing endpoint |
| SSRF | No | No outbound fetch |
| Open redirect | No | All `<Link>` destinations are `/fieldwork/<slug>` from typed frontmatter; slug regex-validated in `FIELDWORK_FRONTMATTER` |
| Dependency CVE introduction | No | No new dependencies |
| Secret exposure | No | No env vars touched; no API keys in scope |
| Rate-limit bypass | No | Static page, no rate-limitable endpoint |

No security review items require story-level action.

---

## Performance budget

### First paint (above the fold)

Approximate cost for the first panel only (the only one visible above the fold):

| Asset | Bytes |
|---|---|
| HTML shell + critical CSS | ~30 KB |
| JS bundle delta (`<Gallery>` + `<GalleryPanel>`) | ~3-5 KB gzip estimated |
| First panel poster (FW01: 410 KB; FW02 if first: 81 KB; FW03: 384 KB — depends on sort order) | up to ~410 KB |
| First panel video — `priority={true}` + `fetchpriority='high'` so it loads but does not block paint | 0 KB blocking; ~600-1200 KB after-paint |

**Largest Contentful Paint (LCP) target:** under 2.5s on a 3G/Slow 4G connection. The first panel's poster is the LCP candidate. ~410 KB poster should fit within budget for desktop and recent mobile.

### Full page weight (all 7 panels loaded)

| Component | Bytes |
|---|---|
| 7 posters (sum) | ~1.7 MB |
| 7 videos (loaded only as user scrolls; not pre-loaded) | up to ~13.2 MB cumulative if user scrolls through all |

The architectural decision to lazy-load videos via IntersectionObserver and pause-when-offscreen means the *resident* memory footprint stays at one decoded video at a time. Cumulative network is bounded by user behaviour (don't scroll = don't download).

### Optimisations beyond architecture

| Optimisation | Recommendation |
|---|---|
| Next.js `<Image>` for posters | Recommended — auto-WebP, responsive sizes. May require `<VideoLoop>` to accept either a string URL or a Next image data URL. Optional refinement; not blocking. |
| HTTP/2 multiplexing | Already on Vercel; no action |
| Video codec optimisation | Existing videos are H.264; HEVC/AV1 transcoding could halve bytes but adds operational complexity (multiple sources, browser fallback). Not in scope for v1. |
| Preconnect / preload hints | Not needed — all assets are same-origin |

**Performance posture: budget is fine; v1 ships without exotic optimisations.** v2 could add codec optimisation if real-world LCP measurements come back hot.

---

## Accessibility audit pre-check (WCAG 2.1 AA touchpoints)

| Touchpoint | Status | Action needed in stories |
|---|---|---|
| 1.4.3 Contrast (minimum) — caption text on video | At-risk | **Add scrim or text-shadow.** See RISK-001. |
| 1.4.11 Non-text contrast — focus indicator | At-risk | Visible focus ring on focused panel link; default Tailwind `focus-visible:ring-2 ring-accent` pattern works |
| 1.4.13 Content on hover/focus — hover states | OK | No hover-only content; click-through is the only affordance |
| 2.1.1 Keyboard — arrow keys nav | At-risk | Custom listener correctness; see RISK-004 |
| 2.1.2 No keyboard trap | OK | Gallery doesn't trap focus; tab leaves it normally |
| 2.4.3 Focus order — tab order matches visual order | OK | Panels rendered in DOM order match scroll order |
| 2.4.4 Link purpose — caption text identifies destination | OK | Caption is `fieldwork ## · {title}`; `<Link href="/fieldwork/<slug>">` |
| 2.4.7 Focus visible | At-risk | Confirm focus ring is visible against varied video backgrounds; may need scrim consistency |
| 2.5.5 Target size — clickable panel | OK | Full viewport panel is unambiguously large enough |
| 2.3.3 Animation from interactions — reduced motion | OK | Scroll-snap is layout, not animation; videos respect `prefers-reduced-motion` via `<VideoLoop>` |
| 1.4.2 Audio control — autoplay audio | OK | Videos are silent; `muted` enforced |
| 1.2.2 Captions for video | At-risk (deferred) | No `.vtt` captions exist. Videos are silent atmospheric loops; the alt text via `aria-label` covers screen-reader description. Captions for non-essential audio-less video are not strictly required by WCAG, but worth noting. |

**Net accessibility verdict:** PASSABLE with the scrim and focus-visible work in stories. No fundamental blocker; gallery is achievable to WCAG 2.1 AA.

---

## Browser support matrix

| Feature | Support floor | Polyfill needed? |
|---|---|---|
| CSS `scroll-snap-type: x mandatory` | Universal since 2019 (Chrome 69, Safari 11, Firefox 68) | No |
| CSS `scroll-snap-align: center` | Same | No |
| CSS `100dvh` | Chrome 108, Safari 15.4, Firefox 101 (all 2022+) | Optional `100vh` CSS fallback ahead of the `100dvh` rule |
| `IntersectionObserver` | Universal since 2019 | Already used in `<VideoLoop>`; no addition |
| `HTMLVideoElement.play() returning Promise` | Universal modern | Already handled with `.catch()` in `<VideoLoop>` |
| `prefers-reduced-motion` media query | Universal since 2020 | Already used |
| Next.js 15 / React 19 SSR + hydration | Standard | None |
| Tailwind v4 utilities (`motion-reduce:*`, etc.) | Build-time; runtime cost is plain CSS | None |

**Browser floor: Safari 15.4+ (2022), Chrome 108+ (2022), Firefox 101+ (2022).** Aligns with bines.ai's existing floor (the site already uses modern features).

---

## Regression risk on existing surfaces

### `VideoLoop` — extended with `pauseWhenOffscreen` prop

- **Existing callers:** `FieldworkArticle` (the Fieldwork detail pages). None pass `pauseWhenOffscreen`.
- **Default behaviour:** prop is `false` by default → IntersectionObserver disconnects after first intersection (existing behaviour preserved).
- **Test coverage:** existing `VideoLoop.test.tsx` cases must continue to pass. One new case for the `pauseWhenOffscreen={true}` branch.
- **Risk:** Low. Captured as RISK-002.

### `getAllFieldwork` — `status` param widened to `FieldworkStatus | readonly FieldworkStatus[]`

- **Existing callers:** `getFieldworkBySlug`, `getFieldworkByStatus`, `getFieldworkGroupedByStatus`, `/fieldwork` index (calls with `{ status: 'in-rotation' }`), `/archive` (calls without status).
- **Type compatibility:** widening to a union with array is backward-compatible for single-string callers.
- **Runtime compatibility:** internal filter must normalise both string and array forms; existing single-string semantics preserved.
- **Test coverage:** existing fieldwork loader tests must continue to pass. One new case for the array branch.
- **Risk:** Negligible. Captured as RISK-007.

### Nav — adding `/gallery` entry

- **Existing callers:** all pages render `<Nav>` via `<PageShell>` (presumed; confirm during context).
- **Effect:** one new link in the nav bar.
- **Risk:** Cosmetic only — verify nav doesn't wrap awkwardly with 9 items vs 8.

### `getGalleryFieldwork()` — new helper

- New function; no existing callers.
- No regression possible.

---

## Open items for the PRD phase

1. **Caption scrim/treatment decision** — PRD should specify the chosen approach (scrim recommended) as an explicit AC on the relevant story so it doesn't get skipped.
2. **Scroll affordance** — PRD should specify what visual hint is added (right-edge gradient + `← →` glyph recommended). Cosmetic but UX-load-bearing.
3. **Sort order** — PRD should pick one: chronological newest-first (matches loader default), reverse-chronological, or fixed editorial order. Recommend **chronological newest-first** for consistency with `/fieldwork` index.
4. **Page intro copy** — PRD should specify the page title and the one-line intro (per architecture: "Gallery" + a minimal one-liner; potentially a small stamp glyph). Maria's call on the copy; safe default copy can be drafted in PRD.
5. **FW05 exclusion test** — stories should include a test verifying that retired pieces (status `retired-still-right`, `retired-evolved`) do NOT appear in `getGalleryFieldwork()` output, even if they have media.

---

## Next step

Run `/isaac:prd` for Phase 5 — generates the PRD synthesising concept + context + architecture + assessment. Should be straightforward given the volume of upstream artifacts.
