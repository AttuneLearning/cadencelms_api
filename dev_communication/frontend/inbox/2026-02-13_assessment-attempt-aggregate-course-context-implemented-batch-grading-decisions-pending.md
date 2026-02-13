# Assessment Attempt Aggregate Course Context - Implemented, Batch Grading Pending Decisions

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-053 (in progress), UI-ISS-156

---

## Status

In Progress

## Summary

Canonical aggregate assessment-attempt rows now include course-level context fields needed for analytics grouping. Batch grading payload semantics are still pending final product decisions.

---

## Implemented Now

`GET /api/v2/assessment-attempts` rows now include:
- `courseId`
- `courseCode`
- `courseName`
- `courseVersionId`

This is resolved from canonical module-to-course version linkage for attempts with module context.

## Verification

- Unit tests: `tests/unit/services/assessment-attempts.service.test.ts` (`listAttemptSummaries` coverage)
- Unit tests: `tests/unit/controllers/assessment-attempts.aggregate.controller.test.ts`
- Integration tests: `tests/integration/assessment-attempts/assessment-attempts.test.ts` (34/34)

All executed with a 30-second timeout gate.

## Pending / Blocked

Batch grading final runtime shape for `POST /api/v2/assessment-attempts/:attemptId/grade` is waiting on final product decisions (atomicity, keying model, grading completion semantics, feedback behavior, notify timing).

