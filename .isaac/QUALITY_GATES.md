# ISAAC Quality Gates

> Import this file in your project's CLAUDE.md: `@.isaac/QUALITY_GATES.md`

## Gate Definitions

All gates must pass before commit. No exceptions.

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| TypeScript | `pnpm typecheck` | 0 errors |
| Linting | `pnpm lint` | 0 errors |
| Tests | `pnpm test` | 100% pass |
| Coverage | (per project) | ≥80% lines/functions/branches |

## Gate Execution

```bash
# Run all gates (must all pass)
pnpm typecheck && pnpm lint && pnpm test
```

## On Gate Failure

1. **Fix the issue** - don't skip or ignore
2. **Re-run gates** - verify the fix worked
3. **Do NOT proceed** until all gates pass
4. **Do NOT use --no-verify** or similar bypasses

## Test Execution Safety

```bash
# SAFE: Filter to specific package
pnpm --filter @isaac/PACKAGE test

# SAFE: Resource-limited execution
pnpm test:safe

# DANGEROUS: Can overwhelm resources
pnpm test  # Avoid on large monorepos
```

## Coverage Requirements

| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

New code should meet or exceed these thresholds.
