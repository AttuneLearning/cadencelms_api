# Assessment Attempt Batch Grading - Contract Update (Product Direction Applied)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-053 (in progress), UI-ISS-156

---

## Status

In Progress

## Summary

Canonical batch grading is implemented on `POST /api/v2/assessment-attempts/:attemptId/grade` with atomic semantics and completion-gated notification.

## Runtime Shape (Current)

Request:

```json
{
  "questionGrades": [
    { "questionIndex": 0, "scoreEarned": 2, "feedback": "...", "questionId": "optional" }
  ],
  "overallFeedback": "...",
  "notifyLearner": true
}
```

Notes:
- `questionIndex` is the required key.
- `questionId` is optional and used only as an integrity check when provided.
- Request is atomic: any invalid grade fails the full call.

Response includes:
- `attemptId`
- `status`
- `learningUnitId` (when available)
- `scoring`
- `notification` (`requested`, `deferred`, `notifiedAt`)
- `questionGrades[]` (with `questionId`, `questionIndex`, `scoreEarned`, `pointsPossible`, `feedback`, `gradedAt`, `gradedBy`, optional `learningUnitQuestionId`)

## Grading/Notification Semantics

- Attempt remains `submitted` until all pending question grades are finalized.
- Attempt transitions to `graded` only when grading is complete.
- `notifyLearner=true` is deferred until attempt reaches complete grading state.
- Learner result payload suppresses feedback while grading is in progress:
  - `questions[].feedback` hidden until completion
  - `scoring.overallFeedback` hidden until completion

## Aggregate Context

`GET /api/v2/assessment-attempts` now includes:
- primary: `courseId`, `courseCode`, `courseName`, `courseVersionId`
- candidates: `courseContexts[]`

## Pending Clarifications (Product)

- projected grading behavior details for `short_answer` / `long_answer`
- learner-facing visibility timing of `overallFeedback` while grading is in progress
