# Product Direction: Prefer Multi-Question Grading for Canonical Assessment Attempts

**Date:** 2026-02-13
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-156, API-ISS-053

---

## Request

Product owner direction: canonical assessment grading should support **multi-question grading in a single request**.

## Context

Current canonical grading route (`POST /api/v2/assessment-attempts/:attemptId/grade`) supports single-question grading only (`questionIndex`, `score`, `feedback`).

UI grading flows and expected staff UX are optimized for grading an entire submission at once:
- submit all question grades together
- include attempt-level `overallFeedback`
- support learner notification behavior

This should remain consistent with canonical learning-unit architecture:
- attempt lifecycle is keyed by `assessmentId`
- for course-player launched assessments, `assessmentId` is sourced from `learningUnit.contentId`
- `learningUnitId` is contextual provenance and should remain traceable in attempt records/responses

## Product Direction

1. Prioritize canonical batch grading support over single-question-only semantics.
2. Provide a canonical payload that accepts `questionGrades[]` in one request.
3. Include attempt-level feedback/notification semantics needed by staff workflows.
4. Ensure batch grading semantics are compatible with learning-unit sourced attempts (course context should be preserved through canonical attempt data).
5. Treat this as the preferred product behavior for grading parity and operational efficiency.

## Proposed Canonical Shape (for alignment)

```json
{
  "questionGrades": [
    { "questionId": "...", "scoreEarned": 2, "feedback": "..." }
  ],
  "overallFeedback": "...",
  "notifyLearner": true
}
```

## LearningUnit Alignment Notes

1. Keep canonical attempt identity model (`assessmentId` authoritative, `learningUnitId` contextual).
2. Batch grading endpoint may remain attemptId-based, but response should preserve enough context for UI routing/analytics where attempts originated from learning units.
3. Do not require UI to reconstruct learning-unit context through extra round-trips when grading attempts launched from course learning units.

## Timeline

- **Needed by:** ASAP
- **Blocking:** Full completion of `UI-ISS-156` staff grading parity on canonical routes

---

## Response Section (For Recipient)

**Status:** In Progress
**Response Date:** 2026-02-13

Accepted direction: canonical grading will prioritize multi-question batch grading support.

Implementation has started under `API-ISS-053`.
To finalize runtime semantics cleanly, API sent focused behavior questions to UI:
- `dev_communication/frontend/inbox/2026-02-13_assessment-attempt-batch-grading-implementation-questions.md`

Unblocked work is proceeding in parallel:
- aggregate attempt course context enrichment for staff analytics grouping

Progress update:
- aggregate rows now include `courseId`, `courseCode`, `courseName`, `courseVersionId`
- contract docs + unit/integration coverage updated for aggregate context
- canonical batch grading endpoint implemented at `POST /api/v2/assessment-attempts/:attemptId/grade`
  - atomic batch validation
  - completion-gated learner notification
  - attempt remains `submitted` until grading is complete

Still pending:
- projected grading detail for `short_answer` / `long_answer`
- learner visibility timing for `overallFeedback` during grading-in-progress

---

*Move to `archive/` when thread is complete*
