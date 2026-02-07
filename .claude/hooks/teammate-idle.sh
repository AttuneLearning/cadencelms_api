#!/bin/bash
# teammate-idle.sh - Prevents teammates from going idle with unfinished work
# Hook event: TeammateIdle
# Exit 2 = keep working (stderr fed back to teammate)
# Exit 0 = allow idle

set -euo pipefail

INPUT=$(cat)
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Use CWD from input, fall back to PWD
if [ -z "$CWD" ]; then
  CWD="$PWD"
fi
cd "$CWD"

# Gate 1: Check for TypeScript errors (BLOCKING)
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || {
  ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")
  echo "Cannot go idle: $ERROR_COUNT TypeScript error(s) remain. Fix them before stopping." >&2
  echo "" >&2
  echo "$TSC_OUTPUT" | head -10 >&2
  exit 2
}

# Gate 2: Check for modified source files without corresponding test changes
MODIFIED_SRC=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | grep -v '__tests__' || true)
MODIFIED_TESTS=$(git diff --name-only 2>/dev/null | grep -E '\.test\.(ts|tsx)$' || true)

if [ -n "$MODIFIED_SRC" ] && [ -z "$MODIFIED_TESTS" ]; then
  echo "Cannot go idle: Source files were modified but no test files were updated." >&2
  echo "Write or update tests before stopping." >&2
  echo "" >&2
  echo "Modified source files:" >&2
  echo "$MODIFIED_SRC" >&2
  exit 2
fi

exit 0
