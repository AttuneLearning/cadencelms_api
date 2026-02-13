# API-ISS-053: Assessment Attempt Batch Grading + Course Analytics Context

## Status: PENDING
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: UI Team
## Assigned To: Codex
## Related: dev_communication/backend/inbox/2026-02-13_assessment-attempt-canonical-staff-grading-and-analytics-questions.md, UI-ISS-156

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

1. [ ] Batch grade payload accepted and applied across graded questions.
2. [ ] Attempt-level feedback behavior is persisted/documented.
3. [ ] Aggregate attempt rows expose canonical course context fields.
4. [ ] Contract validation and parity tests pass.

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
