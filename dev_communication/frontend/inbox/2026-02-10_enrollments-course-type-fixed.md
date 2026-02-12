```markdown
# Fix: GET /enrollments Now Returns Course-Type Enrollments

**Date:** 2026-02-10
**From:** API Team
**To:** UI Team
**Priority:** Critical
**In-Response-To:** 2026-02-10_enrollments-list-missing-course-type.md

---

## Summary

All three bugs fixed. Course enrollments are now returned correctly with full enrichment data.

## Root Causes Found & Fixed

### Bug 1: Course enrollments silently dropped during enrichment

The `enrichEnrollment()` method used the **legacy `Course` model** to look up the course by `enrollment.metadata.courseId`. But since the seed migration, all courses are stored as `CanonicalCourse` documents — so `Course.findById()` returned `null`, the enrichment returned `null`, and the enrollment was filtered out of results.

**Fix:** `enrichEnrollment()` now resolves course data via `CanonicalCourse` + `CourseVersion` (with a fallback to legacy `Course` for backward compatibility). The title comes from the published `CourseVersion`, the code from `CanonicalCourse`.

### Bug 2: Program query double-counted course enrollments

When no `type` filter was specified, the program query (`Enrollment.find({})`) fetched **all** `Enrollment` documents — including course-type ones (which have `metadata.enrollmentType: 'course'`). These got tagged as `type: 'program'`, failed enrichment (no matching `Program` record), and returned `null`. Meanwhile the course query also fetched them correctly. This inflated `pagination.total` and caused the mismatch.

**Fix:** The program query now excludes course-type enrollments:
```javascript
{
  $or: [
    { 'metadata.enrollmentType': { $exists: false } },
    { 'metadata.enrollmentType': { $ne: 'course' } }
  ]
}
```

### Bug 3: `type` query parameter now works correctly

The `type` filter was already wired up in the service logic but the program query overlap made it appear broken. With Bug 2 fixed, `?type=course` correctly returns only course enrollments, `?type=program` returns only program enrollments, etc.

## Response Shape

Course enrollments now return the standard shape:
```json
{
  "id": "...",
  "type": "course",
  "target": {
    "id": "<CanonicalCourse ID>",
    "name": "EMDR Introduction",
    "code": "EMDR101",
    "type": "course"
  },
  "status": "active",
  "enrolledAt": "2026-02-10T...",
  "progress": { "percentage": 0, "completedItems": 0, "totalItems": 0 },
  "grade": { "score": null, "letter": null, "passed": null },
  "department": { "id": "...", "name": "EMDR Department" }
}
```

## Casey Learner Expected Response

`GET /api/v2/enrollments?limit=50` as casey.learner should now return **5 enrollments**:

| # | Type | Target | Code |
|---|------|--------|------|
| 1 | program | EMDR Continuing Education | EMDR-CE |
| 2 | course | EMDR Introduction | EMDR101 |
| 3 | course | EMDR Practicum | EMDR201 |
| 4 | course | CBT Foundations | CBT101 |
| 5 | course | Cognitive Assessment | COG101 |

`pagination.total` will be **5** (matching the actual returned count).

Note: Casey also has 4 class enrollments. If you need all types, don't pass `?type=` and all 9 will be returned (1 program + 4 course + 4 class).

## Files Changed

- `src/services/enrollment/enrollments.service.ts` — Fixed program query exclusion, switched course enrichment to CanonicalCourse + CourseVersion
- `tests/unit/services/enrollments.service.test.ts` — Added 3 new tests (course type filter, CanonicalCourse enrichment, program query exclusion)

## Verification

- `npx tsc --noEmit` — 0 errors
- 70 unit tests passing (67 existing + 3 new)

## No Action Required

No reseed needed. This is a service-layer fix only — existing enrollment data in MongoDB is unchanged.
```
