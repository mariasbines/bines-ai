# Stories Overview — Symphony in Motion (Phase 6)

**Epic:** `symphony-in-motion-v1`
**Captured:** 2026-05-26
**Builds on:** `05-prd.md`

---

## Story list

| ID | Title | TDD Tier | Complexity | Depends on |
|---|---|---|---|---|
| 005.001 | Content loader foundation — status union + gallery helper | 🔴 Full TDD | Small | none |
| 005.002 | `VideoLoop` extension — `pauseWhenOffscreen` prop | 🔴 Full TDD | Small | none |
| 005.003 | Gallery components + `/gallery` page route | 🟡 Critical Path | Large | 005.001, 005.002 |
| 005.004 | Nav + sitemap + ship-readiness | 🟢 Smoke Tests | Small | 005.003 |

---

## DAG

```
   005.001                       005.002
   (loader)                     (VideoLoop)
       │                            │
       └─────────────┬──────────────┘
                     ▼
                 005.003
                 (gallery)
                     │
                     ▼
                 005.004
                 (nav + meta)
```

**Critical path:** 005.001 (or 005.002) → 005.003 → 005.004 — three sequential steps. 005.001 and 005.002 parallelise.

---

## AC-to-story mapping

| AC | Story | Note |
|---|---|---|
| AC-001 (route exists, 200) | 005.003 | Page render |
| AC-002 (7 pieces in scope) | 005.001 (loader); 005.003 (render) | Loader returns; render shows |
| AC-003 (FW05 excluded) | 005.001 | Explicit guard test in loader |
| AC-004 (newest-first order) | 005.001 | Loader sort; verified in 005.003 by render order |
| AC-005 (100dvh × 100vw + scroll-snap CSS) | 005.003 | Panel layout |
| AC-006 (first panel `priority`) | 005.003 | Component prop wiring |
| AC-007 (`pauseWhenOffscreen`) | 005.002 (prop); 005.003 (uses prop) | Split across stories |
| AC-008 (caption text + style) | 005.003 | Panel render |
| AC-009 (scrim contrast) | 005.003 | Panel chrome |
| AC-010 (click-through link) | 005.003 | Panel anchor |
| AC-011 (keyboard arrow nav) | 005.003 | Gallery event listener |
| AC-012 (focus-visible ring) | 005.003 | Panel link styling |
| AC-013 (scroll affordance gradient + glyph) | 005.003 | Gallery chrome |
| AC-014 (Nav entry) | 005.004 | NAV array update |
| AC-015 (page metadata: title/description/OG) | 005.003 | Page route metadata export |
| AC-016 (h1 + intro one-liner) | 005.003 | Page header markup |
| AC-017 (reduced-motion play overlay) | 005.002 (handled in VideoLoop already); 005.003 (verified end-to-end) | No new code; verification only |
| AC-018 (mobile scroll-snap parity) | 005.003 | Panel sizing |
| AC-019 (no Fieldwork detail regression) | 005.002 | Default-`false` behaviour preserved + test |
| AC-020 (array-status `getAllFieldwork`) | 005.001 | Loader extension + test |
| AC-021 (`getGalleryFieldwork` sort + scope) | 005.001 | Helper test |
| AC-022 (all 4 gates green) | 005.004 | Final ship-readiness; each story locally |
| AC-023 (no new deps) | 005.004 | Lockfile verification |
| AC-024 (sitemap includes `/gallery`) | 005.004 | Sitemap audit + update |

Every AC has at least one owning story. Some span two — the loader-render split (AC-002, AC-004) and the prop-wire split (AC-007) are explicit hand-offs.

---

## Parallelisation strategy

**Phase A (parallel, no deps):** Run 005.001 and 005.002 simultaneously. Both touch independent files with no shared surface.

**Phase B (sequential):** Once both Phase A stories merge to the integration branch, 005.003 starts.

**Phase C (sequential):** Once 005.003 lands, 005.004 closes the epic.

If executed via `/isaac:autopilot` or sub-agents, Phase A can be two parallel agents; Phase B and C are single-agent.

---

## Branch strategy

All four stories ship together as the gallery epic. Recommended:

- Continue on the existing branch `feat/symphony-in-motion-v1-concept` (will get renamed via PR title); commit each story's work as a separate logical commit so reviewer sees the progression
- OR cut new branches per story for finer review granularity; rebase onto a final integration branch before the PR

The first approach is simpler for this scope (~6-12 new files); the second is more orthodox ISAAC practice. Either acceptable — execute-phase agent picks.

---

## Next step

Run `/isaac:plan 005.001` and `/isaac:plan 005.002` (parallel-safe; can be batched). Then `/isaac:plan 005.003` once 001 and 002 plans land. Then `/isaac:plan 005.004` once 003 plan lands.

Alternatively, run `/isaac:autopilot` with the four stories queued in DAG order — autopilot handles plan → implement → validate → commit per story with the remediation loop.
