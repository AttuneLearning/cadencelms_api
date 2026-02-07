# UI-ISS-089: Fix Broken `/play` Route Links — Should Be `/player`

## Status: PENDING
## Priority: Critical
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: N/A

---

## Overview

Two learner pages link to `/learner/courses/:courseId/play` which does not exist in the router. The correct route is `/learner/courses/:courseId/player`. Clicking "Continue Learning" on the dashboard or department enrollments page results in a 404.

---

## Requirements

1. All "Continue Learning" / "Play" links must point to `/learner/courses/:courseId/player`
2. No `/play` route references should remain in the codebase

---

## Technical Specification

### Current Behavior

- Clicking "Continue Learning" on the dashboard navigates to `/learner/courses/{id}/play` → **404**
- Clicking "Continue Learning" on department enrollments navigates to `/learner/courses/{id}/play` → **404**

### Expected Behavior

Both links navigate to `/learner/courses/{id}/player`, which is the route defined in the router.

### Correct Behavior Already In Place

- `MyLearningPage.tsx` (line 374): uses `/player` ✅
- `ProgressDashboardPage.tsx` (line 483): uses `/player` ✅
- `CoursePlayerPage.tsx` (line 100): navigates to `/player` ✅

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/dashboard/LearnerDashboardPage.tsx` | Modify | Line 163: Change `/play` to `/player` |
| `src/pages/learner/departments/LearnerDepartmentEnrollmentsPage.tsx` | Modify | Line 207: Change `/play` to `/player` |

### Approach

- **Before:** `` `/learner/courses/${enrollment.target.id}/play` ``
- **After:** `` `/learner/courses/${enrollment.target.id}/player` ``

---

## Tests Required

1. [ ] Clicking "Continue Learning" on dashboard navigates to course player
2. [ ] Clicking "Continue Learning" on department enrollments navigates to course player

---

## Acceptance Criteria

- [ ] No `/play` route references remain in learner pages
- [ ] Dashboard "Continue Learning" opens the course player
- [ ] Department enrollments "Continue Learning" opens the course player
- [ ] Existing tests pass

---

## Implementation Notes

Two-line fix. No API changes. No backwards compatibility.

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

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
