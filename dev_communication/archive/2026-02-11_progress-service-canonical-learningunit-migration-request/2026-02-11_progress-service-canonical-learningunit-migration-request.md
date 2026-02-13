# Progress Service CanonicalCourse + LearningUnit Migration Request

**Date:** 2026-02-11
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-146

---

## Request

Please migrate the progress service from legacy `Course` + `CourseContent` paths to `CanonicalCourse + CourseVersion + LearningUnit/LearningUnitQuestion`.

## Context

The progress endpoints are active and currently depend on legacy content mapping:

- `src/services/analytics/progress.service.ts:184`
- `src/services/analytics/progress.service.ts:400`
- `src/services/analytics/progress.service.ts:646`
- `src/services/analytics/progress.service.ts:907`
- `src/services/analytics/progress.service.ts:1091`
- `src/services/analytics/progress.service.ts:1231`

These methods back `/api/v2/progress/*` endpoints currently used in learner and staff flows.

## Requirements

1. Replace runtime `CourseContent` lookups with canonical/versioned course -> module -> learning unit mapping.
2. Ensure `courseId` semantics are canonical course IDs across progress endpoints.
3. Preserve endpoint behavior and authorization while migrating internals.
4. Publish updated response contract notes for module progress fields (IDs and titles).
5. Add regression coverage for all progress endpoints.

## Proposed Approach (Optional)

Resolve canonical course and active version, then derive module/learning unit sets via `CourseVersionModule` + `LearningUnit`; map attempts/results against learning-unit-linked content and questions.

## Questions

1. What identifier will be authoritative for module rows in responses (`moduleId`, `learningUnitId`, both)?
2. Will any response fields be deprecated immediately or via staged rollout?

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI-ISS-146 full completion and removal of legacy response adapters

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Implemented in `API-ISS-045` (`dev_communication/backend/issues/completed/API-ISS-045_progress-service-canonical-learningunit-migration.md`). Progress service runtime now follows canonical course + learning-unit structures.

---

*Move to `archive/` when thread is complete*
