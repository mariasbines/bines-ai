# Memory-First Protocol

> Import this file in your project's CLAUDE.md: `@.isaac/MEMORY_FIRST.md`

## Core Rule

**STOP AND THINK**: Before struggling with any problem for more than a few minutes, CHECK MEMORY.

## Quick Decision

```
Struggling or unsure? → Load `memory-router` skill FIRST

Working on ISAAC phase? → Load `isaac-constraints` skill
Need general knowledge? → Load `synapsedx-memory` skill
```

## When to Check Memory

| Situation | Action |
|-----------|--------|
| Repeated test failures | Check `isaac-constraints` |
| Familiar-looking code pattern | Check `synapsedx-memory` |
| Architectural decision | Check `synapsedx-memory` |
| Error you've seen before | Check both via `memory-router` |
| Starting work in known domain | Check `synapsedx-memory` |
| Before implementing feature | Check `synapsedx-memory` |
| After learning something new | STORE in `synapsedx-memory` |

## The Two Memory Systems

1. **SynapseDx Memory** (`synapsedx-memory` skill) - General knowledge: facts, patterns, decisions, preferences, constraints
2. **ISAAC Constraints** (`isaac-constraints` skill) - ISAAC workflow rules from past failures

## Why This Matters

**Memory makes you smarter, not slower.** A few seconds checking memory often saves hours of debugging or re-solving problems.

When in doubt: **RECALL FIRST, REMEMBER AFTER**.
