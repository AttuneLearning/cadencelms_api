# UI-ISS-095: Course Completion Flow & Celebration

## Status: PENDING
## Priority: Critical
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-094, UI-ISS-097
## Category: Critical Gap - Learner Experience

---

## Overview

When a learner finishes the last lesson/module in a course, there is no completion experience. The learner simply finishes a lesson and nothing happens. There needs to be:

1. A "Congratulations!" completion screen when all modules/lessons are done
2. Automatic enrollment status update to "completed"
3. Transition to certificate view (if certificates are enabled for the course/program)
4. Option to return to dashboard or view course summary
5. Learning event logged for course completion

---

## Requirements

1. Detect when a learner completes the final content item in a course
2. Display a course completion celebration screen/modal
3. Show completion stats: final grade/score, time spent, lessons completed, date
4. If certificate is enabled: show "View Your Certificate" CTA linking to certificate page
5. If certificate is NOT enabled: show "Back to Dashboard" and "View Course Summary" CTAs
6. Trigger enrollment status update to `completed` via API
7. Log a `course_completed` learning event
8. Show completion state in the player sidebar (all items marked complete)
9. Handle edge cases: course already completed, revisiting completed course

---

## Technical Specification

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/course-player/ui/CourseCompletionScreen.tsx` | Create | Celebration screen with stats, CTAs |
| `src/pages/learner/CoursePlayerPage.tsx` | Modify | Detect completion, show completion screen |
| `src/widgets/course-player/ui/PlayerNavigation.tsx` | Modify | "Complete Course" button on final lesson |
| `src/entities/enrollment/api/enrollmentApi.ts` | Verify | Ensure completion endpoint exists |
| `src/entities/learning-event/api/` | Verify | Ensure course_completed event type supported |

### Approach

1. Add completion detection: when the final content item in the final module is marked complete, trigger the completion flow
2. Create `CourseCompletionScreen` component with:
   - Confetti/celebration animation
   - Course name, final score/grade
   - Time spent summary
   - Lessons/modules completed count
   - Certificate CTA or dashboard CTA
3. Replace the player content area with the completion screen
4. "Complete Course" button on `PlayerNavigation` replaces "Next" on the final lesson
5. On completion trigger, call enrollment completion API + log learning event

---

## Tests Required

1. [ ] Completion screen appears after finishing final lesson
2. [ ] Completion stats display correctly (score, time, count)
3. [ ] Certificate CTA appears when certificate is enabled
4. [ ] Dashboard CTA appears when no certificate
5. [ ] Enrollment status updates to completed
6. [ ] Learning event is logged
7. [ ] Revisiting a completed course shows completed state (not re-triggering completion)
8. [ ] "Complete Course" button appears on final lesson navigation

---

## Acceptance Criteria

- [ ] Learner sees a celebration screen upon completing all course content
- [ ] Completion screen shows relevant stats and next-step CTAs
- [ ] Enrollment is marked as completed in the system
- [ ] Certificate link works when certificates are enabled
- [ ] Edge cases handled (revisit, already completed)
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Is course completion triggered client-side or server-side?**
   Need to confirm if the API auto-completes the enrollment when all content is done, or if the UI must explicitly call a completion endpoint.

---

## Implementation Notes

*Add notes during implementation*

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

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
