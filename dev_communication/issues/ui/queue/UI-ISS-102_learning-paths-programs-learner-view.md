# UI-ISS-102: Learning Paths & Programs — Learner View

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-097, DEPARTMENT_PROGRAM_MANAGEMENT_SPEC
## Category: Next Phase — After Critical Gaps

---

## Overview

**Next-phase feature — implement after critical gaps (UI-ISS-094, 095, 096) are resolved.**

Programs/learning paths exist as an entity and have admin/staff management features, but there is no learner-facing experience. Learners need to:

1. Browse and enroll in programs (learning paths)
2. See their program progress (which courses are done, which are next)
3. Understand sequential progression (complete Course A → unlock Course B)
4. Earn a program-level certificate upon completing all courses in the program

---

## Requirements

### Program Discovery
1. "My Programs" / "Learning Paths" page accessible from learner sidebar
2. Program catalog: browse available programs with description, course count, duration estimate
3. Program detail page: view all courses in the program, prerequisites, certificate info

### Program Enrollment
4. Enroll in a program (which may auto-enroll in component courses or require individual enrollment)
5. Program enrollment status tracking

### Program Progress
6. "My Programs" dashboard showing enrolled programs with overall progress
7. Per-program progress view:
   - Visual course sequence (linear or branching path visualization)
   - Completed courses (checkmarks)
   - Current/next course (highlighted)
   - Locked courses (prerequisites not met)
   - Progress percentage across entire program
8. Direct "Continue" link to the next incomplete course

### Program Completion
9. Program completion triggers program-level certificate (ties to UI-ISS-097)
10. Celebration/completion screen for program completion

---

## Existing Infrastructure

- `src/entities/` has program-related entities
- DEPARTMENT_PROGRAM_MANAGEMENT_SPEC defines program structure
- Program certificate configuration exists in API (`PUT /api/v2/programs/:id/certificate`)
- Analytics endpoint exists (`/api/v2/programs/:id/analytics`)
- No learner-facing program pages exist currently

---

## Technical Considerations

- Program → Course ordering and prerequisite logic
- How program enrollment relates to individual course enrollments
- Visualization of course sequence (linear path, roadmap, or card grid)

---

## Dependencies

- Program entity must be fully implemented on API side
- UI-ISS-097 (certificate system) for program-level certificates
- Course prerequisite enforcement at program level

---

## Acceptance Criteria

- [ ] Design document produced with UX mockups
- [ ] API requirements confirmed/communicated
- [ ] Implementation issues created when prioritized

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
