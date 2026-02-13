# API-ISS-049: Contract Runtime Alignment P1 (Contract Structure Normalization)

## Status: COMPLETE
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Internal
## Assigned To: Codex
## Related: dev_communication/shared/architecture/suggestions/2026-02-13_api_contract-runtime-alignment-audit.md, API-ISS-048

---

## Overview

Execute P1 actions to normalize contract file structure and tooling behavior: separate endpoint contracts from type/documentation artifacts, repair compile-breaking contracts, and remove generated JS contract files from source directories.

---

## Requirements

1. Standardize `*.contract.ts` files to endpoint-contract exports (`*Contract` / `*Contracts`) only.
2. Move narrative/type-only material to dedicated `types` or docs locations.
3. Fix compile-breaking contracts and skipped exports.
4. Remove generated `*.contract.js` files from `contracts/api/` and keep generated artifacts in `contracts/dist/`.

---

## Technical Specification

### Target Repairs

| Contract | Current Problem |
|----------|------------------|
| `admin-roles.contract.ts` | TS compile failure (unused imports) |
| `auth-v2.contract.ts` | TS compile failure (unused imports) |
| `demographics.contract.ts` | TS syntax error |
| `flashcards.contract.ts` | TS compile failure |
| `matching-exercises.contract.ts` | Duplicate export conflicts |
| `media.contract.ts` | TS compile failure |
| `report-schedules.contract.ts` | Zod API mismatch for current version |
| `report-templates.contract.ts` | Zod API mismatch for current version |
| `user-type-revision.contract.ts` | isolatedModules export conflict |
| `certificate-templates.contract.ts` | Skipped (no `*Contract` export) |
| `report-jobs.contract.ts` | Skipped (no `*Contract` export) |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `contracts/api/*.contract.ts` | Modify | Normalize exports and endpoint object schema |
| `contracts/types/*` or `docs/*` | Create/Modify | Relocate non-endpoint contract content |
| `scripts/validate-contracts.ts` | Modify | Ignore/validate metadata entries explicitly |
| `scripts/export-contracts.ts` | Modify | Enforce strict export policy |
| `scripts/generate-openapi.ts` | Modify | Skip non-endpoint entries safely |
| `contracts/api/*.contract.js` | Delete | Remove generated JS from source tree |

### Approach

- Define a contract format spec first, then batch-fix files to that spec.
- Keep export/docs generators consistent with the same contract shape assumptions.
- Do not preserve backward-compatible export aliases or legacy contract shapes.

---

## Tests Required

1. [x] `contracts:validate` passes with zero errors.
2. [x] `contracts:export` exports all intended contracts with no skips/failures.
3. [x] `contracts:docs` completes with no endpoint-processing exceptions.

---

## Acceptance Criteria

- [x] All contract source files compile under current TypeScript config.
- [x] All intended endpoint contract files are exported and documented.
- [x] No generated `*.contract.js` files remain in `contracts/api/`.
- [x] Tests pass
- [x] Code reviewed

---

## Implementation Notes

- Source audit: `dev_communication/shared/architecture/suggestions/2026-02-13_api_contract-runtime-alignment-audit.md`
- Direction set by request: ideal endpoint/type structure first time, no compatibility layer.

---

## Completion

**Completed Date:** 2026-02-13
**Commits:**
| Hash | Description |
|------|-------------|
| pending | P1 contract structure normalization + tooling strictness |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

### Validation Evidence

- `npm run contracts:validate` (pass; 0 errors)
- `npm run contracts:export` (pass; exported 53, failed 0, skipped 0)
- `npm run contracts:docs` (pass; failed 0, skipped 0)
- `npm run type-check` (pass; `tsc --noEmit`)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
