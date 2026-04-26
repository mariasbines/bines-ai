# Architecture: bines.ai — launch

## Overview

Static-first content site with one interactive island (AI chat). Content is MDX in repo; large media lives in Vercel Blob. Chat is a thin server API over the Anthropic SDK. Everything else is server components rendered at build or request time. No database, no CMS, no auth.

The architecture pushes complexity out of the runtime and into git history: every argument edit becomes a commit, every retirement a tag, every *"changed my mind"* a merged branch. This matches the editorial register of the site — transparency about the working-with — and keeps infrastructure minimal.

## Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 App Router | Scaffold is already here; streaming chat is first-class |
| Runtime | React 19 | Server components default, client islands only where interactive |
| Language | TypeScript 5 | Strict mode |
| Styling | Tailwind CSS v4 | CSS-first `@theme` config; design tokens as CSS vars |
| Content format | MDX (`@next/mdx` + `gray-matter`) | Markdown + frontmatter + JSX components |
| Content storage | Git-committed files in `content/` | No CMS. `git log` IS the archive/revision history |
| Media storage | Vercel Blob | AI-generated video loops, testimonials, captions |
| AI | `@anthropic-ai/sdk` | Claude Sonnet 4.6 for v1 chat (cost/quality balance) |
| Analytics | `@vercel/analytics` | Privacy-friendly, cookieless |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` | Protects paid Anthropic endpoint |
| RSS | `feed` npm package | Combined feed for Fieldwork + Postcards |
| Hosting | Vercel Pro | Production: `master`; Preview: `dev` |
| Domain | bines.ai (apex canonical) | `www.bines.ai` → 308 redirect to apex |
| Package manager | pnpm 10 | Already locked |
| Build | Turbopack | Already locked |
| Testing | Vitest + Testing Library | Add as devDep |
| Formatting | Prettier | Add as devDep |

### Why MDX-in-repo over a CMS

- Simplest authoring (VS Code or GitHub web editor)
- Git log = free version history, which *IS* the archive mechanic (*"still right / evolved / changed my mind"* maps onto branches/tags/commit messages)
- No extra service to run, secure, pay for, or migrate off
- For a single-author personal site, a CMS is overhead with no upside

### Why Claude Sonnet 4.6 for chat (not Opus)

- v1 chat is a public endpoint with no auth — cost per conversation matters
- Sonnet 4.6 is more than capable of carrying Maria's voice from a strong system prompt
- Opus 4.7 would double cost for a marginal voice-fidelity improvement at best
- Easy to swap model later via one env var if Maria wants to upgrade

## URL structure

| Route | Purpose | Render |
|---|---|---|
| `/` | Homepage: bio, antipatterns, currently strip, Fieldwork in rotation, recent Postcards | SSG |
| `/fieldwork/[slug]` | Single Fieldwork piece | SSG |
| `/postcards` | Postcards index (stream) | SSG |
| `/postcards/[number]` | Single Postcard | SSG |
| `/archive` | Archive organised by status | SSG |
| `/changed-my-mind/[slug]` | Full changed-my-mind piece | SSG |
| `/now` | /now page | SSG (rebuilt on push) |
| `/taste` | Taste shelf | SSG (rebuilt on push) |
| `/argue` | AI chat interface | Static shell + client island |
| `/rss.xml` | Combined RSS feed | Static route |
| `/sitemap.xml` | Sitemap | Dynamic route |
| `/robots.txt` | Robots | Dynamic route |
| `/api/chat` | Chat streaming endpoint | Edge runtime |
| `/api/push-back` | Feedback submission | Edge runtime |

`www.bines.ai` → apex via Vercel redirect config (308).

## Data model

All content is MDX files with typed frontmatter. TypeScript types live in `lib/content/types.ts`.

### Fieldwork

```
content/fieldwork/{slug}.mdx
```

Frontmatter (`lib/content/types.ts → FieldworkFrontmatter`):

```ts
{
  id: number;                     // ordinal (FIELDWORK 01, 02, ...)
  slug: string;                   // URL slug
  title: string;
  published: string;              // ISO date
  revised?: string[];             // ISO dates of notable revisions
  status: 'in-rotation'
        | 'retired-still-right'
        | 'retired-evolved'
        | 'changed-my-mind';
  retiredReplacedBy?: string;     // slug of replacement Fieldwork (if evolved)
  tags: string[];                 // e.g. ['memory', 'attention', 'specificity']
  media: {
    readMinutes: number;
    watchMinutes?: number;
    headerVideo?: string;         // Vercel Blob URL (atmospheric loop)
    captions?: string;            // Vercel Blob URL (WebVTT)
    testimonial?: string;         // Vercel Blob URL (low-fi Maria-to-camera)
  };
  pushback: { count: number; landed?: number };
  changeMyMind?: { count: number; note?: string };
  excerpt: string;                // 1-2 sentences for cards
}
```

Body: MDX with custom components available — `<PullQuote>`, `<VideoLoop>`, `<FigureCaption>`, `<Aside>`.

### Postcards

```
content/postcards/{number-slug}.mdx
```

Frontmatter:

```ts
{
  number: number;                 // POSTCARD #001, #002, ...
  published: string;              // ISO date
  tags?: string[];
}
```

Body: short MDX (50-200 words). No metadata strip at the card level — postcards are content-forward, numbered header, date line, that's it.

### Now

```
content/now.mdx          — single file, edit in place; git history is the archive
```

Frontmatter:

```ts
{
  updated: string;                // ISO date
  currently: string;              // one fragment, the "currently thinking about" line
}
```

Body: one short paragraph — currently obsessed with / failing at / rereading.

### Taste

```
content/taste.mdx        — single file, same pattern as /now
```

Frontmatter:

```ts
{
  updated: string;
}
```

Body: 3-5 items with short annotations. Each item optionally has a link.

### Antipatterns

Static copy in `lib/content/antipatterns.ts` (not MDX). Stable by design; shouldn't change often. If it does change, it's a deliberate commit.

### Site config

```
lib/content/site.ts
```

Constants: bio line (locked to state-of-play), canonical URL, og-image defaults.

## Components

### Server (default)

| Component | Purpose |
|---|---|
| `<PageShell>` | Top bar: site title, *currently* strip, rotation counts, nav. Wraps all pages. |
| `<AntipatternsStrip>` | The *"I don't do"* list — appears on homepage + footer on all pages |
| `<FieldworkCard>` | Rendered card with data strip, title, excerpt, `[ watch ] [ read ] [ push back ]` |
| `<FieldworkArticle>` | Full piece renderer — header video, title, byline, MDX body, change-my-mind footer |
| `<PostcardCard>` | Short-form numbered card |
| `<PostcardArticle>` | Full postcard view |
| `<ArchiveSection>` | Grouped archive list by status |
| `<NowBlock>` | /now rendering |
| `<TasteShelf>` | 3-5 current items |
| `<Metadata>` | Reusable data-strip for Fieldwork cards |
| `<BioLine>` | Renders the locked bio line |

### Client (islands)

| Component | Purpose |
|---|---|
| `<ChatInterface>` | Full-page chat on `/argue` — text input, streamed output, conversation history in local state |
| `<PushBackButton>` + `<PushBackModal>` | Feedback form (posts to `/api/push-back`) |
| `<VideoLoop>` | HTML5 video with autoplay, muted, loop, captions track — manual play/pause fallback for reduced-motion users |
| `<CurrentlyStrip>` | Only if the *currently* line animates/rotates; otherwise server-rendered |

## Chat architecture (v1 MVP)

**Goal:** a visitor opens `/argue`, types a message, gets a streamed response in Maria's voice. Conversation persists for the session (in-memory state only, resets on refresh). Demonstrates AI prowess on a site about AI × life.

### Flow

```
User → <ChatInterface> (client)
     → POST /api/chat { messages: [...] }
     → route handler (edge runtime)
     → rate-limit check (Upstash)
     → anthropic.messages.stream({
         model: 'claude-sonnet-4-6',
         system: SYSTEM_PROMPT,
         messages,
         max_tokens: 1024,
       })
     → server-sent stream back to client
     → <ChatInterface> renders streaming tokens
```

### System prompt

Lives in `lib/chat/system-prompt.ts`. Anchored on:

- The locked bio line
- The voice rules from state-of-play (diagnostic not confessional, contrarian first, leave a question hanging, British+Southern+Canadian hybrid register)
- The antipatterns list (things the persona refuses to do)
- Fieldwork 01 as a one-shot voice example embedded in the prompt
- Explicit identity: *"you are an AI trained to argue with visitors in Maria's voice. You are NOT Maria herself. If asked directly, you acknowledge you are an AI — cheerfully, because the site is honest about this."*
- Safety rules: no PII about real people (Morgan, Dan, Zac, etc. beyond what's already public on the site); decline to impersonate Maria on matters of opinion she hasn't taken publicly

### Rate limiting

Public endpoint, paid upstream API → must rate-limit.

- IP-based, Upstash-backed
- Baseline: 10 messages per 10 minutes per IP
- Hard cap: 50 messages per day per IP
- Over-limit response: 429 + friendly message
- Configurable via env vars — can loosen if abuse isn't a problem

### Cost control

- Model pinned to Sonnet 4.6 (cheaper than Opus)
- `max_tokens: 1024` per response
- No system prompt bloat (one-shot example only, not a full corpus)
- Anthropic spend alerts on the API key
- Rate limiting = hard ceiling on worst-case cost

### v2 upgrade path (out of scope for v1)

- RAG over Fieldwork + Postcards for corpus-aware replies
- Citation mechanics (*"here's where I argued that →"*)
- Conversation persistence (anonymous session ID in cookie)
- Optional: fine-tune on Maria's corpus once the corpus is large enough

## Media handling

- AI-generated atmospheric loops and testimonials are **authored externally** (Runway / Veo / Pika / Maria's phone), uploaded to Vercel Blob, referenced by URL in Fieldwork frontmatter. The site renders them; it doesn't generate them.
- Captions are WebVTT files in Blob, linked via `<track>` on the video element.
- Static images (any; should be rare) live in `public/` or Blob depending on size/use.
- Blob upload is not in v1 — assume URLs are provided manually in frontmatter. A lightweight admin upload UI is a v2 candidate.

## Design tokens

Defined in `app/globals.css` via Tailwind v4 `@theme`. Editorial-maximalist direction.

### Palette — locked (Palette A "Jewel editorial on ivory")

Chosen from the 22 Apr mood board review (`~/Documents/bines-ai-brainstorm/palette-moodboard.html`). Maria's note: *"jewel editorial was my favourite because of the choice of colours that feel ironically more modern."* Ground refined cream → ivory in a follow-up side-by-side comparison (`~/Documents/bines-ai-brainstorm/background-moodboard.html`) — reads as white at a glance, keeps a sliver of editorial warmth, lets the jewels pop slightly harder without going full gallery-modernist.

Near-white paper ground + deep jewel anchors. Mid-century editorial lineage (MoMA poster store / Penguin Classics deluxe / Girard / Harper). Per-piece discipline: paper + ink + **one** jewel anchor; rotate across pieces so the site-wide palette is rich but each page is tight.

```css
@theme {
  /* ground + type */
  --color-paper: #FFFFF4;     /* ivory — site background */
  --color-paper-2: #FFFEFA;   /* lifted surface — card background */
  --color-ink: #1A1814;       /* deep warm black — body text */

  /* rotating jewel anchors (one per piece) */
  --color-emerald: #0F7B5A;   /* serious, composed */
  --color-sapphire: #1B3A8C;  /* confident */
  --color-ruby: #B0213A;      /* warm, declarative */
  --color-topaz: #C28F2A;     /* golden, luxe not acid */
  --color-amethyst: #3F1E4C;  /* quiet, intellectual */
}
```

Semantic tokens (mapped from the raw palette):
- `--color-bg` → `--color-paper`
- `--color-surface` → `--color-paper-2`
- `--color-text` → `--color-ink`
- `--color-accent` → per-page jewel (selected in frontmatter or via route config)
- `--color-destructive` / `--color-warning` → `--color-ruby` (reuse; no separate error palette)

### Typography (starting pairing — Google Fonts, free)

- **Fraunces** (variable serif) — body text + headlines. Can go from warm editorial body to super-bold display.
- **Inter** (variable sans) — UI, nav, labels, metadata strip captions.
- **JetBrains Mono** — the FIELDWORK card data strips (monospace for the README/dashboard aesthetic). (Locked 22 Apr 2026 after palette-mood-board review — the mood boards used JBM and Maria approved; architecture updated to match intent.)

Loaded via `next/font/google` in root layout — zero layout shift, self-hosted.

Alternative pairings to A/B once the site is live:

- Big Shoulders Display (for loud editorial) + Newsreader + Plex Mono
- Playfair Display + Source Sans 3 + Space Mono

### Scale

Tailwind v4 default scale, extended for a single oversized headline size (for FIELDWORK card titles). Editorial-maximalist requires at least one scale entry that reads across a room.

## Deployment

### Vercel project

- Name: `bines-ai`
- Git: `mariasbines/bines-ai`
- Framework preset: Next.js (auto-detected)
- Install: `pnpm install`
- Build: `pnpm build`
- Output: `.next` (default)
- Node: 20.x

### Branches

- **`master`** → production (deploys to bines.ai)
- **`dev`** → preview (deploys to `dev-bines-ai.vercel.app` or similar)

Branch strategy mirrors Morgan's photography site: push to `dev` to preview, merge to `master` to ship.

### Environment variables (Vercel dashboard)

| Variable | Environments | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | production, preview | Chat endpoint |
| `BLOB_READ_WRITE_TOKEN` | production, preview | Vercel Blob access |
| `UPSTASH_REDIS_REST_URL` | production | Rate limit backend |
| `UPSTASH_REDIS_REST_TOKEN` | production | Rate limit backend |
| `CHAT_MODEL` | production, preview | Override default model (optional) |
| `RATE_LIMIT_PER_WINDOW` | production | Tune rate limit without redeploy |

None of these go in git. All set via Vercel dashboard.

### Domain

- Apex `bines.ai` — canonical
- `www.bines.ai` — 308 redirect to apex
- Nameserver change at Name.com (Maria's action, prompted by deploy story): set to Vercel's `ns1.vercel-dns.com` / `ns2.vercel-dns.com`

## Dependencies

### Add

| Package | Purpose |
|---|---|
| `@anthropic-ai/sdk` | Chat |
| `@vercel/blob` | Media storage |
| `@vercel/analytics` | Analytics |
| `@upstash/ratelimit` | Rate limit |
| `@upstash/redis` | Rate limit backend |
| `feed` | RSS generation |
| `@next/mdx` | MDX renderer |
| `@mdx-js/loader` `@mdx-js/react` | MDX support |
| `gray-matter` | Frontmatter parsing |
| `date-fns` | Date formatting |
| `remark-gfm` | GFM support in MDX |
| `zod` | Frontmatter schema validation |
| `next/font` | Already built-in, explicit mention |

### Add (dev)

| Package | Purpose |
|---|---|
| `vitest` | Unit tests |
| `@vitest/ui` | Test UI |
| `@testing-library/react` | Component tests |
| `@testing-library/jest-dom` | DOM matchers |
| `jsdom` | Test DOM |
| `prettier` | Formatting |
| `prettier-plugin-tailwindcss` | Class sort |

### Keep

Everything currently in `package.json` — Next 15.5, React 19.1, Tailwind 4, TypeScript 5, ESLint 9.

## Non-functional requirements

### Performance

- Core Web Vitals green across all pages
- LCP < 2.0s on homepage, < 2.5s on Fieldwork pieces (video loop lazy-loaded)
- CLS < 0.1 (pre-reserve video/image space)
- JS shipped: homepage < 50kb gzipped (most content is server components)

### Accessibility

- WCAG 2.1 AA baseline
- Captions on all videos (WebVTT)
- Proper heading hierarchy (no `h1`-less pages)
- Keyboard-navigable chat (focus trap in modal if used; focus management on streaming)
- `prefers-reduced-motion` respected — video loops pause, replaced by still header frame
- Color contrast verified for all palette combinations before launch

### SEO

- Metadata per page (title, description, og:image)
- Static OG image for default, custom per Fieldwork piece
- Sitemap + robots
- Structured data: `Article` schema on Fieldwork pieces

### Privacy

- Vercel Analytics only (no GA, no pixels, no session replay)
- No cookies required for chat (IP used only for rate limiting, not stored)
- No email capture forms anywhere (antipatterns forbid newsletter pop-ups)

## Files to create / modify

Canonical structure after the launch epic is complete. Each file will be scoped to a specific story.

```
app/
├── layout.tsx                          # Root layout: fonts, <PageShell>, <AntipatternsStrip>
├── page.tsx                            # Homepage: bio, antipatterns, currently, Fieldwork, recent Postcards
├── globals.css                         # Design tokens (@theme), Tailwind v4, font loading
├── fieldwork/
│   └── [slug]/
│       └── page.tsx                    # Fieldwork article renderer
├── postcards/
│   ├── page.tsx                        # Postcards index
│   └── [number]/
│       └── page.tsx                    # Single postcard
├── archive/
│   └── page.tsx                        # Archive grouped by status
├── changed-my-mind/
│   └── [slug]/
│       └── page.tsx                    # First-class changed-my-mind piece
├── now/
│   └── page.tsx                        # /now
├── taste/
│   └── page.tsx                        # Taste shelf
├── argue/
│   └── page.tsx                        # Chat interface (server shell + client island)
├── api/
│   ├── chat/
│   │   └── route.ts                    # Edge: streaming Anthropic
│   └── push-back/
│       └── route.ts                    # Edge: feedback capture
├── rss.xml/
│   └── route.ts                        # Combined RSS
├── sitemap.ts                          # Dynamic sitemap
└── robots.ts                           # Robots directives

components/
├── PageShell.tsx                       # Top bar + data strip
├── BioLine.tsx                         # Locked bio line
├── AntipatternsStrip.tsx               # "I don't do" block
├── CurrentlyStrip.tsx                  # Header data strip
├── FieldworkCard.tsx                   # Data-strip card
├── FieldworkArticle.tsx                # Full piece renderer
├── Metadata.tsx                        # Reusable data strip
├── PostcardCard.tsx                    # Short-form card
├── PostcardArticle.tsx                 # Full postcard
├── ArchiveSection.tsx                  # Grouped archive
├── NowBlock.tsx                        # /now rendering
├── TasteShelf.tsx                      # Current items
├── ChatInterface.tsx                   # Client chat component
├── PushBackButton.tsx                  # Feedback CTA
├── PushBackModal.tsx                   # Feedback form
└── VideoLoop.tsx                       # Autoplay video + captions

lib/
├── chat/
│   ├── anthropic.ts                    # SDK client
│   ├── system-prompt.ts                # Voice-anchored system prompt
│   └── rate-limit.ts                   # Upstash ratelimiter
├── content/
│   ├── types.ts                        # Zod schemas + TS types
│   ├── antipatterns.ts                 # Static antipatterns list
│   ├── site.ts                         # Site constants (bio line, urls)
│   ├── fieldwork.ts                    # Load + parse Fieldwork MDX
│   ├── postcards.ts                    # Load + parse Postcards MDX
│   ├── now.ts                          # Load /now
│   └── taste.ts                        # Load taste shelf
├── blob/
│   └── client.ts                       # Vercel Blob helpers (v2)
└── utils/
    ├── dates.ts                        # date-fns wrappers
    └── slug.ts                         # slugify

content/
├── fieldwork/
│   └── 01-best-thing-not-at-work.mdx   # Seeded from state-of-play draft
├── postcards/
│   └── 001-impression-of-me.mdx        # Seeded from state-of-play draft
├── now.mdx                             # Initial /now content
└── taste.mdx                           # Initial taste shelf

public/
├── favicon.ico                         # TBD (editorial-maximalist mark)
└── og-default.png                      # TBD

scripts/
└── new-postcard.ts                     # CLI: scaffold next numbered postcard

.isaac/
└── epics/
    └── launch/
        └── artifacts/                  # 01-concept, 02-context, 03-architecture, ...
```

## High-level story sequence (full decomposition in phase 6)

The launch epic naturally sequences into:

1. **Foundation** — install deps, configure fonts + design tokens, global styles
2. **PageShell + BioLine + AntipatternsStrip** — visible front door
3. **Content pipeline** — MDX loader, types, frontmatter validation
4. **FieldworkCard + FieldworkArticle** — Fieldwork rendering end-to-end
5. **Seed Fieldwork 01** — port state-of-play draft into MDX
6. **PostcardCard + PostcardArticle** — Postcard rendering
7. **Seed Postcard #001** — port state-of-play draft
8. **/now + /taste** — simple pages
9. **Archive page** — grouped by status
10. **Changed-my-mind first-class route**
11. **Chat API route + rate limiting** — server side
12. **Chat Interface** — client side, streaming UI
13. **Video loop component + captions** — media handling
14. **Push-back endpoint + modal**
15. **RSS + sitemap + robots + OG defaults**
16. **Vercel project setup + env vars + preview deploy**
17. **Domain cutover** — Maria's action at Name.com, verified
18. **Launch QA** — Core Web Vitals, a11y, content check

Story-level acceptance criteria, test plans, and scope rules get defined in phase 6.

## Out of scope (v2+)

- Corpus-aware chat (RAG, embeddings, citations)
- Chat persistence (anonymous sessions)
- Admin upload UI for media
- Comments (explicitly no)
- Newsletter signup (explicitly no)
- Fine-grained analytics dashboards
- Voice/avatar versions of the chat

## Dependencies (architectural)

- **External**: Anthropic API, Vercel Blob, Upstash Redis, Vercel Analytics, Google Fonts (for Fraunces / Inter / JetBrains Mono via next/font)
- **Existing**: Next.js 15, React 19, Tailwind 4, TypeScript 5
- **New internal patterns**: MDX content pipeline, server-rendered card aesthetic with data strips, streaming chat endpoint

## Risks and open questions (for phase 4 assessment)

1. **System prompt quality determines chat credibility** — if it drifts from Maria's voice, the chat undermines the site's honesty posture. Risk mitigated by tight prompt + one-shot example + explicit AI-not-Maria acknowledgement.
2. **Rate limiting vs public accessibility** — too aggressive blocks real users; too loose invites abuse. Start at 10 per 10 min; tune from real traffic.
3. **Editorial-maximalist is hard to do well with AI imagery** — the direction fits Maria's taste but the default output of image tools fights it. Mitigated by prompt engineering and the option to use non-AI imagery where necessary.
4. **Video as a first-class medium requires Maria to actually ship videos** — if she doesn't, the `[ watch ]` button is a liability. Mitigated by the v1 having the *read* path fully functional; video is optional per Fieldwork piece.
5. **Name collision / confusion with SynapseDx** — bines.ai must not read as a SynapseDx property. Mitigated by the aesthetic + palette + voice firewall, and the *"no SynapseDx palette"* hard rule in CLAUDE.md.

These feed into the phase 4 risk assessment.
