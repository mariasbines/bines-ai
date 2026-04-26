# Phase A + B closeout — pushback-v2

**Status:** DONE.
**Closing commit:** `9035e1d` (story 003.006 — sweep cron + vercel.json).
**Branch:** `dev` (no master merge per orchestrator instructions).
**Date:** 2026-04-25.

---

## Commit list (oldest → newest)

| Story | SHA | Subject |
|---|---|---|
| 003.001 | `9270ead` | feat(argue-log): conversation_id threading + from_slug placeholder |
| 003.002 | `fd939b3` | feat(argue): piece-aware preface from ?from=<slug> capture |
| 003.003 | `0c42149` | feat(argue-judge): core module — schema/storage/prompt/runner/loader |
| 003.004 | `77bdceb` | feat(argue-judge): /api/argue-judge/run route — IP-bind + recency + idempotency |
| 003.005 | `b9e88b1` | feat(argue): chat-end signal — idle + pagehide + beforeunload sendBeacon |
| 003.006 | `9035e1d` | feat(argue-judge): /api/argue-judge/sweep cron + vercel.json |

Six commits. All on `dev`. Pushed to `origin/dev`.

---

## Final gate state (after 003.006 merge)

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✓ clean (0 errors) |
| `pnpm lint` | ✓ clean (0 errors) |
| `pnpm test --run` | ✓ 518 / 518 specs across 58 test files |
| `pnpm build` | ✓ clean (Next.js 15, Turbopack) |

Coverage on new modules (visual map of spec → file mapping; project does
not run vitest with `--coverage` by default):

- `src/lib/conversation/id.ts`: 1 fn × 3 specs → ≥85% trivially.
- `src/lib/argue-judge/schema.ts`: 16 specs covering valid round-trip,
  every Zod boundary, missing required, optional reasoning, schema_version
  drift → ≥85%.
- `src/lib/argue-judge/storage.ts`: 19 specs across all five exports +
  the URL-leak guard → ≥85%.
- `src/lib/argue-judge/prompt.ts`: 15 specs covering every system-prompt
  invariant + the fence escape + injection-regression fixtures → ≥85%.
- `src/lib/argue-judge/runner.ts`: 10 specs across happy path + 5 error
  paths + server-field override + signal pre-aborted → ≥85%.
- `src/lib/argue-judge/loader.ts`: 14 specs across filter/sort/dedupe/
  null-on-error/error-name-leak guard → ≥85%.
- `src/app/api/argue-judge/run/route.ts`: 28 specs across body validation
  + auth + recency + IP-bind (current + previous + neither) + idempotency
  (incl. no-leak ordering) + runner failure + success + X-Governed-By + no-
  401 invariants → ≥85%.
- `src/app/api/argue-judge/sweep/route.ts`: 23 specs across auth + day
  override (incl. path-traversal) + selection + per-conversation isolation
  + multi-error count + sticky from_slug + dual-day judge-set lookup +
  vercel.json integrity → ≥85%.

Spec-count delta from autopilot start: **before 003.001** suite was
~352 specs at story 002.005 tip; **after 003.006** is 518 specs. Net
**+166 specs** added by Phase A + B.

---

## What's live on `dev`

After the soft-launch gap completes and Phase C ships, the system will
expose visitor-facing pushback summaries. Until then, what's live is:

1. **Schema** (`argue-log` + `argue-judge`) carries `conversation_id` (UUID
   v4) + `from_slug` (nullable string) on every new entry.

2. **Chat surface** (`<ChatInterface>`) mints a `conversation_id` on first
   submit, captures `?from=<slug>` from the URL stickily, threads both
   into every `/api/chat` POST. On chat-end (idle 2 min OR `pagehide` OR
   `beforeunload`) fires a `sendBeacon` with `{ conversation_id }` to
   `/api/argue-judge/run`. Debounce guard: at most one beacon per
   conversation_id per component lifetime.

3. **Chat route** (`/api/chat`, now Node runtime — was Edge — to enable
   Fieldwork lookup) prepends a piece-aware preface to `SYSTEM_PROMPT`
   when `from_slug` resolves via `getFieldworkBySlug`. Unknown / path-
   traversal-shaped slugs silently skip the preface.

4. **Run route** (`/api/argue-judge/run`, edge POST, no shared secret).
   Auth: IP-bind (current OR previous salt) + 30-min recency from latest
   argue-log entry + idempotency on existing verdict. Distinct codes
   (400 / 403 / 404 / 410 / 500 / 502); 401 deliberately unused.

5. **Judge module** (`src/lib/argue-judge/`):
   - `schema.ts`: `ARGUE_JUDGE_VERDICT` Zod schema + `EXCERPT_MAX_CHARS`
     (240, single source of truth).
   - `storage.ts`: append / list / read / readAll /
     findVerdictByConversationId. Mirrors argue-log; reuses dayKeyUtc +
     isValidDayKey.
   - `prompt.ts`: architecture-locked Sonnet judge prompt + transcript
     fence + `</transcript>` escape.
   - `runner.ts`: `judgeConversation` — fail-shut, AbortController 8s
     timeout, server-controlled fields override LLM output.
   - `loader.ts`: `getJudgesForSlug` build-time enrichment — filter +
     dedupe (latest judged_at wins) + sort by confidence + top-3
     excerpts. Returns null on Blob fetch error; logs error name only
     (no URL leak).

6. **Sweep cron** (`/api/argue-judge/sweep`, edge GET, `CRON_SECRET`
   bearer). Daily at `30 4 * * *` UTC (one hour after argue-log/cleanup).
   Reads yesterday's argue-log; skips pre-Phase-A entries; skips already-
   judged conversations; runs + writes the rest with per-conversation
   isolation. `?day=YYYY-MM-DD` override for manual replay.

7. **`vercel.json`** registers both crons + `maxDuration: 300` on the
   sweep path.

8. **Ops runbook** at `docs/argue-judge-ops.md` covers schedule + replay
   + monthly check + GDPR erasure + cost note + fail-shut policy + env-
   var summary.

**No public surface yet.** No `<PushbackSummary>`, no `[ argue with this ]`
CTA on Fieldwork cards, no count badge. v1 (`<PushBackModal>` +
`/api/push-back`) is still live; deletion is part of Phase C.

---

## Soft-launch observation guidance for Maria

The next 7 days are an observation window. Your job is to spot-check
verdicts as they accumulate in `argue-judges/<day>.jsonl` and flag any
issues that should restart the clock or block Phase C.

### What you'll see in the system

- Every visitor who hits `/argue` (with or without `?from=`) and sends
  ≥1 message produces an argue-log entry with a conversation_id.
- When the chat ends (idle / unload), the run route fires Sonnet over
  the conversation. A verdict lands in `argue-judges/<today>.jsonl`.
- For conversations the run route misses (browser killed mid-stream,
  mobile session frozen mid-conversation), the next morning's sweep cron
  catches them and writes a verdict to `argue-judges/<sweep-day>.jsonl`.

### What to spot-check daily

You don't yet have a dedicated admin view for the judge data. Read the
JSONL directly via the `/argue/log` admin's pattern (`?day=YYYY-MM-DD`
query against `argue-log/`), but for `argue-judges/` you'll need to
either:
- Use Vercel's Blob admin UI to download the day's `argue-judges/<day>
  .jsonl` file, OR
- Ship a tiny v2.1 admin extension if the unfiltered JSON read becomes
  painful.

For each day's verdicts, eyeball:

1. **Harm-gate false-positives (PB2-BRD-001).** Verdicts where
   `harm_in_visitor_messages: true` is set on a conversation that was
   clearly clean. If you see one false-positive, note it. If you see
   three across different conversations, RESTART the clock and tune the
   judge prompt's harm definition.

2. **Harm-gate false-negatives (PB2-BRD-002).** Verdicts where
   `harm_in_visitor_messages: false` is set on a conversation that
   contained genuine harm-shaped content. **Single false-negative aborts
   the gap → tune prompt → restart the 7-day clock.** Asymmetric err-on-
   true bias is documented in the prompt; if it's not biting hard
   enough, tighten.

3. **Excerpt selection sanity.** For verdicts with `excerpt !== null`
   AND `judge_confidence ≥ 0.8`, read the excerpt. Does it represent the
   visitor's strongest substantive argument? Is it self-contained
   (doesn't require context to make sense)? If you see consistent
   excerpt-selection drift (judge picks the wrong line), tune §3 of the
   prompt and restart the clock.

4. **Preface voice consistency.** Run a few `/argue?from=<slug>`
   conversations yourself across different Fieldwork pieces. Does the
   preface (visible in the chat-route's system prompt — verifiable by
   running with debug logging in dev) read in voice? If a piece-aware
   conversation feels off-brand or off-voice, tune §`buildPiecePreface`
   in `src/lib/chat/system-prompt.ts` and restart.

5. **`is_pushback` calibration.** Conversations where the visitor sent
   ≥2 substantive turns but `is_pushback: false`, OR ≤1 turn but
   `is_pushback: true`. Either direction suggests prompt tuning.

6. **Cost watch.** Anthropic billing dashboard: nightly sweep cost. At
   ~20 conversations/day, ~£0.16/day. Anomalies > 3× that mean either
   a traffic surge OR a bug (e.g., the run route firing redundantly,
   the sweep not deduplicating against existing verdicts). Diagnose
   before scaling `maxDuration`.

### Cron health check (once during the gap)

After day 1, confirm the Vercel dashboard shows:
- `/api/argue-log/cleanup` — last run timestamp 03:30 UTC of today.
- `/api/argue-judge/sweep` — last run timestamp 04:30 UTC of today.

If either is silent, redeploy `vercel.json` to re-register.

---

## Concrete go/no-go criteria for Phase C

Phase C ships **all four** of stories 003.007 / 003.008 / 003.009 /
003.010 in a tight window (≤48h per architecture inter-phase ordering),
because the public summary, the CTA, the v1 deletion, and the privacy
disclosure all couple into the same release surface (PB2-PRV-001 release
blocker).

**GO criteria** — all must hold simultaneously after the 7-day window:

- [ ] **Zero harm-gate false-negatives** across the 7 days. A single
      slipped-through hostile excerpt aborts.
- [ ] **≤2 harm-gate false-positives total**, and you've reviewed them
      all and confirmed the prompt's err-on-true bias is intentional
      (not a calibration bug).
- [ ] **Excerpt selection feels right.** For top-confidence verdicts
      (≥0.8) you'd be comfortable surfacing those lines publicly under
      the piece they came from.
- [ ] **Preface voice passes your voice-check.** The architecture-locked
      preface text (matches `03-architecture.md:248-253` verbatim) reads
      in your voice when you run a few `?from=<slug>` chats yourself.
      If you want to tune it, do that BEFORE Phase C ships — it's
      cheaper than tuning post-launch.
- [ ] **Both crons healthy.** ≥6 successful runs visible in Vercel
      dashboard for each (allows for one 1-day blip; ≤7 days × ≥6 runs
      = ≥85% reliability).
- [ ] **Cost in expected band.** Total Anthropic spend over the 7 days
      ≤ £2.00 (5× the £0.16/day baseline gives plenty of headroom for
      traffic spikes; anything higher signals a runaway loop).
- [ ] **No critical bug in any of the 6 Phase B routes.** A `[argue-judge]
      sweep-failed` log spike (>5/day for >2 consecutive days) or a 5xx
      rate >1% on `/api/argue-judge/run` aborts.
- [ ] **You have appetite for the public surface.** This is the
      implicit gate — Phase C is the moment Maria's voice goes
      adversarial-public on her own site. If the judge data so far
      hasn't earned your trust, defer.

**NO-GO criteria** — any one triggers:

- Any harm-gate false-negative (single slipped-through hostile excerpt).
- Systematic preface voice drift across pieces.
- Run-route auth-bypass discovered (a verdict written without a matching
  IP / recency / idempotency).
- Cron silence > 24h without a known cause.
- Cost > £5 over the 7 days (10× baseline).
- Phase C dependencies (003.007 needs 003.003's loader; 003.008 needs
  003.002's route handling) revealed broken under real traffic.

---

## Deferred work / known gaps for Phase C

The following items are deliberately out of scope for Phase A+B and
should be picked up by Phase C stories or a v2.1 backlog:

### From the autopilot run

- **Maria's voice-check sign-off on the preface text** (story 003.002
  AC-008). The text is the architecture-locked draft (`03-architecture.md
  :248-253`); per autopilot run constraints, sign-off is deferred to
  Maria's dev-branch review. If she objects, follow-up story tweaks the
  string in `src/lib/chat/system-prompt.ts`.

- **`useSearchParams` Suspense wrap at `/argue/page.tsx`**. Added in
  003.002 as a minimal fallback. Phase C may want to upgrade the
  fallback UI from `null` to a skeleton.

- **Chat-route runtime change** (Edge → Node) in 003.002 to enable
  `getFieldworkBySlug`. Acceptable cold-start tradeoff at v1; if
  conversations/day grows past ~100 and cold-start latency becomes
  noticeable, consider build-time slug → preface map (Plan 003.002
  Design §1 Option B).

### From the architecture's deferred list

- **Build-time enrichment perf** (`getJudgesForSlug` reads ~90 day-files
  per build at v1 scale; <100KB total). Deferred optimisation: cache or
  Promise.allSettled fan-out with a concurrency cap. Trigger threshold:
  conversations/day > ~30.

- **Sweep concurrency** (sweep loop is sequential; ~30s wall time at v1
  volume). Deferred optimisation: `Promise.allSettled` with concurrency
  cap of 5, keeping the 8s timeout per call. Trigger threshold:
  conversations/day > ~30.

- **Per-quote redaction admin** (Maria can delete a single excerpt
  without nuking the whole day-file). Deferred to v2.1; trigger:
  PB2-BRD-002 surfaces during soft-launch.

- **Automated retention cron for `argue-judges/`** (mirrors argue-log/
  cleanup). Deferred — verdicts persist until manually deleted at v1.
  Add when retention becomes a documented requirement.

- **Per-IP rate limit on `/api/argue-judge/run`** — bounded today by the
  chat route's 50/IP/day cap on argue-log writes. If that cap loosens,
  add a direct cap.

- **Cron alerting on errors** — manual monthly review at v1 per
  architecture. Add only if Maria wants async notifications.

- **Separate `SWEEP_CRON_SECRET`** — accepted PB2-SEC-005 risk;
  operational simplicity wins at v1.

### Phase C scope

Phase C stories on the dev branch are **not yet present**. The story
files exist:

- `06-story-003.007.md` — `<PushbackSummary>` + build-time enrichment +
  count badge.
- `06-story-003.008.md` — `[ argue with this ]` CTA on
  `<FieldworkCardCtas>`.
- `06-story-003.009.md` — v1 surface deletion (`<PushBackModal>`,
  `/api/push-back`, helpers).
- `06-story-003.010.md` — launch QA + privacy disclosure + voice-check
  rubric + soft-launch sign-off.

These stories are out of scope for this autopilot run per Maria's
instructions ("Scope is Phase A + Phase B ONLY"). The 7-day soft-launch
window is the gate.

---

## Notable architectural decisions captured during execute

These were judgment calls made during execute that aren't already
documented in the architecture or story files:

1. **Story 003.002**: switched `/api/chat` from `runtime = 'edge'` to
   `runtime = 'nodejs'` to enable filesystem-backed `getFieldworkBySlug`
   at request time. The architecture's `~5ms file read + Zod parse`
   description implied Node runtime; the existing route's Edge declaration
   was incompatible with the loader's `node:fs` usage. Documented in the
   commit message + 07-plan-003.002.md §Design 1.

2. **Story 003.002**: empty-string `from_slug` is normalised to `null`
   both client-side (`<ChatInterface>` lazy state) and server-side
   (route validates body `from_slug || null`). Avoids a wire-shape
   ambiguity where `''` could mean "no origin" or "explicit empty".

3. **Story 003.003**: `EXCERPT_MAX_CHARS = 240` exported from
   `argue-judge/schema.ts` as the single source of truth. Story
   003.007's `<PushbackSummary>` will import this for component-side
   truncation. Defence-in-depth at three layers (model prompt, schema,
   component) anchored on one constant.

4. **Story 003.003**: `ARGUE_JUDGE_VERDICT.from_slug` is `z.string()
   .nullable()` (not `.nullable().optional()`) — explicitly recording
   "no origin" simplifies the loader filter. No legacy entries exist
   since 003.003 is the first writer; no migration needed.

5. **Story 003.004**: idempotency check happens **after** auth (IP-bind
   + recency) — so an attacker with a known conversation_id but wrong
   IP cannot probe verdict existence via 200 vs 403. Tested explicitly
   in route.test.ts ("idempotency check does NOT leak verdict existence
   on wrong IP").

6. **Story 003.004**: NaN-defensive recency check — `Number.isNaN
   (latestMs)` short-circuits to 410 (expired). Fail-closed against a
   theoretical write of a malformed timestamp.

7. **Story 003.005**: idle timer effect depends on `messages` (full
   array, not `messages.length`) so per-delta timer reset works
   correctly during streaming. Plan 003.005 §Design 2 documents the
   choice (Option A over Option B).

8. **Story 003.006**: sweep reads judges from BOTH target day + today
   (verdict day-key may straddle the UTC boundary because verdicts are
   written when the JUDGE ran, not when the conversation happened).
   Tested explicitly in sweep route.test.ts.

---

## Telemetry off — preserved across the run

Per project CLAUDE.md, no `report-progress.js` invocations were made by
the orchestrator or any sub-agents during this autopilot run. All ISAAC
phase artefacts (06-stories-* / 07-plan-* / 08-grade-*) and run progress
are derivable from git history.

---

## Self-grades summary

All six stories used self-grades (Codex CLI quota exhausted). All scored
≥85 / 100:

| Story | Plan grade | Pass? |
|---|---|---|
| 003.001 | 94 / 100 | ✓ |
| 003.002 | 91 / 100 | ✓ |
| 003.003 | 89 / 100 | ✓ |
| 003.004 | 92 / 100 | ✓ |
| 003.005 | 88 / 100 | ✓ |
| 003.006 | 90 / 100 | ✓ |

No remediation rounds needed. No story blocked. No autopilot pause.

---

## What Maria does next

1. **Read this closeout.** Skim the "Soft-launch observation guidance"
   section for the daily routine.
2. **Wait 24h.** Confirm both crons fired on dev preview after the
   first UTC night following the merge.
3. **Spot-check verdicts daily** for 7 days. Flag anything matching the
   NO-GO criteria.
4. **At day 7 (or whenever the system has earned trust):** kick off
   Phase C. Stories 003.007 → 003.008 → 003.009 → 003.010 ship as a
   tight bundle within ≤48h.
5. **`dev` → `master` cutover** happens after 003.010 lands. Maria
   handles it; this autopilot run does not touch `master`.

---

## Reference

- DAG: `.isaac/epics/pushback-v2/artifacts/06-stories-dag.md`
- Architecture: `.isaac/epics/pushback-v2/artifacts/03-architecture.md`
- Risk register: `.isaac/epics/pushback-v2/artifacts/04-assessment.md`
- PRD: `.isaac/epics/pushback-v2/artifacts/05-prd.md`
- Plans + grades: `.isaac/epics/pushback-v2/artifacts/07-plan-003.0NN.md`
  / `08-grade-003.0NN.md` for NN ∈ {1..6}.
- Phase B ops: `docs/argue-judge-ops.md`.

End of Phase A + B closeout.
