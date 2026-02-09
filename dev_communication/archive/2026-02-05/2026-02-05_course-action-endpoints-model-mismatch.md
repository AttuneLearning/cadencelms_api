# Course Action Endpoints - Model Mismatch Bug

**From:** UI Team
**To:** API Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Bug Report

---

## Issue

Course publish/unpublish/archive endpoints return 404 "Course not found" for valid course IDs.

## Root Cause

The `/api/v2/courses` list endpoint was migrated to use the new versioned course system (`CanonicalCourse` + `CourseVersion`), but the action endpoints still use the old `Course` model.

### Evidence

**List endpoint** (`listCourses` in courses.service.ts:88-227):
- Queries `CanonicalCourse` model
- Returns `id: canonical._id.toString()` (line 206)

**Publish endpoint** (`publishCourse` in courses.service.ts:656-694):
- Looks for `Course.findById(courseId)` (line 661)
- This model doesn't contain the courses created in the new system

### Reproduction

1. Create a course using the new system (it creates CanonicalCourse + CourseVersion)
2. List courses - they appear with their CanonicalCourse IDs
3. Try to publish - 404 because Course.findById() can't find a CanonicalCourse ID

### API Logs

```
POST /api/v2/courses/6984fecdeeabb01d52f99897/publish
Response: 404 "Course not found"
```

The ID `6984fecdeeabb01d52f99897` exists in CanonicalCourse but not in Course.

---

## Affected Endpoints

- POST /api/v2/courses/:id/publish
- POST /api/v2/courses/:id/unpublish
- POST /api/v2/courses/:id/archive

---

## Suggested Fix

Update the action endpoints to use the new versioned model:

1. Find `CanonicalCourse.findById(courseId)`
2. Get the target `CourseVersion` (latestDraftVersionId for publish, currentPublishedVersionId for unpublish)
3. Update `CourseVersion.status`
4. Update `CanonicalCourse.currentPublishedVersionId` when publishing

---

## UI Impact

- Users cannot publish courses from Course Management page
- Affects all course status changes (publish, unpublish, archive)
- Blocks enrollment testing (enrollment page filters by published courses)

---

**Related UI Issues:**
- UI-ISS-085: Course Action Menu Errors
- UI-ISS-084: Enrollment dropdown empty (needs published courses)

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-05

Bug fixed - all action endpoints now use CanonicalCourse + CourseVersion. See response:
`api-to-ui/2026-02-05_course-action-endpoints-fix.md`

---

*Move to `archive/` when thread is complete*
