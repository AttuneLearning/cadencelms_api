# API-ISS-050: Contract Runtime Alignment P2 (Parity Automation + Legacy Surface Removal)

## Status: COMPLETE
## Priority: Medium
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Internal
## Assigned To: Codex
## Related: dev_communication/shared/architecture/suggestions/2026-02-13_api_contract-runtime-alignment-audit.md, API-ISS-048, API-ISS-049

---

## Overview

Execute P2 stabilization work to prevent contract drift recurrence: add automated route-contract parity checks, align model/contract enum boundaries, and remove legacy/overlapping API surfaces that conflict with canonical contracts.

---

## Requirements

1. Add automated parity test: every endpoint contract must map to a mounted runtime route.
2. Align domain enums/constraints where contracts diverge from runtime models/controllers (starting with media domain).
3. Remove overlapping legacy endpoints/contracts and keep only canonical structures.

---

## Technical Specification

### Candidate Drift Domains

| Domain | Drift |
|--------|------|
| Media | Contract provider/purpose enums differ from model/controller/storage config |
| Attempts | `exam-attempts` legacy surface overlaps canonical `assessment-attempts` flow |
| Content media surfaces | `/api/v2/content/media` and `/api/v2/media` overlap |

### Parity Automation

- Build route-introspection test utility.
- Parse contract endpoints from `contracts/api/*`.
- Normalize path params (`:id`) and method matching.
- Fail on any unmapped endpoint contract (except explicitly internal-only contracts).

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `tests/contract/*` | Create | Contract-route parity tests |
| `scripts/*` | Create/Modify | Route map extraction helpers |
| `contracts/api/*` | Modify/Delete | Remove legacy contract surfaces and keep canonical endpoints |
| `src/routes/*` | Modify/Delete | Remove overlapping legacy endpoints |
| `contracts/types/media-types.ts` | Modify | Align enum surface to runtime decision |
| `src/models/content/MediaAttachment.model.ts` | Verify/Modify | Keep model and contract enum source aligned |

### Approach

- Land parity automation first, then use failures to drive targeted cleanups.
- Remove legacy/duplicate surfaces directly; do not maintain compatibility shims.

---

## Tests Required

1. [x] Contract-route parity test passes for all canonical endpoint contracts.
2. [x] Media contract/model/controller enum compatibility tests pass.
3. [x] Regression tests pass after removal of overlapping legacy attempt/media surfaces.

---

## Acceptance Criteria

- [x] Automated parity check exists and runs in CI.
- [x] Overlapping legacy endpoint/contract surfaces are removed.
- [x] Critical enum mismatches are resolved.
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
| 0eb43b3 | Contract/runtime parity automation + legacy surface cleanup |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
