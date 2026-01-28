# UI-ISS-072: Missing Create Matching Game page for authoring matching activities

**Date:** 2026-01-22
**Reporter:** User
**Priority:** Medium
**Status:** Open

## Description

There is no Create Matching Game page for staff to author matching activities and attach them to modules/learning units. This blocks matching-style practice activities in the UI.

## Evidence

- No matching game authoring page exists under `src/pages/staff`.
- Exercise specs mention matching activities, but there is no UI entry point to create them.

## Expected Behavior

- Staff can create a matching game from a dedicated page.
- Activity includes title, description, and a list of pairs (left/right).
- Supports add/reorder/delete of pairs and optional hints.
- Activity can be associated with a module/learning unit.

## Suggested UI/Flow

1. Add "Create Matching Game" CTA in module authoring flows.
2. Create a new page (e.g., `src/pages/staff/activities/CreateMatchingGamePage.tsx`).
3. Provide metadata fields and a pair editor with add/reorder/delete.
4. Save and return to module editor with the activity attached.

## Related Files

- `api/agent_coms/ui/specs/ENHANCED_EXERCISE_DELIVERY_SPEC.md`
- (New) `src/pages/staff/activities/CreateMatchingGamePage.tsx`
