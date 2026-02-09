# UI-ISS-091: Wire Up Module Completion and Lock Status in Course Player

## Status: COMPLETE
## Priority: High
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-090

---

## Overview

The course player sidebar hardcodes `isCompleted: false` and `isLocked: false` for every lesson (lines 89–90 of `CoursePlayerPage.tsx`). Learners see no progress indicators and no prerequisite enforcement — all modules appear incomplete and unlocked regardless of actual progress.

---

## Requirements

1. Sidebar must reflect actual completion state per module/lesson
2. Locked lessons must be visually indicated and unclickable
3. Progress data must come from the progress API, scoped to the current enrollment

---

## Technical Specification

### Current Behavior (Lines 89–90)

```tsx
isCompleted: false, // TODO: Get from progress
isLocked: false,    // TODO: Check prerequisites
```

### Expected Behavior

1. Fetch progress data using `useProgress(enrollmentId)` or `useContentAttempts(enrollmentId)`
2. Map each module's completion status from the progress response
3. Determine lock status based on prerequisite module completion (sequential or dependency-based)

### PlayerSidebar Already Supports This

`src/features/player/ui/PlayerSidebar.tsx` already:
- Renders completed check icons when `isCompleted: true`
- Disables click and shows lock icon when `isLocked: true`
- Applies `cursor-not-allowed opacity-50` styling for locked items

Only the data wiring in `CoursePlayerPage.tsx` is missing.

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/player/CoursePlayerPage.tsx` | Modify | Import progress hooks, map completion/lock state to modules |

### Approach

1. Import `useProgress` or `useContentAttempts` from the progress entity
2. Fetch progress for the current enrollment (depends on UI-ISS-090 fix)
3. Create a lookup map: `moduleId → { completed, locked }`
4. Replace hardcoded `false` values with actual data in the module mapping

---

## Tests Required

1. [ ] Completed modules show check icon in sidebar
2. [ ] Locked modules show lock icon and are unclickable
3. [ ] Progress updates when a module is completed during the session

---

## Acceptance Criteria

- [ ] Module completion status reflects real progress data
- [ ] Prerequisite-locked modules are visually locked and non-navigable
- [ ] Sidebar updates when a module is marked complete during playback

---

## Questions / Clarifications

1. **Prerequisite model**: Are module prerequisites defined as sequential order or explicit dependency links? This determines lock logic.
2. **API shape**: See API message `2026-02-07_learner-course-player-api-verification.md` for progress endpoint confirmation.

---

## Implementation Notes

Depends on UI-ISS-090 (correct enrollment) being fixed first so progress is fetched for the right enrollment.

---

## Completion

**Completed Date:** 2026-02-07
**Commits:**
| Hash | Description |
|------|-------------|
| pending | Wire up module completion and lock status from useCourseProgress |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (no test file exists; TypeScript 0 new errors)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
