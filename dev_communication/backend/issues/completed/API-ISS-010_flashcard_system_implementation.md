# API-ISS-010: Flashcard System Implementation

## Status: PENDING
## Priority: High
## Created: 2026-01-28
## Updated: 2026-01-28
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-009, API-ISS-012, API-ISS-013, UI-ISS-071
## Depends-On: API-ISS-009 (Question Model Update)

---

## Overview

Implement the flashcard system that enables learners to practice and retain knowledge through spaced repetition. Flashcards are built from Questions that have `'flashcard'` in their `questionTypes` array.

**Key Design**: Flashcards use the monolithic Question model. The `questionText` becomes the front of the card, `correctAnswers[0]` becomes the back. Optional `flashcardData.prompts[]` provides alternative front-of-card variations.

See: `dev_communication/specs/learning/FLASHCARD_FLOW_SPEC.md`

---

## Requirements

1. Flashcard session API for in-module practice
2. SM-2 spaced repetition algorithm implementation
3. Per-learner, per-card progress tracking
4. Course-level flashcard configuration
5. Support for prompt rotation (same answer, different questions)
6. Integration with Question model (no separate FlashcardItem collection)

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/courses/:courseId/flashcard-config` | Get course flashcard settings |
| PUT | `/api/v2/courses/:courseId/flashcard-config` | Update flashcard settings |
| GET | `/api/v2/courses/:courseId/flashcard-session` | Get cards for practice |
| POST | `/api/v2/courses/:courseId/flashcard-result` | Record card result |
| GET | `/api/v2/courses/:courseId/flashcard-progress` | Get learner progress |
| DELETE | `/api/v2/courses/:courseId/flashcard-progress` | Reset progress |

### New Model: FlashcardProgress

```typescript
interface IFlashcardProgress {
  learnerId: ObjectId;
  courseId: ObjectId;
  questionId: ObjectId;        // Reference to Question document
  promptIndex: number;         // Which prompt variant (for rotation)

  // SM-2 Algorithm Fields
  easeFactor: number;          // Default 2.5
  interval: number;            // Days until next review
  repetitions: number;         // Consecutive correct

  // Stats
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewed: Date;
  nextReviewDate: Date;

  // Mastery
  mastered: boolean;
  masteredAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### New Model: CourseFlashcardConfig

```typescript
interface ICourseFlashcardConfig {
  courseId: ObjectId;
  enabled: boolean;
  flashcardsPerCheck: number;      // 0 = disabled retention checks
  failureThreshold: number;
  checkFrequency: 'every_module' | 'every_n_modules' | 'custom';
  checkFrequencyValue?: number;
  selectionMethod: 'random' | 'weighted_by_difficulty' | 'sm2_priority';
  requireContentReview: boolean;
  requireFinalRetake: boolean;
  includeOnlyCompletedModules: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### SM-2 Algorithm

```typescript
function calculateNextReview(quality: number, progress: FlashcardProgress) {
  let { easeFactor, interval, repetitions } = progress;

  if (quality >= 3) {  // Correct
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  } else {  // Incorrect
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, interval, repetitions };
}
```

### Flashcard Session Building

```typescript
async function getFlashcardSession(courseId, learnerId, moduleId?, sessionSize = 10) {
  // 1. Get questions with 'flashcard' in questionTypes for this module/course
  const questions = await Question.find({
    courseId,  // or via module relationship
    questionTypes: 'flashcard',
    isActive: true
  });

  // 2. Get learner progress for these questions
  const progress = await FlashcardProgress.find({
    learnerId,
    questionId: { $in: questions.map(q => q._id) }
  });

  // 3. Select cards due for review (SM-2 priority)
  const dueCards = selectDueCards(questions, progress, sessionSize);

  // 4. Render as flashcards with prompt rotation
  return dueCards.map(({ question, promptIndex }) => ({
    questionId: question._id,
    promptIndex,
    front: {
      text: question.flashcardData?.prompts?.[promptIndex]?.text || question.questionText,
      media: question.flashcardData?.prompts?.[promptIndex]?.media || question.flashcardData?.frontMedia
    },
    back: {
      text: question.correctAnswers[0],
      media: question.flashcardData?.backMedia
    },
    explanation: question.explanation,
    hints: question.hints,
    difficulty: question.difficulty
  }));
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/activity/FlashcardProgress.model.ts` | Create | Learner progress tracking |
| `src/models/content/CourseFlashcardConfig.model.ts` | Create | Course-level settings |
| `src/services/assessment/flashcard.service.ts` | Create | Flashcard business logic |
| `src/controllers/assessment/flashcard.controller.ts` | Create | Route handlers |
| `src/routes/flashcard.routes.ts` | Create | Route definitions |
| `src/utils/sm2-algorithm.ts` | Create | SM-2 implementation |
| `contracts/api/flashcards.contract.ts` | Update | Align with Question integration |
| `tests/integration/flashcard.test.ts` | Create | Integration tests |

### Approach

1. **Phase 1: Models**
   - Create FlashcardProgress model
   - Create CourseFlashcardConfig model
   - Add indexes for efficient queries

2. **Phase 2: SM-2 Algorithm**
   - Implement SM-2 calculation
   - Unit test algorithm thoroughly

3. **Phase 3: Service Layer**
   - Implement session building (pull from Questions)
   - Implement result recording
   - Implement progress queries

4. **Phase 4: API Endpoints**
   - Create routes and controllers
   - Add validation
   - Add authorization

5. **Phase 5: Integration**
   - Connect to Question model queries
   - Test with real question data

---

## Tests Required

1. [ ] SM-2 algorithm: correct answer increases interval
2. [ ] SM-2 algorithm: incorrect answer resets to 1 day
3. [ ] SM-2 algorithm: ease factor adjusts correctly
4. [ ] Session building: selects due cards
5. [ ] Session building: respects sessionSize
6. [ ] Session building: prompt rotation works
7. [ ] Result recording: updates progress
8. [ ] Result recording: detects mastery
9. [ ] Config: get/update course settings
10. [ ] Progress: returns correct summary stats
11. [ ] Progress reset: clears learner progress

---

## Acceptance Criteria

- [ ] FlashcardProgress model created with SM-2 fields
- [ ] CourseFlashcardConfig model created
- [ ] SM-2 algorithm implemented and tested
- [ ] Session endpoint returns cards from Questions
- [ ] Result endpoint updates progress correctly
- [ ] Prompt rotation works for varied practice
- [ ] Progress endpoint shows mastery stats
- [ ] All tests pass
- [ ] Contract aligned with implementation
- [ ] Code reviewed

---

## Questions / Clarifications

1. **How are flashcard questions associated with modules?**
   Via Question → Exercise → Module relationship, or direct moduleId on Question

2. **Should prompt rotation be random or sequential?**
   Random - better for learning

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
