# API-ISS-009: Question Model - Monolithic Design Update

## Status: IN PROGRESS
## Priority: High
## Created: 2026-01-28
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: API-ISS-010, API-ISS-011, API-ISS-012

---

## Overview

Update the Question model to use a **monolithic design** where a single Question document contains all knowledge needed to assess a concept and can be rendered as multiple question types (multiple_choice, flashcard, matching, etc.).

This is a foundational change that enables:
- One question → multiple presentations (reusability)
- Flashcard system integration
- Matching exercise system
- Consistent question bank management

---

## Requirements

1. Update Question model with new universal fields
2. Add type-specific data sub-documents (flashcardData, matchingData, etc.)
3. Implement validation based on questionTypes array
4. Migrate existing questions to new structure
5. Update Question service with rendering methods
6. Update existing API endpoints for new schema

---

## Technical Specification

### Model Changes

| Field | Type | Description |
|-------|------|-------------|
| `questionText` | string | The prompt/stem (existing) |
| `correctAnswers` | string[] | Correct answer(s) - **NEW: replaces correctAnswer** |
| `distractors` | string[] | Wrong answers - **NEW: replaces options for wrong** |
| `questionTypes` | QuestionType[] | Supported types (existing, expanded validation) |
| `flashcardData` | object | **NEW**: prompts[], backMedia, frontMedia |
| `matchingData` | object | **NEW**: columnAMedia, columnBMedia, pairExplanation |
| `trueFalseData` | object | **NEW**: correctValue, explanations |
| `shortAnswerData` | object | **NEW**: alternateAccepted, matchThreshold |
| `longAnswerData` | object | **NEW**: rubric, sampleAnswer, requiresHumanGrading |
| `fillBlankData` | object | **NEW**: textWithBlanks, blanks[] |

### Migration Strategy

```typescript
// Old structure
{
  questionText: "What is the powerhouse?",
  options: ["Mitochondria", "Ribosome", "Nucleus"],  // Mixed correct/wrong
  correctAnswer: "Mitochondria",
  questionTypes: ["multiple_choice"]
}

// New structure
{
  questionText: "What is the powerhouse?",
  correctAnswers: ["Mitochondria"],
  distractors: ["Ribosome", "Nucleus"],
  questionTypes: ["multiple_choice"],
  // type-specific data optional for basic multiple_choice
}
```

### Validation Rules

```typescript
// Pre-save validation
if (questionTypes.includes('multiple_choice') || questionTypes.includes('multiple_select')) {
  require(distractors.length >= 1);
}

if (questionTypes.includes('true_false')) {
  require(trueFalseData?.correctValue !== undefined);
}

if (questionTypes.includes('fill_in_blank')) {
  require(fillBlankData?.blanks?.length >= 1);
}

if (questionTypes.includes('long_answer')) {
  default(longAnswerData.requiresHumanGrading, true);
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/assessment/Question.model.ts` | Modify | Update schema with new fields |
| `contracts/types/question-types.ts` | Create | Type definitions (already created) |
| `src/services/assessment/questions.service.ts` | Modify | Add rendering methods |
| `src/validators/question.validator.ts` | Modify | Update validation for new schema |
| `migrations/XXXX-question-monolithic-migration.ts` | Create | Migrate existing data |
| `tests/integration/questions.test.ts` | Modify | Update tests for new schema |

### Approach

1. **Phase 1: Schema Update**
   - Add new fields to Question model (non-breaking)
   - Add type-specific sub-schemas
   - Update indexes

2. **Phase 2: Service Layer**
   - Add rendering methods: `renderAsMultipleChoice()`, `renderAsFlashcard()`, `renderAsMatching()`
   - Update create/update methods for new fields

3. **Phase 3: Migration**
   - Create migration script to convert `options` + `correctAnswer` to `correctAnswers` + `distractors`
   - Preserve backward compatibility during transition

4. **Phase 4: Cleanup**
   - Remove deprecated fields after migration verified
   - Update all consumers

---

## Tests Required

1. [ ] Create question with single questionType
2. [ ] Create question with multiple questionTypes
3. [ ] Validation: multiple_choice requires distractors
4. [ ] Validation: true_false requires trueFalseData.correctValue
5. [ ] Validation: fill_in_blank requires fillBlankData.blanks
6. [ ] Render question as multiple_choice
7. [ ] Render question as flashcard (with prompt rotation)
8. [ ] Migration: existing questions converted correctly
9. [ ] Backward compatibility: old API calls still work

---

## Acceptance Criteria

- [ ] Question model updated with all new fields
- [ ] Validation enforces type-specific requirements
- [ ] Existing questions migrated to new structure
- [ ] Rendering methods work for all supported types
- [ ] All existing tests pass
- [ ] New tests for monolithic design pass
- [ ] API endpoints work with new schema
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Should we keep backward compatibility for `options` field during transition?**
   Yes - deprecated but functional during migration period

2. **How long is migration period before removing old fields?**
   TBD - after all consumers updated

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
