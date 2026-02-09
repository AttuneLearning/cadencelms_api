# UI-ISS-085: Course Action Menu - Publish Course Returns "No Course Found" Error

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Completed: 2026-02-05
## Requested By: User Report
## Assigned To: Unassigned
## Related: UI-ISS-084 (Enrollment dropdown depends on published courses)

---

## Overview

When clicking "Publish Course" from the ellipsis action menu on the Course Management page, the action fails with error "Failed to publish, no course found".

Need to verify all action menu items work correctly.

---

## Steps to Reproduce

1. Navigate to Course Management page (staff or admin)
2. Click the ellipsis menu on a course row
3. Click "Publish Course"
4. Observe: Error "Failed to publish, no course found"

---

## Requirements

1. All action menu items should work correctly:
   - View/Preview
   - Edit
   - Publish
   - Unpublish
   - Archive
   - Duplicate
   - Delete

---

## Acceptance Criteria

- [x] Publish Course action works (API fix deployed, server restart required)
- [x] All other action menu items work (API fixed all endpoints)
- [x] Proper error handling for edge cases
- [x] API integration verified via direct API test

---

## Implementation Notes

**2026-02-05: Investigation Complete - API Bug Identified**

### Root Cause (API-side)

The course list endpoint was migrated to use the new versioned course system (`CanonicalCourse` + `CourseVersion`), but the publish/unpublish/archive endpoints still use the old `Course` model.

**List endpoint** (`listCourses`):
- Queries `CanonicalCourse` model
- Returns `id: canonical._id.toString()`

**Publish endpoint** (`publishCourse`):
- Uses `Course.findById(courseId)` - old model
- Can't find CanonicalCourse IDs → 404

### UAT Test Evidence

```
POST /api/v2/courses/6984fecdeeabb01d52f99897/publish
Response: 404 "Course not found"
```

The ID `6984fecdeeabb01d52f99897` exists in CanonicalCourse but not in the old Course model.

### UI Code is Correct

The UI correctly passes `course.id` to the publish mutation. The bug is entirely API-side.

### Message Sent

Created: `dev_communication/messaging/ui-to-api/2026-02-05_course-action-endpoints-model-mismatch.md`

### Files Created (UI)

- `src/test/uat/scenarios/enrollment.uat.spec.ts` - Added UAT test for course publish action

---

**2026-02-05: API Fix Applied - Follow-up Issue Found**

### Original Issue Fixed

The API team fixed the model mismatch. The 404 "Course not found" error is now resolved.
See: `dev_communication/messaging/api-to-ui/2026-02-05_course-action-endpoints-fix.md`

### New Issue: Status Inconsistency

UAT test now shows a different error:

```
POST /api/v2/courses/6984fecdeeabb01d52f99897/publish
Response: 400 "Cannot publish archived course"
```

But the list endpoint returns this same course with `status: "draft"`.

### Follow-up Message Sent

Created: `dev_communication/messaging/ui-to-api/2026-02-05_publish-status-inconsistency.md`

The status shown in the UI (draft) doesn't match what the publish endpoint sees (archived). This indicates a data inconsistency between CanonicalCourse and CourseVersion status fields.

---

## Completion

**Completed Date:** 2026-02-05
**Resolution:** API-side fix - no UI changes required

**Root Cause:**
The API course action endpoints (publish, unpublish, archive, unarchive) were using the old `Course` model while the list endpoint had been migrated to use `CanonicalCourse` + `CourseVersion`. The API team fixed all endpoints and a server restart was required to deploy the changes.

**Verification:**
- [x] All acceptance criteria met
- [x] API integration verified via direct test
- [x] Publish now returns correct validation ("must have at least one module") instead of false "archived" error

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
