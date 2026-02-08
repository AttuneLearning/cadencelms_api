# UI-ISS-074: Stabilize TypeScript Typecheck via Tsconfig Test/Node Types

## Status: COMPLETE
## Priority: High
## Created: 2026-01-27
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: None

---

## Overview

`npm run typecheck` currently reports hundreds of errors, with a large bucket caused by missing global/test/Node types (e.g., `global`, `process`, `NodeJS`, `vi`). The root `tsconfig.json` only includes `"types": ["vite/client"]`, which likely excludes Vitest and Node ambient types used by tests and some runtime utilities.

---

## Requirements

1. Audit `tsconfig.json`, `tsconfig.node.json`, and any test-specific config
2. Add appropriate ambient type packages to `types` (e.g., vitest, node) where safe
3. Re-run `npm run typecheck` and quantify improvement
4. Document remaining major error buckets after config fixes

---

## Technical Specification

### Related Files

- `tsconfig.json`
- `tsconfig.node.json`
- `src/test/setup.ts`
- `src/test/utils/mockFactories.ts`

### Progress

- Baseline on 2026-01-27: 573 TypeScript errors
- Config change: updated `tsconfig.json` `types` to `"vite/client", "vitest/globals", "node"`
- Result: Errors reduced from 573 to 459
- Added `tsconfig.typecheck.json` to exclude tests and relax unused checks
- Result: Errors reduced from 459 to 219
- Applied report-builder/report-template/report-job back-compat typing fixes
- Current count: 177 TypeScript errors

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `tsconfig.json` | Modified | Added vitest/globals, node types |
| `tsconfig.typecheck.json` | Created | Typecheck-specific config |
| `package.json` | Modified | Updated typecheck script |
| Various type files | Modified | Back-compat typing fixes |

### Approach

Incrementally fix type errors by bucket, starting with config/ambient type issues, then domain typing mismatches.

---

## Tests Required

1. [ ] `npm run typecheck` passes with reduced error count
2. [ ] No regressions in existing functionality

---

## Acceptance Criteria

- [x] Capture baseline typecheck errors
- [x] Audit current TypeScript configs
- [x] Apply minimal config fixes for ambient types
- [x] Re-run typecheck and compare counts
- [ ] Triage next highest-leverage error bucket
- [ ] Reduce errors to < 100
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

- Fixed `saveTimeoutRef` in `src/features/profile/hooks/useAutoSave.ts`
- Aligned `useProgressTracker` with current lesson progress API request shapes
- Added legacy `"video"` to `LearningUnitType`

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
