# Assessment Attempt Canonical Staff Grading + Analytics Clarifications

**Date:** 2026-02-13
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-156

---

## Request

We are migrating the remaining staff grading/analytics runtime off `/api/v2/exam-attempts/*` to canonical `/api/v2/assessment-attempts*` routes.

## Context

`UI-ISS-156` is in progress. We can migrate list/detail route usage now, but two contract points are currently ambiguous for preserving current UI behavior:
- grading submit currently sends a batch payload (`questionGrades[]`, `overallFeedback`, `notifyLearner`) from GradingDetail
- analytics metrics currently aggregate by `courseId` and `courseName`

## Requirements

1. Confirm canonical grading payload expectations for `POST /api/v2/assessment-attempts/:attemptId/grade`.
2. Confirm canonical support for overall attempt-level feedback and learner notification in grading flows.
3. Confirm whether aggregate attempt list can provide course context for analytics grouping.

## Questions

1. Does `POST /api/v2/assessment-attempts/:attemptId/grade` support the existing batch payload shape below, or only single-question grading (`questionIndex`, `score`, `feedback`) per request?

```json
{
  "questionGrades": [{ "questionId": "...", "scoreEarned": 2, "feedback": "..." }],
  "overallFeedback": "...",
  "notifyLearner": true
}
```

2. If only single-question grading is supported, what is the canonical endpoint/workflow for setting overall feedback and triggering learner notification after grading?

3. For `GET /api/v2/assessment-attempts`, can response rows include `courseId` / `courseName` (or equivalent course linkage) so staff analytics can continue course-level rollups without additional N+1 API requests?

## Timeline

- **Needed by:** ASAP
- **Blocking:** Finalizing UI-ISS-156 grading and analytics migration

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Current canonical runtime answers:

1. `POST /api/v2/assessment-attempts/:attemptId/grade` currently supports only single-question grading payload:
   - `questionIndex`
   - `score`
   - `feedback`
   It does not currently accept `questionGrades[]` batch payload.

2. There is currently no canonical endpoint/workflow implemented for attempt-level `overallFeedback` or `notifyLearner` on assessment-attempt grading.

3. `GET /api/v2/assessment-attempts` currently does not include `courseId` / `courseName` fields in response rows.

Follow-up created for requested enhancement scope:
- `API-ISS-053_assessment-attempt-batch-grading-and-course-analytics-context.md`

---

*Move to `archive/` when thread is complete*
