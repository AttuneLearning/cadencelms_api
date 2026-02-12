# Entity: Question System (Monolithic Design)

**Type:** Model | System
**Created:** 2026-01-28
**Tags:** #entity #assessment #learning #flashcard #matching

## Summary

The Question system uses a **monolithic design** where a single Question document contains all the knowledge needed to assess a concept, and can be **rendered as multiple question types** depending on context. This enables content reuse - one piece of knowledge can be presented as a multiple choice question, flashcard, matching pair, or short answer without duplicating data.

## Key Characteristics

- **One Row → Multiple Presentations**: A single Question document can populate multiple_choice, flashcard, matching, short_answer, etc.
- **Universal Core Fields**: `questionText`, `correctAnswers[]`, `distractors[]` are used by all types
- **Type-Specific Extensions**: Optional `flashcardData`, `matchingData`, `longAnswerData`, etc. enhance specific renderings
- **questionTypes[] Array**: Lists all types this question supports (validated against required fields)
- **Question Bank Integration**: Questions belong to question banks and are reusable across exercises

## Design Principles

### Core Knowledge Model

| Field | Purpose | Used By |
|-------|---------|---------|
| `questionText` | The prompt/stem | All types (front of flashcard, Column A in matching) |
| `correctAnswers[]` | Correct response(s) | All types (back of flashcard, Column B match, correct option) |
| `distractors[]` | Wrong answers | multiple_choice (wrong options), matching (wrong matches from other questions) |
| `explanation` | Post-answer feedback | All types |
| `hints[]` | Progressive hints | All types |

### Rendering by Type

```
┌─────────────────────────────────────────────────────────────────┐
│                     QUESTION DOCUMENT                           │
│                        (One Row)                                │
├─────────────────────────────────────────────────────────────────┤
│ questionText: "What is the powerhouse of the cell?"             │
│ correctAnswers: ["Mitochondria"]                                │
│ distractors: ["Ribosome", "Nucleus", "Golgi"]                   │
│ questionTypes: ["multiple_choice", "flashcard", "matching"]     │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ MULTIPLE      │   │   FLASHCARD   │   │   MATCHING    │
│ CHOICE        │   │               │   │               │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ Stem: qText   │   │ Front: qText  │   │ ColA: qText   │
│ Options:      │   │ Back: correct │   │ ColB: correct │
│  - distractors│   │       Ans[0]  │   │       Ans[0]  │
│  - correctAns │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Type-Specific Data

| Type | Required Core | Optional Extension |
|------|---------------|-------------------|
| `multiple_choice` | questionText, correctAnswers, distractors | — |
| `multiple_select` | questionText, correctAnswers (multiple), distractors | — |
| `true_false` | questionText | trueFalseData.correctValue |
| `flashcard` | questionText, correctAnswers | flashcardData.prompts[], flashcardData.backMedia |
| `matching` | questionText, correctAnswers | matchingData.columnAMedia, matchingData.columnBMedia |
| `short_answer` | questionText, correctAnswers | shortAnswerData.alternateAccepted, matchThreshold |
| `long_answer` | questionText | longAnswerData.rubric, sampleAnswer, requiresHumanGrading |
| `fill_in_blank` | questionText | fillBlankData.textWithBlanks, fillBlankData.blanks[] |

## Relationships

- Depends on: [[department-system]] (department scoping)
- Depends on: [[media-system]] (MediaAttachment for rich content)
- Used by: [[exercise-system]] (exercises contain questions)
- Used by: [[flashcard-system]] (flashcard decks pull from questions)
- Used by: [[matching-exercise-system]] (matching combines multiple questions)
- Related to: [[knowledge-node-system]] (adaptive learning)

## Location

**Files:**
- `src/models/assessment/Question.model.ts` - Mongoose schema
- `contracts/api/questions.contract.ts` - API contract
- `contracts/types/question-types.ts` - Type definitions
- `src/services/assessment/questions.service.ts` - Business logic
- `src/controllers/assessment/questions.controller.ts` - Route handlers

## Data Model

```typescript
interface IQuestion {
  // ─── UNIVERSAL FIELDS ───
  questionText: string;
  correctAnswers: string[];
  distractors: string[];
  explanation?: string;
  hints?: string[];

  // ─── TYPE SUPPORT ───
  questionTypes: QuestionType[];

  // ─── ORGANIZATION ───
  departmentId: ObjectId;
  questionBankIds: string[];
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  points: number;

  // ─── TYPE-SPECIFIC EXTENSIONS ───
  flashcardData?: {
    prompts: { text: string; media?: MediaAttachment }[];
    backMedia?: MediaAttachment;
    frontMedia?: MediaAttachment;
  };

  matchingData?: {
    columnAMedia?: MediaAttachment;
    columnBMedia?: MediaAttachment;
    pairExplanation?: string;
  };

  trueFalseData?: {
    correctValue: boolean;
    falseExplanation?: string;
    trueExplanation?: string;
  };

  shortAnswerData?: {
    alternateAccepted?: string[];
    matchThreshold: number;
    caseSensitive: boolean;
  };

  longAnswerData?: {
    rubric?: string;
    sampleAnswer?: string;
    maxWordCount?: number;
    minWordCount?: number;
    requiresHumanGrading: boolean;
    aiScoringEnabled: boolean;
  };

  fillBlankData?: {
    textWithBlanks: string;
    blanks: {
      blankId: number;
      acceptedAnswers: string[];
      caseSensitive: boolean;
      matchThreshold: number;
    }[];
  };

  // ─── ADAPTIVE LEARNING ───
  knowledgeNodeId?: ObjectId;
  cognitiveDepth?: string;
  hierarchy?: QuestionHierarchy;

  // ─── METADATA ───
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Validation Rules

1. **Universal**: `questionText` required, `correctAnswers` must have at least 1
2. **multiple_choice/multiple_select**: `distractors` required
3. **flashcard**: `flashcardData.prompts` must have at least 1 if provided
4. **true_false**: `trueFalseData.correctValue` required
5. **fill_in_blank**: `fillBlankData.blanks` must have at least 1
6. **long_answer**: Defaults `requiresHumanGrading: true`

## Usage Examples

### Building a Multiple Choice Quiz

```typescript
// Pull questions supporting multiple_choice
const questions = await Question.find({
  questionTypes: 'multiple_choice',
  questionBankIds: bankId
});

// Render each question
questions.map(q => ({
  stem: q.questionText,
  options: shuffle([...q.distractors, q.correctAnswers[0]]),
  correctIndex: /* index of correctAnswers[0] after shuffle */
}));
```

### Building a Flashcard Deck

```typescript
// Pull questions supporting flashcard
const questions = await Question.find({
  questionTypes: 'flashcard',
  moduleId: moduleId
});

// Render as cards
questions.flatMap(q => {
  const prompts = q.flashcardData?.prompts || [{ text: q.questionText }];
  return prompts.map(prompt => ({
    front: prompt.text,
    frontMedia: prompt.media,
    back: q.correctAnswers[0],
    backMedia: q.flashcardData?.backMedia,
    explanation: q.explanation
  }));
});
```

### Building a Matching Exercise

```typescript
// Pull multiple questions supporting matching
const questions = await Question.find({
  questionTypes: 'matching',
  questionBankIds: bankId
}).limit(6);

// Build columns
const columnA = questions.map(q => ({
  id: q._id,
  text: q.questionText,
  media: q.matchingData?.columnAMedia
}));

const columnB = shuffle(questions.map(q => ({
  id: q._id,  // Correct match ID
  text: q.correctAnswers[0],
  media: q.matchingData?.columnBMedia
})));

// Learner must match columnA[i] to columnB item with same id
```

## Notes

- **Flashcard Prompt Rotation**: When `flashcardData.prompts` has multiple entries, the system can rotate through different prompts for the same answer, improving retention
- **Matching Distractors**: In matching exercises, wrong answers come from OTHER questions' `correctAnswers`, not from the `distractors` field
- **Media Support**: All type-specific data supports `MediaAttachment` for rich content (images, video, audio)
- **Backward Compatibility**: The existing `options`, `matchingPairs`, `cards` fields can be migrated to the new structure

## Links

- Memory log: [[../memory-log]]
- Related patterns: [[../patterns/department-scoping]]
- Spec: [[../../dev_communication/specs/learning/FLASHCARD_FLOW_SPEC]]
- ADR: [[../../dev_communication/shared/architecture/decisions/ADR-DATA-001-DATA-ARCHITECTURE]]
