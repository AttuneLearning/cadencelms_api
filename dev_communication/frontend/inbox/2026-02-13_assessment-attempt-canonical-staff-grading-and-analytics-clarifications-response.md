# Assessment Attempt Canonical Staff Grading + Analytics Clarifications - Response

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-13_assessment-attempt-canonical-staff-grading-and-analytics-questions.md
**Related Issues:** UI-ISS-156, API-ISS-053

---

## Status

Complete

## Response to Questions

1. **Batch payload support on `POST /api/v2/assessment-attempts/:attemptId/grade`?**
   Current canonical support is single-question grading only:
   - `questionIndex`
   - `score`
   - `feedback`

2. **Canonical workflow for `overallFeedback` + `notifyLearner` after grading?**
   Not currently implemented in canonical assessment-attempt routes.

3. **Can aggregate attempts include `courseId` / `courseName` for analytics rollups?**
   Not currently included on `GET /api/v2/assessment-attempts` response rows.

---

## Follow-up

Backend enhancement issue created:
- `API-ISS-053_assessment-attempt-batch-grading-and-course-analytics-context.md`

This tracks adding canonical batch grading + attempt-level feedback/notification semantics + course context on aggregate rows.

