# 03 — Architecture: argue-hardening

**Epic:** `argue-hardening`
**Phase:** 3 (Architecture)
**Inputs:** `01-concept.md`, `02-context.md`
**Superseded assumption:** elicitation Q8 assumed an Anthropic moderation endpoint. `@anthropic-ai/sdk` has no such resource — confirmed via context7 on 24 Apr 2026. Resolution: **one Haiku pre-flight call emits both a harm verdict and an off-brand verdict.** Decision logged with Maria. All other Q1-Q9 answers stand.

---

## Overview

Two new library directories (`src/lib/argue-log/`, `src/lib/argue-filter/`), one new admin page (`src/app/argue/log/page.tsx`), one new cron endpoint (`src/app/api/argue-log/cleanup/route.ts`), and targeted changes to the existing chat route + system prompt + Anthropic wiring. Zero new npm dependencies. No breaking change to the visitor-facing `/argue` UI.

The hot path: visitor POSTs to `/api/chat` → rate-limit + agent-guard (unchanged) → **Haiku pre-flight** classifies user turns (new) → if off-brand, early-return an in-voice refusal as a single-event text/event-stream response; otherwise → existing Sonnet stream wrapped in a pass-through that captures tokens → on stream close, `after()` schedules a log-append to private Blob.

---

## Decisions resolved from Phase 2 findings

| # | Finding | Decision |
|---|---|---|
| 1 | Private Blob access model | **Server-only SDK reads.** Blob URL is never exposed to the client. Admin page is a React Server Component that reads Blob with the `BLOB_READ_WRITE_TOKEN`. Blobs are written with `access: 'public'` because `@vercel/blob` v2 requires it for the `put()` surface we use, but the returned URL is kept server-side only — defence-in-depth is the Deployment-Protection gate on `/argue/log`, plus the unguessable URL. We never `list()` the prefix from any client path. |
| 2 | Post-stream log scheduling | **`after()` from `next/server`.** Edge-compatible in Next 15.5.15. Called from inside the pass-through stream wrapper's close handler. Keeps log writes off the visitor's latency path. |
| 3 | Classifier architecture | **Single Haiku 4.5 pre-flight call.** Returns structured JSON with `harm` (enum) + `off_brand` (string[]) fields. Replaces the originally-assumed two-layer Anthropic-moderation + Haiku split. |
| 4 | Haiku verdict shape | Forced JSON via explicit prompt + `response_format`-style parse (the SDK doesn't take a `response_format` arg; we prompt for JSON and `JSON.parse` the assistant's message content, with a zod schema on top for safety). See `ArgueVerdict` schema below. |
| 5 | 90-day expiry mechanism | **Vercel Cron + cleanup route.** Daily cron at 03:30 UTC hits `/api/argue-log/cleanup` with a secret header. Route iterates `argue-log/` blob prefix, deletes files with `YYYY-MM-DD` key older than 90 days. Simpler than Blob lifecycle rules (not guaranteed on Pro plan; avoids the plan-capability question). |
| 6 | Refusal response shape | **Single-event `text/event-stream`.** Body is one Anthropic-SDK-shaped `message_delta` / `content_block_delta` event carrying the refusal text, followed by `message_stop`. Client (`src/lib/chat/client.ts`) needs no change — it already parses this stream shape. |
| 7 | Salt rotation procedure | **Two env vars + manual quarterly rotation.** `ARGUE_LOG_IP_SALT_CURRENT` and `ARGUE_LOG_IP_SALT_PREVIOUS`. New writes use CURRENT. Reads (for "same visitor" joins in admin view) try CURRENT first, fall back to PREVIOUS. Quarterly: set a new CURRENT, move old CURRENT → PREVIOUS. PREVIOUS ages out naturally after 90 days because logs themselves expire. Rotation is a Vercel env-var edit; documented in `docs/argue-log-ops.md` (new, written in story 002.001). |
| 8 | Admin-page pagination | **Day-by-day navigation.** `/argue/log` defaults to today's JSONL; `?day=YYYY-MM-DD` picks a specific day; there's a prev/next day nav + a "days with entries" index. No client-side infinite scroll; no cross-day load. One JSONL per day matches the storage shape and keeps payload sizes bounded. Expected daily size at launch: <50KB assuming ~20 conversations/day × 5 turns × ~500 bytes/turn. |

---

## Components

### `src/lib/argue-log/schema.ts` (NEW)

Zod schemas + TypeScript types for log entries. Single source of truth.

```ts
export const TURN = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ARGUE_VERDICT = z.object({
  harm: z.enum(['none', 'hate', 'threat', 'sexual', 'violence', 'self_harm']),
  off_brand: z.array(z.enum([
    'electoral_politics',
    'hot_button_social',
    'race_identity_politics',
    'religion',
    'named_private_people',
    'family_beyond_site',
    'conspiracy_crypto_hype',
  ])),
  reasoning: z.string().max(500).optional(),
});

export const ARGUE_LOG_ENTRY = z.object({
  schema_version: z.literal(1),
  timestamp: z.string().datetime(),
  ip_hash: z.string().length(64), // hex SHA-256
  salt_version: z.enum(['current', 'previous']),
  turns: z.array(TURN).min(1),
  guard_signals: z.array(z.string()),
  verdict: ARGUE_VERDICT,
  refused: z.boolean(), // true when we early-returned a refusal
  model: z.string(),   // which Sonnet model actually replied (null-string if refused)
  latency_ms: z.object({
    pre_flight: z.number().int().nonnegative(),
    stream: z.number().int().nonnegative().nullable(),
  }),
});
export type ArgueLogEntry = z.infer<typeof ARGUE_LOG_ENTRY>;
```

### `src/lib/argue-log/hash.ts` (NEW)

Web-Crypto-based SHA-256 hash of `salt + ip`, returning lowercase hex. Edge-runtime compatible.

```ts
export async function hashIp(ip: string, salt: string): Promise<string>
```

Pure function, no env reads. Env read happens in the caller (route.ts) so tests are trivial.

### `src/lib/argue-log/storage.ts` (NEW)

Modelled on `src/lib/push-back/storage.ts` — same get-then-concat-then-put append pattern, same daily-JSONL key, same race-accepted v1 tradeoff. **Only structural differences:**

- Blob prefix `argue-log/` (not `push-back/`)
- `import 'server-only'` at top
- Throws on missing `BLOB_READ_WRITE_TOKEN`
- Validates the entry against `ARGUE_LOG_ENTRY` before writing (rejects malformed upstream data; push-back doesn't validate because its schema-at-route is already zod-parsed)

```ts
export async function appendArgueLog(entry: ArgueLogEntry, options?: { now?: Date }): Promise<void>
export async function listArgueLogDays(): Promise<string[]>      // 'YYYY-MM-DD'[], sorted desc
export async function readArgueLogDay(day: string): Promise<ArgueLogEntry[]>
export async function deleteArgueLogDay(day: string): Promise<void>   // for cleanup route
```

### `src/lib/argue-filter/haiku.ts` (NEW)

Calls Haiku 4.5 with a short system prompt, the full conversation as user content, and a strict "respond with JSON only" instruction. Parses + validates against `ARGUE_VERDICT`. On any failure (timeout, parse error, SDK error), **returns a fail-open verdict** (`harm: 'none'`, `off_brand: []`, `reasoning: 'classifier_error'`) — never blocks legitimate chat due to an infra issue.

```ts
export async function classifyConversation(messages: Turn[]): Promise<ArgueVerdict>
```

Uses `getAnthropicClient()` from `src/lib/chat/anthropic.ts` (unchanged).
Model = `FILTER_MODEL` env (default `claude-haiku-4-5`).
Max tokens = 256 (enough for JSON verdict + short reasoning).
Timeout = 3 seconds (AbortController on the `messages.create` promise).

### `src/lib/argue-filter/refusal.ts` (NEW)

Deterministic refusal text + the stream-shape wrapper.

```ts
export const REFUSAL_TEXT: string
export function refusalEventStream(): ReadableStream<Uint8Array>  // single-event SSE body
```

Refusal text (locked from elicitation Q7, with light British-English polish):

> not my lane — maria doesn't have a public position on this, and i don't invent them. what else have you got?

(Lower-case opening matches existing chat voice — compare `"ease up — we've had a lot of arguing today"` at `src/app/api/chat/route.ts:60`.)

### `src/lib/chat/anthropic.ts` (MODIFIED)

Add two exports. Existing `getAnthropicClient`, `DEFAULT_MODEL`, `MAX_TOKENS` unchanged.

```ts
export const FILTER_MODEL = process.env.FILTER_MODEL ?? 'claude-haiku-4-5';
export const FILTER_MAX_TOKENS = 256;
```

### `src/lib/chat/system-prompt.ts` (MODIFIED)

Append a paragraph to the existing system prompt declaring the Q6 off-brand categories as explicitly out-of-scope, with instruction to deflect in-voice if raised. Belt-and-braces with the classifier — if Haiku misses something, Sonnet still has guidance.

### `src/app/api/chat/route.ts` (MODIFIED)

New step order (see concept §MVP scope for the six-story decomposition):

```
1. Parse JSON                 [unchanged]
2. Validate shape             [unchanged]
3. Get IP                     [unchanged]
4. Rate-limit baseline+daily  [unchanged]
5. Agent-guard                [unchanged, signals captured for log]
6. Haiku pre-flight           [NEW]
   ├─ verdict.off_brand non-empty → build log entry (refused=true, latency captured),
   │                                 schedule via after(), return refusalEventStream()
   └─ otherwise → fall through
7. Anthropic client           [unchanged]
8. Sonnet stream + tee        [MODIFIED — pass-through captures assistant tokens]
9. after() → appendArgueLog   [NEW — fires on stream close, with full turns + verdict]
```

The tee is a `TransformStream` that copies chunks to (a) the response body and (b) an in-memory buffer. On `flush`, we decode the buffer to a single assistant string, assemble the `ArgueLogEntry`, and call `appendArgueLog` inside `after()`. If the client aborts mid-stream, `flush` still fires with whatever tokens were emitted — we log the partial with a `truncated: true` marker (added to schema if needed; candidate for Phase 7 planning).

### `src/app/argue/log/page.tsx` (NEW)

React Server Component. Reads the selected day's JSONL via `readArgueLogDay()` server-side. Renders a list of conversations with:

- Timestamp, IP hash (short-hex), turn count
- Per-turn: role + content
- Verdict badge (harm / off-brand categories)
- **Scrub-by-default on harm ≠ 'none'.** Content collapsed, click-to-reveal (progressive disclosure — `<details>` element, no client JS needed)
- Day navigation: prev-day, next-day, day index from `listArgueLogDays()`

Gated by Vercel Deployment Protection at the project level. No additional app-level auth. If Deployment Protection is off, the page is still inert to bots (no discoverable link from home page; not in sitemap; `robots: noindex`).

### `src/app/api/argue-log/cleanup/route.ts` (NEW)

Vercel Cron target. Protected by a shared secret: the request must carry `authorization: Bearer <CRON_SECRET>` and the secret is matched against `process.env.CRON_SECRET`. Vercel's cron service sets this header when invoking.

```ts
export const runtime = 'edge';
export async function GET(req: Request): Promise<Response>
```

Logic: list `argue-log/` blobs, for each day-key older than 90 days call `deleteArgueLogDay(day)`, return JSON summary of deletions.

Cron schedule defined in `vercel.json`: `{ "crons": [{ "path": "/api/argue-log/cleanup", "schedule": "30 3 * * *" }] }`.

---

## Data flow (happy-path chat turn, on-brand)

```
Client                Edge Route                Haiku                  Sonnet                  Blob
  |---POST /api/chat--->|                                                                       |
  |                     |--validate, rate-limit, agent-guard (unchanged)                        |
  |                     |------classify (full convo)------->|                                   |
  |                     |<---{harm:'none', off_brand:[]}----|                                   |
  |                     |--start stream-------------------------------->|                       |
  |<---text/event-stream chunks (tee'd in wrapper)----------------------|                       |
  |                     |                                               |<-- all chunks teed    |
  |                     |--stream close → after(): append log ----------|---------------------->|
```

## Data flow (off-brand refusal)

```
Client                Edge Route                Haiku                                          Blob
  |---POST /api/chat--->|                                                                       |
  |                     |------classify-------------------->|                                   |
  |                     |<--{off_brand:['electoral_...']}---|                                   |
  |                     |--build refusal SSE, schedule log via after()                          |
  |                     |--after(): append log (refused=true) --------------------------------->|
  |<---text/event-stream (single event with refusal text)---|                                   |
```

---

## Files to create / modify

| File | Action | Purpose |
|---|---|---|
| `src/lib/argue-log/schema.ts` | Create | Zod + type for log entries + verdict |
| `src/lib/argue-log/hash.ts` | Create | Web Crypto salted-IP hash |
| `src/lib/argue-log/storage.ts` | Create | Append, list, read, delete for Blob namespace |
| `src/lib/argue-log/__tests__/schema.test.ts` | Create | Round-trip zod parse |
| `src/lib/argue-log/__tests__/hash.test.ts` | Create | Hash stability + salt variance |
| `src/lib/argue-log/__tests__/storage.test.ts` | Create | Blob mock; append / list / read / delete |
| `src/lib/argue-filter/haiku.ts` | Create | Pre-flight classifier with fail-open |
| `src/lib/argue-filter/refusal.ts` | Create | Refusal text + SSE stream builder |
| `src/lib/argue-filter/__tests__/haiku.test.ts` | Create | Anthropic SDK mock; verdict parse; error paths |
| `src/lib/argue-filter/__tests__/refusal.test.ts` | Create | SSE shape assertions |
| `src/lib/chat/anthropic.ts` | Modify | Export `FILTER_MODEL`, `FILTER_MAX_TOKENS` |
| `src/lib/chat/system-prompt.ts` | Modify | Append off-brand-lanes paragraph |
| `src/lib/chat/__tests__/system-prompt.test.ts` | Modify | Assert new paragraph present |
| `src/app/api/chat/route.ts` | Modify | Insert pre-flight + tee + after() scheduling |
| `src/app/api/chat/__tests__/route.test.ts` | Modify | Extend mocks; test refusal path + log scheduling |
| `src/app/argue/log/page.tsx` | Create | Admin view, server component |
| `src/app/argue/log/__tests__/page.test.tsx` | Create | Render tests with mocked storage |
| `src/app/api/argue-log/cleanup/route.ts` | Create | Cron cleanup endpoint |
| `src/app/api/argue-log/cleanup/__tests__/route.test.ts` | Create | Auth gate + deletion logic |
| `vercel.json` | Create or Modify | Add cron schedule |
| `docs/argue-log-ops.md` | Create | Salt rotation procedure + cron secret setup |
| `docs/argue-voice-check.md` | Create | Voice-check rubric for refusal text (sibling of existing `chat-voice-check.md`) |

No files outside this list are in scope.

---

## Dependencies

### Existing (reused)

- `@anthropic-ai/sdk` ^0.90.0 — Haiku classifier + Sonnet chat
- `@vercel/blob` ^2.3.3 — private-namespace append
- `zod` ^4.3.6 — log-entry schema validation
- `@upstash/ratelimit`, `@upstash/redis` — unchanged, existing gate covers Haiku
- Web Crypto `crypto.subtle` — salted-IP hash (Edge-native, no npm dep)
- Next.js 15.5.15 `after()` from `next/server` — post-stream log scheduling (first use in project)

### New

- None.

### New env vars (Vercel Production + Preview)

| Var | Purpose | Sensitivity |
|---|---|---|
| `FILTER_MODEL` | Optional Haiku model override (defaults `claude-haiku-4-5`) | Low |
| `ARGUE_LOG_IP_SALT_CURRENT` | Current quarter's salt for IP hashing | **High — rotate quarterly** |
| `ARGUE_LOG_IP_SALT_PREVIOUS` | Prior quarter's salt for admin-view lookups | High |
| `CRON_SECRET` | Shared secret for cleanup-route auth | **High — rotate annually** |

Existing env vars (`ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_*`) unchanged.

---

## Out of scope (explicit)

- v2 RAG / corpus-awareness on the chat model (concept §non-goals)
- User accounts / login on `/argue`
- Real-time alerts, email digests, Slack pushes (explicit Q4 decline)
- Admin-editable filter categories (code-editable for v1)
- Abuse/prompt-injection hard-block escalation (`agent-guard` stays detect-only)
- Cross-page log consolidation (`push-back` and `argue-log` stay separate)
- Streaming classifier verdict to client (verdict is internal, not surfaced in UI)

---

## Constraints carried forward

- Voice lane: British English, lowercase, dry. Refusal text and admin-page copy both conform.
- No SynapseDx palette on admin page. Admin page inherits site styles — same ivory/colour-block look.
- Edge runtime on all new API routes. No Node-only APIs in `src/lib/argue-log/` or `src/lib/argue-filter/`.
- No silent failures: every infra error (Blob write, Haiku call) is logged via `console.error` with a `[argue-*]` tag for grepability.

---

## Testing approach (per module)

- **Pure functions** (`hash.ts`, `schema.ts`, `refusal.ts`): direct unit tests, no mocks, ≥95% coverage expected.
- **Haiku classifier** (`haiku.ts`): class-mock `@anthropic-ai/sdk` per chat-route precedent; test success, JSON-parse failure, zod-rejection, abort/timeout → all three fail-open paths.
- **Storage** (`storage.ts`): module-mock `@vercel/blob` per push-back precedent; test append (empty day + appending day), list, read, delete, missing token, malformed entry rejection.
- **Chat route** (modified): extend existing `route.test.ts`. New cases: (a) off-brand verdict → refusal SSE + log scheduled with `refused: true`; (b) on-brand verdict → stream flows + log scheduled on close with full assistant content; (c) Haiku error → fail-open, Sonnet stream starts; (d) `after()` called exactly once per request.
- **Cleanup route**: auth header missing → 401; wrong secret → 401; correct secret → deletes eligible days and returns summary.
- **Admin page**: server-component test — mock `readArgueLogDay` + `listArgueLogDays`; assert render, scrub-by-default on harm≠none, day nav links.

Target coverage on new code: ≥ 85% lines/functions/branches (above the project's 80% floor, because this is security-adjacent).

---

## Observability hooks (minimal)

- `console.log('[argue-filter] verdict', ...)` with harm + off_brand only (never the message content) — private Blob already has content, console logs stay metadata-only.
- `console.error('[argue-log] append-failed', reason)` — Maria greps Vercel logs when something's weird.
- Haiku latency in verdict (`latency_ms.pre_flight`) + stream latency (`latency_ms.stream`) captured on every log entry — supports future tuning.

No external telemetry (no Sentry, no Datadog). Matches project's no-telemetry posture.

---

## Risk implications for Phase 4 (assessment)

- Haiku fail-open is an intentional policy: prefer usability over over-blocking. Phase 4 documents this as an accepted risk.
- Refusal-text voice drift: Sonnet and Haiku see the refusal text at different times in different roles. A bad refusal could break voice. Mitigation: lock the exact refusal string in `refusal.ts` as a const; voice-check it against `docs/argue-voice-check.md`; one source of truth.
- Partial-conversation logs on client abort: we log whatever tokens were emitted. Not a security issue; a data-quality one.
- Cron secret leak → attacker can mass-delete logs. Mitigation: rotate annually; cron route only allows DELETE-by-age, not arbitrary delete (path-traversal-proof — day keys pass through strict `YYYY-MM-DD` regex).
- Salt-env-var misconfiguration → hashes unstable, admin "same visitor" joins break. Mitigation: fail loudly in route if `ARGUE_LOG_IP_SALT_CURRENT` missing (500, not silent) — this env var is required, not optional.

---

## Next

Run `/isaac:assess` for risk assessment and security review.
