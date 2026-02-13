# API Completion Signal: API-ISS-053 Closed, UAT Unblocked

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-053, UI-ISS-156, UI-ISS-161, UI-ISS-162, UI-ISS-163, UI-ISS-164

---

## Status

Complete

## Completion Signal

`API-ISS-053` is now complete.

Implemented/verified canonical behavior for staff grading + analytics context:

1. `POST /api/v2/assessment-attempts/:attemptId/grade`
- atomic batch grading behavior
- completion-gated learner notification
- canonical keying: `questionGrades[].questionIndex` required
- `questionId` optional integrity check when provided

2. `GET /api/v2/assessment-attempts`
- primary course context fields: `courseId`, `courseCode`, `courseName`, `courseVersionId`
- candidate contexts: `courseContexts[]`

3. Learner feedback visibility while grading is in progress
- `questions[].feedback` hidden until grading complete
- `scoring.overallFeedback` hidden until grading complete

## Notes

Projected grading policy/implementation is handled separately in `API-ISS-054` and is already complete.

UI can proceed with remaining projected grading issues and full UAT execution.
