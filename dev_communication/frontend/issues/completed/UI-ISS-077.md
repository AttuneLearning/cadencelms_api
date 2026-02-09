# UI-ISS-077: QuestionRenderer Enhancement for New Types

## Status: PENDING
## Priority: High
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-071, UI-ISS-072, UI-ISS-075, UI-ISS-076
## Depends-On: UI-ISS-075

---

## Overview

The QuestionRenderer component needs new renderers for flashcard, multiple_select, and fill_in_blank question types. These components are required for learners to interact with questions in exercises.

---

## Requirements

1. Create FlashcardQuestion renderer component
2. Create MultipleSelectQuestion renderer component
3. Create FillInBlankQuestion renderer component
4. Update QuestionRenderer switch to handle new types
5. Support review mode for all new types
6. Support showing correct answers for all new types

---

## Technical Specification

### Current QuestionRenderer Coverage

| Type | Renderer | Status |
|------|----------|--------|
| multiple_choice | MultipleChoiceQuestion | Complete |
| true_false | TrueFalseQuestion | Complete |
| short_answer | ShortAnswerQuestion | Complete |
| essay | EssayQuestion | Complete |
| matching | MatchingQuestion | Complete |
| flashcard | **Missing** | Needs creation |
| multiple_select | **Missing** | Needs creation |
| fill_in_blank | **Missing** | Needs creation |

### New Components

#### 1. FlashcardQuestion Component

**Purpose:** Render flashcard for learner practice/review

**Features:**
- Card flip animation (click to reveal back)
- Front: questionText + frontMedia
- Back: correctAnswers[0] + backMedia
- Self-assessment buttons in practice mode: "Got it" / "Need review"
- Show both sides in review mode

**Props:**
```typescript
interface FlashcardQuestionProps {
  question: ExamQuestion;
  onAnswerChange: (value: 'correct' | 'incorrect') => void;
  isReview?: boolean;
  showCorrectAnswer?: boolean;
  className?: string;
}
```

**Design:**
```tsx
<div className="perspective-1000">
  <div className={cn(
    "relative w-full h-64 transition-transform duration-500 transform-style-preserve-3d",
    isFlipped && "rotate-y-180"
  )}>
    {/* Front */}
    <div className="absolute inset-0 backface-hidden bg-card rounded-lg p-6 shadow-md">
      <div className="flex flex-col h-full justify-center items-center text-center">
        {question.flashcardData?.frontMedia && (
          <MediaDisplay media={question.flashcardData.frontMedia} />
        )}
        <p className="text-lg font-medium">{question.questionText}</p>
        <Button variant="ghost" onClick={() => setIsFlipped(true)}>
          Click to reveal answer
        </Button>
      </div>
    </div>

    {/* Back */}
    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary/5 rounded-lg p-6 shadow-md">
      <div className="flex flex-col h-full justify-center items-center text-center">
        {question.flashcardData?.backMedia && (
          <MediaDisplay media={question.flashcardData.backMedia} />
        )}
        <p className="text-lg font-medium">{question.correctAnswers?.[0]}</p>

        {!isReview && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => handleSelfAssess('incorrect')}>
              <X className="h-4 w-4 mr-2" /> Need Review
            </Button>
            <Button variant="default" onClick={() => handleSelfAssess('correct')}>
              <Check className="h-4 w-4 mr-2" /> Got It
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

#### 2. MultipleSelectQuestion Component

**Purpose:** Render checkbox-based question with multiple correct answers

**Features:**
- Checkbox inputs (not radio)
- Multiple selections allowed
- Partial credit indication in review
- Visual feedback for correct/incorrect in review mode

**Props:**
```typescript
interface MultipleSelectQuestionProps {
  question: ExamQuestion;
  selectedAnswers: string[] | undefined;
  onAnswerChange: (value: string[]) => void;
  isReview?: boolean;
  showCorrectAnswer?: boolean;
  className?: string;
}
```

**Design:**
```tsx
<div className="space-y-3">
  <p className="text-sm text-muted-foreground">
    Select all that apply
  </p>
  {question.options?.map((option, index) => {
    const isSelected = selectedAnswers?.includes(option);
    const isCorrect = question.correctAnswers?.includes(option);

    return (
      <div
        key={index}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
          isSelected && "bg-primary/5 border-primary",
          isReview && isCorrect && "bg-green-50 border-green-500",
          isReview && isSelected && !isCorrect && "bg-red-50 border-red-500"
        )}
        onClick={() => handleToggle(option)}
      >
        <Checkbox
          checked={isSelected}
          disabled={isReview}
        />
        <span>{option}</span>
        {isReview && showCorrectAnswer && isCorrect && (
          <Check className="h-4 w-4 text-green-500 ml-auto" />
        )}
      </div>
    );
  })}
</div>
```

#### 3. FillInBlankQuestion Component

**Purpose:** Render text with inline blanks for learner to fill

**Features:**
- Parse questionText for `[blank]` or `___` markers
- Render inline input at each blank position
- Multiple blanks supported
- Show correct answers in review mode

**Props:**
```typescript
interface FillInBlankQuestionProps {
  question: ExamQuestion;
  answers: string[] | undefined;
  onAnswerChange: (value: string[]) => void;
  isReview?: boolean;
  showCorrectAnswer?: boolean;
  className?: string;
}
```

**Design:**
```tsx
function FillInBlankQuestion({ question, answers = [], onAnswerChange, isReview, showCorrectAnswer }) {
  // Parse question text for blanks
  const parts = question.questionText.split(/(\[blank\]|___)/g);
  let blankIndex = 0;

  return (
    <div className="text-lg leading-relaxed">
      {parts.map((part, i) => {
        if (part === '[blank]' || part === '___') {
          const currentIndex = blankIndex++;
          const userAnswer = answers[currentIndex] || '';
          const correctAnswer = question.correctAnswers?.[currentIndex];
          const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();

          return (
            <span key={i} className="inline-block mx-1">
              <Input
                value={userAnswer}
                onChange={(e) => handleBlankChange(currentIndex, e.target.value)}
                disabled={isReview}
                className={cn(
                  "w-32 inline-block",
                  isReview && isCorrect && "border-green-500 bg-green-50",
                  isReview && !isCorrect && "border-red-500 bg-red-50"
                )}
              />
              {isReview && showCorrectAnswer && !isCorrect && (
                <span className="text-green-600 text-sm ml-1">
                  ({correctAnswer})
                </span>
              )}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
```

#### 4. Updated QuestionRenderer Switch

```typescript
export function QuestionRenderer({ question, answer, onAnswerChange, isReview, showCorrectAnswer, className }: QuestionRendererProps) {
  // Use questionTypes array with fallback to legacy questionType
  const primaryType = question.questionTypes?.[0] || question.questionType;

  switch (primaryType) {
    case 'multiple_choice':
      return <MultipleChoiceQuestion {...props} />;

    case 'multiple_select':
      return (
        <MultipleSelectQuestion
          question={question}
          selectedAnswers={answer?.answer as string[] | undefined}
          onAnswerChange={handleAnswerChange}
          isReview={isReview}
          showCorrectAnswer={showCorrectAnswer}
          className={className}
        />
      );

    case 'true_false':
      return <TrueFalseQuestion {...props} />;

    case 'short_answer':
      return <ShortAnswerQuestion {...props} />;

    case 'essay':
    case 'long_answer':
      return <EssayQuestion {...props} />;

    case 'fill_in_blank':
      return (
        <FillInBlankQuestion
          question={question}
          answers={answer?.answer as string[] | undefined}
          onAnswerChange={handleAnswerChange}
          isReview={isReview}
          showCorrectAnswer={showCorrectAnswer}
          className={className}
        />
      );

    case 'flashcard':
      return (
        <FlashcardQuestion
          question={question}
          onAnswerChange={handleAnswerChange}
          isReview={isReview}
          showCorrectAnswer={showCorrectAnswer}
          className={className}
        />
      );

    case 'matching':
      return <MatchingQuestion {...props} />;

    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Unsupported question type: {primaryType}</p>
        </div>
      );
  }
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/features/exercises/ui/FlashcardQuestion.tsx` | Flashcard renderer |
| `src/features/exercises/ui/MultipleSelectQuestion.tsx` | Multi-select renderer |
| `src/features/exercises/ui/FillInBlankQuestion.tsx` | Fill-in-blank renderer |

### Files to Modify

| File | Description |
|------|-------------|
| `src/features/exercises/ui/QuestionRenderer.tsx` | Add new type cases |
| `src/features/exercises/ui/index.ts` | Export new components |

### CSS Requirements

- Flashcard flip animation (CSS transform-style: preserve-3d)
- Backface visibility handling
- Smooth transitions

---

## Tests Required

1. [ ] FlashcardQuestion renders front correctly
2. [ ] FlashcardQuestion flips to back on click
3. [ ] FlashcardQuestion self-assessment buttons work
4. [ ] FlashcardQuestion review mode shows both sides
5. [ ] MultipleSelectQuestion allows multiple selections
6. [ ] MultipleSelectQuestion validates against correctAnswers
7. [ ] MultipleSelectQuestion review shows correct/incorrect
8. [ ] FillInBlankQuestion parses blanks correctly
9. [ ] FillInBlankQuestion handles multiple blanks
10. [ ] FillInBlankQuestion review shows correct answers
11. [ ] QuestionRenderer routes to correct component

---

## Acceptance Criteria

- [ ] FlashcardQuestion component works with card flip
- [ ] MultipleSelectQuestion component works with checkboxes
- [ ] FillInBlankQuestion component parses and renders blanks
- [ ] All components support review mode
- [ ] All components support showCorrectAnswer
- [ ] QuestionRenderer handles all new types
- [ ] Animations are smooth (60fps)
- [ ] Accessible (keyboard navigation, ARIA)
- [ ] No TypeScript errors
- [ ] Code reviewed

---

## Questions / Clarifications

1. Should flashcard have a timer before allowing flip?
2. Should fill_in_blank support case-insensitive matching?
3. Should multiple_select show partial credit score in review?

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
