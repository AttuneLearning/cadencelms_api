# API-ISS-047: Assessment Attempt Contract Runtime Alignment (assessmentId Canonical)

## Status: COMPLETE
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Internal
## Assigned To: API Team
## Related: contracts/api/assessment-attempts.contract.ts, contracts/api/assessments.contract.ts, contracts/api/learning-units.contract.ts

---

## Overview

Contracts were updated to establish `assessmentId` as the authoritative attempt identifier and `learningUnitId` as optional launch provenance. Runtime API/controller/validator behavior now needs to be aligned to these contracts and explicitly enforce learning-unit-to-assessment mapping.

---

## Requirements

1. Ensure assessment-attempt lifecycle endpoints match contract paths and payloads.
2. Enforce validation rule: when `learningUnitId` is provided, `LearningUnit.contentId` must equal path `assessmentId`.
3. Keep `assessmentId` authoritative in persistence/query paths; treat `learningUnitId` as context only.
4. Align request validation for `start` and `save` payloads to contract (`enrollmentId`, `responses[].questionId`, etc.).
5. Add regression tests covering mismatch/rejection and happy-path LU launch.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/assessments/:assessmentId/attempts/start` | Start attempt (`assessmentId` authoritative) |
| PUT | `/api/v2/assessments/:assessmentId/attempts/:attemptId/save` | Save progress by `questionId` |
| POST | `/api/v2/assessments/:assessmentId/attempts/:attemptId/submit` | Submit attempt |
| POST | `/api/v2/assessments/:assessmentId/attempts/:attemptId/grade` | Manual grading |
| GET | `/api/v2/assessments/:assessmentId/attempts` | List attempts |
| GET | `/api/v2/assessments/:assessmentId/attempts/my` | Current user attempts |
| GET | `/api/v2/assessments/:assessmentId/attempts/:attemptId` | Attempt details/results |

### Request Rule (critical)

```json
{
  "path.assessmentId": "required ObjectId",
  "body.learningUnitId": "optional ObjectId",
  "rule": "if learningUnitId exists -> LearningUnit.contentId must equal assessmentId"
}
```

### Error Contract Additions

- `400 LEARNING_UNIT_ASSESSMENT_MISMATCH`
- `404 LEARNING_UNIT_NOT_FOUND`

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/controllers/progress/assessment-attempts.controller.ts` | Modify | Ensure payload/endpoint behavior matches contract |
| `src/services/progress/assessment-attempts.service.ts` | Modify | Add LU->assessment validation rule |
| `src/validators/assessment-attempt.validator.ts` | Modify | Validate `enrollmentId` and payload shapes per contract |
| `src/routes/v2/assessment-attempts.routes.ts` | Verify/Modify | Confirm route set fully matches contract |
| `tests/integration/assessment-attempts/assessment-attempts.test.ts` | Modify/Add | Contract and mismatch-path coverage |

### Approach

- Add service-level resolver/guard for `learningUnitId` lookup and `contentId` equality.
- Keep DB schema as-is (`assessmentId` required, `learningUnitId` optional).
- Standardize validation and error payloads.

---

## Tests Required

1. [x] Start attempt succeeds with `assessmentId` only.
2. [x] Start attempt succeeds with matching `learningUnitId` and `assessmentId`.
3. [x] Start attempt fails with `LEARNING_UNIT_ASSESSMENT_MISMATCH` when IDs do not map.
4. [x] Start attempt fails with `LEARNING_UNIT_NOT_FOUND` for invalid LU.
5. [x] Save/submit payloads accept `responses[].questionId` as contract shape.

---

## Acceptance Criteria

- [x] Runtime endpoints and request/response behavior match updated contracts.
- [x] `learningUnitId` mapping validation is enforced server-side.
- [x] Integration tests cover mismatch and success paths.
- [x] No new regressions in existing assessment-attempt tests.
- [x] Code reviewed.

---

## Questions / Clarifications

1. **Should `/api/v2/exam-attempts` be removed immediately or kept temporarily as deprecated?**
   Product direction set to no compatibility window for new development; legacy surface removal remains tracked in follow-up work.

---

## Implementation Notes

- Contract source files updated on 2026-02-13:
  - `contracts/api/assessment-attempts.contract.ts`
  - `contracts/api/assessments.contract.ts`
  - `contracts/api/learning-units.contract.ts`
  - `contracts/api/modules.contract.ts`
  - `contracts/api/courses.contract.ts`
  - `contracts/api/exam-attempts.contract.ts`

---

## Completion

**Completed Date:** 2026-02-13
**Commits:**
| Hash | Description |
|------|-------------|
| pending | Runtime/validator/test/contract alignment for canonical assessment-attempt flow |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

## Progress Notes

- 2026-02-13: Updated `validateStartAttempt` to require `enrollmentId` as ObjectId (422 on invalid/missing payload).
- 2026-02-13: Added `learningUnitId` runtime guard in `AssessmentAttemptsService.startAttempt`:
  - 404 + `LEARNING_UNIT_NOT_FOUND` when learning unit does not exist.
  - 400 + `LEARNING_UNIT_ASSESSMENT_MISMATCH` when `learningUnit.contentId !== assessmentId`.
  - Auto-derives `moduleId` from `learningUnit.moduleId` when omitted.
- 2026-02-13: Added integration coverage for LU mapping happy path and mismatch/not-found error contracts; updated missing-enrollment expectation to 422.
- 2026-02-13: Synced `contracts/api/assessment-attempts.contract.ts` error/status docs to current runtime behavior (409 conflict paths + 422 validation paths + LU error codes).
- 2026-02-13: Regression gate run in local environment: `tests/integration/assessment-attempts/assessment-attempts.test.ts` passed (34/34); typecheck passed (`tsc --noEmit`).

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
