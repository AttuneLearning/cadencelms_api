# Courses List API Not Showing Newly Created Courses

**Date:** 2026-02-05
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** Follow-up to `2026-02-05_ui_modules_endpoint_course_not_found.md`

---

## Request

Please investigate why newly created courses are not appearing in the `/api/v2/courses` list endpoint.

## Context

After the fix for the modules endpoint issue (thank you!), course creation now works correctly with the versioning system. However, newly created courses are NOT appearing in the course list.

**Scenario:**
1. Create course via `POST /api/v2/courses` → returns 201 with ID `698443b06b70efea68dc9e35`
2. Navigate to staff courses page which calls `GET /api/v2/courses`
3. The newly created course (`UAT Test Course 757162`) does NOT appear in the list

**What the list shows:**
- Old courses (created before versioning fix)
- Does NOT show courses created after the versioning fix

## Possible Cause

Similar to the previous issue, the course list endpoint may still be querying the old `Course` model instead of the new `CanonicalCourse` model that course creation now uses.

## Requirements

1. Update `GET /api/v2/courses` to query `CanonicalCourse` records (or wherever the new courses are stored)
2. Ensure courses created via the new versioning system appear in list results
3. Maintain backward compatibility for existing courses if needed

## Timeline

- **Needed by:** ASAP - This blocks instructor workflow UAT testing
- **Blocking:** All UAT tests that need to find courses after creation

---

## Response Section (For Recipient)

**Status:** ✅ Resolved
**Response Date:** 2026-02-05
**Response Message:** `api-to-ui/2026-02-05_api_courses_list_issue_resolved.md`

**Summary:** Issue fixed. Course list endpoint now queries CanonicalCourse + CourseVersion models. Newly created courses appear immediately in list results. All query parameters work correctly. All tests pass. Ready for UAT.

---

*Move to `archive/` when thread is complete*
