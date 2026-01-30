# Message: Enhanced Exercise Types API Request

**Date:** 2026-01-28
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Request
**Related Issues:** UI-ISS-071, UI-ISS-072
**Reference Spec:** `agent_coms/ui/specs/ENHANCED_EXERCISE_DELIVERY_SPEC.md`

---

## Summary

The UI team is blocked on implementing Flashcard Deck and Matching Game authoring pages. The `ENHANCED_EXERCISE_DELIVERY_SPEC.md` defines these as new exercise types, but the API currently only supports `'quiz' | 'exam' | 'practice' | 'assessment'`.

---

## Request

Please implement the following API changes to unblock UI work:

### 1. ExerciseType Enum Update

**Current:**
```typescript
type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment';
```

**Requested:**
```typescript
type ExerciseType =
  | 'quiz' | 'exam' | 'practice' | 'assessment'  // existing
  | 'flashcard' | 'matching';                      // new
```

### 2. Flashcard Exercise Support (UI-ISS-071)

**Data Structures Needed:**
- `FlashcardItem` - card with front/back MediaContent, hints, tags, difficulty
- `FlashcardExerciseConfig` - cards array, shuffle, trackMastery, masteryThreshold, sessionSize
- `FlashcardProgress` - per-card tracking with spaced repetition fields

**Endpoints Needed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v2/exercises/:id/flashcard-session` | Get cards for study session |
| POST | `/api/v2/exercises/:id/flashcard-result` | Record card result (correct/incorrect) |
| GET | `/api/v2/exercises/:id/flashcard-progress` | Get learner's mastery progress |
| DELETE | `/api/v2/exercises/:id/flashcard-progress` | Reset progress |

### 3. Matching Exercise Support (UI-ISS-072)

**Data Structures Needed:**
- `MatchingPair` - columnA/columnB with MediaContent support, explanation
- `MatchingExerciseConfig` - pairs array, shuffleColumnB, allowPartialCredit, showFeedbackOnDrop, maxAttempts, timeLimit

**Note:** The existing `MatchingQuestion` component handles matching as a **question type** within quizzes. This request is for **standalone matching exercises** with drag-and-drop interaction.

---

## Priority Rationale

- **Flashcard decks** are a common learning activity type requested for memorization/recall training
- **Matching games** provide interactive practice beyond traditional quiz formats
- Both are defined in the existing spec but not yet implemented

---

## Questions for API Team

1. Is the spec in `ENHANCED_EXERCISE_DELIVERY_SPEC.md` approved for implementation?
2. Should we create separate API issues (API-ISS-XXX) for tracking this work?
3. Estimated timeline for availability?

---

## Response Requested

Please confirm receipt and provide:
- Acceptance of the request
- Any clarifications needed on the spec
- Rough timeline or sprint planning info

---

*Message from UI Team - 2026-01-28*
