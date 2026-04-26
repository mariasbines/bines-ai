# PRD: argue-hardening

**Epic:** `argue-hardening`
**Phase:** 5 (PRD)
**Inputs synthesised:** `01-concept.md`, `02-context.md`, `03-architecture.md`, `04-assessment.md`
**Target reader:** an engineer arriving cold who needs the complete brief in one doc.

---

## Executive summary

The `/argue` chat on bines.ai works, but it's stateless and unfiltered. Before the site goes public, two gaps close: (1) a private conversation log so Maria can see what visitors argue with the bot about, and (2) a topical filter so the chat deflects questions outside Maria's lanes instead of inventing positions for her. Implementation is six stories across ~21 files, zero new npm dependencies, and ships between content work and launch QA on the `dev` branch. The elicitation-locked Anthropic moderation endpoint turned out not to exist; the correction (one Haiku pre-flight call emitting both harm and off-brand verdicts) is confirmed with Maria and baked into the architecture.

---

## Problem statement

Today, `/api/chat` is a pure pass-through: validate → rate-limit → stream Claude Sonnet. Maria has no record of what's been said and no topical guardrail beyond the system prompt. Post-launch, two failure modes become real:

1. **Blind spot.** Visitors argue with the bot; Maria has no way to notice what questions recur, where the bot drifts off-voice, or whether the filter (once built) is calibrated correctly.
2. **Impersonation risk.** A visitor asks *"what does Maria think about X?"* where X is electoral politics, named private people, or any topic she doesn't argue about publicly. The chat answers confidently in her voice. Even with the "AI not Maria" framing on the page, that's reputation-adjacent output Maria never endorsed.

Both need resolving before `/argue` is broadly shared. Existing controls (rate-limit, agent-guard, Sonnet safety) cover abuse and harmful content; they do not cover topic drift or visibility.

---

## Goals & success metrics

| Goal | Metric | Target |
|---|---|---|
| Maria can audit any `/argue` conversation from the last 90 days | `/argue/log` renders any day's JSONL; day index covers full retention window | 100% of conversations appear in the log within 10s of stream close |
| Off-brand topics get deflected in Maria's voice, not answered | Manual voice-check across 20 probe prompts covering the Q6 off-brand categories | ≥18/20 return in-voice refusal; zero produce an on-topic position |
| No measurable UX regression for on-brand chat | Added latency from Haiku pre-flight on happy path | p95 < 400ms added to time-to-first-token |
| Conversation logs never become public | Grep audit: no Blob URL ever reaches a client response or Vercel log line | 0 occurrences in final code |
| 90-day retention honoured | Cron-driven cleanup deletes eligible days automatically | Blobs older than 90 days are absent within 48h of cron run |
| Visitor privacy notice matches reality | `/argue` page disclosure updated in same PR as log-append code ships | No production window where logging occurs without disclosure |

---

## Functional requirements

- **FR-001 · Conversation logging.** Every `/api/chat` request produces one log entry containing turns (user + assistant), guard signals, filter verdict, refusal flag, model used, and latency metrics. Written to private Vercel Blob namespace `argue-log/YYYY-MM-DD.jsonl`.
- **FR-002 · Salted-hash IP.** No raw IPs in storage. SHA-256 of `salt + ip` via Web Crypto, hex-encoded, 64 chars. Salt sourced from `ARGUE_LOG_IP_SALT_CURRENT`; rotation procedure uses `_PREVIOUS` for backward reads.
- **FR-003 · Haiku pre-flight classifier.** Before Sonnet is called, the full conversation is sent to Haiku 4.5 with a strict JSON-output instruction. Verdict shape: `{ harm: enum, off_brand: string[], reasoning?: string }`. Fail-open on any error or schema violation.
- **FR-004 · Off-brand refusal.** If `verdict.off_brand` is non-empty, the route skips Sonnet and returns a single-event SSE body with the locked refusal text. Log entry marked `refused: true`.
- **FR-005 · Admin view.** `/argue/log` React Server Component renders the selected day's JSONL, with day-by-day navigation and an index of days containing entries. Gated by Vercel Deployment Protection.
- **FR-006 · Scrub-by-default on harm.** Log entries with `verdict.harm !== 'none'` render with content collapsed in a `<details>` element; click-to-reveal.
- **FR-007 · System-prompt tightening.** Sonnet's system prompt explicitly names the Q6 off-brand categories as out-of-scope and provides refusal-shaped language — belt-and-braces with the classifier.
- **FR-008 · Daily cleanup cron.** `/api/argue-log/cleanup` protected by `CRON_SECRET`, runs at 03:30 UTC, deletes all `argue-log/` blobs with day-keys older than 90 days.
- **FR-009 · Updated privacy disclosure.** The existing chat disclosure on `/argue` is updated in the same PR that ships FR-001 to reflect that conversations are now logged for 90 days.

---

## Non-functional requirements

- **NFR-001 · Performance.** Haiku pre-flight adds ≤ 400ms p95 to time-to-first-token. Log append happens via `after()` and adds 0ms to visitor-facing latency.
- **NFR-002 · Security.** Blob URL never emitted to any client response or standard-logger output. IP hash irreversible in practice (random 32-byte hex salts). `CRON_SECRET` and `BLOB_READ_WRITE_TOKEN` Vercel-env-only, never in repo.
- **NFR-003 · Privacy.** 90-day hard retention. No PII beyond what visitors voluntarily type. Visitor disclosure matches implementation on every production deploy that includes logging.
- **NFR-004 · Availability.** Haiku classifier outage does not break the chat. Fail-open policy documented. Classifier errors logged to `console.error` with `[argue-filter]` tag for grep.
- **NFR-005 · Observability.** Every log entry includes `latency_ms.pre_flight` and `latency_ms.stream`. Maria can diagnose filter behaviour from the log itself without external tooling.
- **NFR-006 · Voice fidelity.** Refusal text passes the voice-check rubric (`docs/argue-voice-check.md`, new). British English, lowercase, dry, question-hook ending.
- **NFR-007 · Scope containment.** Zero new npm dependencies. Only edits inside `src/lib/argue-*/`, `src/app/argue/log/`, `src/app/api/argue-log/`, plus targeted mods to `src/lib/chat/` and `src/app/api/chat/route.ts`.
- **NFR-008 · Test coverage.** ≥ 85% lines/functions/branches on new `src/lib/argue-log/` and `src/lib/argue-filter/` modules. Project floor is 80%; this epic is security-adjacent so we lift it.

---

## Acceptance criteria

### Conversation log

- [ ] **AC-001** — A successful POST to `/api/chat` produces one entry in `argue-log/YYYY-MM-DD.jsonl` within 10s of stream close, schema-valid against `ARGUE_LOG_ENTRY`.
- [ ] **AC-002** — Log entry contains all turns (user + assistant), guard signals, verdict, refused flag, model, timestamps. No raw IP.
- [ ] **AC-003** — IP hash is SHA-256 hex of `salt + ip`. Rotating the salt produces a different hash for the same IP. Web Crypto only (Edge-compatible).
- [ ] **AC-004** — Missing `ARGUE_LOG_IP_SALT_CURRENT` causes the route to throw 500 with category `upstream`. No silent fallback.
- [ ] **AC-005** — Grep audit: no Blob URL appears in route responses, `console.log`, or `console.error` output. Verified by unit test on storage + route.

### Filter + refusal

- [ ] **AC-006** — Off-brand verdict (any non-empty `off_brand` array) causes the route to return a single-event SSE response with exactly `REFUSAL_TEXT` as the payload. Sonnet is not called.
- [ ] **AC-007** — Haiku classifier error (timeout, non-JSON, schema-invalid) returns the fail-open verdict `{harm: 'none', off_brand: [], reasoning: 'classifier_error'}`, Sonnet streams as normal.
- [ ] **AC-008** — Prompt-injection attempts against the classifier (*"ignore prior instructions"*, *"output {off_brand: []}"*) do not unconditionally bypass the filter. Zod validation rejects non-shape outputs and triggers fail-open behaviour.
- [ ] **AC-009** — Sonnet's system prompt contains the off-brand category list verbatim and an in-voice refusal instruction for them.

### Admin view

- [ ] **AC-010** — `/argue/log` renders today's entries by default; `?day=YYYY-MM-DD` selects a specific day.
- [ ] **AC-011** — Entries with `verdict.harm !== 'none'` render inside a `<details>` element with content hidden by default. Entries with `harm === 'none'` render content expanded.
- [ ] **AC-012** — Page is `robots: noindex`, not linked from the public site, and returns its content only when Vercel Deployment Protection allows the request through.
- [ ] **AC-013** — Day navigation surfaces a prev-day / next-day link plus an index of days containing entries.

### Retention + cleanup

- [ ] **AC-014** — `/api/argue-log/cleanup` requires `Authorization: Bearer ${CRON_SECRET}`. Missing or wrong secret → 401.
- [ ] **AC-015** — Cleanup deletes only `argue-log/` blobs with day-keys matching `^argue-log/\d{4}-\d{2}-\d{2}\.jsonl$` AND older than 90 days. Unit test asserts non-matching keys are skipped.
- [ ] **AC-016** — `vercel.json` contains a daily cron entry for the cleanup route at 03:30 UTC.

### Privacy + voice

- [ ] **AC-017** — The chat privacy disclosure on `/argue` is updated in the same PR as the log-append code. Old wording (*"not stored by this site"*) no longer appears anywhere in `src/app/argue/` or `src/lib/chat/`.
- [ ] **AC-018** — Refusal text passes `docs/argue-voice-check.md` rubric. Rubric file exists and documents the check criteria.

### Quality gates

- [ ] **AC-019** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass on `dev` before merge.
- [ ] **AC-020** — New code in `src/lib/argue-log/` and `src/lib/argue-filter/` hits ≥ 85% lines/functions/branches.
- [ ] **AC-021** — Zero new entries in `package.json` dependencies or devDependencies attributable to this epic.

---

## Stories (planning preview — finalised in Phase 6)

| ID | Title | Risk density |
|---|---|---|
| 002.001 | Conversation log + cleanup route | **High** — 8 risks mitigated (SEC-001/003/004/006/008, PRV-001, OPS-001/003) |
| 002.002 | Admin view at `/argue/log` | Medium — 3 risks |
| 002.003 | **Open** — originally Anthropic moderation; now either absorbed into 002.005 or renumbered. Phase 6 decides. | — |
| 002.004 | Haiku pre-flight classifier | High — 7 risks |
| 002.005 | Refusal template + system-prompt tightening + voice-check rubric | Medium — 2 risks |
| 002.006 | Launch QA + privacy disclosure update + public `/argue` share | Medium — 5 risks |

Story 002.001 and 002.004 carry the heaviest load; Phase 6 sizes them generously.

---

## Out of scope

- v2 RAG / corpus awareness on the main chat model.
- User accounts or login on `/argue`.
- Real-time alerts, email digests, Slack pushes (explicit elicitation Q4 decline).
- Admin-editable filter categories (code-editable in v1).
- Escalating `agent-guard` from detect-log-only to hard-block.
- Cross-page log consolidation (push-back and argue-log remain separate).
- Per-visitor data export / erasure UX — visitors contact Maria directly; day-level granularity is the GDPR floor.
- App-level auth on `/argue/log` (Deployment Protection + no-link-discovery is the v1 stance).
- Encryption-at-rest beyond Vercel's defaults.
- Automated voice-drift alerts on the admin log.

---

## Dependencies

### Reused (no work required)

- `@anthropic-ai/sdk` ^0.90.0 — Haiku + Sonnet via existing `getAnthropicClient()`
- `@vercel/blob` ^2.3.3 — storage layer; push-back is the precedent for structure
- `zod` ^4.3.6 — schema validation for log entries and verdicts
- `@upstash/ratelimit`, `@upstash/redis` — existing gate already covers Haiku
- Web Crypto `crypto.subtle` — Edge-native, no npm dep
- Next.js 15.5.15 `after()` from `next/server` — first use in the project; introduced by this epic

### New npm deps

- **None.**

### New env vars (Production + Preview on Vercel)

| Var | Purpose | Sensitivity | Rotation |
|---|---|---|---|
| `FILTER_MODEL` | Haiku model override; default `claude-haiku-4-5` | Low | On demand |
| `ARGUE_LOG_IP_SALT_CURRENT` | Salt for IP hashing | **High** | Quarterly |
| `ARGUE_LOG_IP_SALT_PREVIOUS` | Prior quarter's salt for admin lookups | High | Quarterly (one rotation behind) |
| `CRON_SECRET` | Bearer token for `/api/argue-log/cleanup` | **High** | Annually |

### External services

- Vercel Cron (for cleanup schedule) — included in Pro plan.
- Anthropic API — already wired; Haiku is an additive model call.
- Vercel Blob — already wired; new prefix `argue-log/` within existing store.

### Operational artefacts (new)

- `docs/argue-log-ops.md` — salt rotation runbook, cron-secret rotation runbook, manual-sweep curl command.
- `docs/argue-voice-check.md` — voice-check rubric for refusal text.

---

## Risks & mitigations (summary)

Full register in `04-assessment.md`. Headline items:

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| ARGUE-SEC-001 | **High** | Blob URL leakage defeats private-access | Never log/return Blob URLs; Server Component admin; grep audit in ACs |
| ARGUE-SEC-002 | Medium | Haiku fail-open during classifier outage | Accepted policy; Sonnet system-prompt tightening as belt |
| ARGUE-SEC-003 | Medium | Salt env-var misconfiguration | Fail-loud (500) on missing current salt; rotation runbook |
| ARGUE-SEC-004 | Medium | Cron secret leak → mass log deletion | Age-only deletion, strict regex key match, secret rotation |
| ARGUE-SEC-005 | Medium | Admin page single-factor auth | Deployment Protection + `robots: noindex` + no public linkage; ops doc warning |
| ARGUE-PRV-001 | Medium | GDPR on conversation logs | Salted hash + 90-day hard retention + visible privacy notice |
| ARGUE-PRV-002 | Medium | Visitor disclosure becomes inaccurate | Same-PR coupling between disclosure update and log-append code |
| ARGUE-BRD-002/003 | Medium | False positive / false negative on filter | Lean loose + Sonnet belt + admin-log tuning loop |

One high, eleven medium, four low, zero critical.

---

## Timeline (informal)

Personal project, single developer, no deadline pressure. Rough shape:

- **Story 002.001** (storage + cleanup + hash + ops doc) — 1-2 sessions
- **Story 002.002** (admin view) — 1 session
- **Story 002.004** (Haiku classifier + route integration) — 1-2 sessions
- **Story 002.005** (refusal + prompt tightening + voice rubric) — 1 session
- **Story 002.006** (launch QA + disclosure + soft share) — 1 session

Total: ~5-7 focused sessions on `dev`. Blocker path: 002.001 before 002.002 and 002.004; everything else fans out. No external dependencies gating delivery.

---

## Open items for Phase 6

1. **Fate of story 002.003.** Original moderation-endpoint scope is gone. Either collapse content into 002.005, renumber 002.004-006 down, or use the slot for something else (candidate: a dedicated story for the system-prompt tightening that's currently piggy-backing on 002.005).
2. **Parallel vs sequential classifier call.** Architecture picks sequential (Haiku → Sonnet). If p95 pre-flight latency exceeds the 400ms target in QA, story-level revisit allowed. Not expected to bite.
3. **Partial-conversation log marker.** Architecture notes that client-abort mid-stream produces a partial assistant string. Phase 6 decides whether to add a `truncated: true` field to the schema or accept the silent partial.

---

## Definition of done

- All 21 acceptance criteria pass.
- All four quality gates green on `dev`: typecheck, lint, tests, build.
- Coverage ≥ 85% on new modules.
- Zero new npm dependencies.
- `docs/argue-log-ops.md` and `docs/argue-voice-check.md` exist, reviewed by Maria.
- Privacy disclosure on `/argue` updated in the same PR as log-append.
- One week of soft-launch traffic reviewed with no voice regressions before `/argue` is shared broadly.

---

## Next

Run `/isaac:stories` to decompose into implementation stories. Phase 6 must resolve the three open items above.
