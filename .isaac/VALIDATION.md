# ISAAC Validation Configuration

This file documents the project-specific testing strategy for ISAAC story validation.

## Quick Reference

| Command | Purpose | When |
|---------|---------|------|
| `pnpm test:related` | Run tests for changed files only | Per-story validation |
| `pnpm test` | Full test suite | Final validation (after all stories) |

## Test Script Setup

### 1. Create `scripts/test-related.sh`

```bash
#!/bin/bash
# Find and run tests related to changed/new files only
# Much faster than full test suite for per-story validation

set -e

# Get changed files (staged + unstaged + untracked)
CHANGED_FILES=$(git diff --name-only HEAD -- '*.ts' '*.tsx' 2>/dev/null || true)
STAGED_FILES=$(git diff --cached --name-only -- '*.ts' '*.tsx' 2>/dev/null || true)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard -- '*.ts' '*.tsx' 2>/dev/null || true)

ALL_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES\n$UNTRACKED_FILES" | sort -u | grep -v '^$' || true)

if [ -z "$ALL_FILES" ]; then
  echo "No changed TypeScript files found. Skipping tests."
  exit 0
fi

# Find test files
TEST_FILES=""

for file in $ALL_FILES; do
  # Skip if file doesn't exist (deleted)
  [ -f "$file" ] || continue

  # If it's already a test file, include it
  if [[ "$file" == *.test.ts ]] || [[ "$file" == *.spec.ts ]]; then
    TEST_FILES="$TEST_FILES $file"
    continue
  fi

  # Look for colocated test file
  base="${file%.ts}"
  base="${base%.tsx}"

  for ext in ".test.ts" ".spec.ts" ".test.tsx" ".spec.tsx"; do
    if [ -f "${base}${ext}" ]; then
      TEST_FILES="$TEST_FILES ${base}${ext}"
      break
    fi
  done
done

# Remove duplicates and empty
TEST_FILES=$(echo "$TEST_FILES" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')

if [ -z "$TEST_FILES" ]; then
  echo "No test files found for changed files. Skipping."
  exit 0
fi

echo "Running tests for: $TEST_FILES"
echo "---"

# Run with fast flags
pnpm vitest run --pool=threads --no-isolate $TEST_FILES
```

### 2. Add npm script to `package.json`

```json
{
  "scripts": {
    "test:related": "bash scripts/test-related.sh"
  }
}
```

### 3. Make script executable

```bash
chmod +x scripts/test-related.sh
```

## Performance Flags

The script uses these vitest flags for speed:

| Flag | Effect |
|------|--------|
| `--pool=threads` | Faster than default forks |
| `--no-isolate` | Skip per-test isolation overhead |
| `run` | Exit after tests (no watch mode) |

## Expected Performance

| Approach | Time | Tests |
|----------|------|-------|
| `pnpm test` (full) | ~21 min | All |
| `pnpm test:related` | ~8 sec | Changed only |

## Customization

### Different test patterns

If your tests aren't colocated, modify the script to find them:

```bash
# Example: tests in separate __tests__ directory
TEST_DIR="__tests__"
for file in $ALL_FILES; do
  basename=$(basename "$file" .ts)
  if [ -f "$TEST_DIR/${basename}.test.ts" ]; then
    TEST_FILES="$TEST_FILES $TEST_DIR/${basename}.test.ts"
  fi
done
```

### Jest instead of Vitest

```bash
# Replace vitest command with:
pnpm jest --findRelatedTests $TEST_FILES --passWithNoTests
```

### Pytest (Python)

```bash
# Find related Python tests
for file in $ALL_FILES; do
  if [[ "$file" == *.py ]] && [[ "$file" != test_* ]]; then
    test_file="test_$(basename $file)"
    if [ -f "tests/$test_file" ]; then
      TEST_FILES="$TEST_FILES tests/$test_file"
    fi
  fi
done

pytest $TEST_FILES
```

## Integration with ISAAC

The execute-agent checks for `pnpm test:related` first:

1. If `test:related` script exists → use it
2. Else if story has Testing Strategy → use that command
3. Else fallback to `vitest related $FILES`

This ensures fast validation (~8s) instead of full suite (~21min) per story.
