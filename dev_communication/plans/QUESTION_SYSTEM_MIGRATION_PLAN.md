# Question System Migration Plan

## Monolithic Question Design Integration

**Date:** 2026-01-29
**Status:** PROPOSED
**Related Issues:** UI-ISS-071, UI-ISS-072, API-ISS-009
**Priority:** High

---

## Executive Summary

The API team has implemented a **monolithic Question design** where a single Question can support multiple presentations (quiz, flashcard, matching) without content duplication. The UI needs updates across exercise/quiz/exam pages to fully leverage this new architecture.

### Key Changes Required

1. **Type System Alignment** - Exercise entity uses narrower QuestionType than Question entity
2. **Form Updates** - QuestionForm missing flashcard/matching editors
3. **Renderer Updates** - QuestionRenderer missing flashcard/multiple_select/fill_in_blank components
4. **Data Model Migration** - Move from singular `questionType` to `questionTypes[]` array
5. **New Field Support** - Add UI for `flashcardData`, `matchingData`, `distractors`

---

## Current State Analysis

### Type Misalignment

| Entity | QuestionType Values |
|--------|---------------------|
| **Question** (updated) | `multiple_choice`, `multiple_select`, `true_false`, `short_answer`, `long_answer`, `matching`, `flashcard`, `fill_in_blank`, `essay`, `fill_blank` |
| **Exercise** (outdated) | `multiple_choice`, `true_false`, `short_answer`, `essay`, `matching` |

**Gap:** Exercise entity missing: `multiple_select`, `flashcard`, `fill_in_blank`, `long_answer`

### QuestionForm Coverage

| Type | Create/Edit Support | Notes |
|------|---------------------|-------|
| multiple_choice | Yes | Full support |
| true_false | Yes | Full support |
| short_answer | Yes | Full support |
| long_answer | Yes | As "Essay" |
| fill_in_blank | Yes | Basic support |
| matching | **NO** | No pair editor |
| flashcard | **NO** | No front/back editor |
| multiple_select | **NO** | Uses single-select UI |

### QuestionRenderer Coverage

| Type | Render Support | Notes |
|------|----------------|-------|
| multiple_choice | Yes | Full support |
| true_false | Yes | Full support |
| short_answer | Yes | Full support |
| essay | Yes | Full support |
| matching | Yes | MatchingQuestion component exists |
| flashcard | **NO** | No renderer |
| multiple_select | **NO** | No checkbox variant |
| fill_in_blank | **NO** | No inline input renderer |

---

## Affected Files

### Critical Path (Must Update)

| File | Changes Required |
|------|------------------|
| `src/entities/exercise/model/types.ts` | Align QuestionType with Question entity |
| `src/entities/question/ui/QuestionForm.tsx` | Add flashcard/matching/multiple_select editors |
| `src/features/exercises/ui/QuestionRenderer.tsx` | Add flashcard/multiple_select/fill_in_blank cases |
| `src/pages/admin/questions/QuestionBankPage.tsx` | Support new question types in create/edit |
| `src/pages/staff/courses/ExerciseBuilderPage.tsx` | Support new exercise configurations |

### Supporting Files

| File | Changes Required |
|------|------------------|
| `src/entities/question/model/types.ts` | Already updated - verify exports |
| `src/features/learning-activity-editor/model/question-types.ts` | Add new type configs |
| `src/features/learning-activity-editor/ui/question-bank/QuestionEditorModal.tsx` | Support new types |
| `src/test/mocks/data/questions.ts` | Update mock data for new structure |

### New Components Required

| Component | Location | Purpose |
|-----------|----------|---------|
| `FlashcardQuestion.tsx` | `src/features/exercises/ui/` | Render flashcard in learner view |
| `MultipleSelectQuestion.tsx` | `src/features/exercises/ui/` | Render checkbox-based multi-select |
| `FillInBlankQuestion.tsx` | `src/features/exercises/ui/` | Render inline blank inputs |
| `FlashcardEditor.tsx` | `src/features/flashcard-builder/` | Staff authoring for flashcards |
| `MatchingPairEditor.tsx` | `src/features/matching-builder/` | Staff authoring for matching pairs |

---

## Implementation Phases

### Phase 1: Type System Alignment (Foundation)

**Goal:** Ensure consistent types across all entities

**Tasks:**
1. Update `src/entities/exercise/model/types.ts`:
   ```typescript
   // Before
   export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';

   // After - Import from Question entity
   export type { QuestionType } from '@/entities/question';
   ```

2. Update `ExerciseQuestion` interface to support monolithic design:
   ```typescript
   export interface ExerciseQuestion {
     id: string;
     questionText: string;
     questionTypes: QuestionType[];  // Array, not singular
     questionType?: QuestionType;    // Legacy fallback
     // ... existing fields
     flashcardData?: FlashcardData;
     matchingData?: MatchingData;
     distractors?: string[];
   }
   ```

3. Update `QuestionReference` for create/update operations

**Files:**
- `src/entities/exercise/model/types.ts`
- `src/entities/exercise/index.ts` (exports)

**Estimated Scope:** Small - type changes only

---

### Phase 2: QuestionForm Enhancement

**Goal:** Enable creation/editing of all question types

**Tasks:**

1. **Add questionTypes multi-select:**
   ```typescript
   // Allow selecting multiple presentations
   <MultiSelect
     value={formData.questionTypes}
     options={[
       { value: 'multiple_choice', label: 'Multiple Choice' },
       { value: 'flashcard', label: 'Flashcard' },
       { value: 'matching', label: 'Matching' },
       // ...
     ]}
   />
   ```

2. **Add Flashcard Editor Section:**
   - Front content (questionText or custom)
   - Back content (correctAnswers[0] or custom)
   - Front media upload
   - Back media upload
   - Hints/prompts array

3. **Add Matching Pair Editor:**
   - Column A items (prompts)
   - Column B items (answers)
   - Distractors (wrong answers)
   - Drag-to-reorder pairs
   - Media support per column

4. **Add Multiple Select variant:**
   - Allow multiple `isCorrect` checkboxes
   - Validate at least one correct

5. **Update validation:**
   - Require flashcardData when type includes 'flashcard'
   - Require valid pairs when type includes 'matching'

**Files:**
- `src/entities/question/ui/QuestionForm.tsx`
- `src/entities/question/model/types.ts` (QuestionFormData update)

**Estimated Scope:** Large - significant form restructure

---

### Phase 3: QuestionRenderer Enhancement

**Goal:** Render all question types for learners

**Tasks:**

1. **Create FlashcardQuestion component:**
   ```tsx
   // Card flip animation
   // Front: questionText + frontMedia
   // Back: correctAnswers[0] + backMedia
   // Self-assessment buttons: "Got it" / "Need review"
   ```

2. **Create MultipleSelectQuestion component:**
   ```tsx
   // Checkbox-based selection (vs radio for multiple_choice)
   // Multiple correct answers
   // Partial credit support
   ```

3. **Create FillInBlankQuestion component:**
   ```tsx
   // Parse questionText for [blank] markers
   // Render inline inputs at blank positions
   // Validate against correctAnswers array
   ```

4. **Update QuestionRenderer switch:**
   ```typescript
   switch (question.questionTypes?.[0] || question.questionType) {
     case 'flashcard':
       return <FlashcardQuestion {...props} />;
     case 'multiple_select':
       return <MultipleSelectQuestion {...props} />;
     case 'fill_in_blank':
       return <FillInBlankQuestion {...props} />;
     // ... existing cases
   }
   ```

**Files:**
- `src/features/exercises/ui/QuestionRenderer.tsx`
- `src/features/exercises/ui/FlashcardQuestion.tsx` (new)
- `src/features/exercises/ui/MultipleSelectQuestion.tsx` (new)
- `src/features/exercises/ui/FillInBlankQuestion.tsx` (new)

**Estimated Scope:** Medium - new components, simple logic

---

### Phase 4: Page Integration

**Goal:** Update admin/staff pages to use new capabilities

**Tasks:**

1. **QuestionBankPage.tsx:**
   - Add type filter for new question types
   - Show flashcard/matching indicators in list
   - Preview support for all types
   - Bulk import template update

2. **ExerciseBuilderPage.tsx:**
   - Allow flashcard/matching exercise types
   - Configure flashcard session settings
   - Configure matching scoring options
   - Preview all question types

3. **ExerciseManagementPage.tsx:**
   - Filter by new types
   - Bulk operations support
   - Status indicators for type

**Files:**
- `src/pages/admin/questions/QuestionBankPage.tsx`
- `src/pages/staff/courses/ExerciseBuilderPage.tsx`
- `src/pages/admin/exercises/ExerciseManagementPage.tsx`

**Estimated Scope:** Medium - integration work

---

### Phase 5: API Integration

**Goal:** Connect UI to new API endpoints

**Tasks:**

1. **Update Question API calls:**
   - Send `questionTypes` array (not singular)
   - Include `flashcardData` when applicable
   - Include `matchingData` when applicable
   - Include `distractors` for matching

2. **Add Flashcard-specific API:**
   - `useFlashcardConfig(courseId)`
   - `useFlashcardSession(courseId)`
   - `useFlashcardResult(courseId)`

3. **Add Matching-specific API:**
   - `useMatchingSession(exerciseId)`
   - `useMatchingResult(exerciseId)`

4. **Update hooks:**
   - Transform legacy data for backward compatibility
   - Handle both old and new response formats

**Files:**
- `src/entities/question/api/questionApi.ts`
- `src/entities/question/model/useQuestion.ts`
- `src/features/flashcard-player/api/` (new)
- `src/features/matching-player/api/` (new)

**Estimated Scope:** Medium - API layer updates

---

### Phase 6: Testing & Polish

**Goal:** Ensure quality and backward compatibility

**Tasks:**

1. **Update test mocks:**
   - Add flashcard question mocks
   - Add matching question mocks
   - Add multiple_select mocks

2. **Add integration tests:**
   - Create flashcard question flow
   - Take flashcard exercise flow
   - Create matching question flow
   - Take matching exercise flow

3. **Backward compatibility:**
   - Verify old questions still render
   - Verify old exercises still work
   - Migration helpers if needed

**Estimated Scope:** Medium - testing focus

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing questions | High | Maintain legacy field support, gradual migration |
| Type mismatches at runtime | Medium | Strong TypeScript, runtime validation |
| Complex form state | Medium | Consider form library (react-hook-form) |
| Performance with media | Low | Lazy load media, optimize previews |

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| API-ISS-009 (Question Model) | Complete | Monolithic design implemented |
| API-ISS-010 (Flashcard System) | Complete | Endpoints ready |
| API-ISS-011 (Matching System) | Complete | Endpoints ready |
| API-ISS-012 (Media Upload) | Complete | S3/local support ready |

---

## Success Criteria

- [ ] All question types can be created via QuestionForm
- [ ] All question types render correctly for learners
- [ ] Flashcard exercises work end-to-end
- [ ] Matching exercises work end-to-end
- [ ] Existing questions/exercises continue to work
- [ ] No TypeScript errors
- [ ] Tests pass

---

## Recommended Execution Order

1. **Phase 1** - Type alignment (blocks everything)
2. **Phase 3** - QuestionRenderer (unblocks learner testing)
3. **Phase 2** - QuestionForm (unblocks content creation)
4. **Phase 4** - Page integration
5. **Phase 5** - API integration
6. **Phase 6** - Testing

This order allows incremental testing and deployment.

---

*Plan created: 2026-01-29*
*Review requested from: Development Lead*
