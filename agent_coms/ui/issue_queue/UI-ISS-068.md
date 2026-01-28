# UI-ISS-068: No UI flow to add a Learning Activity to a Module (Create Learning Activity page needed)

**Date:** 2026-01-22
**Reporter:** User
**Priority:** High
**Status:** Open

## Description

Staff cannot add a Learning Activity (Learning Unit) to a Module. The Module Editor currently shows lessons with mock data and provides edit/remove actions, but there is no create/add flow. This blocks course authors from attaching activities (content, exercises, assessments) to modules.

## Evidence

- `src/pages/staff/courses/ModuleEditorPage.tsx` initializes lessons with an empty `mockLessons` array and has no create/add UI.
- `src/features/courses/ui/ModuleList.tsx` notes that content types live on Learning Units, not modules, but there is no page to create those units.

## Expected Behavior

- Staff can create a Learning Activity/Unit from within the Module Editor or a dedicated Create Learning Activity page.
- The new activity is associated with the selected module and appears in the module's activity list.

## Suggested UI/Flow

1. Add a "Create Learning Activity" CTA on `ModuleEditorPage` (next to "Add Lesson" / in the header).
2. Route to a new page (e.g., `src/pages/staff/courses/CreateLearningActivityPage.tsx`).
3. Provide activity type selection (content, exercise, assessment, etc.) and required metadata.
4. On save, return to Module Editor and list the new activity.

## Related Files

- `src/pages/staff/courses/ModuleEditorPage.tsx`
- `src/features/courses/ui/ModuleList.tsx`
- (New) `src/pages/staff/courses/CreateLearningActivityPage.tsx`
