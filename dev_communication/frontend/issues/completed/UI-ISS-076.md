# UI-ISS-076: QuestionForm Enhancement for Monolithic Design

## Status: PENDING
## Priority: High
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-071, UI-ISS-072, UI-ISS-075, API-ISS-009
## Depends-On: UI-ISS-075

---

## Overview

The QuestionForm component currently only supports basic question types (multiple_choice, true_false, short_answer, long_answer, fill_in_blank). It needs enhancement to support the monolithic Question design with:
- Multi-type selection (questionTypes array)
- Flashcard editor (front/back content with media)
- Matching pair editor (column A/B with distractors)
- Multiple select variant

---

## Requirements

1. Support selecting multiple questionTypes (e.g., a question can be both flashcard and multiple_choice)
2. Add flashcard-specific editor fields
3. Add matching-specific editor fields
4. Add multiple_select mode for multiple correct answers
5. Update form validation for new types
6. Update form data structure for monolithic design

---

## Technical Specification

### Current QuestionForm Capabilities

| Type | Supported | Editor |
|------|-----------|--------|
| multiple_choice | Yes | Radio options with isCorrect |
| true_false | Yes | Fixed True/False options |
| short_answer | Yes | Text answer field |
| long_answer | Yes | Textarea answer field |
| fill_in_blank | Yes | Text answer field |
| matching | **No** | Missing |
| flashcard | **No** | Missing |
| multiple_select | **No** | Missing |

### Required Updates

#### 1. QuestionFormData Type Update

```typescript
interface QuestionFormData {
  questionText: string;
  questionTypes: QuestionType[];  // Array, not singular
  options: AnswerOption[];
  correctAnswers: string[];       // Array, not singular
  distractors?: string[];         // For matching
  points: number;
  difficulty: QuestionDifficulty;
  tags: string[];
  explanation: string;

  // Flashcard extension
  flashcardData?: {
    prompts: string[];
    frontMedia?: MediaContent;
    backMedia?: MediaContent;
  };

  // Matching extension
  matchingData?: {
    columnAMedia?: MediaContent;
    columnBMedia?: MediaContent;
  };
}
```

#### 2. Type Selector Component

Replace single Select with multi-select:
```tsx
<MultiSelect
  label="Question Types"
  description="Select all applicable types. Same content can be used in different contexts."
  value={formData.questionTypes}
  onChange={(types) => handleChange('questionTypes', types)}
  options={[
    { value: 'multiple_choice', label: 'Multiple Choice', icon: CircleDot },
    { value: 'multiple_select', label: 'Multiple Select', icon: CheckSquare },
    { value: 'true_false', label: 'True/False', icon: ToggleLeft },
    { value: 'short_answer', label: 'Short Answer', icon: Type },
    { value: 'long_answer', label: 'Essay', icon: FileText },
    { value: 'fill_in_blank', label: 'Fill in Blank', icon: TextCursor },
    { value: 'flashcard', label: 'Flashcard', icon: Layers },
    { value: 'matching', label: 'Matching', icon: ArrowLeftRight },
  ]}
/>
```

#### 3. Flashcard Editor Section

```tsx
{formData.questionTypes.includes('flashcard') && (
  <Card>
    <CardHeader>
      <CardTitle>Flashcard Configuration</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Front of Card */}
      <Label>Front of Card</Label>
      <p className="text-muted-foreground text-sm">
        Uses Question Text by default, or customize below
      </p>
      <MediaContentEditor
        value={formData.flashcardData?.frontMedia}
        onChange={(media) => handleFlashcardChange('frontMedia', media)}
        placeholder="Optional: Add image/video to front"
      />

      {/* Back of Card */}
      <Label>Back of Card</Label>
      <p className="text-muted-foreground text-sm">
        Uses first Correct Answer by default, or customize below
      </p>
      <MediaContentEditor
        value={formData.flashcardData?.backMedia}
        onChange={(media) => handleFlashcardChange('backMedia', media)}
        placeholder="Optional: Add image/video to back"
      />

      {/* Additional Prompts/Hints */}
      <Label>Additional Prompts (Optional)</Label>
      <TagInput
        value={formData.flashcardData?.prompts || []}
        onChange={(prompts) => handleFlashcardChange('prompts', prompts)}
        placeholder="Add hint prompts"
      />
    </CardContent>
  </Card>
)}
```

#### 4. Matching Editor Section

```tsx
{formData.questionTypes.includes('matching') && (
  <Card>
    <CardHeader>
      <CardTitle>Matching Configuration</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Distractors */}
      <Label>Distractors (Wrong Answers)</Label>
      <p className="text-muted-foreground text-sm">
        Add extra Column B items that don't match any Column A item
      </p>
      <TagInput
        value={formData.distractors || []}
        onChange={(distractors) => handleChange('distractors', distractors)}
        placeholder="Add distractor answers"
      />

      {/* Column A Media */}
      <Label>Column A Media (Optional)</Label>
      <MediaContentEditor
        value={formData.matchingData?.columnAMedia}
        onChange={(media) => handleMatchingChange('columnAMedia', media)}
      />

      {/* Column B Media */}
      <Label>Column B Media (Optional)</Label>
      <MediaContentEditor
        value={formData.matchingData?.columnBMedia}
        onChange={(media) => handleMatchingChange('columnBMedia', media)}
      />
    </CardContent>
  </Card>
)}
```

#### 5. Multiple Select Mode

```tsx
{formData.questionTypes.includes('multiple_select') && (
  <Alert>
    <CheckSquare className="h-4 w-4" />
    <AlertDescription>
      Multiple Select mode: Learners can select multiple correct answers.
      Mark all correct options below.
    </AlertDescription>
  </Alert>
)}

{/* Update options section to show checkboxes and allow multiple isCorrect */}
{(requiresOptions || formData.questionTypes.includes('multiple_select')) && (
  <Card>
    <CardHeader>
      <CardTitle>
        Answer Options
        {formData.questionTypes.includes('multiple_select') && (
          <Badge variant="secondary" className="ml-2">Multi-select</Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Allow multiple isCorrect for multiple_select */}
    </CardContent>
  </Card>
)}
```

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/entities/question/ui/QuestionForm.tsx` | Major | Add all new editors |
| `src/entities/question/model/types.ts` | Modify | Update QuestionFormData |

### New Components Required

| Component | Location | Description |
|-----------|----------|-------------|
| `MediaContentEditor.tsx` | `src/shared/ui/` | Rich media upload/preview |

### Approach

1. Update QuestionFormData type
2. Add questionTypes multi-select
3. Add conditional flashcard section
4. Add conditional matching section
5. Update validation logic
6. Test all type combinations

---

## Tests Required

1. [ ] Create question with single type
2. [ ] Create question with multiple types
3. [ ] Create flashcard with front/back media
4. [ ] Create matching with distractors
5. [ ] Create multiple_select with multiple correct
6. [ ] Form validation for each type
7. [ ] Edit existing questions of each type

---

## Acceptance Criteria

- [ ] questionTypes multi-select works
- [ ] Flashcard editor section appears when type selected
- [ ] Matching editor section appears when type selected
- [ ] Multiple select allows multiple correct answers
- [ ] Distractors can be added for matching
- [ ] Media can be attached to flashcard front/back
- [ ] Validation requires appropriate fields per type
- [ ] Form submits correct payload structure
- [ ] No TypeScript errors
- [ ] Code reviewed

---

## Questions / Clarifications

1. Should we allow combining incompatible types (e.g., true_false + multiple_choice)?
2. Should media upload use existing MediaFile infrastructure or new system?

---

## Implementation Notes

*To be added during implementation*

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
