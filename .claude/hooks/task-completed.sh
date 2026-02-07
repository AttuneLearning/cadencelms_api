#!/bin/bash
# task-completed.sh - Enforces code-reviewer gate criteria for agent team tasks
# Hook event: TaskCompleted
# Exit 2 = block completion (stderr fed back to teammate)
# Exit 0 = allow completion

set -euo pipefail

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty')
TASK_DESCRIPTION=$(echo "$INPUT" | jq -r '.task_description // empty')
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Use CWD from input, fall back to PWD
if [ -z "$CWD" ]; then
  CWD="$PWD"
fi
cd "$CWD"

# Detect team from working directory
TEAM="unknown"
if echo "$CWD" | grep -q "cadencelms_ui"; then
  TEAM="ui"
elif echo "$CWD" | grep -q "cadencelms_api"; then
  TEAM="api"
fi

# Skip gate checks for documentation/coordination/research tasks
if echo "$TASK_SUBJECT" | grep -qiE "^(document|session file|memory|comms|coordinate|plan|review|research)"; then
  exit 0
fi

# Gate 1: TypeScript compilation (BLOCKING)
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || {
  echo "TASK COMPLETION BLOCKED: TypeScript errors detected." >&2
  echo "Fix all type errors before completing task: $TASK_SUBJECT" >&2
  echo "" >&2
  echo "$TSC_OUTPUT" | head -20 >&2
  exit 2
}

# Gate 2: Run relevant unit tests for modified source files (BLOCKING)
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | grep -v '__tests__' || true)
TEST_FILES=""

for f in $CHANGED_FILES; do
  DIR=$(dirname "$f")
  BASE=$(basename "$f" | sed 's/\.\(ts\|tsx\)$//')

  # Check common test file locations
  for t in "$DIR/__tests__/$BASE.test.tsx" "$DIR/__tests__/$BASE.test.ts" "$DIR/$BASE.test.tsx" "$DIR/$BASE.test.ts"; do
    if [ -f "$t" ]; then
      TEST_FILES="$TEST_FILES $t"
    fi
  done
done

if [ -n "$TEST_FILES" ]; then
  if [ "$TEAM" = "ui" ]; then
    TEST_OUTPUT=$(npx vitest run $TEST_FILES 2>&1) || {
      echo "TASK COMPLETION BLOCKED: Tests failing." >&2
      echo "Fix failing tests before completing task: $TASK_SUBJECT" >&2
      echo "" >&2
      echo "$TEST_OUTPUT" | tail -20 >&2
      exit 2
    }
  elif [ "$TEAM" = "api" ]; then
    TEST_OUTPUT=$(npm run test:unit -- $TEST_FILES 2>&1) || {
      echo "TASK COMPLETION BLOCKED: Tests failing." >&2
      echo "Fix failing tests before completing task: $TASK_SUBJECT" >&2
      echo "" >&2
      echo "$TEST_OUTPUT" | tail -20 >&2
      exit 2
    }
  fi
fi

# Gate 3: Check that tests exist for implementation tasks
if echo "$TASK_SUBJECT" | grep -qiE "^(implement|create|add|build|feature|fix)"; then
  if [ -z "$TEST_FILES" ] && [ -n "$CHANGED_FILES" ]; then
    echo "TASK COMPLETION BLOCKED: No test files found for implementation task." >&2
    echo "Write tests before completing task: $TASK_SUBJECT" >&2
    echo "" >&2
    echo "Modified source files without tests:" >&2
    echo "$CHANGED_FILES" >&2
    exit 2
  fi
fi

exit 0
