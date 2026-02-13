# Bug Report: GET /enrollments Endpoint — Missing User Filtering & Course Support

**Date:** 2026-02-09
**From:** UI Team
**To:** API Team
**Priority:** Critical
**Related Issues:** None (discovered during manual UAT)

---

## Request

The `GET /enrollments` endpoint has three critical bugs that prevent basic learner enrollment functionality from working:

1. **Authenticated user filtering is missing** — returns ALL enrollments system-wide
2. **Course-type enrollments are not queried** — only `program` and `class` types
3. **`course` filter parameter is accepted but never applied**

## Context

During UAT testing of the learner experience, we discovered:
- The "My Courses" page (`GET /enrollments`) returns every enrollment in the database instead of just the authenticated user's enrollments
- A learner with a `type: 'course'` enrollment in EMDR101 cannot see it on their "My Courses" page
- The course player enrollment check (`GET /enrollments?course=<courseId>&limit=1`) returns incorrect results because the `course` filter is ignored

### Evidence from `enrollments.service.ts`

**Bug 1 — `_userId` unused:**
```typescript
// Line ~145: userId is passed but prefixed with underscore (unused)
static async listEnrollments(filters: ListEnrollmentsFilters, _userId: string) {
  // _userId is never referenced in the method body
  // All queries return system-wide results
}
```

**Bug 2 — Only queries program and class types:**
The service builds two separate queries — one for `ProgramEnrollment` and one for `ClassEnrollment` — then merges results. There is no query for direct course enrollments (`type: 'course'`).

**Bug 3 — `course` filter ignored:**
`filters.course` is accepted in the filter interface but never applied to either the ProgramEnrollment or ClassEnrollment queries.

## Requirements

1. **Filter by authenticated user**: Use the `userId` parameter to filter enrollments so each learner only sees their own enrollments
2. **Support course-type enrollments**: Query enrollments where `type: 'course'` in addition to program and class types
3. **Apply course filter**: When `filters.course` is provided, filter results to only enrollments targeting that specific course ID
4. **Maintain response shape**: Keep the existing pagination response format (`page, limit, total, totalPages, hasNext, hasPrev`)

## Impact

Without these fixes:
- "My Courses" page shows all enrollments for all users (data leak)
- Learners with direct course enrollments see an empty "My Courses" page
- Course player cannot verify enrollment status (always shows "Not Enrolled" for course-type enrollments)
- Course catalog "Enroll" → player flow is broken end-to-end

## Timeline

- **Needed by:** ASAP — this blocks all learner enrollment UAT
- **Blocking:** Learner "My Courses", course player enrollment verification, course catalog → player flow

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Fixed in `API-ISS-037` (`dev_communication/backend/issues/completed/API-ISS-037_enrollments-user-filtering.md`). Authenticated learner filtering, course-type support, and course filter behavior were implemented.

---

*Move to `archive/` when thread is complete*
