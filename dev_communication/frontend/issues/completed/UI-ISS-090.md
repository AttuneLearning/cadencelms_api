# UI-ISS-090: Course Player Fetches Wrong Enrollment

## Status: PENDING
## Priority: Critical
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-089

---

## Overview

`CoursePlayerPage` calls `useEnrollments({ limit: 1 })` which returns the learner's **first** enrollment regardless of course. If the learner is enrolled in multiple courses, the wrong enrollment is used for content attempts and progress tracking.

---

## Requirements

1. Course player must fetch the enrollment matching the current `courseId` from the URL
2. Content attempts and progress must be scoped to the correct enrollment

---

## Technical Specification

### Current Behavior (Line 35–38 of CoursePlayerPage.tsx)

```tsx
const { data: enrollmentsData } = useEnrollments({ limit: 1 });
const enrollment = enrollmentsData?.enrollments?.[0];
```

Returns a random enrollment, not the one for the current course.

### Expected Behavior

```tsx
const { data: enrollmentsData } = useEnrollments({ courseId, limit: 1 });
const enrollment = enrollmentsData?.enrollments?.[0];
```

Filter by the `courseId` from `useParams()` so the correct enrollment is used.

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/player/CoursePlayerPage.tsx` | Modify | Line 35: Add `courseId` filter to `useEnrollments()` |

### Approach

1. Check if `useEnrollments` supports a `courseId` or `targetId` filter parameter
2. If yes: add `courseId` to the query params
3. If no: check if a `useEnrollmentByCourse(courseId)` hook exists, or filter client-side

---

## Tests Required

1. [ ] Player loads correct enrollment for current course
2. [ ] Player with multi-enrolled learner uses the right enrollment
3. [ ] Content attempts are recorded against the correct enrollment

---

## Acceptance Criteria

- [ ] Enrollment fetched in CoursePlayerPage matches the `courseId` URL param
- [ ] Content attempts record against the correct enrollment
- [ ] Works correctly for learners enrolled in multiple courses

---

## Questions / Clarifications

1. **Does `useEnrollments` support `courseId` filter?** Check the enrollment entity API params to confirm. See API message `2026-02-07_learner-course-player-api-verification.md`.

---

## Implementation Notes

Must be fixed alongside UI-ISS-089 since they both affect the course player experience. Depends on API confirmation of enrollment filter params.

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
