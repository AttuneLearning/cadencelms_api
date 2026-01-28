# UI-ISS-071: Missing Create Flashcard Deck page for authoring flashcards

**Date:** 2026-01-22
**Reporter:** User
**Priority:** Medium
**Status:** Open

## Description

There is no Create Flashcard Deck page for staff to author flashcard activities and attach them to modules/learning units. This blocks creation of flashcard-based learning activities in the UI.

## Evidence

- No flashcard authoring page exists under `src/pages/staff`.
- Exercise-related specs mention flashcards, but there is no UI entry point to create a deck.

## Expected Behavior

- Staff can create a flashcard deck from a dedicated page.
- Deck includes title, description, tags, and a list of cards.
- Cards support front/back content and optional hints.
- Deck can be associated with a module/learning unit.

## Suggested UI/Flow

1. Add "Create Flashcard Deck" CTA in module authoring flows.
2. Create a new page (e.g., `src/pages/staff/activities/CreateFlashcardDeckPage.tsx`).
3. Provide deck metadata fields and a card editor with add/reorder/delete.
4. Save and return to module editor with the deck attached.

## Related Files

- `api/agent_coms/ui/specs/ENHANCED_EXERCISE_DELIVERY_SPEC.md`
- (New) `src/pages/staff/activities/CreateFlashcardDeckPage.tsx`
