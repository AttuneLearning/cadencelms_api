# API-ISS-053: Assessment Attempt Batch Grading + Course Analytics Context

## Status: IN PROGRESS
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: UI Team
## Assigned To: Codex
## Related: dev_communication/backend/inbox/2026-02-13_product-direction-multi-question-grading-preferred.md, dev_communication/frontend/inbox/2026-02-13_assessment-attempt-batch-grading-implementation-questions.md, UI-ISS-156

---

## Overview

Add canonical support for staff grading batch workflows and course-level context in aggregate attempt rows so UI can complete migration off legacy exam-attempt surfaces.

---

## Requirements

1. Define canonical payload/workflow for batch grading on assessment attempts.
2. Define canonical support for attempt-level feedback and learner-notification behavior.
3. Extend aggregate attempt list payload with course linkage fields (or equivalent canonical grouping keys).
4. Update contracts and tests for final canonical behavior.

---

## Technical Specification

### Candidate Endpoint Extensions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/assessment-attempts/:attemptId/grade` | Batch grading request with per-question grades |
| GET | `/api/v2/assessment-attempts` | Aggregate rows include canonical course context for analytics grouping |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/controllers/progress/assessment-attempts.controller.ts` | Modify | Handle batch grade payload semantics |
| `src/services/progress/assessment-attempts.service.ts` | Modify | Batch grade processing and aggregate course linkage enrichment |
| `src/models/progress/AssessmentAttempt.model.ts` | Modify | Persist attempt-level grading metadata if required |
| `contracts/api/assessment-attempts.contract.ts` | Modify | Canonical grading payload and aggregate row field documentation |
| `tests/unit/...` / `tests/integration/...` | Add/Modify | Coverage for batch grading and aggregate course context |

### Approach

Implement ideal canonical grading + analytics structure directly (no legacy endpoint fallback), then update UI comms and contract docs.

---

## Tests Required

1. [x] Batch grade payload accepted and applied across graded questions.
2. [x] Attempt-level feedback behavior is persisted/documented.
3. [x] Aggregate attempt rows expose canonical course context fields.
4. [x] Contract validation and parity tests pass.

## Progress Notes

- 2026-02-13: Implemented aggregate course analytics context in `GET /api/v2/assessment-attempts` response rows:
  - `courseId`
  - `courseCode`
  - `courseName`
  - `courseVersionId`
- 2026-02-13: Updated canonical contract docs for aggregate attempt rows in `contracts/api/assessment-attempts.contract.ts`.
- 2026-02-13: Added unit coverage for `listAttemptSummaries()` course-context behavior and re-ran aggregate controller unit tests.
- 2026-02-13: Implemented canonical batch grading on `POST /api/v2/assessment-attempts/:attemptId/grade`:
  - atomic validation/apply behavior
  - `questionGrades[]` keyed by `questionIndex` (with optional `questionId` integrity check)
  - replace-on-write `overallFeedback`
  - deferred `notifyLearner` until grading completes
  - grading completion transitions to `graded` only when all question grades are finalized
- 2026-02-13: Enforced learner feedback visibility policy:
  - while `scoring.gradingComplete=false`, learner result payload suppresses `questions[].feedback` and `scoring.overallFeedback`
  - feedback becomes visible when grading is complete
- 2026-02-13: Added/updated tests for canonical batch grading:
  - `tests/unit/services/assessment-attempts.service.test.ts` (`gradeAttemptBatch`)
  - `tests/unit/controllers/assessment-attempts.aggregate.controller.test.ts`
  - `tests/integration/assessment-attempts/assessment-attempts.test.ts` (manual flow + canonical batch route)
- 2026-02-13: Full assessment-attempt integration regression run with 30s timeout:
  - `tests/integration/assessment-attempts/assessment-attempts.test.ts` passed (36/36).
- 2026-02-13: Remaining product clarification pending:
  - projected grading policy details for `short_answer`/`long_answer` (including threshold/projection source)

---

## Acceptance Criteria

- [ ] Canonical grading workflow documented and implemented for staff migration use.
- [ ] Canonical aggregate rows support course-level analytics grouping without N+1 calls.
- [ ] Contracts/tests updated and passing.

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
