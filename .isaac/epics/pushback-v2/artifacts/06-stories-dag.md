# 06 — Stories DAG: pushback-v2

**Epic:** `pushback-v2`
**Phase:** 6 (Stories)
**Inputs:** `01-concept.md`, `02-context.md`, `03-architecture.md`, `04-assessment.md`, `05-prd.md`
**Sibling artifacts:** `06-story-003.001.md` through `06-story-003.010.md`

---

## Story list

| ID | Title | Phase | TDD | Complexity |
|---|---|---|---|---|
| **003.001** | Schema diff + conversation_id threading | A | 🔴 Full | Medium |
| **003.002** | `?from=<slug>` capture + chat-route preface | B | 🟡 Critical Path | Small |
| **003.003** | argue-judge core module (schema + storage + prompt + runner + loader) | B | 🔴 Full | Large |
| **003.004** | `/api/argue-judge/run` route | B | 🔴 Full | Medium |
| **003.005** | Chat-end signal in `<ChatInterface>` (idle + beforeunload + sendBeacon) | B | 🟡 Critical Path | Medium |
| **003.006** | `/api/argue-judge/sweep` cron + `vercel.json` | B | 🟡 Critical Path | Medium |
| ↓ ↓ ↓ | **7-day soft-launch gap** (Phase B → Phase C) — see §inter-phase ordering | — | — | — |
| **003.007** | `<PushbackSummary>` + build-time enrichment + count badge | C | 🔴 Full | Large |
| **003.008** | `[ argue with this ]` CTA on `<FieldworkCardCtas>` | C | 🟢 Smoke | Small |
| **003.009** | v1 surface deletion (`<PushBackModal>`, `/api/push-back`, helpers) | C | 🟢 Smoke | Small |
| **003.010** | Launch QA + privacy disclosure + voice-check rubric + soft-launch sign-off | C | 🟢 Smoke + manual | Small (code) + Medium (verification) |

---

## DAG

### Visual (ASCII)

```
                      ┌──────────────────────────────────────────────────┐
                      │              003.001  (Phase A)                 │
                      │   Schema diff + conversation_id threading       │
                      │              [LEAF — no deps]                   │
                      └────────────────────┬─────────────────────────────┘
                                           │
                  ┌────────────────────────┼─────────────────────────┐
                  │                        │                         │
                  ▼                        ▼                         ▼
          ┌──────────────┐         ┌──────────────┐          ┌──────────────┐
          │   003.002    │         │   003.003    │          │   003.005    │
          │  ?from=slug  │         │  argue-judge │          │  chat-end    │
          │   + preface  │         │     core     │          │   beacon     │
          │  (Phase B)   │         │  (Phase B)   │          │  (Phase B)   │
          └──────┬───────┘         └────┬───┬─────┘          └──────┬───────┘
                 │                      │   │                       │
                 │                      ▼   ▼                       │
                 │              ┌──────────────┐  ┌──────────────┐  │
                 │              │   003.004    │  │   003.006    │  │
                 │              │ /argue-judge │  │ /argue-judge │  │
                 │              │     /run     │  │   /sweep +   │  │
                 │              │              │  │  vercel.json │  │
                 │              │  (Phase B)   │  │  (Phase B)   │  │
                 │              └──────┬───────┘  └──────┬───────┘  │
                 │                     │                 │          │
                 └─────────────────────┼─────────────────┼──────────┘
                                       │                 │
                                       │       (003.005 also depends on 003.004
                                       │        for end-to-end happy path; see §dep notes)
                                       │                 │
                                       ▼                 ▼
                       ╔════════════════════════════════════════════╗
                       ║   ⏳ 7-DAY SOFT-LAUNCH GAP (Phase B→C)    ║
                       ║   judges populate silently in argue-judges/║
                       ║   Maria reviews via /argue/log admin       ║
                       ║   sign-off gates Phase C dev merges        ║
                       ╚═══════════════════╤════════════════════════╝
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   003.007     │
                                   │ PushbackSummary│
                                   │ + enrichment  │
                                   │ + count badge │
                                   │   (Phase C)   │
                                   └───────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   003.008     │
                                   │ [argue with   │
                                   │  this] CTA    │
                                   │   (Phase C)   │
                                   └───────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   003.009     │
                                   │  v1 deletion  │
                                   │   (Phase C)   │
                                   └───────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │   003.010     │
                                   │ Launch QA +   │
                                   │ disclosure +  │
                                   │ sign-off      │
                                   │   (Phase C)   │
                                   │  [TERMINAL]   │
                                   └───────────────┘
```

### Adjacency table

| Story | Depends on | Blocks |
|---|---|---|
| 003.001 | — (leaf) | 003.002, 003.003, 003.004, 003.005, 003.006 |
| 003.002 | 003.001 | 003.005 (`from_slug` available for the conversation by the time the beacon fires), 003.008 |
| 003.003 | 003.001 | 003.004, 003.006, 003.007 |
| 003.004 | 003.001, 003.003 | 003.005 (logical pairing — beacon would 404 silently otherwise), 003.010 |
| 003.005 | 003.001, 003.004 (logical), 003.002 (logical — `from_slug` should already be threading by chat-end) | 003.010 |
| 003.006 | 003.001, 003.003 | 003.010 |
| **soft-launch gap** | 003.006 (end of Phase B) | 003.007 (start of Phase C — gates on Maria's admin review during the gap) |
| 003.007 | 003.003, soft-launch gap | 003.008, 003.009, 003.010 |
| 003.008 | 003.002 (route handles `?from=`), 003.007 (count-badge sibling visual) | 003.009, 003.010 |
| 003.009 | 003.007, 003.008 | 003.010 |
| 003.010 | 003.007, 003.008, 003.009 | — (terminal) |

---

## Inter-phase ordering — the 7-day soft-launch gap

The gap between **003.006 (end of Phase B)** and **003.007 (start of Phase C)** is the single hardest-to-shortcut sequencing constraint in the epic. It's NOT a story; it's an observation window.

**What happens during the gap:**
- All Phase B stories merged on `dev`.
- Visitors interacting with `/argue?from=<slug>` (or with `/argue` directly) trigger judge runs via the run route + sweep cron.
- Verdicts accumulate in `argue-judges/*.jsonl`.
- **No public surface yet** — `<PushbackSummary>` doesn't exist; `<FieldworkCard>` count badge doesn't exist; the `[ argue with this ]` CTA isn't on the index page yet (the route handles `?from=` but no card links to it).
- Maria reviews each day's verdicts via `/argue/log` admin (which gains a parallel view of `argue-judges/<day>.jsonl` informally — implementation of any judge view in the admin is out of v2 scope; reading the JSONL via the existing day-file pattern is the v1 stance).
- Maria spot-checks for: harm-gate false-positives (clean conversations flagged as harmful — PB2-BRD-001), harm-gate false-negatives (hostile excerpts not flagged — PB2-BRD-002), excerpt selection sanity (judge_confidence ranking matches Maria's sense of "best line"), preface voice consistency across pieces.

**Why ≥ 7 days:**
- Per `04-assessment.md` PB2-BRD-002 mitigation and `05-prd.md` AC-023.
- Sweep cron fires nightly; a 7-day window guarantees ≥ 7 sweep cycles, capturing both run-route-fire and sweep-recovery paths.
- Gives multiple visitor cohorts (weekday vs weekend traffic patterns).
- Maria's admin-review cadence is realistically every 2-3 days; 7 days = at least 2-3 review sessions.

**What aborts the gap:**
- A single hostile-shaped excerpt slipping through the harm gate aborts the gap → tune prompt → restart the 7-day clock.
- Systematic voice regression in the preface across pieces → tune preface text → restart.
- Critical run-route or sweep bug → fix → no automatic restart, but Maria's call.

**What ends the gap:**
- 7 calendar days of clean admin review.
- Maria's explicit sign-off (captured in story 003.010 commit message or sibling note).
- 003.007 dev merge proceeds; 003.008 / 003.009 / 003.010 follow within hours/days.

**Phase C release-blocker constraint:**
- Phase C stories (003.007-003.010) all merge to `dev` together OR sequentially within a tight window (≤ 48h).
- Phase C `dev` → `master` PR ships **all four together**: public render + CTA + v1 deletion + disclosure update. This is the same-PR coupling that `04-assessment.md` PB2-PRV-001 makes a release blocker.

---

## Critical path

The longest dependency chain in execution-order:

**003.001 → 003.003 → 003.006 → [7-day gap] → 003.007 → 003.008 → 003.009 → 003.010**

- 003.001 (Medium) — schema + threading (foundation)
- 003.003 (Large) — judge module (highest risk-density)
- 003.006 (Medium) — sweep cron (Phase B close)
- gap (≥ 7 days observation, no engineering)
- 003.007 (Large) — public render
- 003.008 (Small) — CTA
- 003.009 (Small) — v1 deletion
- 003.010 (Small + verification) — launch QA close

This chain captures the "minimum end-to-end ship" path. Stories 003.002, 003.004, 003.005 are not on the critical path but block downstream parallel work and ship as part of Phase B.

### Parallelisable Phase B stories (after 003.001 + 003.003 merge)

```
After 003.001 + 003.003 land on dev, these can land in any order (interleaved on dev with green CI between each):

  003.002  ────────┐
  003.004  ────────┼──── all merge to dev independently
  003.005  ────────┤     (003.005 prefers 003.004 first for end-to-end smoke)
  003.006  ────────┘
```

In practice the autopilot order will likely be: 003.001 → 003.003 → 003.002 → 003.004 → 003.005 → 003.006 (one-at-a-time to keep grading clean), but no story-pair after 003.001 + 003.003 has a hard dependency on another within Phase B (only logical / smoke-coverage preferences).

---

## Estimated total effort

| Phase | Stories | Approximate engineering hours (post-grade) |
|---|---|---|
| **A** | 003.001 | 2-3 hours |
| **B** | 003.002, 003.003, 003.004, 003.005, 003.006 | 12-16 hours total (003.003 alone is ~6-8) |
| **soft-launch gap** | observation only, no engineering | 0 hours (calendar wait) |
| **C** | 003.007, 003.008, 003.009, 003.010 | 6-8 hours total (003.007 is ~3-4; the rest are small) |
| **Total engineering** | — | **20-27 hours** |
| **Total wall-clock** | — | ~7 days gap + 1-2 days each side = **~10-14 days** |

These are rough order-of-magnitude estimates; story-level grades will refine.

---

## Risk-mitigation density per story

From `04-assessment.md` §"Mitigation → story map", mapped against this DAG:

| Story | Risks mitigated (count) | Notable IDs |
|---|---|---|
| 003.001 | 3 | PB2-SEC-008, PB2-DAT-001, PB2-PRV-003 |
| 003.002 | 3 | PB2-SEC-003, PB2-BRD-001/002 (preface voice) |
| **003.003** | **8** | **PB2-SEC-001, PB2-SEC-006, PB2-OPS-003/004, PB2-PRF-001, PB2-DAT-002/003, PB2-BRD-001/003** |
| 003.004 | 3 | PB2-SEC-002, PB2-SEC-007, PB2-OPS-003 |
| 003.005 | 3 | PB2-SEC-007, PB2-PRF-003, PB2-OPS-003 |
| 003.006 | 4 | PB2-SEC-005, PB2-OPS-001/002, PB2-PRF-002 |
| **003.007** | **7** | **PB2-SEC-004, PB2-BRD-003/005, PB2-DAT-002/003, PB2-OPS-004, PB2-PRF-001** |
| 003.008 | 1 | PB2-BRD-004 |
| 003.009 | 0 (cleanup) | — |
| **003.010** | **8** | **PB2-PRV-001 (release blocker), PB2-BRD-001/002/004/005, PB2-OPS-001/004, PB2-PRV-002** |

**Highest-density stories** (matching PRD §"Stories" guidance): 003.003 (judge module — 8 risks) and 003.010 (launch QA — 8 risks across the consolidation surface). Both are in the locked-large-or-careful-verification bucket.

---

## Open product question resolution (from PRD §"Open product questions")

The PRD raised five open questions defaulting to specific answers if Maria didn't push back. Recording resolutions here per Phase 6 instructions:

| # | Question | Resolution in stories |
|---|---|---|
| 1 | Soft-launch duration: 7 vs 14 days? | **7 days** — locked in DAG inter-phase ordering + 003.010 AC-008. Adjustable in 003.010 if Maria wants longer at the time. |
| 2 | Per-quote redaction admin in v2 vs v2.1? | **Defer to v2.1** — explicit scope-out in 003.007 + 003.010. Triggered if PB2-BRD-002 surfaces during soft-launch. |
| 3 | `reasoning` field visible in `/argue/log` admin? | **Yes, surface it** — 003.003 schema includes `reasoning` as optional; admin view rendering is out of this epic's scope (admin extension would live in a separate v2.1 story); the data is captured per-verdict for Maria's review. |
| 4 | Second `[ argue with this ]` CTA on Fieldwork detail page? | **No second CTA** — 003.008 scope rule explicit; summary block at the bottom serves the role. |
| 5 | `from_slug` for postcards / `/now` / `/taste`? | **Fieldwork-only for v1** — 003.007 scope rule + 003.008 scope rule explicit. Defer cross-content-type extension to v2.1. |

---

## Decomposition adjustments from suggested

The handoff suggested 10 stories with a specific shape. Final decomposition:

- **Suggested 003.001 (schema) and 003.002 (?from)** — kept as separate stories. 003.001 is purely additive schema + conv-id (Phase A safe-merge). 003.002 layers `?from=` capture + preface (Phase B; depends on 003.001). Justification for splitting: the architecture explicitly carves Phase A as "no UI change, no judge yet" — bundling `?from=` capture into 003.001 would break the Phase A safe-merge property.
- **Suggested 003.003 (judge core)** — kept as a single Large story. Per PRD recommendation, splitting into B1 (schema + storage) and B2 (prompt + runner + loader) was an option, but the modules are tightly coupled (loader needs schema + storage; runner needs schema + prompt; storage needs schema), so reading any subset in isolation requires the others. Sized Large explicitly.
- **Stories 003.004 / 003.005 / 003.006** — kept as suggested.
- **Suggested 003.007 (PushbackSummary + enrichment) + 003.008 (CTA)** — kept as separate stories. Pairing the count badge into 003.007 keeps the build-time-enrichment data flow in one story; the CTA in 003.008 is the visible link sibling. Both ship in the same Phase C release window but the cleanly-graded boundary between "render derived data" and "add link to a new route" is worth preserving.
- **Suggested 003.009 (v1 deletion) + 003.010 (launch QA)** — kept as separate stories. 003.009 is mechanical deletion + grep audit. 003.010 is the disclosure update + sign-off ritual. Per architecture §`v1 deletion timing` decision, both should land in Phase C close, but separating them keeps git-history clear (a deletion story is grep-auditable on its own).

**Net adjustment from suggested: zero.** All 10 stories present, numbering matches the suggestion, decomposition matches the suggested shape. Justifications above record where the temptation to merge stories was rejected.

---

## Next

Run `/isaac:plan 003.001` to begin Phase 7 planning on the leaf story. Phase 7 grades each plan ≥85 before any code is written — `claude-review.yml` and CI handle Tier 2 + Tier 3 gates.

Soft-launch gap kicks in once 003.006 lands on dev. During the gap, Maria's admin-review cadence drives Phase C readiness; engineering work pauses on this epic until sign-off (other epics or refinements can fill the gap).
