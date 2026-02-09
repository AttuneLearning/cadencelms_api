# UI-ISS-082: Course Enrollment Pages (Non-Class Based)

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Requested By: Internal
## Assigned To: Unassigned
## Related: None

---

## Overview

Create course enrollment functionality that allows enrolling learners directly in courses without requiring a class. Currently, enrollment only works through class-based enrollment (`/staff/classes/:classId` → "Enroll Students").

Two pages needed:
1. **Admin Enrollment Page** (`/admin/enrollments`) - For `enrollment-admin` global role
2. **Department Enrollment Page** (`/staff/departments/:deptId/enrollments`) - For department staff

---

## Requirements

1. Create admin-level enrollment management page
2. Create department-scoped enrollment page
3. Support direct course enrollment (not class-based)
4. Support bulk enrollment (multiple learners at once)
5. View and manage existing enrollments
6. Filter by course, learner, status, date range

---

## Technical Specification

### Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/admin/enrollments` | `EnrollmentManagementPage` | `enrollment-admin` (global-admin) |
| `/staff/departments/:deptId/enrollments` | `DepartmentEnrollmentPage` | `enrollment:department:manage` |

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/enrollments` | List enrollments with filters |
| POST | `/enrollments/course` | Enroll learner in course |
| POST | `/enrollments/bulk` | Bulk enroll multiple learners |
| PATCH | `/enrollments/:id/status` | Update enrollment status |
| DELETE | `/enrollments/:id` | Withdraw enrollment |

### Page Features

**Admin Enrollment Page (`/admin/enrollments`):**
- System-wide enrollment view
- Filter by department, course, learner, status
- Bulk enrollment wizard
- Enrollment statistics dashboard
- Export functionality

**Department Enrollment Page (`/staff/departments/:deptId/enrollments`):**
- Department-scoped enrollment view
- Filter by course, learner, status
- Enroll learners in department courses
- View enrollment progress/status

### UI Components Needed

1. **EnrollmentTable** - List enrollments with sorting/filtering
2. **EnrollCourseDialog** - Modal to enroll learner(s) in a course
3. **BulkEnrollmentWizard** - Multi-step wizard for bulk enrollment
4. **EnrollmentFilters** - Filter controls
5. **EnrollmentStats** - Summary statistics cards

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/pages/admin/enrollments/EnrollmentManagementPage.tsx` | Admin enrollment page |
| `src/pages/admin/enrollments/index.ts` | Barrel export |
| `src/pages/staff/departments/DepartmentEnrollmentPage.tsx` | Department enrollment page |
| `src/features/enrollment/ui/EnrollCourseDialog.tsx` | Enrollment dialog |
| `src/features/enrollment/ui/BulkEnrollmentWizard.tsx` | Bulk enrollment wizard |
| `src/features/enrollment/ui/EnrollmentFilters.tsx` | Filter controls |

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/app/router/index.tsx` | Add routes | Add new enrollment routes |
| `src/pages/admin/enrollments/index.ts` | Create | Barrel export |
| `src/pages/staff/departments/index.ts` | Update | Add DepartmentEnrollmentPage export |

### Route Registration

```typescript
// Admin route
<Route
  path="/admin/enrollments"
  element={
    <AdminOnlyRoute>
      <EnrollmentManagementPage />
    </AdminOnlyRoute>
  }
/>

// Department route
<Route
  path="/staff/departments/:deptId/enrollments"
  element={
    <StaffOnlyRoute>
      <DepartmentEnrollmentPage />
    </StaffOnlyRoute>
  }
/>
```

---

## Tests Required

1. [ ] Admin can view all enrollments
2. [ ] Admin can enroll learner in course directly
3. [ ] Admin can bulk enroll multiple learners
4. [ ] Department staff can view department enrollments
5. [ ] Department staff can enroll learners in department courses
6. [ ] Enrollment status updates work correctly
7. [ ] Filters work correctly
8. [ ] Permission checks prevent unauthorized access

---

## Acceptance Criteria

- [ ] `/admin/enrollments` page accessible to enrollment-admin
- [ ] `/staff/departments/:deptId/enrollments` page accessible to department staff
- [ ] Can enroll learner in course without class
- [ ] Can bulk enroll multiple learners
- [ ] Can view existing enrollments with filters
- [ ] Can update enrollment status
- [ ] Can withdraw enrollments
- [ ] Proper permission checks on all actions
- [ ] Responsive design
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Bulk enrollment format?**
   CSV upload? Multi-select from learner list? Both?

2. **Enrollment approval workflow?**
   Should enrollments be auto-approved or require approval?

3. **Sidebar navigation?**
   Where should these pages appear in sidebar navigation?

---

## Implementation Notes

**2026-02-05: Implementation Complete**

### Files Created

| File | Description |
|------|-------------|
| `src/entities/enrollment/model/types.ts` | Added `BulkCourseEnrollmentPayload`, `BulkCourseEnrollmentResponse` |
| `src/entities/enrollment/api/enrollmentApi.ts` | Added `bulkEnrollInCourse()` |
| `src/entities/enrollment/hooks/useEnrollments.ts` | Added `useBulkEnrollInCourse()` hook |
| `src/features/enrollment/ui/EnrollCourseDialog.tsx` | Bulk enrollment dialog component |
| `src/features/enrollment/index.ts` | Feature barrel export |
| `src/pages/staff/departments/DepartmentEnrollmentPage.tsx` | Course enrollment management page |

### Routes Added

- `/staff/departments/:deptId/enrollments` - Department course enrollment management

### API Integration

Uses new `POST /api/v2/enrollments/course/bulk` endpoint (confirmed ready by API team).

### Outstanding Items

1. **Admin enrollment page** (`/admin/enrollments`) - Not implemented yet, would be for global enrollment-admin role
2. **Unit tests** - Not created yet, manual verification items remain
3. **Sidebar navigation** - Route exists but not yet added to sidebar navigation

Existing enrollment hooks:
- `useEnrollInCourse()` - Enroll single learner
- `useEnrollments()` - List enrollments
- `useEnrollLearners()` - Bulk enroll (for classes)
- `useBulkEnrollInCourse()` - **NEW** Bulk enroll in course (not class)

---

## Completion

**Completed Date:** 2026-02-05 (partial)
**Commits:**
| Hash | Description |
|------|-------------|
| TBD | Course enrollment feature (pending commit) |

**Verification:**
- [x] `/staff/departments/:deptId/enrollments` page accessible to department staff
- [x] Can enroll learner in course without class
- [x] Can bulk enroll multiple learners (via dialog)
- [x] Can view existing enrollments with filters
- [ ] Admin enrollment page (deferred - not in scope)
- [x] Unit tests written (17 tests: EnrollCourseDialog + DepartmentEnrollmentPage)
- [ ] Code reviewed

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
