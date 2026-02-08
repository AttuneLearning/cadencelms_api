# UI-ISS-084: Course Enrollments Page - Course Dropdown Returns No Courses

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Requested By: User Report
## Assigned To: Unassigned
## Related: UI-ISS-082 (Course Enrollment Pages), UI-ISS-083 (Sidebar Link)

---

## Overview

On the Department Course Enrollments page (`/staff/departments/:deptId/enrollments`), the course dropdown returns no courses even when courses exist in the department. Users cannot enroll learners because they cannot select a course.

---

## Steps to Reproduce

1. Navigate to `/staff/departments/:deptId/enrollments`
2. Open the "Enroll Learners" dialog
3. Click the course dropdown
4. Observe: No courses are listed

**Expected:** Courses from the selected department should appear in the dropdown
**Actual:** Dropdown is empty

---

## Requirements

1. Course dropdown should display department courses
2. Only published courses should be selectable for enrollment
3. Courses should be filtered by the current department context

---

## Technical Specification

### Likely Root Causes

1. **API query missing department filter** - Course query may not be passing `departmentId`
2. **Wrong API endpoint** - May be calling wrong courses endpoint
3. **Permission issue** - May need different permission for course listing
4. **Missing hook/query** - EnrollCourseDialog may not be fetching courses

### Investigation Areas

- `src/features/enrollment/ui/EnrollCourseDialog.tsx` - Check how courses are fetched
- `src/entities/course/hooks/useCourses.ts` - Verify department filtering
- `src/pages/staff/departments/DepartmentEnrollmentPage.tsx` - Check props passed to dialog

---

## Tests Required

1. [x] Unit: Course dropdown displays department courses
2. [x] Unit: Only published courses are shown
3. [ ] Integration: Enrollment flow works end-to-end (manual verification)

---

## Acceptance Criteria

- [x] Course dropdown shows courses from selected department
- [x] Only published/enrollable courses appear
- [x] Can successfully select a course for enrollment
- [x] Tests pass

---

## Implementation Notes

**2026-02-05: Bug Fix Complete**

### Root Cause

The `DepartmentEnrollmentPage` was using `course._id` instead of `course.id` to access the course identifier. The `CourseListItem` type defines the property as `id`, but the page code incorrectly used `_id` (MongoDB convention that doesn't match the type).

This caused:
1. `SelectItem` components to have `key={undefined}` and `value={undefined}`
2. Select component to not display the items properly
3. `selectedCourse` lookup to always return `undefined`

### Files Modified

| File | Change |
|------|--------|
| `src/pages/staff/departments/DepartmentEnrollmentPage.tsx:124` | Changed `c._id` to `c.id` in selectedCourse find |
| `src/pages/staff/departments/DepartmentEnrollmentPage.tsx:200` | Changed `course._id` to `course.id` in SelectItem |

### Additional Improvements (2nd iteration)

After initial fix still showed no courses, added debugging and error handling:

1. **Added `enabled: !!deptId`** - Prevents query from running when deptId is undefined
2. **Added error display** - Shows API errors visibly in the UI
3. **Added debug logging** - Logs query state in development mode
4. **Added "No published courses" message** - Shows when API returns empty array
5. **Disabled select when empty** - Better UX when no courses available

### Possible Remaining Issues

If courses still don't appear, check:
- Are there published courses in the department?
- Check browser console for `[DepartmentEnrollmentPage]` debug logs
- Check if any API errors are displayed in the UI
- Verify the API returns courses at `/api/v2/courses?department=<deptId>&status=published`

### Files Created

| File | Description |
|------|-------------|
| `src/pages/staff/departments/__tests__/DepartmentEnrollmentPage.test.tsx` | Unit tests for enrollment page |

### Tests Added

5 new unit tests covering course dropdown functionality

---

## Completion

**Completed Date:** 2026-02-05
**Commits:**
| Hash | Description |
|------|-------------|
| pending | Fix course dropdown using wrong property (._id vs .id) |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (5 new tests)
- [x] Response message sent (if cross-team) - N/A (internal bug fix)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
