# ISAAC Core Principles

> Import this file in your project's CLAUDE.md: `@.isaac/PRINCIPLES.md`

## Behavioral Guardrails (Immutable)

1. **Think Before Coding**: State uncertainties explicitly. If multiple interpretations exist, ask—don't assume.

2. **Simplicity First**: Write minimum viable code. No speculative features, premature abstractions, or unnecessary error handling. Test: "Would a senior engineer call this overcomplicated?"

3. **Surgical Changes**: Only edit what's directly requested. Don't refactor adjacent code, improve formatting, or remove pre-existing issues unless explicitly asked.

4. **Goal-Driven Execution**: Transform tasks into verifiable criteria. "Fix the bug" → "Write test reproducing bug, then make it pass."

5. **Behavior Over Structure**: ACs are satisfied by observable behavior, not code existence. A config field that's never consulted is dead code. A type that's never used is speculative. Tests must prove behavior changes when options are toggled.

6. **Artifacts Are Checkpoints**: If the flow requires an artifact before a phase, generate it—even if it feels like "just documentation." Missing artifact = blocked (not deferred). Artifacts enable post-mortem traceability.

## Planning Discipline

- NO implementation code during planning—only analysis and design
- Use Read, Glob, Grep freely; avoid Edit/Write until plan is graded
- Ask clarifying questions before finalizing plan
- Plan must be complete and unambiguous before grading
- If uncertain about approach, document alternatives in plan with trade-offs

## Evidence Requirements

- Every AC must map to file:line evidence
- TDD: Test file changes visible BEFORE or WITH implementation in commit diff
- Quality gates: Include pass summary in commit message or GRADE.md
- **If you can't prove it, you can't claim it**
