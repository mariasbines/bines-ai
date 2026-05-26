# Symphony in Motion — Concept (Phase 1)

**Epic slug:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Author:** Maria + Claude (drafted from Maria's concept brief in memory `project_bines_ai_art_gallery.md`)

---

## TL;DR

A new page on bines.ai that collects every piece of AI-assisted art created for the site — the Fieldwork hero videos primarily, plus any postcard art, /now and /taste imagery, the site stamps — into a curated "gallery wall" Maria can revisit just to look at. Maria's framing: *"a symphony in motion"* — motion design and scroll-driven rhythm, not a flat grid. Editorial-maximalist, curated, not autoplay-y. Pre-requisite epic (pushback v2) shipped 21 May; cleared to start.

---

## Why

The bines.ai art is currently scattered. Each Fieldwork hero video lives at the top of its own essay; each postcard signature mark sits inside its postcard. A reader can only see the art one piece at a time, in the context of its parent piece. Maria has built up a body of work — every video is generated through a deliberate Veo prompt that references the piece's content; every poster is a still from that take; every stamp is an authored mark. The collection is worth more than the sum of its parts, and worth letting Maria (and any future visitor who's read more than one piece) revisit as a *body of work*, even though the images are AI-assisted.

The motivation is curatorial, not promotional. Not "look at all the art on this site" but "here is a quiet room where the visual side of bines.ai gets to live as itself."

The framing Maria used — *"a symphony in motion"* — is load-bearing. It signals:
- The Fieldwork hero videos are the dominant medium (not stills), so the gallery should treat motion as the primary register
- Rhythm matters more than enumeration — the gallery should *flow*, not list
- Lean toward motion design / transitions / scroll-driven cadence rather than a static grid

---

## What

A new page on bines.ai — provisional route `/gallery` (or possibly absorbed into `/archive`; see open questions) — that surfaces the visual artefacts of the site as a continuous, motion-led experience.

Each Fieldwork hero video plays in the gallery in some autoplay-loop register, with its associated poster as the fallback / before-load state. Posters from FW05 (which currently has no video) should still appear; the gallery accommodates the gap rather than hiding it.

Some text accompanies each piece — at minimum the Fieldwork number and title, so the viewer can navigate from the gallery to the source piece if they want — but the visual is the focal element. Captions stay short and editorial. No commentary explaining the art.

Beyond Fieldwork videos: the gallery should also have a place for the site's other art — the `stamp.svg`, the OG mark, any postcard art if/when it exists, /now and /taste hero art if/when those surfaces get visuals (none today). The gallery's structure should accommodate growth as more art is added over time, without needing a re-design.

The gallery is for looking. Not curating, not commenting, not sharing externally, not gamified. Maria visits. Visitors who have read enough pieces visit. Both leave having spent time with the work.

---

## Inputs — what gets surfaced

Current art assets in the repo (as of 2026-05-26 evening, post-merge of FW08 + Precursor rename):

### Fieldwork hero videos + posters (`public/media/fwNN/`)

| Piece | Video | Poster | Notes |
|---|---|---|---|
| FW01 best-thing-not-at-work | `header.mp4` 1.2 MB | `poster.jpg` | Editorial-maximalist geometric collage, green/black |
| FW02 architect-not-bystander | `header.mp4` 597 KB | `poster.jpg` | Smallest video |
| FW03 maybe-an-entrepreneur | `header.mp4` 1.8 MB | `poster.jpg` | |
| FW04 singularity-different-clothes | `header.mp4` 2.4 MB | `poster.jpg` | |
| FW05 singularity-is-here | **missing** | **missing** | Frontmatter has `readMinutes` only — no video has ever been generated for this piece |
| FW06 brain-swap | `header.mp4` 3.6 MB | `poster.jpg` | Hand-printed mustard/grey/coral |
| FW07 know-thyself | `header.mp4` 1.6 MB | `poster.jpg` | Literal poison-dart-frog illustration |
| FW08 precursor (slug `08-both-desks`) | `header.mp4` 2.0 MB | `poster.jpg` | Paper torn off the wall by wind, pin remains |

**Total video weight:** ~13.2 MB across 7 pieces. Naïve full-page loading would be heavy; the architecture phase needs to address lazy-loading / playback strategy.

### Other art assets

- `public/stamp.svg` — site stamp / sigil (small SVG)
- `public/media/og-stamp.png` — Open Graph stamp mark
- Postcards: text-only at present (no hero art per postcard). Decide whether to include postcard-list typographic excerpts or skip entirely.
- /now and /taste: text-only pages. No hero art today.

---

## Voice & aesthetic constraints (immutable)

From `~/Documents/bines-ai-brainstorm/02-state-of-play.md`, project `CLAUDE.md`, and existing pieces:

- **Editorial-maximalist** — Saul Bass / Sister Corita Kent / Charley Harper / Matisse lineage. Saturated limited palette. Scale not volume.
- **NOT default AI tropes** — no robots, no glowing brains, no blue gradients, no particle swirls, no glossy 3D, no minimalist-AI vector look.
- **No SynapseDx palette** — bines.ai is deliberately distinct from Maria's CEO brand. The forbidden SynapseDx tokens (bg #0A0F1A, cyan #00D4AA, coral #F26B38, blue #0EA5E9) are forbidden here.
- **British English** in any new copy.
- **No real names of people in Maria's life** per `feedback_bines_ai_no_real_names.md` — covers any captions referencing people.
- **No newsletter pop-ups ever.**

The existing Fieldwork posters set the visual register. Any chrome, transitions, or page styling for the gallery should sit *quietly* relative to the art — the art is the loud thing, the chrome is the room around it.

---

## Non-goals (explicitly out of scope)

- **No CMS / admin UI.** Maria doesn't curate via the gallery — assets are added to the gallery by adding them to `public/media/` and the relevant content frontmatter, same as today.
- **No gamification.** No likes, no leaderboards, no "art of the week", no shareable cards, no social-sharing widgets.
- **No external embeds.** The gallery doesn't get embedded on LinkedIn, doesn't have an OG-card optimised "share this gallery" flow.
- **Not autoplay-y in a stocky way.** The Fieldwork videos autoplay in the gallery but the gallery as a whole shouldn't read as a slideshow saver or hotel-lobby reel.
- **Not a regenerator of art.** The gallery does not call Veo or generate new art at view time. It surfaces what's already in `public/media/`.
- **Not a critique / praise space.** No commentary explaining the art, no AI-tool attribution beyond what already exists, no curator's notes.

---

## Success criteria

The gallery is successful if:

1. **Maria visits it for pleasure.** She finds it satisfying to look at; it earns repeat visits as new pieces ship.
2. **A visitor who has read several pieces can spend a couple of minutes in the gallery and feel they've experienced the body of work as a whole** — not just N individual hero images.
3. **It flows.** The motion-design feels rhythmic — Maria's "symphony" — rather than gridded enumeration.
4. **It scales.** Adding FW09's hero video later requires only dropping the file into `public/media/fw09/` and updating frontmatter; no gallery code touched.
5. **It loads.** Heavy total weight is mitigated by intelligent lazy-loading / autoplay-on-intersection / etc. — no jankiness on first paint, no thrashing on scroll.
6. **It honours the aesthetic.** Editorial-maximalist, curated, not generic-AI-page-default.

---

## Open questions for next phases

The architecture phase (Phase 3) will need to resolve these. Captured here so the context phase (Phase 2) can scope its analysis appropriately.

### Design / UX

1. **Layout pattern.** Horizontal scroll? Vertical scroll with parallax? Autoplay slideshow with crossfades? Ken Burns drift over each piece? Hybrid? — *This is the "symphony in motion" decision and warrants a design exploration phase before stories.*
2. **One unified gallery, or sub-collections?** Single continuous flow, or sections (Fieldwork videos / Stamps / Postcard art / …)?
3. **Captions.** Per-piece title + number visible, or pure visual with hover/tap reveal, or no captions at all?
4. **Click-through behaviour.** Click on a piece in the gallery → does it navigate to the source Fieldwork piece, open the asset full-bleed, or do nothing?
5. **Sort order.** Chronological (newest first / oldest first)? By accent colour? By piece type? Random per visit? Fixed editorial order?
6. **Mobile pattern.** Does the desktop scroll-driven motion design translate to mobile, or does mobile get a different (perhaps more grid-like) treatment?
7. **First-paint state.** What does the gallery look like in the half-second before videos start loading? (Poster mosaic? Single hero frame? Blank with a stamp?)

### Technical

8. **Route.** New `/gallery` page, or absorbed into `/archive`? (Existing `/archive` covers Fieldwork + /now history but not art-as-such.)
9. **Asset delivery.** Pre-render the page with Next.js (probably yes, content is static)? Lazy-load videos on intersection observer? Pre-fetch the next-in-rotation video while the current one plays?
10. **Video playback.** Autoplay-muted-loop (matches header video pattern)? One-at-a-time playback (only the in-view video plays)? Click-to-play?
11. **Performance budget.** What's the acceptable JS bundle increase? What's the network budget for first-paint? (Total assets ~13 MB at full quality — needs deferred loading.)
12. **Accessibility.** Reduced-motion preference handling (videos pause / fall back to posters). Keyboard navigation. Screen reader behaviour (each art piece needs an alt description or aria-label).

### Content / voice

13. **Page title and intro copy.** Just "Gallery"? Something more bines.ai ("The wall", "Symphony", "Things made for here")? Any intro paragraph, or open straight into the art?
14. **Alt text / aria descriptions.** Do these exist for the existing hero videos? If not, generating them is part of this epic.
15. **AI-tool attribution.** Does Maria want a note about Veo / Gemini / etc. being used to generate the videos, or stay tool-agnostic?
16. **Postcard art question.** Postcards are text-only today. Does the gallery want a typographic-postcard representation, or is the gallery strictly for visual art?

### Pre-requisites that need resolving before architecture

17. **FW05 missing video.** Generate a header.mp4 + poster.jpg for FW05 *before* the gallery ships, or accept the gap (and design the gallery to handle gaps gracefully)? Worth a quick Maria-call before the architecture phase commits.

---

## Suggested epic shape (preliminary — architecture phase confirms)

- **Phase 2 / Context** — full inventory pass (confirm asset paths, dimensions, durations, existing alt text); read current `/archive` route to understand whether it absorbs the gallery or stays separate; check existing image/video patterns in the codebase.
- **Phase 3 / Architecture** — design exploration: prototype 2-3 motion patterns (e.g. horizontal scroll, parallax stack, autoplay slideshow) in low-fi, pick one with Maria; specify route + component shape + asset-loading strategy.
- **Phase 4 / Assessment** — performance + accessibility risk pass; reduced-motion fallback; mobile pattern.
- **Phase 5 / PRD** — short PRD covering decisions.
- **Phase 6 / Stories** — break into 3-6 stories. Candidate stories: gallery route + base layout; asset-loading strategy; per-piece motion treatment; captions + navigation; accessibility + reduced-motion; (optional) FW05 video backfill.
- **Phase 7 / Plan + Grade**, **Phase 8 / Implement**, **Phase 9 / Validate** — standard.

---

## Related memory & context

- `project_bines_ai_art_gallery.md` — original captured concept (12 May 2026), now superseded by this artifact
- `project_bines_ai_live.md` — live status of bines.ai
- `project_bines_ai.md` — bines.ai general voice + aesthetic
- `project_bines_ai_pushback_v2.md` — pre-requisite epic (shipped 21 May)
- `~/Documents/bines-ai-brainstorm/02-state-of-play.md` — canonical voice + concept reference

## Next step

Run `/isaac:context` to scope the codebase analysis for Phase 2.
