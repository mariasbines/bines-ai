# 02 — Context: codebase patterns for argue-hardening

**Epic:** `argue-hardening`
**Phase:** 2 (Context)
**Input:** `01-concept.md`

## Scope of this analysis

Four targeted investigations driven by the concept's "Next" section:

1. Push-back Blob storage — shape to mimic, access model to diverge from
2. Edge-runtime constraints around streaming + post-response work
3. Chat-endpoint test structure — mocking conventions to follow
4. Anthropic SDK wiring — where Haiku + moderation reuse plugs in

Everything below cites file:line from the current `dev` branch.

---

## Tech stack (relevant slice)

| Layer | Tool | Version | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 15.5.15 | Edge runtime on both existing API routes |
| Runtime | Vercel Edge | — | Web standard `Request`/`Response`, no `NextRequest` used (`rg NextRequest src` returned nothing) |
| Anthropic | `@anthropic-ai/sdk` | ^0.90.0 | Streaming messages, lazy client |
| Blob | `@vercel/blob` | ^2.3.3 | `list` + `put`; push-back uses `access: 'public'` |
| Rate limit | `@upstash/ratelimit` + `@upstash/redis` | ^2.0.8 / ^1.37.0 | Sliding-window, lazy-init, null-when-unconfigured |
| Validation | `zod` | ^4.3.6 | Shared client+server schemas |
| Test runner | `vitest` | ^4.1.5 | Module mocks via `vi.mock` factory |
| Package manager | pnpm | Turbopack dev + build | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` are the four gates |

---

## 1. Push-back Blob storage — shape + divergence

### Structure to mimic

`src/lib/push-back/` has exactly the directory shape argue-log should clone:

```
src/lib/push-back/
  schema.ts          ← zod schema + inferred type (14 lines, one export)
  storage.ts         ← append-only Blob operation (48 lines, one exported fn)
  rate-limit.ts      ← lazy Upstash binding (pattern)
  __tests__/
    schema.test.ts
    storage.test.ts
```

**Key patterns to copy:**

- `import 'server-only'` at top of `storage.ts:1` — blocks accidental client import. argue-log storage must do the same.
- Lazy env-var read inside the function, throw clean `Error('BLOB_READ_WRITE_TOKEN missing')` (`storage.ts:28-29`). Same treatment for the IP-salt env var.
- Daily JSONL file keyed by `YYYY-MM-DD` (`storage.ts:7-9`, `:30`). Same shape works for argue-log.
- Get-then-concat-then-put append (`storage.ts:32-46`) with the race caveat noted in comments. argue-log inherits the same race, same v1 acceptance.

### Divergence — access model

`push-back/storage.ts:41` writes with `access: 'public'`. This means:

- Every blob has a **public, unguessable URL** returned by `list()`.
- The URL is the only secret. If it leaks (paste into a log, screenshot, accidental commit), the content is public.
- Fine for push-back because feedback messages are low-stakes and Maria is the only one with the `list()` token.

Argue logs **must not** use `access: 'public'`. Per elicitation Q5: *"private namespace for conversation logs. Admin page proxy-reads from the server. NOT access: 'public' like push-back."*

**Open for Phase 3:** `@vercel/blob` v2's options for private-read. Either:
- `access: 'public'` + treat unguessable URL as effectively private (same as push-back, but with a tighter token scope)
- Server-side-only read via SDK with the token, never exposing any URL to client. `list()` and `fetch()` inside the admin-page server component.

The second is the defensible choice. Architecture phase confirms.

### Schema shape precedent

`push-back/schema.ts` is 16 lines: zod object → `z.infer` type → one exported const. argue-log schema follows this precisely — one `ArgueLogEntry` object with nested `TurnEntry[]`, moderation verdict, filter verdict, guard signals, salted-IP, timestamp. Schema lives in `src/lib/argue-log/schema.ts`.

---

## 2. Edge runtime + post-response work

### Current state

Both routes declare `export const runtime = 'edge'` (`src/app/api/chat/route.ts:7`, `src/app/api/push-back/route.ts:5`). No `waitUntil`, no `after()`, no `NextRequest` usage anywhere in `src/`.

Push-back does its Blob write **before** returning the 200 response (`route.ts:61-74`). The user-facing latency includes the Blob write. Acceptable because push-back isn't streaming.

Chat is different: it returns a stream (`route.ts:107-112`). The assistant tokens arrive over time. We can only log the full conversation **after** the stream closes.

### Options for post-stream logging

1. **Wrap the stream in a pass-through that buffers tokens.** On stream close, fire the log append. Works on Edge because the pass-through runs inside the same request handler's promise chain. Risk: if the client aborts mid-stream, the `close` event fires with partial content — we log the partial (which is fine, that's reality).

2. **`after()` from `next/server`.** Next 15 App Router supports `after(() => fn())` to schedule work after the response is sent. Edge-runtime compatible. Cleanest API.

3. **`ctx.waitUntil()`.** Vercel Edge primitive. Exposed via route context in some Next versions; `after()` is the Next-idiomatic wrapper around it.

**Recommended direction (architect will decide):** `after()` from `next/server`, scheduled from inside the stream pass-through's close handler. Gives non-blocking log writes without adding latency to the chat stream.

### Constraint for Haiku pre-flight

Pre-flight happens **before** the stream starts (synchronously in the request path). Latency budget from concept: < 400ms. Haiku 4.5 is fast; a short prompt with ~100 output tokens should come in well under that. Need to confirm in architecture with a concrete token budget.

Pre-flight blocks on a response. If Haiku is rate-limited or errors, we **fall open** (allow the message through) and flag on the log entry — failing closed would DOS legitimate traffic on any Haiku outage.

---

## 3. Chat-endpoint test structure — conventions

### The mocking pattern (from `src/app/api/chat/__tests__/route.test.ts`)

```ts
// 1. Class mock for Anthropic SDK — must be a class for `new` to work
const mockStream = { toReadableStream: vi.fn(() => new ReadableStream({ ... })) };
const mockMessagesStream = vi.fn<...>(() => mockStream);
class MockAnthropic { public messages = { stream: mockMessagesStream }; }
vi.mock('@anthropic-ai/sdk', () => ({ default: MockAnthropic, Anthropic: MockAnthropic }));

// 2. Dynamic import of route AFTER mocks are set up
async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import('../route');
  return POST(new Request('http://test.local/api/chat', { ... }));
}

// 3. Env-var save/restore in beforeEach/afterEach
const ORIG_KEY = process.env.ANTHROPIC_API_KEY;
beforeEach(() => { __resetRatelimitForTests(); ... });
afterEach(() => { if (ORIG_KEY === undefined) delete ...; else process.env.X = ORIG_KEY; });
```

### Blob mocking (from `src/lib/push-back/__tests__/storage.test.ts`)

```ts
vi.mock('@vercel/blob', () => ({ list: vi.fn(), put: vi.fn() }));
import { list, put } from '@vercel/blob';
const listMock = vi.mocked(list);
const putMock = vi.mocked(put);
```

Plus `globalThis.fetch` stubbed for the get-then-concat step. Save/restore pattern for the fetch global too.

### What new tests will look like

| New module | Test file | What to mock |
|---|---|---|
| `src/lib/argue-log/storage.ts` | `__tests__/storage.test.ts` | `@vercel/blob` list+put, `globalThis.fetch`, `BLOB_READ_WRITE_TOKEN` env, salt env |
| `src/lib/argue-log/hash.ts` | `__tests__/hash.test.ts` | Nothing — pure crypto (Web Crypto `crypto.subtle` on Edge) |
| `src/lib/argue-log/schema.ts` | `__tests__/schema.test.ts` | Nothing — zod parse round-trips |
| `src/lib/argue-filter/haiku.ts` | `__tests__/haiku.test.ts` | Anthropic SDK class mock (as route.test.ts), return canned verdicts |
| `src/lib/argue-filter/moderation.ts` | `__tests__/moderation.test.ts` | Anthropic SDK moderation endpoint (check SDK surface in Phase 3) |
| `src/lib/argue-filter/refusal.ts` | `__tests__/refusal.test.ts` | Nothing — template rendering |
| `src/app/api/chat/route.ts` (updated) | existing `route.test.ts` | Extend the Anthropic class mock with `.messages.create` (Haiku) + `.moderations.create` (if used); add `after()` mock to assert log scheduling |
| `src/app/argue/log/page.tsx` | `__tests__/log-page.test.tsx` | Server component test — mock Blob `list`+`fetch`, render output, assert scrub behaviour |

### Coverage expectation

Project requires ≥ 80% lines/functions/branches on new code (`.isaac/QUALITY_GATES.md`). The new modules are small and pure; 80% is comfortably achievable without heroic mocking.

---

## 4. Anthropic SDK wiring — reuse points

### Current shape (`src/lib/chat/anthropic.ts`)

```ts
export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured; ...');
  return new Anthropic({ apiKey: key });
}
export const DEFAULT_MODEL = process.env.CHAT_MODEL ?? 'claude-sonnet-4-6';
export const MAX_TOKENS = 1024;
```

**Good news:** Haiku pre-flight + moderation can both use `getAnthropicClient()` as-is. Nothing new to wire for auth.

**Additions needed in this module:**

- `FILTER_MODEL` constant — default `claude-haiku-4-5`, overridable via `FILTER_MODEL` env var. Matches the `DEFAULT_MODEL`/`CHAT_MODEL` convention. Lets Maria bump the classifier model without redeploy.
- `FILTER_MAX_TOKENS` — tight cap (64?) because verdicts are short. Architecture sets the exact number.
- Moderation endpoint: the `@anthropic-ai/sdk` v0.90.0 surface exposes moderations via `client.moderations.create(...)` — **verify in Phase 3** with `context7` docs lookup, since SDK minor versions have shuffled this.

### Where the filter plugs into the route

`src/app/api/chat/route.ts` today has six sequential steps (commented 1-6 in the file). The hardened version becomes:

```
1. Parse JSON                     [unchanged]
2. Validate shape                 [unchanged]
3. Get IP                         [unchanged — but now also hashed for log]
4. Rate-limit baseline + daily    [unchanged]
5. Agent-guard detect             [unchanged — result captured for log]
6. Haiku pre-flight               [NEW — returns verdict; off-brand → early-return refusal response + log]
7. Ensure Anthropic client        [unchanged]
8. Stream Sonnet + wrap for log   [MODIFIED — pass-through captures tokens]
9. after() → append log entry     [NEW — log lands when stream closes]
```

Step 6's early-return path doesn't stream — it writes a canned in-voice refusal as a single-event text/event-stream body so the existing client UX (`src/lib/chat/client.ts`) doesn't need to learn a new response shape. Alternative: JSON response with a `refusal: true` field. Pick one in Phase 3.

Moderation (harm-category) runs **in parallel** with the Sonnet stream — it's logging-only, not gating. Easiest placement: inside the stream wrapper's close handler, call moderation on the full user+assistant transcript, attach to log entry before the `after()` append. This adds zero user-facing latency because the user already got the stream.

---

## Convention summary

| Area | Convention | Where observed |
|---|---|---|
| Naming | kebab-case filenames, camelCase exports | `push-back/`, `chat/`, all `.ts` |
| Imports | `@/lib/...` alias | `tsconfig` path alias used throughout routes |
| Env vars | Read lazily inside functions, throw plain `Error` on missing | `anthropic.ts:12`, `storage.ts:28`, `rate-limit.ts:19` |
| Error categories | Typed union: `'rate-limited' \| 'input' \| 'upstream' \| 'unknown'` in JSON responses | `chat/route.ts:21`, `push-back/route.ts:19` |
| Response headers | Every response adds `X-Governed-By: bines.ai` | `chat/route.ts:9`, `push-back/route.ts:7` |
| Server-only guard | `import 'server-only'` at top of storage modules | `push-back/storage.ts:1` |
| Streaming | Anthropic SDK `messages.stream().toReadableStream()` passed straight to `Response` body | `chat/route.ts:96-112` |
| Test isolation | Env-var save/restore, `__reset…ForTests` functions for module-level memoised state | `chat/route.test.ts`, `rate-limit.ts:54-58` |
| Commit style | `feat(scope): …` / `fix(scope): …` with Co-Authored-By footer | `git log --oneline` recent history |
| Voice for user-facing strings | British English, lowercase, dry | `"ease up — we've had a lot of arguing today"` (`route.ts:60`); refusal string needs to match this register |

---

## Integration-point map (additive)

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts               [MODIFIED: +pre-flight, +log scheduling]
│   │   └── push-back/
│   │       └── route.ts               [unchanged]
│   ├── argue/
│   │   ├── page.tsx                   [unchanged]
│   │   └── log/
│   │       └── page.tsx               [NEW: server component, Deployment-Protection-gated]
│   └── ...
├── lib/
│   ├── chat/
│   │   ├── anthropic.ts               [MODIFIED: +FILTER_MODEL, +FILTER_MAX_TOKENS exports]
│   │   ├── rate-limit.ts              [unchanged — same gate covers Haiku]
│   │   ├── agent-guard.ts             [unchanged — result captured for log]
│   │   ├── system-prompt.ts           [MODIFIED: tightened against off-brand list]
│   │   └── ...
│   ├── argue-log/                     [NEW directory]
│   │   ├── schema.ts                  zod + type
│   │   ├── hash.ts                    salted-IP hashing (Web Crypto subtle)
│   │   ├── storage.ts                 private-access append + cleanup
│   │   └── __tests__/
│   └── argue-filter/                  [NEW directory]
│       ├── haiku.ts                   pre-flight classifier
│       ├── moderation.ts              post-stream moderation adapter
│       ├── refusal.ts                 in-voice refusal template
│       └── __tests__/
└── ...
```

No files outside this map should need to change for the MVP scope.

---

## Dependencies added (anticipated)

None required. All four new surfaces use libraries already in `package.json`:

- `@anthropic-ai/sdk` — Haiku + moderation
- `@vercel/blob` — private-namespace append
- `zod` — log-entry schema
- Web Crypto `crypto.subtle` — salted hash (no npm dep)

---

## Findings for Phase 3 (architecture)

1. **Private Blob access model** — decide between "unguessable public URL + tight token" (push-back's choice) vs "server-only SDK reads, never expose URL". Recommend the latter.
2. **`after()` vs manual pass-through close handler** — pick the Next-idiomatic approach.
3. **Haiku verdict shape** — structured JSON output (category + confidence + reasoning) vs single enum. Needed for both the refusal trigger and the admin-log rendering.
4. **Moderation endpoint SDK surface** — confirm `client.moderations.create` shape in `@anthropic-ai/sdk` v0.90.0 via context7 before story writing.
5. **90-day expiry mechanism** — Vercel Cron + cleanup route vs manual script vs Blob lifecycle (if supported on Pro). Cron is probably right; spike needed.
6. **Refusal response shape** — text/event-stream single-event vs JSON with `refusal: true`. Minimises client-side code churn if we keep event-stream.
7. **Salt rotation operational procedure** — two-env-var pattern (current + previous), documented in README-or-ops-note.
8. **Admin-page pagination / sizing** — back-of-envelope on Blob size per day at expected traffic.

These carry into `03-architecture.md`.

---

## Next

Run `/isaac:architect` to design the technical architecture against this context.
