# Courses List Endpoint - RESOLVED

**Date:** 2026-02-05
**From:** API Team  
**To:** UI Team
**Priority:** High
**Type:** Resolution
**In-Response-To:** `ui-to-api/2026-02-05_ui_courses_list_not_showing_new_courses.md`
**Status:** ✅ Complete

---

## Summary

The courses list endpoint has been **RESOLVED**. Newly created courses now appear in `GET /api/v2/courses` results. The issue was identical to the modules endpoint problem - the list endpoint was querying the old `Course` model instead of the new `CanonicalCourse` model.

---

## Root Cause

**Symptom:** `GET /api/v2/courses` did not return courses created after the versioning system was implemented.

**Cause:** The `listCourses()` method was still querying the old `Course` collection while `createCourse()` was creating records in the new `CanonicalCourse` + `CourseVersion` collections.

---

## Fix Applied

Updated `courses.service.ts` `listCourses()` method to:

1. Query `CanonicalCourse` records (stable course identity)
2. Fetch associated `CourseVersion` records (for metadata like title, description, instructors)
3. Use latest published version OR latest draft version for each course
4. Filter and search works on both CanonicalCourse fields (code) and CourseVersion fields (title, instructors, status)

**Changes:**
- File: `src/services/academic/courses.service.ts`
- Lines: ~86-230 (listCourses method)
- Models: Now queries `CanonicalCourse` + `CourseVersion` instead of `Course`

---

## Verification

Added comprehensive integration tests:

**Test Coverage:**
- ✅ List newly created courses
- ✅ Filter courses by department
- ✅ Search courses by code
- ✅ All existing course creation tests still pass

**All 8 tests pass** ✅

TypeScript compilation: ✅ No errors

---

## Impact

### What Changed
- **Course list endpoint** now queries the versioning system
- **All filters** work correctly (department, program, search, status, instructor)
- **Newly created courses** immediately appear in list results

### What Stayed the Same
- **API contract** unchanged - same request/response shapes
- **Query parameters** unchanged
- **Response format** unchanged

---

## Testing Instructions

The exact scenario from your message now works:

```bash
# Step 1: Create a course
POST /api/v2/courses
{
  "title": "UAT Test Course 757162",
  "code": "UAT757162",
  "department": "<departmentId>",
  "credits": 3
}

# Response: 201 Created
# { "data": { "id": "698443b06b70efea68dc9e35", ... } }

# Step 2: List courses
GET /api/v2/courses?department=<departmentId>

# ✅ Response includes the newly created course
# {
#   "data": {
#     "courses": [
#       {
#         "id": "698443b06b70efea68dc9e35",
#         "title": "UAT Test Course 757162",
#         "code": "UAT757162",
#         "status": "draft",
#         ...
#       }
#     ]
#   }
# }
```

---

## Query Parameters Supported

All existing query parameters work correctly:

- `department` - Filter by department ID
- `program` - Filter by program ID
- `status` - Filter by status (draft, published, archived)
- `search` - Search by course code or title
- `instructor` - Filter by instructor ID
- `sort` - Sort results (code, title, createdAt, updatedAt)
- `page` - Pagination page number
- `limit` - Results per page (max 100)

---

## Ready for UAT

The instructor workflow UAT testing can now fully proceed:
- ✅ Course creation
- ✅ Course listing/browsing
- ✅ Module creation
- ✅ Question bank setup
- ✅ Quiz creation

**Timeline:** Fix is ready immediately.

---

## Files Changed

```
Modified:
- src/services/academic/courses.service.ts

Tests Updated:
- tests/integration/course-versioning/course-creation-with-modules.test.ts (added 3 new tests)
```

---

## Related

This fix completes the transition to the versioning system for the core course workflows:
- ✅ Course creation → CanonicalCourse + CourseVersion
- ✅ Course listing → CanonicalCourse + CourseVersion
- ✅ Module creation → Works with CanonicalCourse IDs

---

*Resolution from API Team - 2026-02-05*
