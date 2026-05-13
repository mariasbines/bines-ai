# Gap Analysis — Story 003.007

**Date:** 2026-05-13
**Mode:** Self-grading (Codex Pro quota exhausted per memory `reference_isaac_telemetry_pending.md`)
**Verdict:** PROCEED

---

## Trilateral analysis

### View 1: Plan → Implementation

| Plan section | Implemented? | Evidence |
|---|---|---|
| §1 type extension | Yes | `src/lib/content/types.ts:6` re-exports `PushbackEnrichment`; `interface Fieldwork` gains required `pushback: PushbackEnrichment` field with demotion comment on frontmatter `PUSHBACK`. |
| §2 loader change | Yes | `src/lib/content/fieldwork.ts:30-58` calls `getJudgesForSlug` per piece with `.catch()` returning `null`; null → `EMPTY_ENRICHMENT` substitution. |
| §3 component | Yes | `src/components/PushbackSummary.tsx:1-71` server component, no `'use client'`, plain React text nodes. |
| §4 article integration | Yes | `src/components/FieldworkArticle.tsx:71-76` renders `<PushbackSummary>` between `<MdxBody>` and `<FieldworkArticleFooter>`. |
| §5 card badge | Yes | `src/components/FieldworkCard.tsx:39-49` renders accent-tinted badge in the top strip when count > 0. |
| §6 test updates | Yes | Mocks `@/lib/argue-judge/loader` in fieldwork.test.ts; 11 new tests on PushbackSummary, 3 on FieldworkArticle, 5 on FieldworkCard, 5 on fieldwork enrichment. |

**No plan items skipped or deferred.**

### View 2: ACs → Test coverage

| AC | Mapped test |
|---|---|
| AC-001 (Fieldwork.pushback field) | Type-level — tsc passes; runtime usage in FieldworkArticle/FieldworkCard tests. |
| AC-002 (.catch() on enrichment) | `fieldwork.test.ts` "(c) caught: getJudgesForSlug throws". |
| AC-003 (a-d four cases) | `fieldwork.test.ts` four named "(a)/(b)/(c)/(d)" cases all present. |
| AC-004 (PushbackSummary props + render rules) | `PushbackSummary.test.tsx` cases 1-4. |
| AC-005 (static labels + sign-off in commit) | Labels are source-controlled ("pushback", "landed", "anonymous"); commit will record Maria sign-off. |
| AC-006 (8 cases) | `PushbackSummary.test.tsx` 11 cases (super-set: includes the M-001 empty-excerpts case from grade). |
| AC-007 (insertion between body and footer) | `FieldworkArticle.test.tsx` "DOM order" test using `compareDocumentPosition`. |
| AC-008 (badge styling) | `FieldworkCard.test.tsx` "1 pushback" / "5 pushbacks" / accent class / forbidden hex grep. |
| AC-009 (5 sub-cases) | All 5 present in `FieldworkCard.test.tsx` "pushback count badge" describe block. |
| AC-010 (a-c) | All 3 present in `FieldworkArticle.test.tsx`. |
| AC-011 (no dangerouslySetInnerHTML) | `PushbackSummary.test.tsx` grep-audit test (comment-stripped). |
| AC-012 (build completes with empty corpus) | Verified at end-of-story `pnpm build`; loader returns null → empty enrichment, no throws. |
| AC-013 (gates green) | Full suite 65/65 files, 585/585 tests; typecheck clean; lint TBD before commit. |

**All 13 ACs have concrete test evidence or are runtime-verified in the final build step.**

### View 3: Risk register → mitigations in place

| Risk | Mitigation evidence |
|---|---|
| PB2-SEC-004 XSS | `PushbackSummary.test.tsx` XSS-shape test + grep-audit test + plain-text-node implementation. |
| PB2-BRD-003 out-of-context excerpts | Loader gives confidence-desc; component preserves order; top-3 cap enforced upstream in `loader.ts`. |
| PB2-BRD-005 label drift | Labels in source. `docs/argue-voice-check.md` extension is story 003.010 scope. |
| PB2-DAT-002 frontmatter count drift | `fieldwork.test.ts` "(d) loader is authoritative" — asserts loader count differs from frontmatter and loader wins. |
| PB2-DAT-003 truncation layering | Component imports `EXCERPT_MAX_CHARS` from schema (single constant); test cases for 240-verbatim, >240-truncated, no-whitespace-degenerate. |
| PB2-OPS-004 Blob unreachable | `.catch()` in fieldwork.ts + null-handling in PushbackSummary (count=0 → null DOM). |
| PB2-PRF-001 build-time cost | Documented in loader comment; v1 stance per PRD; deferred refactor flagged. |

**Seven risks, seven mitigations with test evidence.**

---

## Critical gaps

**None.**

## Minor gaps

1. **Lint hasn't run yet** — typecheck and full test suite are green, but `pnpm lint` is the third gate. Will run before commit. Expectation: clean (no new ESLint disables; consistent with existing code style).

2. **`pnpm build` hasn't run yet** — AC-012 requires the build to complete with the empty enrichment shape. Will run before commit.

3. **`landed` field is technically optional in the frontmatter PUSHBACK schema** (`z.number().int().nonnegative().optional()`) but **required non-optional** in `PushbackEnrichment`. The component handles `landed > 0` correctly. There is no mismatch — the frontmatter field has been demoted and isn't consulted at runtime. Worth a note in code review.

4. **`from_slug: null` case for loader** — `getJudgesForSlug` already filters these out (it requires `from_slug === slug`). No test added here because it's covered in the existing loader tests (`loader.test.ts` "filters out verdicts with a different from_slug" includes a `from_slug: null` case).

## Out-of-scope checks

- Does NOT add `[ argue with this ]` CTA — correct, that's story 003.008. Verified `FieldworkCardCtas.tsx` unchanged.
- Does NOT delete `<PushBackModal>` — correct, that's story 003.009. Verified file still exists.
- Does NOT update privacy disclosure — correct, that's story 003.010. Verified `ChatInterface.tsx` privacy text unchanged.
- Does NOT use SynapseDx palette — grep audits on PushbackSummary.tsx and FieldworkCard.tsx both present.
- Does NOT add `'use client'` to PushbackSummary — verified server component.
- Does NOT cache `getJudgesForSlug` across pages — verified plain per-piece call in `getAllFieldwork`.
- Does NOT consult `piece.frontmatter.pushback.count` at runtime — verified.

## Voice-check

Labels rendered: `pushback`, `landed`, `anonymous`, `pushback (N)`, `landed (N)`, `N pushback(s)`.

- Lowercase, mono, editorial register. Consistent with `<FieldworkArticleFooter>`, the chat disclosure, and the card top strip.
- `anonymous` (lowercase, mono) is consistent with the lowercase-everywhere voice rule.
- `aria-label="Pushback summary"` is sentence-case — defensible for screen-reader announcement; not visible to sighted users.

Story 003.010 will run the formal voice-check sweep — these labels are source-controlled and stable from here.

## Verdict: PROCEED

All acceptance criteria mapped to concrete tests or runtime-verified. Plan fully executed. Risk mitigations in place. No critical gaps. Two minor items (lint + build) are sequential gates that run as part of the commit ritual.
