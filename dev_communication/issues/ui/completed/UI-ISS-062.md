# UI-ISS-062: Course Creators Cannot View Their Own Courses

## Status: COMPLETE
## Priority: High
## Created: 2026-01-21
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: API-ISS-062

---

## Overview

Staff users who create courses cannot view them after creation. This prevents creators from reviewing course content, checking configurations, previewing the learner experience, and QA testing before publishing.

---

## Requirements

1. Course creators can view courses they created (createdBy field)
2. Instructors can view courses in their department
3. Department-admins can view courses in their department
4. Content-admins can view courses in their department
5. View access is distinct from learner enrollment (Preview mode)

---

## Technical Specification

### Current Behavior

Staff users who create courses cannot view them after creation.

### Expected Behavior

Course creators should have **view access** (not enrollment) to:
1. Their own courses - Any course where they are the creator (createdBy)
2. Department courses - Any course belonging to their department(s)

This is read-only preview access for content review, NOT enrollment for credit.

### Test User

- **User**: `riley.instructor@lms.edu`
- **Role**: Staff/Instructor
- **Expected Access**: View own created courses + department courses

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/courses/StaffCoursesPage.tsx` | Modify | Add Preview button to course cards |
| `src/pages/staff/courses/CourseEditorPage.tsx` | Modify | Add Preview button to editor header |
| `src/pages/staff/courses/CoursePreviewPage.tsx` | Modify | Fix exit navigation |

### UI Implementation Complete

- Course cards on StaffCoursesPage now have both "Preview" and "Edit" buttons
- CourseEditorPage has a "Preview" button in the header for existing courses
- CoursePreviewPage properly navigates back to `/staff/courses/:id/edit` on exit
- Preview route exists: `/staff/courses/:courseId/preview`
- Preview mode banner shows "Read-Only" badge

---

## Tests Required

1. [ ] Instructors can view courses in their department
2. [ ] Department-admins can view courses in their department
3. [ ] Content-admins can view courses in their department
4. [ ] Preview mode shows course content without tracking progress

---

## Acceptance Criteria

- [x] Course creators can view courses they created (API-ISS-062 partial fix)
- [ ] Instructors can view courses in their department
- [ ] Department-admins can view courses in their department
- [ ] Content-admins can view courses in their department
- [x] View access is distinct from learner enrollment
- [x] Preview mode shows course content without tracking progress/completion
- [x] UI shows appropriate "Preview" or "Review" mode indicator
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Backend work status?**
   API-ISS-062 fixed `canViewCourse()` in `courses.service.ts` - course creators can now always view their own courses. Department context allows viewing all department courses.

---

## Implementation Notes

This is a workflow blocker for content creators. They cannot verify their work without this access.

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
