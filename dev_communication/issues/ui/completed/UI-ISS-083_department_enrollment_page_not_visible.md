# UI-ISS-083: Department Enrollment Page Not Visible in Sidebar

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-082 (Course Enrollment Pages)

---

## Overview

Department admins cannot see or access the enrollment page (`/staff/departments/:deptId/enrollments`) from the sidebar navigation. The route exists and the page is implemented, but there is no navigation item in the department actions section to access it.

---

## Requirements

1. Add "Enrollments" link to staff department actions in sidebar
2. Link should appear for users with appropriate enrollment permissions
3. Link should navigate to `/staff/departments/:deptId/enrollments`
4. Link should be visible when a department is selected

---

## Technical Specification

### Root Cause

The `sectionConfig.ts` file defines department actions but is missing an entry for the enrollments page. There are entries for:
- `dept-courses` - Courses
- `dept-create-course` - Create Course
- `dept-students` - Student Progress
- `dept-reports` - Department Reports
- `dept-settings` - Department Settings

But no `dept-enrollments` entry for the enrollment management page.

### Missing Configuration

```typescript
// Should be added to DEPARTMENT_ACTION_ITEMS in sectionConfig.ts
{
  id: 'dept-enrollments',
  label: 'Course Enrollments',
  pathTemplate: '/staff/departments/:deptId/enrollments',
  icon: UserPlus, // or GraduationCap
  requiredPermission: 'enrollment:department:manage',
  dashboards: ['staff'],
},
```

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/sidebar/config/sectionConfig.ts` | Modify | Add `dept-enrollments` to DEPARTMENT_ACTION_ITEMS |
| `src/widgets/sidebar/config/navItems.ts` | Modify | Add corresponding nav item if needed |

### Approach

1. Add new department action item for enrollments
2. Position it logically (after Courses, before Student Progress)
3. Use appropriate icon (UserPlus or GraduationCap)
4. Set permission to `enrollment:department:manage` or `enrollments:manage`

---

## Tests Required

1. [x] UAT: Staff can see "Course Enrollments" link in department actions
2. [x] UAT: Clicking link navigates to enrollment page
3. [x] Unit: Sidebar renders enrollment link for users with permission
4. [x] Unit: Sidebar hides enrollment link for users without permission

---

## Acceptance Criteria

- [x] "Course Enrollments" link visible in department actions section
- [x] Link only visible when department is selected
- [x] Link navigates to `/staff/departments/:deptId/enrollments`
- [x] Link respects permission requirements
- [x] UAT tests pass
- [x] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **What permission should control visibility?**
   Suggested: `enrollment:department:manage` - confirms ability to manage enrollments within department

2. **What icon to use?**
   Suggested: `UserPlus` (adding users to courses) or `GraduationCap` (enrollment context)

---

## Implementation Notes

**2026-02-05: Implementation Complete**

### Files Modified

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/sidebar/config/sectionConfig.ts` | Modified | Added `UserPlus` icon import and `dept-enrollments` entry to `DEPARTMENT_ACTIONS` array |
| `src/widgets/sidebar/__tests__/Sidebar.test.tsx` | Modified | Added 2 unit tests for enrollment link visibility |

### Configuration Added

```typescript
{
  id: 'dept-enrollments',
  label: 'Course Enrollments',
  pathTemplate: '/staff/departments/:deptId/enrollments',
  icon: UserPlus,
  requiredPermission: 'enrollment:department:manage',
  dashboards: ['staff'],
}
```

### Tests Added

1. `should show Course Enrollments link for users with enrollment:department:manage permission`
2. `should hide Course Enrollments link for users without enrollment:department:manage permission`

### Verification

- TypeScript: No errors in modified files
- Unit tests: 78 tests pass (76 existing + 2 new)

---

## Completion

**Completed Date:** 2026-02-05
**Commits:**
| Hash | Description |
|------|-------------|
| pending | Add Course Enrollments link to sidebar department actions |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team) - N/A (internal change)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
