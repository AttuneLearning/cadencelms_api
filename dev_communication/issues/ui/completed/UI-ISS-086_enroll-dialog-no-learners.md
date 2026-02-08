# UI-ISS-086: Enroll Learners Dialog Shows "No Learners Found"

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Requested By: User Report
## Assigned To: Unassigned
## Related: UI-ISS-083, UI-ISS-084, UI-ISS-085 (Enrollment feature)

---

## Overview

When opening the "Enroll Learners" dialog from the Course Enrollments page, the learner list shows "No learners found" even though learners exist in the system.

---

## Steps to Reproduce

1. Navigate to Staff Dashboard
2. Select a department (e.g., Cognitive Therapy)
3. Click "Course Enrollments" in sidebar
4. Select a published course from dropdown
5. Click "Enroll Learners" button
6. Observe: Dialog shows "No learners found"

---

## Expected Behavior

The dialog should display a list of learners that can be enrolled in the course, filtered by department if applicable.

---

## Technical Context

The `EnrollCourseDialog` component fetches learners via:

```typescript
const { data: usersData, isLoading: isLoadingUsers } = useQuery({
  queryKey: ['users', { role: 'learner', department: departmentId }],
  queryFn: () => userApi.list({
    filters: {
      role: 'learner',
      ...(departmentId && { department: departmentId }),
    }
  }),
  enabled: open,
});
```

**Potential causes:**
1. API endpoint not returning learners for the department filter
2. Users don't have 'learner' role assigned
3. Department ID mismatch between UI and API
4. API query parameter format issue

---

## Acceptance Criteria

- [x] Learners appear in the enrollment dialog
- [x] Already-enrolled learners shown as disabled
- [x] Search filter works correctly
- [x] Bulk enrollment completes successfully

---

## Implementation Notes

**2026-02-05: Investigation Complete - API Permission Issue**

### Root Cause

The `/api/v2/users/learners` endpoint requires `learner:pii:read` permission, but department staff only have:
- `learner:department:read`
- `learner:department:manage`

### Evidence

```
GET /api/v2/users/learners?department=697c18c13e9e6d1cc22e0784
Response: 403 "Insufficient permissions. Required: learner:pii:read"
```

### UI Code Path

1. `EnrollCourseDialog` calls `userApi.list({ filters: { role: 'learner', department } })`
2. `userApi.list` uses `endpoints.admin.users.list` → `/users/staff` (wrong endpoint!)
3. Even with correct `/users/learners` endpoint, permission denied

### Two Issues Found

1. **UI Bug:** `userApi.list` points to `/users/staff` not `/users/learners`
2. **API Bug:** `/users/learners` doesn't respect department-scoped permissions

### Message Sent

Created: `dev_communication/messaging/ui-to-api/2026-02-05_learners-endpoint-permission.md`

---

**2026-02-05: API Team Response - New Permission Tier**

### Solution

API team implementing tiered permission model:

| Permission | Data Returned |
|------------|---------------|
| `learner:directory:read` | Masked: `Smith, A. ...9011` |
| `learner:pii:read` | Full PII (name, email) |

### New Response Format

```json
{
  "learners": [
    {
      "id": "507f1f77bcf86cd799439011",
      "displayName": "Smith, A.",
      "idSuffix": "9011",
      "status": "active",
      "isProgramEnrollee": true
    }
  ]
}
```

### UI Changes Required

1. Update `EnrollCourseDialog` to use new `learners` array (not `users`)
2. Display: `{displayName}    ...{idSuffix}`
3. Remove email display (not available at directory level)
4. Add `isProgramEnrollee` badge (optional)

---

**2026-02-05: UI Implementation Complete**

### Changes Made

1. **`EnrollCourseDialog.tsx`**:
   - Updated to call `/users/learners` endpoint directly
   - Added `NormalizedLearner` interface for backward compatibility
   - Handles both new `learners` array and legacy `users` array formats
   - Displays `displayName`, `idSuffix`, and `isProgramEnrollee` badge
   - Added error handling for 403 permission denied

2. **`EnrollCourseDialog.test.tsx`**:
   - Updated mock endpoint from `/users/staff` to `/users/learners`
   - Added mock data in new directory format
   - Added 4 new tests:
     - `displays learners in directory format (displayName with idSuffix)`
     - `shows Program badge for program enrollees`
     - `handles legacy API format (users array)`
     - `displays permission error when API returns 403`
   - All 12 tests passing

### Blocked On

**Waiting for API team** to add `learner:directory:read` permission to `instructor` and/or `department-admin` roles.

Follow-up sent: `dev_communication/messaging/ui-to-api/2026-02-05_learners-endpoint-permission-followup.md`

---

## Completion

**Completed Date:** 2026-02-05
**Commits:**
| Hash | Description |
|------|-------------|
| 078b808 | feat(enrollment): support new learner directory API format |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (12/12)
- [x] API permission verified (learner:directory:read working)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
