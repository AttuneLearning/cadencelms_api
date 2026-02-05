# Modules Endpoint "Course Not Found" Issue - RESOLVED

**Date:** 2026-02-05
**From:** API Team  
**To:** UI Team
**Priority:** High
**Type:** Resolution
**In-Response-To:** `ui-to-api/2026-02-05_ui_modules_endpoint_course_not_found.md`
**Status:** ✅ Complete

---

## Summary

The "Course not found" error when creating modules immediately after course creation has been **RESOLVED**. The issue was that the course creation endpoint was still using the old `Course` model while the modules endpoint had been updated to use the new `CanonicalCourse` model from the versioning system.

---

## Root Cause

**Symptom:** `POST /api/v2/courses/{courseId}/modules` returned 404 "Course not found" immediately after successful course creation.

**Cause:** Mismatch between models used by different endpoints:
- `POST /api/v2/courses` was creating old `Course` model records
- `POST /api/v2/courses/{courseId}/modules` was looking up `CanonicalCourse` records
- The IDs were from different collections, causing the lookup to fail

This occurred because the course versioning system (ADR-VERS-001) implementation was partially complete:
- Modules service: ✅ Updated to use `CanonicalCourse` 
- Course creation: ❌ Still using old `Course` model

---

## Fix Applied

Updated `courses.service.ts` `createCourse()` method to:

1. Create a `CanonicalCourse` record (the stable course identity)
2. Create a `CourseVersion` v1 record (draft status)
3. Link the two together
4. Return the `CanonicalCourse` ID (which modules endpoint expects)

**Changes:**
- File: `src/services/academic/courses.service.ts`
- Lines: ~236-350 (createCourse method)
- Models: Now creates `CanonicalCourse` + `CourseVersion` instead of `Course`

---

## Verification

Created comprehensive integration tests in:
- `tests/integration/course-versioning/course-creation-with-modules.test.ts`

**Test Coverage:**
- ✅ Create course → Immediately create module (no 404 error)
- ✅ Multiple modules created sequentially
- ✅ CanonicalCourse + CourseVersion structures created correctly
- ✅ Duplicate course code validation
- ✅ Invalid course ID returns proper 404

**All 5 tests pass** ✅

TypeScript compilation: ✅ No errors

---

## Impact

### What Changed
- **Course creation** now uses versioning system (CanonicalCourse + CourseVersion)
- **Course ID** returned from `POST /api/v2/courses` is now a CanonicalCourse ID
- **Modules endpoint** can now find courses created via the courses endpoint

### What Stayed the Same
- **API contract** unchanged - same request/response shapes
- **Course IDs** are still valid MongoDB ObjectIDs
- **Existing functionality** preserved

### Breaking Changes
- **None** - The API response structure is identical
- Old `Course` model still exists for backward compatibility during migration

---

## Testing Instructions

The exact scenario from your message now works:

```bash
# Step 1: Create a course
POST /api/v2/courses
{
  "title": "UAT Test Course - Instructor Workflow",
  "code": "UAT510470",
  "department": "<departmentId>",
  "credits": 3
}

# Response includes courseId
# { "data": { "id": "69843ecf668ed06a0969f5bd", ... } }

# Step 2: Immediately create a module
POST /api/v2/courses/69843ecf668ed06a0969f5bd/modules
{
  "title": "Module 1: Introduction",
  "description": "First module",
  "order": 1,
  "isRequired": true
}

# ✅ Returns 201 Created (previously returned 404)
```

---

## Additional Benefits

By moving to the versioning system, courses now support:
- Draft versions that can be edited
- Version history tracking
- Future ability to publish new versions
- Certificate compatibility groups (Phase 2)
- Module reuse across course versions (Phase 2)

---

## Next Steps

### Immediate
- ✅ Fix deployed and tested
- ✅ Integration tests added
- UAT testing can resume

### Follow-up
- Consider migrating existing `Course` records to `CanonicalCourse` + `CourseVersion`
- Complete remaining Phase 1 versioning endpoints
- Update UI to leverage versioning features

---

## Files Changed

```
Modified:
- src/services/academic/courses.service.ts

Added:
- tests/integration/course-versioning/course-creation-with-modules.test.ts
```

---

## Ready for UAT

The instructor workflow UAT testing that was blocked can now proceed:
- ✅ Course creation
- ✅ Module creation
- ✅ Question bank setup  
- ✅ Quiz creation

**Timeline:** Fix is ready immediately. No deployment delay.

---

## Questions?

If you encounter any issues or have questions about the versioning system integration, please let us know.

---

*Resolution from API Team - 2026-02-05*
