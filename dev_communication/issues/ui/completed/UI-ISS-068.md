# UI-ISS-068: Create Learning Activity Page Needed

## Status: COMPLETE
## Priority: High
## Created: 2026-01-22
## Updated: 2026-01-28
## Completed: 2026-01-28
## Requested By: UI Team
## Assigned To: Implemented
## Related: None

---

## Overview

Staff cannot add a Learning Activity (Learning Unit) to a Module. The Module Editor currently shows lessons with mock data and provides edit/remove actions, but there is no create/add flow. This blocks course authors from attaching activities (content, exercises, assessments) to modules.

---

## Requirements

1. Staff can create a Learning Activity/Unit from within the Module Editor or a dedicated page
2. The new activity is associated with the selected module
3. Activity type selection (content, exercise, assessment, etc.)
4. Required metadata collection
5. Return to Module Editor with new activity listed

---

## Technical Specification

### Evidence

- `src/pages/staff/courses/ModuleEditorPage.tsx` initializes lessons with an empty `mockLessons` array and has no create/add UI
- `src/features/courses/ui/ModuleList.tsx` notes that content types live on Learning Units, not modules, but there is no page to create those units

### Suggested UI/Flow

1. Add a "Create Learning Activity" CTA on ModuleEditorPage (next to "Add Lesson" / in the header)
2. Route to a new page (e.g., `src/pages/staff/courses/CreateLearningActivityPage.tsx`)
3. Provide activity type selection and required metadata
4. On save, return to Module Editor and list the new activity

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/courses/ModuleEditorPage.tsx` | Modify | Add "Create Learning Activity" CTA |
| `src/pages/staff/courses/CreateLearningActivityPage.tsx` | Create | New page for creating activities |
| `src/features/courses/ui/ModuleList.tsx` | Modify | Support activity creation |

### Approach

Add CTA button, create new page with activity type selection and form, wire up to API.

---

## Tests Required

1. [ ] "Create Learning Activity" CTA is visible on Module Editor
2. [ ] Activity type selection works
3. [ ] New activity is saved and appears in module list
4. [ ] Navigation returns to Module Editor after save

---

## Acceptance Criteria

- [ ] Staff can create a Learning Activity from Module Editor
- [ ] Activity type can be selected
- [ ] Required metadata can be entered
- [ ] Activity is associated with correct module
- [ ] Activity appears in module's activity list after save
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

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

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
