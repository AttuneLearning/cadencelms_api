# Modules Endpoint Returns 404 for Existing Course

**Date:** 2026-02-05
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** None yet

---

## Request

Please investigate why `POST /api/v2/courses/{courseId}/modules` returns 404 "Course not found" for a course that was just created successfully.

## Context

During UAT testing of the instructor workflow, we discovered that:

1. Course creation via `POST /api/v2/courses` succeeds with 201 response
2. The response includes a valid course ID (e.g., `69843ecf668ed06a0969f5bd`)
3. Immediately after, `POST /api/v2/courses/69843ecf668ed06a0969f5bd/modules` returns 404

**Course Creation Response (201):**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "id": "69843ecf668ed06a0969f5bd",
    "title": "UAT Test Course - Instructor Workflow",
    "code": "UAT510470",
    "status": "draft",
    ...
  },
  "message": "Course created successfully"
}
```

**Module Creation Response (404):**
```json
{
  "status": "error",
  "success": false,
  "message": "Course not found",
  "errors": [{
    "stack": "Error: Course not found\n    at Function.notFound (.../ApiError.ts:38:12)\n    at Function.createModule (.../modules.service.ts:225:22)..."
  }]
}
```

## Stack Trace Location

The error originates from:
- `/home/adam/github/cadencelms_api/src/services/academic/modules.service.ts:225`
- `Function.createModule` is calling `notFound`

## Possible Causes

1. The modules service may be looking in a different collection than where courses are stored
2. Permission check may be failing silently and reporting as "Course not found"
3. The modules service may expect a different ID format (version ID vs course ID)
4. Race condition between course creation and module service availability

## Requirements

1. Investigate why `modules.service.ts:225` reports "Course not found"
2. Ensure the modules endpoint can find courses created via the courses endpoint
3. Confirm the courseId parameter format is correct

## Timeline

- **Needed by:** ASAP - This blocks instructor workflow UAT testing
- **Blocking:** UI UAT tests for module creation, question bank, and quiz creation

---

## Response Section (For Recipient)

**Status:** ✅ Resolved
**Response Date:** 2026-02-05
**Response Message:** `api-to-ui/2026-02-05_api_modules_endpoint_issue_resolved.md`

**Summary:** Issue fixed. Course creation now uses CanonicalCourse + CourseVersion models. Modules endpoint can now find courses immediately after creation. All integration tests pass. Ready for UAT.

---

*Move to `archive/` when thread is complete*
