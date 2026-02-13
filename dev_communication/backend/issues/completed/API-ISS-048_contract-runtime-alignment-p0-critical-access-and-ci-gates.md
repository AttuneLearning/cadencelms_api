# API-ISS-048: Contract Runtime Alignment P0 (Critical Access + CI Gates)

## Status: COMPLETE
## Priority: Critical
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Internal
## Assigned To: API Team
## Related: dev_communication/shared/architecture/suggestions/2026-02-13_api_contract-runtime-alignment-audit.md, API-ISS-047

---

## Overview

Execute P0 actions from the contract-runtime alignment audit to remove immediate production and delivery risk: mount missing assessment CRUD routes, enforce one canonical auth endpoint structure, and gate CI strictly on contract health.

---

## Requirements

1. Mount assessments CRUD routes so `/api/v2/assessments` endpoints are reachable.
2. Define canonical auth endpoint set and align routes + contracts in one pass with no legacy alias routes.
3. Fail CI on any contract compile/export/docs generation failure (no partial-success acceptance).

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v2/assessments` | Assessment list/create (currently unmounted) |
| GET/PUT/DELETE | `/api/v2/assessments/:assessmentId` | Assessment detail/update/delete |
| POST | `/api/v2/assessments/:assessmentId/publish` | Publish assessment |
| POST | `/api/v2/assessments/:assessmentId/archive` | Archive assessment |
| POST/PUT | `/api/v2/auth/*` | Canonical auth paths after reconciliation |

### Contract Quality Gate

Required pipeline checks:
- `npm run contracts:validate`
- `npm run contracts:export`
- `npm run contracts:docs`

Any error output must fail CI.

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/app.ts` | Modify | Mount `assessmentsRoutes` under `/api/v2/assessments` |
| `src/routes/auth.routes.ts` | Modify | Align route paths/methods to canonical contract decision |
| `contracts/api/auth.contract.ts` | Modify | Sync with canonical runtime |
| `contracts/api/auth-v2.contract.ts` | Modify | Sync with canonical runtime |
| `.github/workflows/*` (or project CI config) | Modify | Add strict contract gates |
| `package.json` | Verify/Modify | Ensure scripts used in CI are stable |

### Approach

- Land route-mount + auth-alignment in same PR to prevent mixed API behavior.
- Make contract tooling deterministic; eliminate "generated with failures" behavior from release flow.
- Do not keep backward-compatible auth route variants.

---

## Tests Required

1. [x] Integration tests for `/api/v2/assessments` CRUD and publish/archive routes.
2. [x] Auth endpoint contract-vs-runtime test coverage for reconciled paths.
3. [x] CI check proving contract scripts hard-fail on invalid contracts.

---

## Acceptance Criteria

- [x] Assessment CRUD endpoints are mounted and reachable.
- [x] Auth contracts and runtime paths are synchronized.
- [x] CI fails on contract validation/export/docs errors.
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
| 13971c5 | P0 route mount/access-context fix, auth contract alignment, strict contract export/docs gating, CI workflow, and assessments integration coverage |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
