# API-ISS-054: Projected Grading - Short Answer Fuzzy + Long Answer Heuristics

## Status: COMPLETE
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Product Owner
## Assigned To: Codex
## Related: API-ISS-053, UI-ISS-156, dev_communication/backend/inbox/2026-02-13_product-direction-multi-question-grading-preferred.md

---

## Overview

Implement practical projected-grading support in canonical assessment attempts without LLM dependency:

- **Phase 1:** Short-answer fuzzy projection with instructor verification workflow.
- **Phase 2:** Long-answer heuristic projection (keyword/reference closeness) with instructor verification workflow.

---

## Requirements

1. Add projected grading metadata to attempt question records for non-final AI/rule-based grading suggestions.
2. Implement short-answer fuzzy threshold evaluation with a near-threshold review path.
3. Implement long-answer heuristic projection based on answer/reference similarity and keyword coverage.
4. Keep final grading authority with instructor; attempt only becomes `graded` when all required instructor reviews are complete.
5. Keep learner feedback hidden until grading completion (already aligned in API-ISS-053 follow-up).
6. Update contracts and tests for projected grading fields and behavior.

---

## Technical Specification

### Endpoint Surfaces (Canonical)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/assessment-attempts/:attemptId/grade` | Instructor approval/override of projected grades (batch, atomic) |
| GET | `/api/v2/assessments/:assessmentId/attempts/:attemptId` | Learner attempt results with feedback gated until grading complete |
| GET | `/api/v2/assessment-attempts/:attemptId` | Staff detail including projected grading context |

### Phase 1 (Short Answer Fuzzy)

- Use configured threshold (`matchThreshold`/`shortAnswerData.matchThreshold`) where available.
- If similarity >= threshold: auto-grade final.
- If similarity is in near-threshold review band: create **projected correct** outcome requiring instructor verification.

### Phase 2 (Long Answer Heuristics)

- Use non-LLM heuristic signals:
  - reference text similarity (model/sample answer)
  - keyword coverage from expected answer/rubric
- Store projected score/correctness/confidence and mark question for instructor verification.
- Do not finalize long-answer grade without instructor approval.

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/progress/AssessmentAttempt.model.ts` | Modify | Add projected grading metadata fields |
| `src/services/progress/assessment-attempts.service.ts` | Modify | Short-answer fuzzy + long-answer heuristic projection logic |
| `contracts/api/assessment-attempts.contract.ts` | Modify | Projected grading fields/notes and review semantics |
| `tests/unit/services/assessment-attempts.service.test.ts` | Modify | Unit coverage for both phases |
| `tests/integration/assessment-attempts/assessment-attempts.test.ts` | Modify | Integration coverage for projection + instructor approval flow |

### Approach

Implement contract-first projected fields and runtime persistence, then phase-specific heuristics in service logic, then validate with unit + integration tests using 30s timeout.

---

## Tests Required

1. [x] Short-answer near-threshold response is projected and flagged for instructor verification.
2. [x] Long-answer heuristic projection stores confidence + projected result.
3. [x] Instructor grading/approval finalizes projected questions and updates attempt status correctly.
4. [x] Feedback remains hidden to learners until grading complete.
5. [x] Full assessment-attempt integration suite passes.

---

## Acceptance Criteria

- [x] Phase 1 implemented and contract-documented.
- [x] Phase 2 implemented and contract-documented.
- [x] Instructor verification remains authoritative for projected grades.
- [x] Contracts/tests updated and passing.

---

## Completion

**Completed Date:** 2026-02-13
**Commits:**
| Hash | Description |
|------|-------------|
| pending | Projected grading phases 1+2 implementation, contracts, tests, and frontend decision handoff |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
