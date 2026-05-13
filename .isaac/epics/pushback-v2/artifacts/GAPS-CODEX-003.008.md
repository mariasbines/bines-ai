# Gap Analysis — Story 003.008

**Date:** 2026-05-13
**Mode:** Self-grading
**Verdict:** PROCEED

---

## Trilateral analysis

### View 1: Plan → Implementation

| Plan section | Implemented? | Evidence |
|---|---|---|
| Component change: remove `!hasTestimonial` early-return | Yes | `FieldworkCardCtas.tsx:31-50` always renders the CTA row; `[ watch ]` is now nested-conditional, not gate-conditional. |
| Add `<Link>` before `[ watch ]` | Yes | Lines 30-35. |
| Add `slug` to destructure | Yes | Line 23. |
| Mount `<WatchDialog>` only when testimonial present | Yes | Lines 47-55. |
| Strip stale comment about hidden `[ push back ]` | Yes | Comment block reworded to describe new behaviour. |

### View 2: ACs → Tests

| AC | Test |
|---|---|
| AC-001 (hidden push-back replaced by visible argue link) | "(d) regression guard — no push back text anywhere" |
| AC-002 (a) link href | "(a) href matches /argue?from=<slug>" |
| AC-002 (b) link text | "(b) link text content is exactly..." |
| AC-002 (c) hover/border parity | "(c) link shares border / hover classes with sibling [ watch ]" |
| AC-002 (d) no push back | "(d) regression guard" + "does NOT render [ push back ]" |
| AC-002 (e) motion-reduce class | "(e) link has motion-reduce:transition-none class" |
| AC-003 (every card) | "(a) renders the link on every card — even when no testimonial" |
| AC-004 (Maria sign-off) | Captured in commit message |
| AC-005 (gates green) | typecheck + lint + 592 tests pass + build clean |

### View 3: Risk register

| Risk | Mitigation |
|---|---|
| PB2-BRD-004 voice mismatch | Visual register parity asserted in test (c); manual sign-off in commit |

## Critical gaps

**None.**

## Minor gaps

1. **WatchDialog mounted only when testimonial present** — the previous behaviour was identical in spirit (the dialog was inside the `if (!hasTestimonial) return null;` guard). No regression.
2. **`[ argue with this ]` is the leftmost CTA** — defensible per the plan's documented deviation from the story file's "after `[ read ]`" wording (no `[ read ]` exists; the universal CTA being leftmost is the only consistent placement across all cards).

## Out-of-scope checks

- Does NOT delete `<PushBackModal>` — story 003.009.
- Does NOT add tracking attribute — confirmed (no `data-` attributes on the link beyond what's needed).
- Does NOT add second CTA on detail page — confirmed (only `<FieldworkCardCtas>` changed).
- Does NOT add to postcards / `/now` / `/taste` — confirmed.

## Voice-check

`[ argue with this ]` — lowercase, square brackets, mono. Same visual register as `[ watch ]`. Reads as dry-inviting, not imperative-confrontational. The "this" refers to the piece on the card the visitor is looking at — context-anchored.

## Verdict: PROCEED
