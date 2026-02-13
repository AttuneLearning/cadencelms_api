# Assessment Projected Grading (Phase 1 + Phase 2) Decision

**Date:** 2026-02-13  
**Owner:** API Team  
**Audience:** Frontend, Product, API

---

## Decision Summary

Implement projected grading now without compatibility layers and without LLM dependency.

1. **Phase 1 (Short Answer):** fuzzy matching with threshold and near-threshold projection review.
2. **Phase 2 (Long Answer):** heuristic projection using reference similarity + keyword coverage.
3. **Instructor is final authority:** projected results are advisory until instructor approves/overrides.
4. **Learner feedback gating:** no per-question feedback or overall feedback shown until grading completes.

---

## Canonical Endpoints

1. `POST /api/v2/assessment-attempts/:attemptId/grade`
- Canonical staff grading endpoint.
- Used for manual grading and projected-grade approval/override.
- Atomic across submitted `questionGrades[]`.

2. `GET /api/v2/assessment-attempts/:attemptId`
- Staff detail endpoint.
- Returns projected fields for instructor review workflows.

3. `GET /api/v2/assessments/:assessmentId/attempts/:attemptId`
- Learner result endpoint.
- Hides feedback fields until `scoring.gradingComplete=true`.

---

## Data Model Additions (Per Question)

Projected grading metadata is stored on attempt question records:

- `projectedScore?: number`
- `projectedCorrect?: boolean`
- `projectedConfidence?: number` (0..1)
- `projectedMethod?: string`
- `projectedReason?: string`
- `requiresInstructorReview?: boolean`
- `projectedAt?: Date`
- `reviewedAt?: Date`

Final grading fields (`pointsEarned`, `isCorrect`, `gradedAt`, `gradedBy`) remain canonical outcome values.

---

## Phase Behavior

### Phase 1: Short Answer Fuzzy

1. Normalize learner response + accepted answers.
2. Compute best fuzzy similarity.
3. Resolve result:
- Similarity >= threshold: auto-final correct.
- Similarity within near-threshold review band: projected-correct + instructor review required.
- Otherwise: auto-final incorrect.

### Phase 2: Long Answer Heuristic

1. Build reference corpus from model/sample/rubric content.
2. Compute similarity + keyword coverage.
3. Produce projected score/correctness/confidence.
4. Always require instructor review before final grading.

---

## Completion Rules

1. If all questions are fully auto-finalized, attempt can complete without instructor action.
2. If any question has `requiresInstructorReview=true`, attempt remains `submitted` until instructor grading resolves all pending items.
3. `notifyLearner` fires when grading is complete (or is deferred until completion).

---

## Frontend Implementation Direction

Create/track concurrent UI issues for:

1. Staff projected-grading review UI per question (confidence/method/reason + approve/override).
2. Staff attempt indicators for pending instructor review.
3. Learner result surface that honors feedback gating until grading completion.

---

## Future Extension

LLM-assisted evaluation can be added as a later method under `projectedMethod` while keeping the same approval and finalization workflow.
