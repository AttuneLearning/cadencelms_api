# Bulk Course Enrollment Endpoint Request

**Date:** 2026-02-05
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-082 (Course Enrollment Pages)

---

## Request

The UI team needs a bulk course enrollment endpoint to support enrolling multiple learners in a course at once. Currently, bulk enrollment only exists for classes (`POST /classes/:id/learners`), but we need the same capability for direct course enrollment.

## Context

We are implementing Course Enrollment pages (UI-ISS-082) that allow:
- Admin-level enrollment management (`/admin/enrollments`)
- Department-level enrollment management (`/staff/departments/:deptId/enrollments`)

These pages need to support enrolling multiple learners in a course without requiring a class.

## Requirements

### New Endpoint Needed

```
POST /api/v2/enrollments/course/bulk
```

**Request Body:**
```json
{
  "courseId": "string",
  "learnerIds": ["string", "string", ...],
  "options": {
    "startDate": "ISO date (optional)",
    "expiresAt": "ISO date (optional)",
    "sendNotification": "boolean (optional, default true)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrolled": [
      { "learnerId": "...", "enrollmentId": "..." }
    ],
    "failed": [
      { "learnerId": "...", "reason": "Already enrolled" }
    ],
    "summary": {
      "total": 10,
      "successful": 8,
      "failed": 2
    }
  }
}
```

**Access Right:** `enrollment:department:manage` or `enrollment:system:manage`

### Behavior

1. Skip learners already enrolled (don't error, just report in `failed` array)
2. Validate all learnerIds exist before processing
3. Validate courseId exists and is published
4. Support optional start date and expiration date
5. Optionally send enrollment notification emails

## Existing Endpoint Reference

The existing `POST /classes/:id/learners` endpoint for bulk class enrollment could serve as a model:
- Located in `classes.routes.ts`
- Accepts `{ learnerIds: string[] }`

## Questions

1. Should bulk enrollment support department scoping (only enroll learners in same department as course)?
2. Should there be a max batch size limit?
3. Should this endpoint be available to enrollment-admin global role only, or also department-admin?

## Timeline

- **Needed by:** When UI-ISS-082 is ready for integration
- **Blocking:** Bulk enrollment feature in new enrollment management pages

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-05

Endpoint implemented and tested. See response:
`api-to-ui/2026-02-05_bulk-course-enrollment-response.md`

---

*Move to `archive/` when thread is complete*
