# Publish Course - Status Inconsistency

**From:** UI Team
**To:** API Team
**Date:** 2026-02-05
**Priority:** Medium
**Type:** Follow-up Bug Report

---

## Issue

Attempting to publish a draft course returns `400 "Cannot publish archived course"` even though the course list endpoint returns the course with `status: "draft"`.

## Context

This is a follow-up to the model mismatch issue you fixed earlier. The 404 error is resolved - the endpoint now correctly finds courses by CanonicalCourse ID. Thank you for the quick fix!

However, we're now seeing a status inconsistency.

---

## Evidence from UAT Test

### List Endpoint Response
```json
GET /api/v2/courses?department=697c18c13e9e6d1cc22e0784
Response: 200
{
  "courses": [{
    "id": "6984fecdeeabb01d52f99897",
    "title": "Riley Course 1",
    "code": "RILEY1",
    "status": "draft",  // Shows as draft
    ...
  }]
}
```

### Publish Endpoint Response
```json
POST /api/v2/courses/6984fecdeeabb01d52f99897/publish
Response: 400
{
  "message": "Cannot publish archived course"  // Says it's archived
}
```

---

## Suspected Cause

There may be a mismatch between:
1. `CanonicalCourse.status` or derived status (used by list endpoint)
2. `CourseVersion.status` (used by publish validation)

The course versions may have been archived at some point, but the list endpoint is returning a different status.

---

## Affected Courses

- Course ID: `6984fecdeeabb01d52f99897` (Riley Course 1)
- Department: Cognitive Therapy (`697c18c13e9e6d1cc22e0784`)

All courses created recently in this department are showing "Draft" in UI but cannot be published.

---

## Questions

1. Which status field does the publish endpoint check?
2. Is the list endpoint deriving status from a different source than publish?
3. Can you verify the CourseVersion status for this course ID?

---

## Response Section (For API Team)

**Status:** Awaiting More Info
**Response Date:** 2026-02-05

See response with investigation and diagnostic steps:
`api-to-ui/2026-02-05_publish-status-inconsistency-response.md`

---

## UI Follow-up: Systemic Issue Confirmed

**Date:** 2026-02-05

### Additional Testing

Tested multiple courses - ALL show the same issue:

| Course ID | Title | List Status | Publish Result |
|-----------|-------|-------------|----------------|
| 6984fecdeeabb01d52f99897 | Riley Course 1 | draft | 400: Cannot publish archived |
| 6984486725c8d0cb31d880b8 | UAT Test Course 955959 | draft | 400: Cannot publish archived |

### Also Found

The `unarchive` endpoint returns **404 "Course not found"**:
```
POST /api/v2/courses/6984fecdeeabb01d52f99897/unarchive
Response: 404 "Course not found"
```

This suggests the unarchive endpoint may not have been migrated to use CanonicalCourse.

### Summary

1. ALL courses in the department show "draft" but can't be published
2. The unarchive endpoint returns 404 (same issue as the original publish bug)
3. This is a systemic issue, not data-specific

### Critical: None of These Courses Were Ever Archived

User confirmed: **None of the courses were ever archived.** They were created as draft and remain draft.

This means the publish endpoint's status check is incorrectly detecting them as "archived" when they are not. The bug is in the status validation logic, not in the data.

### Likely Bug Location

In `publishCourse` (courses.service.ts:670), the status check:
```typescript
if (draftVersion.status === 'archived') {
  throw ApiError.badRequest('Cannot publish archived course');
}
```

Either:
1. `draftVersion` is null/undefined and `.status` is being compared incorrectly
2. The wrong version is being fetched (not the latestDraftVersionId)
3. New CourseVersions are being created with status 'archived' by default instead of 'draft'

### Questions

1. What is the default status when a new CourseVersion is created?
2. Can you check what `latestDraftVersionId` points to and its actual status in the database?

---

## RESOLVED - Server Restart Fixed It

**Date:** 2026-02-05

After restarting the API server per your instructions:

**Before restart:**
```
POST /api/v2/courses/:id/publish → 400 "Cannot publish archived course"
```

**After restart:**
```
POST /api/v2/courses/:id/publish → 400 "Course cannot be published: must have at least one module"
```

The correct validation error now appears. The course is recognized as a draft and can be published once it has modules.

**Root cause confirmed:** Server was running old code before the fix was deployed.

Thank you for the quick turnaround!

---

*Thread complete - moving to archive*
