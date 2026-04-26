# 02 — Context: codebase patterns & integration points

**Epic:** `pushback-v2`
**Phase:** 2 (Context)
**Captured:** 26 Apr 2026
**Previous artifact:** `01-concept.md`

## Tech stack snapshot

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Next.js 15 + App Router + Turbopack | Edge runtime on `/api/*` (declared per-route) |
| Language | TypeScript strict | `pnpm typecheck` = `tsc --noEmit` |
| Lint | ESLint flat config | `pnpm lint` = `eslint` |
| Test | Vitest 4.x | `pnpm test` = `vitest run --passWithNoTests`. 50 test files, 344 tests today. |
| Schema | Zod 4 | All MDX frontmatter + log entry shapes go through Zod parsers |
| Storage | Vercel Blob (`@vercel/blob` 2.3) | Day-keyed JSONL pattern, see `src/lib/argue-log/storage.ts` |
| Rate-limit | Upstash Redis + Ratelimit | `src/lib/chat/rate-limit.ts`; null-safe (permissive when env unset) |
| Cron | Vercel cron (`vercel.json`) | One existing job: `/api/argue-log/cleanup` daily at 03:30 UTC |
| LLM | Anthropic SDK 0.90 | Single Sonnet model in use (`DEFAULT_MODEL = claude-sonnet-4-6`) since Haiku retired |
| Content | MDX + gray-matter + Zod | `content/fieldwork/*.mdx`, `content/postcards/*.mdx`, `content/now.mdx`, `content/taste.mdx` |

## Repo layout — areas relevant to v2

```
src/
├── app/
│   ├── api/
│   │   ├── argue-log/cleanup/route.ts   ← cron pattern (CRON_SECRET, timing-safe compare)
│   │   ├── chat/route.ts                ← needs from_slug capture + judge trigger hook
│   │   └── push-back/route.ts           ← TO DELETE (v2 retires v1)
│   ├── argue/
│   │   ├── page.tsx                     ← needs ?from= handling + piece preface
│   │   └── log/                         ← admin view (Vercel Deployment Protection)
│   └── fieldwork/
│       ├── page.tsx                     ← index; FieldworkCard count badge lands here
│       └── [slug]/page.tsx              ← detail; PushbackSummary lands here
├── components/
│   ├── ChatInterface.tsx                ← needs idle / beforeunload chat-end hook
│   ├── FieldworkArticle.tsx             ← detail-page component; PushbackSummary inserts before footer
│   ├── FieldworkCard.tsx                ← index card; pushback count badge slot
│   ├── FieldworkCardCtas.tsx            ← [ watch ] [ read ] today; v2 adds [ argue with this ]
│   ├── PushBackModal.tsx                ← TO DELETE
│   └── (new) PushbackSummary.tsx        ← editorial summary block
└── lib/
    ├── argue-judge/                     ← NEW: prompt + verdict shape + storage
    ├── argue-log/
    │   ├── day.ts                       ← DAY_KEY_RE / dayKeyUtc helpers — reusable
    │   ├── hash.ts                      ← sha-256 IP hash helpers — reusable
    │   ├── schema.ts                    ← extend ArgueLogEntry with from_slug
    │   └── storage.ts                   ← Blob JSONL append/read pattern — reuse for argue-judges
    ├── chat/
    │   ├── anthropic.ts                 ← getAnthropicClient(), DEFAULT_MODEL, MAX_TOKENS
    │   ├── client.ts                    ← postChat() — needs ?from= signal in body
    │   ├── system-prompt.ts             ← SYSTEM_PROMPT — extend with piece body when from_slug present
    │   └── validate.ts                  ← CHAT_REQUEST schema — extend with optional from_slug
    └── content/
        └── fieldwork.ts                 ← getAllFieldwork / getFieldworkBySlug — extend with judge enrichment
content/fieldwork/*.mdx                  ← pushback.count frontmatter — degraded to fallback
vercel.json                              ← add second cron entry for judge-sweep
```

## Existing patterns to mirror

### Pattern A — daily-bucketed JSONL append on Vercel Blob
File: `src/lib/argue-log/storage.ts`. Conventions:
- One file per UTC day, key `argue-log/YYYY-MM-DD.jsonl`
- `appendArgueLog()` does `list → fetch → concat → put` (race-tolerant, not atomic; documented tradeoff for low-traffic site)
- `listArgueLogDays()`, `readArgueLogDay()`, `deleteArgueLogDay()` round out the CRUD surface
- Schema validation via `ARGUE_LOG_ENTRY.parse(entry)` BEFORE any Blob call
- L-002 hardening: exact-pathname match prevents sibling files (`.backup` etc.) from being picked up
- `BLOB_READ_WRITE_TOKEN` env var is mandatory; helper throws if missing

**v2 reuse:** new `src/lib/argue-judge/storage.ts` mirrors this exactly with `argue-judges/YYYY-MM-DD.jsonl`. Same race tolerance, same env requirement, same day-key helpers (import `dayKeyUtc` directly).

### Pattern B — Vercel cron with bearer-secret auth
File: `src/app/api/argue-log/cleanup/route.ts`. Conventions:
- Cron schedule lives in `vercel.json` `crons` array
- Route is GET (Vercel cron sends GET)
- Bearer-token auth via `CRON_SECRET` env var
- **Constant-time string compare** via local `timingSafeEqual()` (edge runtime has no Node `crypto.timingSafeEqual`); ASCII-only secret documented
- 401 on unauthorised, 500 on misconfigured
- All responses carry `X-Governed-By: bines.ai` header

**v2 reuse:** new `/api/argue-judge/sweep/route.ts` for the daily judge-sweep cron. Reuses `CRON_SECRET` (no new env). Same auth pattern, same response envelope.

### Pattern C — Anthropic SDK call
File: `src/app/api/chat/route.ts:186-191`. Conventions:
- `getAnthropicClient()` is the only place that reads `ANTHROPIC_API_KEY`
- `client.messages.stream({ model, system, messages, max_tokens })` for streaming chat
- `client.messages.create({ ... })` for one-shot completions (was used by retired Haiku, applicable for argue-judge)
- All routes are `export const runtime = 'edge'`
- Error path: catch around the SDK call, return 500 + `category: 'upstream'`

**v2 reuse:** argue-judge uses `messages.create` (not stream — verdict is a structured one-shot). Same model id, same client accessor, same edge runtime.

### Pattern D — Zod schema-first log entries
File: `src/lib/argue-log/schema.ts`. Conventions:
- Schema lives next to the type; `z.infer` for the TS type
- `ARGUE_VERDICT` has `harm` + `off_brand` + optional `reasoning` (≤500 chars)
- Top-level `ARGUE_LOG_ENTRY` validates schema_version literal, ip_hash length, salt_version enum, etc.
- `salt_version: 'current' | 'previous'` enables salt-rotation without losing parseability

**v2 reuse:** new `ARGUE_JUDGE_VERDICT` schema. Existing `ARGUE_LOG_ENTRY` gets one additive optional field: `from_slug?: string`. Backwards-compatible; old entries keep parsing.

### Pattern E — Edge-runtime route with X-Governed-By header
Every API route emits `X-Governed-By: bines.ai`. Conventions:
- Header constant declared at top of route module
- Spread into every Response init
- Tests assert presence on success AND error paths

**v2 reuse:** new `/api/argue-judge/*` routes follow this exactly.

### Pattern F — Server-only content loaders + Zod-validated MDX
File: `src/lib/content/fieldwork.ts`. Conventions:
- `import 'server-only'` at the top of any module that touches the filesystem
- `readMdxFile(filepath, schema)` validates frontmatter, throws `ContentValidationError` on mismatch
- Loaders return typed shapes; consumers (page components) destructure frontmatter

**v2 reuse:** new helper `getJudgesForSlug(slug)` in `src/lib/argue-judge/loader.ts`. Reads judges JSONL, filters by `from_slug`, returns shape consumed by `getFieldworkBySlug`. Build-time enrichment — page components don't know about Blob.

### Pattern G — Client island + parent server component
File: `src/components/FieldworkCardCtas.tsx`. Conventions:
- `'use client'` at top of any component with interactivity
- Server-rendered parent (`FieldworkCard.tsx`) renders the client island
- Client island is small — only handles state local to the interaction
- All static data passed as props from server parent

**v2 reuse:** `<PushbackSummary>` is a server component (just renders text + counts from build-time data). `<FieldworkCardCtas>` adds the new `[ argue with this ]` link — still a client island. The new chat-end signal logic lives inside `<ChatInterface>` (already a client island).

### Pattern H — Test conventions
- Vitest only; no Jest. Edge-runtime modules tested via direct import + mocks.
- Mocks via `vi.mock(modulePath, () => ({ ... }))` and `vi.hoisted` for shared mocks.
- Anthropic SDK mocked at `@anthropic-ai/sdk`. `messages.stream` and `messages.create` mocked separately.
- argue-log storage mocked at `@/lib/argue-log/storage` (the route never sees Blob in tests).
- `next/server`'s `after()` is mocked to capture callbacks for explicit invocation.
- Tests live next to source: `src/lib/foo/__tests__/foo.test.ts`.
- Coverage gate ≥80% (lines/functions/branches).

**v2 reuse:** new tests under `src/lib/argue-judge/__tests__/` and `src/app/api/argue-judge/sweep/__tests__/`. Mock pattern identical.

## Integration points — what v2 touches

| Surface | Today | v2 change |
|---|---|---|
| `/argue?from=<slug>` | unsupported query param | parse, fetch piece body, prepend to system prompt with soft preface |
| `/api/chat` request body | `{ messages: [...] }` | additive: `{ messages, from_slug? }` |
| `ArgueLogEntry` schema | no piece attribution | additive optional `from_slug` |
| `ChatInterface` lifecycle | streams response, no end-of-session signal | adds idle (2 min) + `beforeunload` POST to `/api/argue-judge/run` |
| `/api/argue-judge/run` | does not exist | new edge route — accepts `{ conversation_id, from_slug, transcript }`, calls Sonnet, writes to `argue-judges/YYYY-MM-DD.jsonl` |
| `/api/argue-judge/sweep` | does not exist | new cron route — finds yesterday's argue-log entries lacking a judge entry, runs judge over them retroactively |
| `getFieldworkBySlug` | returns frontmatter + body | also returns derived `pushback: { count, landed, excerpts[] }` from judges log |
| `<FieldworkCard>` | static metadata | reads derived count → renders accent badge when > 0 |
| `<FieldworkArticle>` | header + body + footer | inserts `<PushbackSummary>` before footer when count > 0 |
| `<FieldworkCardCtas>` | `[ watch ]` `[ read ]` | adds `[ argue with this ]` `<Link>` |
| `<PushBackModal>` | unreachable | deleted |
| `/api/push-back` | unreachable | deleted |
| `vercel.json` | one cron entry | adds `/api/argue-judge/sweep` daily |

## Conventions to honour

- **Naming:** kebab-case for files, PascalCase for React components, camelCase for functions, SCREAMING_SNAKE for constants.
- **Imports:** absolute via `@/` alias for cross-module; relative for sibling files within a directory.
- **Edge-runtime constraints:** no Node `crypto`, no `fs`, no `Buffer`. Use Web Crypto + Web Fetch + edge-compatible libs only.
- **Server-only marker:** any module that reads filesystem or has secrets gets `import 'server-only'` at top.
- **No comments unless the WHY is non-obvious.** (Project rule from root CLAUDE.md.)
- **British English in user-facing copy, lowercase opener.** (Voice rule from project CLAUDE.md.)
- **Voice for any UI / copy belongs to Maria.** Don't ship visitor-facing strings without sign-off — same as the privacy disclosure was reviewed before AC-001 closed.

## Risks discovered during context phase

1. **Race in `argue-judges/YYYY-MM-DD.jsonl` writes.** Mirrors the known argue-log race (low-traffic-tolerated). With chat-end firing from each visitor's browser, simultaneous writes are rare but possible. Same accepted-tradeoff posture as v1 logging.
2. **`beforeunload` unreliability.** Documented in concept. Sweep cron is the safety net.
3. **`/api/argue-judge/run` is publicly callable.** Needs auth — likely IP-bound (only judge conversations whose log entry's `ip_hash` matches the request's hashed IP) plus a short window of time. Detail goes to Phase 3 (architect).
4. **Conversation_id stability.** Needs to be assigned client-side at chat start (UUID) and threaded into every `/api/chat` POST so all log entries for one conversation share the id. Today's chat does NOT have this — the new field has to be threaded through `client.ts` → route → log entry.
5. **Build-time enrichment requires Blob reads at build.** The build container needs `BLOB_READ_WRITE_TOKEN` and network access during `next build`. Vercel handles this; preview/dev needs token in `.env.local`. Already true for argue-log read in admin view, so pattern is established.
6. **Excerpt length.** Visitors can write up to `MAX_MESSAGE_CHARS = 800`. Public excerpts probably want a soft cap (~200 chars) — judge prompt enforces; component truncates as belt-and-braces.

## Hand-off to Phase 3 (architect)

The architect phase needs to design:

- The `argue-judge` Sonnet prompt (verdict-emitting, JSON-shaped, defensive against the conversation transcript itself attempting injection)
- The `conversation_id` lifecycle (when assigned, where threaded, how validated server-side)
- The `/api/argue-judge/run` auth model (IP-bind + recency window + idempotency)
- The schema diff for `ArgueLogEntry` (additive `from_slug`) and the new `ArgueJudgeVerdict` shape
- The chat-end signal in `<ChatInterface>` (idle timeout duration, debounce, beforeunload)
- The build-time enrichment shape returned by `getFieldworkBySlug` (where the join happens, fallback when judges-log is empty)
- The sweep cron's selection query (which conversations need retroactive judging?)
- Failure mode: what does `<PushbackSummary>` render when judges-log fetch fails at build? (Skip silently? Use frontmatter fallback?)
- v1 deletion order — does it block on v2 ship, or precede it?
