# UI-ISS-078: Question System Page Integration

## Status: PENDING
## Priority: Medium
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-075, UI-ISS-076, UI-ISS-077
## Depends-On: UI-ISS-075, UI-ISS-076, UI-ISS-077

---

## Overview

Update admin and staff pages to fully support the new question types (flashcard, matching, multiple_select, fill_in_blank) and the monolithic Question design. This includes filtering, display, preview, and exercise configuration.

---

## Requirements

1. QuestionBankPage: Support all question types in filters, list, and preview
2. ExerciseBuilderPage: Support flashcard/matching exercise configurations
3. ExerciseManagementPage: Filter and display new exercise types
4. Learning Activity Editor: Support new question types in import/create

---

## Technical Specification

### 1. QuestionBankPage Updates

**File:** `src/pages/admin/questions/QuestionBankPage.tsx`

**Current State:**
- Filter by question type (limited types)
- Create/edit questions (limited types)
- Preview questions (limited renderers)

**Required Changes:**

a) **Update type filter dropdown:**
```tsx
<Select value={filters.questionType} onValueChange={handleTypeFilter}>
  <SelectItem value="">All Types</SelectItem>
  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
  <SelectItem value="multiple_select">Multiple Select</SelectItem>
  <SelectItem value="true_false">True/False</SelectItem>
  <SelectItem value="short_answer">Short Answer</SelectItem>
  <SelectItem value="long_answer">Essay</SelectItem>
  <SelectItem value="fill_in_blank">Fill in Blank</SelectItem>
  <SelectItem value="flashcard">Flashcard</SelectItem>
  <SelectItem value="matching">Matching</SelectItem>
</Select>
```

b) **Update type column display:**
```tsx
// Show badges for multi-type questions
<TableCell>
  <div className="flex flex-wrap gap-1">
    {question.questionTypes.map(type => (
      <Badge key={type} variant="outline" className="text-xs">
        {getTypeLabel(type)}
      </Badge>
    ))}
  </div>
</TableCell>
```

c) **Update preview modal:**
- Use enhanced QuestionRenderer
- Support all question types in preview mode

d) **Update bulk import template:**
```typescript
// Add questionTypes array support
interface BulkImportRow {
  questionText: string;
  questionTypes: string;  // Comma-separated: "flashcard,multiple_choice"
  // ... other fields
  flashcardFrontMedia?: string;
  flashcardBackMedia?: string;
  distractors?: string;  // Comma-separated
}
```

### 2. ExerciseBuilderPage Updates

**File:** `src/pages/staff/courses/ExerciseBuilderPage.tsx`

**Current State:**
- Create quiz/exam/practice/assessment
- Add questions from bank
- Configure settings

**Required Changes:**

a) **Add flashcard exercise support:**
```tsx
{exercise.type === 'flashcard' && (
  <Card>
    <CardHeader>
      <CardTitle>Flashcard Settings</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4">
        <div>
          <Label>Session Size</Label>
          <Input
            type="number"
            value={settings.flashcardConfig?.sessionSize || 10}
            onChange={(e) => handleFlashcardConfig('sessionSize', e.target.value)}
          />
          <p className="text-muted-foreground text-sm">Cards per study session</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={settings.flashcardConfig?.shuffleCards}
            onCheckedChange={(v) => handleFlashcardConfig('shuffleCards', v)}
          />
          <Label>Shuffle cards each session</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={settings.flashcardConfig?.trackMastery}
            onCheckedChange={(v) => handleFlashcardConfig('trackMastery', v)}
          />
          <Label>Track mastery progress</Label>
        </div>

        {settings.flashcardConfig?.trackMastery && (
          <div>
            <Label>Mastery Threshold (%)</Label>
            <Slider
              value={[settings.flashcardConfig?.masteryThreshold || 80]}
              onValueChange={([v]) => handleFlashcardConfig('masteryThreshold', v)}
              min={50}
              max={100}
              step={5}
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

b) **Add matching exercise support:**
```tsx
{exercise.type === 'matching' && (
  <Card>
    <CardHeader>
      <CardTitle>Matching Settings</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={settings.matchingConfig?.allowPartialCredit}
            onCheckedChange={(v) => handleMatchingConfig('allowPartialCredit', v)}
          />
          <Label>Allow partial credit</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={settings.matchingConfig?.showFeedbackOnDrop}
            onCheckedChange={(v) => handleMatchingConfig('showFeedbackOnDrop', v)}
          />
          <Label>Show feedback on each match</Label>
        </div>

        <div>
          <Label>Max Attempts</Label>
          <Input
            type="number"
            value={settings.matchingConfig?.maxAttempts || 3}
            onChange={(e) => handleMatchingConfig('maxAttempts', e.target.value)}
          />
        </div>

        <div>
          <Label>Time Limit (minutes, 0 = unlimited)</Label>
          <Input
            type="number"
            value={settings.matchingConfig?.timeLimit || 0}
            onChange={(e) => handleMatchingConfig('timeLimit', e.target.value)}
          />
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

c) **Update exercise type selector:**
```tsx
<Select value={exercise.type} onValueChange={handleTypeChange}>
  <SelectItem value="quiz">Quiz</SelectItem>
  <SelectItem value="exam">Exam</SelectItem>
  <SelectItem value="practice">Practice</SelectItem>
  <SelectItem value="assessment">Assessment</SelectItem>
  <SelectItem value="flashcard">Flashcard Deck</SelectItem>
  <SelectItem value="matching">Matching Exercise</SelectItem>
</Select>
```

### 3. ExerciseManagementPage Updates

**File:** `src/pages/admin/exercises/ExerciseManagementPage.tsx`

**Required Changes:**

a) **Add type filter for new types:**
```tsx
<SelectItem value="flashcard">Flashcard</SelectItem>
<SelectItem value="matching">Matching</SelectItem>
```

b) **Update type column with icons:**
```tsx
function getTypeIcon(type: ExerciseType) {
  switch (type) {
    case 'flashcard': return <Layers className="h-4 w-4" />;
    case 'matching': return <ArrowLeftRight className="h-4 w-4" />;
    // ... existing types
  }
}
```

### 4. Learning Activity Editor Updates

**Files:**
- `src/features/learning-activity-editor/model/question-types.ts`
- `src/features/learning-activity-editor/ui/question-bank/QuestionImportPicker.tsx`
- `src/features/learning-activity-editor/ui/question-bank/QuestionEditorModal.tsx`

**Required Changes:**

a) **Add new type configs:**
```typescript
export const QUESTION_TYPE_CONFIGS = {
  // ... existing
  flashcard: {
    label: 'Flashcard',
    icon: Layers,
    description: 'Front/back card for memorization',
    supportsMedia: true,
    hasOptions: false,
  },
  matching: {
    label: 'Matching',
    icon: ArrowLeftRight,
    description: 'Match items from two columns',
    supportsMedia: true,
    hasOptions: true,
  },
  multiple_select: {
    label: 'Multiple Select',
    icon: CheckSquare,
    description: 'Select all correct answers',
    supportsMedia: false,
    hasOptions: true,
  },
  fill_in_blank: {
    label: 'Fill in Blank',
    icon: TextCursor,
    description: 'Complete the sentence',
    supportsMedia: false,
    hasOptions: false,
  },
};
```

b) **Update QuestionImportPicker filters**

c) **Update QuestionEditorModal to use enhanced QuestionForm**

---

## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/questions/QuestionBankPage.tsx` | Type filter, display, preview |
| `src/pages/staff/courses/ExerciseBuilderPage.tsx` | Flashcard/matching config |
| `src/pages/admin/exercises/ExerciseManagementPage.tsx` | Type filter, display |
| `src/features/learning-activity-editor/model/question-types.ts` | New type configs |
| `src/features/learning-activity-editor/ui/question-bank/QuestionImportPicker.tsx` | Type filter |
| `src/features/learning-activity-editor/ui/question-bank/QuestionEditorModal.tsx` | Use enhanced form |

---

## Tests Required

1. [ ] QuestionBankPage filters by all types
2. [ ] QuestionBankPage displays multi-type badges
3. [ ] QuestionBankPage preview works for all types
4. [ ] ExerciseBuilderPage creates flashcard exercises
5. [ ] ExerciseBuilderPage creates matching exercises
6. [ ] ExerciseBuilderPage flashcard config works
7. [ ] ExerciseBuilderPage matching config works
8. [ ] ExerciseManagementPage filters new types
9. [ ] Learning activity editor imports new types

---

## Acceptance Criteria

- [ ] QuestionBankPage fully supports all question types
- [ ] ExerciseBuilderPage supports flashcard exercise creation
- [ ] ExerciseBuilderPage supports matching exercise creation
- [ ] Exercise configurations save correctly
- [ ] ExerciseManagementPage displays new types
- [ ] Learning activity editor works with new types
- [ ] No TypeScript errors
- [ ] Code reviewed

---

## Questions / Clarifications

1. Should flashcard decks be a separate exercise type or a configuration of practice exercises?
2. Should matching exercises support mixed question types (matching + multiple choice in same exercise)?

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
