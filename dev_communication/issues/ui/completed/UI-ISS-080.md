# UI-ISS-080: Question System Testing & Polish

## Status: PENDING
## Priority: Medium
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-075, UI-ISS-076, UI-ISS-077, UI-ISS-078, UI-ISS-079
## Depends-On: UI-ISS-075, UI-ISS-076, UI-ISS-077, UI-ISS-078, UI-ISS-079

---

## Overview

Comprehensive testing and polish for the Question System migration. This includes updating test mocks, adding integration tests, verifying backward compatibility, and addressing any UX polish items discovered during development.

---

## Requirements

1. Update test mocks for new question structure
2. Add integration tests for all new flows
3. Verify backward compatibility with existing data
4. Address accessibility requirements
5. Performance optimization
6. Documentation updates

---

## Technical Specification

### 1. Test Mock Updates

**File:** `src/test/mocks/data/questions.ts`

**Required Updates:**

```typescript
// Add flashcard question mocks
export const mockFlashcardQuestion: Question = {
  id: 'fc-1',
  departmentId: 'dept-1',
  questionBankId: 'bank-1',
  questionText: 'What is the capital of France?',
  questionTypes: ['flashcard', 'short_answer'],
  options: [],
  correctAnswers: ['Paris'],
  distractors: [],
  points: 1,
  difficulty: 'easy',
  tags: ['geography', 'europe'],
  explanation: 'Paris is the capital and largest city of France.',
  flashcardData: {
    prompts: ['Think about the Eiffel Tower'],
    frontMedia: undefined,
    backMedia: undefined,
  },
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Add matching question mocks
export const mockMatchingQuestion: Question = {
  id: 'match-1',
  departmentId: 'dept-1',
  questionBankId: 'bank-1',
  questionText: 'France',
  questionTypes: ['matching'],
  options: [],
  correctAnswers: ['Paris'],
  distractors: ['London', 'Berlin', 'Madrid'],
  points: 1,
  difficulty: 'medium',
  tags: ['geography'],
  explanation: null,
  matchingData: {
    columnAMedia: undefined,
    columnBMedia: undefined,
  },
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Add multiple select question mocks
export const mockMultipleSelectQuestion: Question = {
  id: 'ms-1',
  departmentId: 'dept-1',
  questionBankId: 'bank-1',
  questionText: 'Which of the following are programming languages?',
  questionTypes: ['multiple_select'],
  options: [
    { text: 'JavaScript', isCorrect: true },
    { text: 'HTML', isCorrect: false },
    { text: 'Python', isCorrect: true },
    { text: 'CSS', isCorrect: false },
    { text: 'TypeScript', isCorrect: true },
  ],
  correctAnswers: ['JavaScript', 'Python', 'TypeScript'],
  distractors: [],
  points: 3,
  difficulty: 'medium',
  tags: ['programming'],
  explanation: 'HTML and CSS are markup/styling languages, not programming languages.',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Add fill in blank question mocks
export const mockFillInBlankQuestion: Question = {
  id: 'fib-1',
  departmentId: 'dept-1',
  questionBankId: 'bank-1',
  questionText: 'The [blank] is the powerhouse of the cell.',
  questionTypes: ['fill_in_blank'],
  options: [],
  correctAnswers: ['mitochondria'],
  distractors: [],
  points: 1,
  difficulty: 'easy',
  tags: ['biology'],
  explanation: 'Mitochondria produce ATP through cellular respiration.',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
```

### 2. Integration Tests

**New Tests to Add:**

```typescript
// tests/integration/flashcard-flow.test.tsx
describe('Flashcard Exercise Flow', () => {
  it('should create a flashcard question', async () => {
    // Test QuestionForm with flashcard type
  });

  it('should render flashcard in exercise', async () => {
    // Test FlashcardQuestion component
  });

  it('should flip card on click', async () => {
    // Test card flip interaction
  });

  it('should record self-assessment result', async () => {
    // Test API call on "Got it" / "Need review"
  });

  it('should show progress after session', async () => {
    // Test progress display
  });
});

// tests/integration/matching-flow.test.tsx
describe('Matching Exercise Flow', () => {
  it('should create a matching question with distractors', async () => {
    // Test QuestionForm with matching type
  });

  it('should render shuffled matching columns', async () => {
    // Test MatchingQuestion component
  });

  it('should allow drag-drop matching', async () => {
    // Test drag-drop interaction
  });

  it('should submit matches and show results', async () => {
    // Test submission and feedback
  });

  it('should handle partial credit scoring', async () => {
    // Test partial credit calculation
  });
});

// tests/integration/multi-type-question.test.tsx
describe('Multi-Type Question', () => {
  it('should create question with multiple types', async () => {
    // Test creating a question that is both flashcard and multiple_choice
  });

  it('should render as flashcard in flashcard context', async () => {
    // Test context-aware rendering
  });

  it('should render as multiple_choice in quiz context', async () => {
    // Test context-aware rendering
  });
});
```

### 3. Backward Compatibility Tests

```typescript
// tests/compatibility/legacy-questions.test.tsx
describe('Legacy Question Compatibility', () => {
  it('should load question with singular questionType', async () => {
    const legacyQuestion = {
      id: 'legacy-1',
      questionType: 'multiple_choice',  // Old format
      // ... other fields
    };
    // Verify normalizeQuestion transforms correctly
  });

  it('should load question with singular correctAnswer', async () => {
    const legacyQuestion = {
      id: 'legacy-2',
      correctAnswer: 'Paris',  // Old format (string)
      // ... other fields
    };
    // Verify normalizeQuestion transforms correctly
  });

  it('should handle questions without flashcardData', async () => {
    // Verify existing questions still work
  });

  it('should handle questions without matchingData', async () => {
    // Verify existing questions still work
  });
});
```

### 4. Accessibility Requirements

| Component | Requirements |
|-----------|--------------|
| FlashcardQuestion | Keyboard flip (Enter/Space), ARIA live region for back content |
| MultipleSelectQuestion | Checkbox group with proper labels |
| FillInBlankQuestion | Input labels, error announcements |
| MatchingQuestion | Keyboard drag-drop alternative, ARIA descriptions |

**Checklist:**
- [ ] All interactive elements focusable
- [ ] Keyboard navigation works
- [ ] Screen reader announces state changes
- [ ] Color not sole indicator of state
- [ ] Focus visible on all elements
- [ ] Reduced motion support for animations

### 5. Performance Optimization

| Area | Optimization |
|------|--------------|
| Flashcard flip | CSS transforms, no layout thrash |
| Media loading | Lazy load, progressive images |
| Matching drag-drop | Throttle drag events |
| Large question lists | Virtual scrolling |

**Checklist:**
- [ ] Animations run at 60fps
- [ ] Media lazy loads
- [ ] No unnecessary re-renders
- [ ] Bundle size reasonable

### 6. Documentation Updates

| Document | Updates Needed |
|----------|----------------|
| Question types reference | Add new types |
| Exercise builder guide | Flashcard/matching config |
| API contracts | Verify match implementation |
| Component storybook | Add new component stories |

---

## Implementation

### Test Files to Create/Update

| File | Description |
|------|-------------|
| `src/test/mocks/data/questions.ts` | Add new mocks |
| `tests/integration/flashcard-flow.test.tsx` | Flashcard tests |
| `tests/integration/matching-flow.test.tsx` | Matching tests |
| `tests/integration/multi-type-question.test.tsx` | Multi-type tests |
| `tests/compatibility/legacy-questions.test.tsx` | Compatibility tests |

### Component Updates for A11y

| File | Updates |
|------|---------|
| `src/features/exercises/ui/FlashcardQuestion.tsx` | ARIA, keyboard |
| `src/features/exercises/ui/MultipleSelectQuestion.tsx` | Checkbox a11y |
| `src/features/exercises/ui/FillInBlankQuestion.tsx` | Input labels |
| `src/features/exercises/ui/MatchingQuestion.tsx` | Drag-drop a11y |

---

## Tests Required

1. [ ] All new mocks pass type checks
2. [ ] Flashcard flow integration tests pass
3. [ ] Matching flow integration tests pass
4. [ ] Multi-type question tests pass
5. [ ] Legacy compatibility tests pass
6. [ ] Accessibility audit passes
7. [ ] Performance benchmarks met
8. [ ] All existing tests still pass

---

## Acceptance Criteria

- [ ] Test mocks updated for all new types
- [ ] Integration tests cover happy paths
- [ ] Legacy questions load correctly
- [ ] Accessibility audit passes (WCAG 2.1 AA)
- [ ] Animations smooth (60fps)
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. What's the target browser support for CSS transforms?
2. Should we add Storybook stories for new components?
3. What's the acceptable bundle size increase?

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
