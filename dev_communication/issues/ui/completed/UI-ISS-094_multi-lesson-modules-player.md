# UI-ISS-094: Multi-Lesson Module Support in Course Player

## Status: COMPLETE
## Priority: Critical
## Created: 2026-02-07
## Updated: 2026-02-08
## Requested By: Internal
## Assigned To: Claude
## Related: UI-ISS-082, Phase 9 Track B
## Category: Critical Gap - Learner Experience

---

## Overview

The course player currently maps 1 module = 1 lesson, collapsing the module→lesson hierarchy. Real courses need multiple content items per module (e.g., video → reading → quiz within a single module). The data model and `PlayerSidebar` already support the nested structure, but `CoursePlayerPage` flattens it. This must be fixed for courses to function correctly with real course content.

---

## Requirements

1. Support multiple lessons within a single module in the course player
2. Player sidebar must render expandable modules with nested lesson lists
3. Navigation (previous/next) must traverse lessons within a module before moving to the next module
4. Module-level progress should aggregate from child lesson completion
5. Module locking should apply at the module level (all lessons in a locked module are inaccessible)
6. Individual lesson completion should be tracked and reflected with status icons (not started, in progress, completed)
7. Deep-linking to a specific lesson within a module via URL params must work
8. Breadcrumb should show: Course > Module > Lesson

---

## Technical Specification

### Current Behavior
- `CoursePlayerPage` maps each module to a single lesson with the same ID
- Sidebar shows a flat list of modules, each acting as a single lesson

### Required Behavior
- `CoursePlayerPage` preserves the module → lessons hierarchy from the course data
- Sidebar shows expandable modules, each containing their child lessons
- Navigation controls step through lessons within modules sequentially
- Route: `/learner/courses/:courseId/player/:moduleId/:lessonId`

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/CoursePlayerPage.tsx` | Modify | Preserve module→lesson hierarchy instead of flattening |
| `src/widgets/course-player/ui/PlayerSidebar.tsx` | Modify | Render nested module→lesson tree with expand/collapse |
| `src/widgets/course-player/ui/PlayerNavigation.tsx` | Modify | Navigate through lessons within modules sequentially |
| `src/widgets/course-player/model/` | Modify | Update state/logic for multi-lesson navigation |

### Approach

1. Update the data mapping in `CoursePlayerPage` to preserve the full module→lessons hierarchy from the API response
2. Modify `PlayerSidebar` to render modules as expandable sections with nested lesson items
3. Update `PlayerNavigation` to flatten the module→lesson structure into a sequential list for prev/next traversal
4. Ensure module completion is calculated from child lesson completions
5. Update URL routing to include both `moduleId` and `lessonId`

---

## Tests Required

1. [ ] Multiple lessons render within a single module in sidebar
2. [ ] Clicking a lesson within a module navigates to correct content
3. [ ] Previous/Next navigates through lessons within module, then to next module
4. [ ] Module progress bar reflects aggregate lesson completion
5. [ ] Locked module prevents access to all child lessons
6. [ ] Deep-link to specific module/lesson loads correctly
7. [ ] Single-lesson modules still work correctly (backward compatibility)
8. [ ] Breadcrumb displays Course > Module > Lesson hierarchy

---

## Acceptance Criteria

- [ ] Course player supports modules with 1+ lessons each
- [ ] Sidebar shows expandable module sections with lesson items
- [ ] Navigation traverses all lessons in correct order across modules
- [ ] Module progress is calculated from child lesson completion
- [ ] Existing single-lesson-per-module courses still work
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Does the API already return lessons nested within modules?**
   Verify the course content API response structure. The entity types support it, but confirm the actual API response shape.

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
