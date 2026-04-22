# ISAAC Scope Rules

> Import this file in your project's CLAUDE.md: `@.isaac/SCOPE_RULES.md`

## File Modification Rules

### Allowed Edits (No Justification Needed)

- Files in story's "Files to Modify" list
- Test files corresponding to modified files
- The story file itself (to mark ACs complete, add evidence, document deferrals)

### Requires Justification

Any file NOT in the above list requires explicit justification in commit message.

**Invalid justifications:**
- "I noticed it needed fixing"
- "While I was there, I also..."
- "It was related to the change"

**Valid justifications:**
- "Required for type safety: X depends on Y"
- "Test infrastructure needed for coverage"
- "Documentation update reflecting API change"

## Pre-Commit Scope Check

Before committing, verify scope compliance:

```bash
# List all changed files
git diff --name-only HEAD

# Compare against story's "Files to Modify" list
# Flag any out-of-scope files
```

## Out-of-Scope Handling

If you modified an out-of-scope file:

1. **Document the reason** in commit message under "Out-of-scope changes:"
2. **If no valid justification** → revert the changes before commit
3. **If the change is valuable** → create a follow-up story for it

## Deferral Mechanism

If a Technical Task cannot be completed in this story:

1. **Do NOT silently skip it**
2. **Report deferral** via telemetry
3. **Document** in story file under `## Deferred Tasks`
4. **Create follow-up story** if one doesn't exist

```bash
# Report deferral
node "$PLUGIN_ROOT/hooks/scripts/report-progress.js" \
  --event task-deferred \
  --story {XXX.YYY} \
  --task "{task description}" \
  --followup "{new-story-id or TBD}"
```
