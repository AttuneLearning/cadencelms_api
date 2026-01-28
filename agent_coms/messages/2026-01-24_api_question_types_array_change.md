# API Change: Question Model - `questionType` to `questionTypes[]`

**Date:** 2026-01-24
**From:** API Team
**To:** UI Team
**Priority:** High - Breaking Change

---

## Summary

The Question model has been updated to support **multiple presentation types** per question. This enables the adaptive learning engine to dynamically choose how to present a question based on learner progress.

## What Changed

### Before (Single Type)
```typescript
{
  questionText: "Why is the sky blue?",
  questionType: "multiple_choice",  // Single value
  options: [...],
  points: 10
}
```

### After (Multiple Types)
```typescript
{
  questionText: "Why is the sky blue?",
  questionTypes: ["multiple_choice", "short_answer", "long_answer"],  // Array
  options: [...],           // For multiple_choice presentation
  acceptedAnswers: [...],   // For short_answer presentation
  sampleAnswer: "...",      // For long_answer presentation
  points: 10
}
```

## Key Points

1. **Field Rename:** `questionType` → `questionTypes` (now an array)

2. **Multiple Answer Formats:** A single question can now have answer data for multiple presentation types. The UI should populate all relevant answer fields when creating/editing questions.

3. **Adaptive Presentation:** When presenting a question to a learner (during an assessment attempt), the API will select ONE type from the available `questionTypes[]`. The response will still include a single `presentationType` or `questionType` field indicating which format is being used for that presentation.

4. **Available Types:**
   - `multiple_choice`
   - `multiple_select`
   - `true_false`
   - `short_answer`
   - `long_answer`
   - `matching`
   - `flashcard`
   - `fill_in_blank`

## UI Impact

### Question Creation/Edit Forms
- Change type selector from dropdown (single) to multi-select (array)
- Show answer configuration sections for each selected type
- Example: If admin selects `['multiple_choice', 'short_answer']`, show both:
  - Options editor (for multiple_choice)
  - Accepted answers editor (for short_answer)

### Question List/Display
- Update any displays of `question.questionType` to handle array
- Consider showing as chips/tags: `[MC] [SA] [LA]`

### Assessment Attempt UI
- No change needed - the API will still return a single type per question during attempts

## Type-to-Field Mapping

| Type | Required Answer Fields |
|------|----------------------|
| `multiple_choice` | `options[]` with at least one `isCorrect: true` |
| `multiple_select` | `options[]` with multiple `isCorrect: true` |
| `true_false` | `options[]` with exactly 2 items |
| `short_answer` | `acceptedAnswers[]`, optional `matchThreshold` |
| `long_answer` | `sampleAnswer`, optional `rubric` |
| `matching` | `matchingPairs` object or `pairs[]` |
| `flashcard` | `cards[]` with `front`/`back` |
| `fill_in_blank` | `blanks[]` with positions and accepted answers |

## API Endpoints Affected

- `POST /api/v2/departments/:id/questions` - Create question
- `PUT /api/v2/departments/:id/questions/:questionId` - Update question
- `GET /api/v2/departments/:id/questions` - List questions (response shape changed)
- `GET /api/v2/departments/:id/questions/:questionId` - Get question (response shape changed)

## Migration Notes

- Existing questions will be migrated to have `questionTypes: [existingType]`
- No data loss - single type becomes single-element array

## Questions?

Please reach out if you have any questions about implementing these changes in the UI.
