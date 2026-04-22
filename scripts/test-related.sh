#!/bin/bash
# ISAAC Test Related - Fast per-story test validation
# Finds and runs tests only for changed/new files
#
# Usage: pnpm test:related
#
# Performance: ~8 seconds vs ~21 minutes (full suite)
#
# Customize this script for your project's test patterns.
# See .isaac/VALIDATION.md for documentation.

set -e

echo "=== ISAAC Test Related ==="

# Get changed files (staged + unstaged)
CHANGED_FILES=$(git diff --name-only HEAD -- '*.ts' '*.tsx' 2>/dev/null || true)
STAGED_FILES=$(git diff --cached --name-only -- '*.ts' '*.tsx' 2>/dev/null || true)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard -- '*.ts' '*.tsx' 2>/dev/null || true)

# Combine and deduplicate
ALL_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES\n$UNTRACKED_FILES" | sort -u | grep -v '^$' || true)

if [ -z "$ALL_FILES" ]; then
  echo "No changed TypeScript files found."
  echo "Skipping tests (nothing to validate)."
  exit 0
fi

echo "Changed files:"
echo "$ALL_FILES" | sed 's/^/  /'
echo ""

# Find test files for each changed file
TEST_FILES=()

for file in $ALL_FILES; do
  # Skip if file doesn't exist (was deleted)
  [ -f "$file" ] || continue

  # If it's already a test file, include it directly
  if [[ "$file" == *.test.ts ]] || [[ "$file" == *.spec.ts ]] || \
     [[ "$file" == *.test.tsx ]] || [[ "$file" == *.spec.tsx ]]; then
    TEST_FILES+=("$file")
    continue
  fi

  # Look for colocated test file (same directory)
  base="${file%.ts}"
  base="${base%.tsx}"

  for ext in ".test.ts" ".spec.ts" ".test.tsx" ".spec.tsx"; do
    if [ -f "${base}${ext}" ]; then
      TEST_FILES+=("${base}${ext}")
      break
    fi
  done
done

# Remove duplicates
readarray -t TEST_FILES < <(printf '%s\n' "${TEST_FILES[@]}" | sort -u)

if [ ${#TEST_FILES[@]} -eq 0 ]; then
  echo "No test files found for changed files."
  echo "Skipping tests (no colocated tests detected)."
  echo ""
  echo "Tip: Create colocated tests like 'foo.test.ts' next to 'foo.ts'"
  exit 0
fi

echo "Running tests:"
printf '  %s\n' "${TEST_FILES[@]}"
echo ""
echo "---"

# Run vitest with fast flags
# --pool=threads: Faster than default forks
# --no-isolate: Skip per-test isolation overhead
# run: Exit after tests (no watch mode)
pnpm vitest run --pool=threads --no-isolate "${TEST_FILES[@]}"

echo ""
echo "=== Test Related Complete ==="
