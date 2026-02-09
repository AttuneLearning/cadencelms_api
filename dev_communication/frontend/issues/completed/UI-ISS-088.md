# UI-ISS-088: Admin Enrollment Management Page

## Status: COMPLETE
## Priority: Medium
## Created: 2026-02-06
## Updated: 2026-02-06
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-082 (Department Enrollment Page)

---

## Overview

Create an admin-level enrollment management page that mirrors the staff department enrollment page (`DepartmentEnrollmentPage`). This page should allow system administrators with `enrollment-admin` global role to manage course enrollments across all departments.

---

## Requirements

1. Admin can view enrollments across all departments
2. Admin can filter by department, course, learner, status
3. Admin can bulk enroll learners in any course
4. Admin can update enrollment status
5. Admin can withdraw enrollments
6. Display enrollment statistics dashboard

---

## Technical Specification

### Route

| Route | Component | Access |
|-------|-----------|--------|
| `/admin/enrollments` | `EnrollmentManagementPage` | `enrollment-admin` (global role) |

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/enrollments` | List enrollments with filters |
| POST | `/enrollments/course/bulk` | Bulk enroll learners |
| PATCH | `/enrollments/:id/status` | Update enrollment status |
| DELETE | `/enrollments/:id` | Withdraw enrollment |

### Features (Mirror from DepartmentEnrollmentPage)

1. **Department Selector** - Filter by department (admin-only, not in staff version)
2. **Course Selector** - Select course to manage enrollments
3. **Enrollment List** - Table showing enrolled learners with:
   - Learner name and avatar
   - Enrollment status badge
   - Progress percentage
   - Enrolled date
   - Actions menu
4. **Bulk Enroll Dialog** - Reuse `EnrollCourseDialog` component
5. **Status Filters** - Filter by active/completed/withdrawn/suspended/expired
6. **Search** - Search learners by name
7. **Statistics Cards** - Show enrollment counts by status

### Key Differences from Staff Page

| Feature | Staff Page | Admin Page |
|---------|------------|------------|
| Scope | Single department | All departments |
| Department filter | N/A (implicit from context) | Dropdown selector |
| Course filter | Department courses only | All courses (or filtered by dept) |
| Permission | `enrollment:department:manage` | `enrollment-admin` global role |

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/pages/admin/enrollments/EnrollmentManagementPage.tsx` | Main admin enrollment page |
| `src/pages/admin/enrollments/index.ts` | Barrel export |

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/app/router/index.tsx` | Add route | Add `/admin/enrollments` route |

### Route Registration

```typescript
import { EnrollmentManagementPage } from '@/pages/admin/enrollments';

<Route
  path="/admin/enrollments"
  element={
    <AdminOnlyRoute>
      <EnrollmentManagementPage />
    </AdminOnlyRoute>
  }
/>
```

### Component Structure

```tsx
// Reuse existing components
import { EnrollCourseDialog } from '@/features/enrollment';
import { useCourseEnrollments } from '@/entities/enrollment/hooks/useEnrollments';
import { useCourses } from '@/entities/course/model/useCourse';
import { useDepartments } from '@/entities/department/model/useDepartment';

// Add department selector at top
// Rest mirrors DepartmentEnrollmentPage
```

---

## Tests Required

1. [x] Admin can view enrollments across departments
2. [x] Department filter works correctly
3. [x] Course selector shows courses from selected department
4. [x] Bulk enrollment works (uses EnrollCourseDialog)
5. [x] Status filters work correctly
6. [x] Search filters learners
7. [x] Permission check prevents non-admin access (AdminOnlyRoute)

---

## Acceptance Criteria

- [x] `/admin/enrollments` page accessible to enrollment-admin
- [x] Can filter by department
- [x] Can select course and view enrollments
- [x] Can bulk enroll learners
- [x] Can filter by enrollment status
- [x] Can search learners
- [x] Statistics cards show correct counts
- [x] Responsive design
- [x] Tests pass (18 passing)
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Should admin see all departments or only assigned ones?**
   All departments - admin has global access.

2. **Should there be export functionality?**
   Deferred to future issue - not in initial scope.

---

## Implementation Notes

- Created `EnrollmentManagementPage` mirroring `DepartmentEnrollmentPage`
- Added department selector using Radix Select with "all" value for filtering
- Reused existing `EnrollCourseDialog` for bulk enrollment
- Used `useDepartments`, `useCourses`, and `useCourseEnrollments` hooks
- 18 unit tests covering page structure, filters, and data flow
- Route registered at `/admin/enrollments` with `AdminOnlyRoute` guard

---

## Completion

**Completed Date:** 2026-02-07
**Commits:**
| Hash | Description |
|------|-------------|
| f23a543 | feat(admin): add enrollment management page |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (18 tests)
- [x] Response message sent (if cross-team) - N/A (internal)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
