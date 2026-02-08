# Learners Endpoint Permission Issue

**From:** UI Team
**To:** API Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Permission Bug

---

## Issue

Staff members with `learner:department:manage` permission cannot list learners for enrollment purposes.

---

## Context

The Course Enrollments page needs to list learners that can be enrolled in a course. Staff like Riley Instructor have department-scoped permissions but the API requires global PII permissions.

---

## Evidence

**User Permissions (Riley Instructor):**
```
- learner:department:read
- learner:department:manage
- enrollment:department:manage
```

**API Call:**
```
GET /api/v2/users/learners?department=697c18c13e9e6d1cc22e0784
Authorization: Bearer <riley-token>
```

**Response:**
```json
{
  "status": "error",
  "message": "Insufficient permissions. Required: learner:pii:read. Reason: denied",
  "code": "AUTHORIZATION_DENIED"
}
```

---

## Expected Behavior

When `department` filter is provided and user has `learner:department:read` or `learner:department:manage` for that department, the endpoint should:
1. Return learners scoped to that department
2. Not require global `learner:pii:read` permission

---

## Business Impact

- Staff cannot enroll learners in courses
- The "Enroll Learners" dialog shows "No learners found"
- Breaks the core enrollment workflow

---

## Suggested Fix

Option A: Department-scoped authorization
```typescript
// If department filter provided, check department-scoped permission
if (filters.department) {
  authorize('learner:department:read', { departmentId: filters.department })
} else {
  authorize('learner:pii:read') // Global access requires PII permission
}
```

Option B: Separate endpoint
```
GET /api/v2/departments/:deptId/learners
// Authorizes with learner:department:read for that department
```

---

## Response Section (For API Team)

**Status:** Pending

---

*Move to `archive/` when thread is complete*
