# Gap Analysis — Story 003.010

**Date:** 2026-05-13
**Mode:** Self-grading
**Verdict:** PROCEED (with documented manual handoffs)

---

## Trilateral analysis

### View 1: Plan → Implementation

| Plan step | Done? | Evidence |
|---|---|---|
| ChatInterface disclosure update | Yes | `src/components/ChatInterface.tsx:228` — locked draft text present |
| ChatInterface tests + grep guard | Yes | 2 new tests in `ChatInterface.test.tsx` — clause present + positional ordering |
| /privacy page extension | Yes | `src/app/privacy/page.tsx:54-61` — new paragraph between "What is stored" and "After 90 days" |
| docs/argue-voice-check.md extension | Yes | 5 new sections appended; doc went from 117 → 204 lines |
| typecheck + lint + test + build | Pass | typecheck clean, lint clean, 570/570 pass, build clean |

### View 2: ACs → Evidence

| AC | Status |
|---|---|
| AC-001 (text update) | Done — verbatim from PRD locked draft |
| AC-002 (test assertions updated) | Done — existing assertions still pass + new public-quoting assertion + positional ordering grep guard |
| AC-003 (OLD disclosure shape not present) | Done — the OLD shape ended with `...how the chat is used. no ip, no account...` with no clause between; the positional-ordering test asserts that `anonymous quotes on that piece` sits between `how the chat is used.` and `no ip, no account` — proving the old shape is broken |
| AC-004 (voice-check sweep) | Maria task — flagged in final report |
| AC-005 (ops-doc walkthrough) | Maria task — flagged in final report |
| AC-006 (voice-check rubric extension) | Done — 5 new sections in `docs/argue-voice-check.md` |
| AC-007 (launch-readiness checklist) | Partial: engineering-side items confirmed (typecheck/lint/test/build all green; no new env vars; `<PushbackSummary>` renders on Fieldwork pieces in build; `<FieldworkCard>` count badge code paths verified; `[ argue with this ]` CTA on every card; no `<PushBackModal>` reachable). Vercel-dashboard-side items are Maria's. |
| AC-008 (7-day soft-launch window) | Declared cleared per autopilot briefing |
| AC-009 (production sweep-cron post-merge fire) | Maria task — post-master-merge confirmation |
| AC-010 (29 PRD ACs ratified) | Partial — engineering ACs from PRD are now satisfied by the dev branch; full ratification is Maria's |

### View 3: Cross-surface consistency

The privacy disclosure now appears in two places:

1. `<ChatInterface>` privacy-notice block (line 228)
2. `/privacy` page `/argue conversations` section

Both surfaces mention the public-quoting flow with consistent framing ("anonymous quotes", "Fieldwork piece", "[ argue with this ]"). The `/privacy` page is more detailed (it explains the LLM judge, the filtering, the 3-excerpt cap). The chat-side disclosure is shorter (it's a single-paragraph block in the chat UI).

Both surfaces agree:
- The public-quoting flow is conditional on arriving via a Fieldwork piece CTA.
- Quotes are attributed to "anonymous".
- The data practice doesn't link back to the visitor.

## Critical gaps

**None for engineering scope.**

Manual-verification items (AC-004, AC-005, AC-007 partial, AC-008 declared-cleared, AC-009, AC-010 partial) require:
- A deployed preview
- Vercel dashboard access (Maria)
- Live `/argue` chat session
- Post-master-merge cron history check

These are tracked in the final autopilot report, not blocking story closure.

## Minor gaps

1. **`/privacy` page mentions implementation detail** ("An LLM judge runs over the conversation"). Reading: this is informative for users who want to understand the public-quoting flow; consistent with Maria's "diagnostic, not confessional" voice (the page explains how the system works, not just what it does). Maria can revise the voice if she prefers a less-mechanical description.

2. **`/privacy` page has no automated test** — bines.ai has no `__tests__/privacy/page.test.tsx`. The page is verified at build time. Adding a test for the new paragraph would be reasonable but is outside this story's scope (introduces a test file the codebase doesn't have a pattern for).

3. **`docs/argue-voice-check.md` 5 new sections** are author-only — no test validates the content. By construction (it's documentation). Maria reads on AC-005 walkthrough.

## Out-of-scope checks

- Did NOT touch `<PushbackSummary>` / `<FieldworkCard>` / `<FieldworkCardCtas>` — confirmed.
- Did NOT alter cron entries in `vercel.json` — confirmed.
- Did NOT add new env vars — confirmed.
- Did NOT bypass PR review flow — when Maria opens the dev → master PR, the standard CI + claude-review.yml + human approval all apply.
- Did NOT fold v2.1 features (per-quote redaction admin, postcards argue-judge, cross-piece best-argument view) into this story — confirmed.

## Voice-check (preliminary, pending Maria's formal sweep)

New static text introduced in this story:

1. **`<ChatInterface>` clause**: "when you've come from a fieldwork piece, parts of substantive arguments may surface as anonymous quotes on that piece."
   - Lowercase, voice-continuous with the existing notice
   - "substantive arguments" — Maria's frame; not "comments" / "feedback"
   - "anonymous quotes on that piece" — concrete, not abstract ("on the relevant page" would be vaguer)
2. **`/privacy` page paragraph**: longer, more mechanism-explanation. Sentence-case (consistent with the rest of the privacy page). Mentions the [ argue with this ] CTA, the LLM judge, the harm-filter.
3. **Voice-check.md sections**: meta — these are Maria's tools for future sweeps, not visitor-facing copy.

## Verdict: PROCEED

Engineering scope complete. Manual handoffs documented for the final autopilot report.
