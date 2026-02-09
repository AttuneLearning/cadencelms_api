# UI-ISS-126: Code Cleanup — Debug Logging & Rough Edges

## Status: PENDING
## Priority: Low
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: None

---

## Overview

Several debug `console.log` statements remain in production code paths, and there are miscellaneous rough edges that should be cleaned up before the learner experience is polished. While these don't break functionality, they indicate unfinished work and can leak implementation details to browser dev tools.

---

## Requirements

1. Remove or convert all debug `console.log` statements to proper logging (or remove entirely)
2. Review and clean up TODO comments in learner-facing code
3. Remove any hardcoded test data in components that should use API data

---

## Technical Specification

### Known Debug Logging

| File | Details |
|------|---------|
| `AuthInitializer` | 7 `console.log` calls with `[AuthInitializer]` prefix (lines ~31-114) |
| Login service | Login request/response logging (lines ~15, 22) |
| Session timeout handler | Session timeout debug logging (lines ~49, 83, 89) |
| Course page components | Scattered `console.log` calls |
| Email notification service | Email notification log (line ~118) |

### Known Hardcoded Data

| File | Details |
|------|---------|
| My Classes page | `const classes: Array<{...}> = []` with TODO comment — hardcoded empty array |

### Approach

1. `grep -rn "console.log" src/` to find all instances
2. Categorize: debug (remove), error handling (convert to logger), intentional (keep)
3. Remove debug logs, convert error-path logs to `console.error` or structured logger
4. Review TODO comments for any that indicate broken or incomplete code

---

## Acceptance Criteria

- [ ] No debug `console.log` statements in production code paths
- [ ] Auth flow doesn't leak debug info to browser console
- [ ] Error-path logging uses `console.error` or `console.warn` appropriately
- [ ] No hardcoded test/empty data in components (either use API or show proper loading/empty states)
- [ ] TODO comments are either resolved or documented as known future work

---

## Implementation Notes

*Low priority — these don't affect functionality but improve code quality and professionalism. Can be batched as a cleanup sprint. Consider adding an ESLint rule (`no-console`) with exceptions for error/warn to prevent future debug logs from being committed.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
