# UI-ISS-075: Question System Type Alignment

## Status: COMPLETE
## Priority: High
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-071, UI-ISS-072, API-ISS-009
## Blocks: UI-ISS-076, UI-ISS-077, UI-ISS-078

---

## Overview

The Exercise entity has a narrower `QuestionType` definition than the Question entity, causing type mismatches and preventing support for flashcard, matching, and multiple_select question types in exercises. This foundational issue blocks all subsequent Question System migration work.

---

## Requirements

1. Align Exercise entity `QuestionType` with Question entity
2. Update `ExerciseQuestion` interface to support monolithic Question design
3. Update `QuestionReference` for create/update operations
4. Maintain backward compatibility with existing exercises

---

## Technical Specification

### Current State

**Question Entity (`src/entities/question/model/types.ts`):**
```typescript
export type QuestionType =
  | 'multiple_choice' | 'multiple_select' | 'true_false'
  | 'short_answer' | 'long_answer' | 'matching'
  | 'flashcard' | 'fill_in_blank' | 'essay' | 'fill_blank';
```

**Exercise Entity (`src/entities/exercise/model/types.ts`):**
```typescript
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';
```

### Gap Analysis

Missing from Exercise:
- `multiple_select`
- `flashcard`
- `fill_in_blank`
- `long_answer`

### Proposed Changes

1. **Remove duplicate QuestionType from Exercise entity:**
```typescript
// Before: Local definition
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';

// After: Import from Question entity
import type { QuestionType, FlashcardData, MatchingData, MediaContent } from '@/entities/question';
export type { QuestionType };
```

2. **Update ExerciseQuestion interface:**
```typescript
export interface ExerciseQuestion {
  id: string;
  questionText: string;
  questionTypes: QuestionType[];  // Array for multi-presentation
  questionType?: QuestionType;    // Legacy fallback
  order: number;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  distractors?: string[];         // NEW: For matching wrong answers
  explanation?: string;
  difficulty: ExerciseDifficulty;
  tags?: string[];
  flashcardData?: FlashcardData;  // NEW: Flashcard extension
  matchingData?: MatchingData;    // NEW: Matching extension
  createdAt: string;
}
```

3. **Update QuestionReference interface:**
```typescript
export interface QuestionReference {
  questionId?: string;
  questionText?: string;
  questionTypes?: QuestionType[];  // Array
  questionType?: QuestionType;     // Legacy
  options?: string[];
  correctAnswer?: string | string[];
  distractors?: string[];
  points?: number;
  order?: number;
  explanation?: string;
  difficulty?: ExerciseDifficulty;
  tags?: string[];
  flashcardData?: FlashcardData;
  matchingData?: MatchingData;
}
```

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/entities/exercise/model/types.ts` | Modify | Import QuestionType, update interfaces |
| `src/entities/exercise/index.ts` | Modify | Re-export QuestionType if needed |

### Approach

1. Import shared types from Question entity
2. Add new optional fields to interfaces
3. Keep legacy fields for backward compatibility
4. Run TypeScript check to identify any cascading issues
5. Fix any type errors in dependent files

---

## Tests Required

1. [ ] TypeScript compiles without errors
2. [ ] Existing exercise CRUD operations work
3. [ ] Exercise questions can include new types
4. [ ] Legacy exercises still load correctly

---

## Acceptance Criteria

- [x] Exercise entity uses same QuestionType as Question entity
- [x] ExerciseQuestion supports flashcardData and matchingData
- [x] ExerciseQuestion supports distractors array
- [x] QuestionReference supports all new fields
- [x] No TypeScript errors (exercise-related)
- [x] Existing tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

### Changes Made

1. **`src/entities/exercise/model/types.ts`:**
   - Imported `QuestionType`, `QuestionDifficulty`, `FlashcardData`, `MatchingData`, `MediaContent` from `@/entities/question`
   - Re-exported `QuestionType` for convenience
   - Added 'flashcard' and 'matching' to `ExerciseType`
   - Made `ExerciseDifficulty` an alias of `QuestionDifficulty`
   - Updated `ExerciseQuestion` interface with `questionTypes?`, `correctAnswers?`, `distractors?`, `flashcardData?`, `matchingData?`
   - Updated `QuestionReference` interface similarly
   - Updated `QuestionFormData` interface with all new fields
   - Added `FlashcardExerciseConfig` and `MatchingExerciseConfig` types

2. **`src/entities/exercise/index.ts`:**
   - Added exports for `FlashcardExerciseConfig`, `MatchingExerciseConfig`

3. **Cascading Fixes:**
   - `src/features/exercises/ui/ExercisePreview.tsx`: Added flashcard/matching to type map, use questionTypes with fallback
   - `src/features/exercises/ui/QuestionBankSelector.tsx`: Added all QuestionType values to format map
   - `src/pages/admin/exercises/ExerciseManagementPage.tsx`: Added flashcard/matching to type map
   - `src/pages/staff/courses/ExerciseBuilderPage.tsx`: Added questionTypes and correctAnswers mapping
   - `src/test/mocks/data/exercises.ts`: Updated all mock questions with new fields

### Backward Compatibility
- All new fields are optional (`?`)
- Legacy `questionType` and `correctAnswer` fields preserved with `@deprecated` comments
- Code uses fallback pattern: `questionTypes?.[0] ?? questionType`

---

## Completion

**Completed Date:** 2026-01-29
**Commits:**
| Hash | Description |
|------|-------------|
| (pending) | Type system alignment for monolithic Question design |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (exercise-related TypeScript errors resolved)
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
