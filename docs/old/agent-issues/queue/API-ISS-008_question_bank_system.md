# API-ISS-008: Question Bank System Implementation

## Status: OPEN
## Priority: High
## Created: 2026-01-23
## Requested By: UI Team
## Related Issues: UI-ISS-068
## Related Messages: 2026-01-23_ui_question_bank_api_proposal.md
## Implementation Plan: agent_coms/api/specs/Question_Bank_System_Implementation.md

---

## Overview

Implement the department-scoped Question Bank system to support the Learning Activity Editor. This enables reusable questions that can be linked to multiple Learning Units (exercises/assessments).

---

## Contracts Created

| Contract File | Endpoints |
|---------------|-----------|
| `contracts/api/question-banks.contract.ts` | Question Banks CRUD, Department Questions, Admin Copy |
| `contracts/api/learning-unit-questions.contract.ts` | Question Linking, Progress Tracking, AI Quiz Shell |

---

## Implementation Phases

### Phase 1: Priority 1 - Week 9 Deadline (UI BLOCKING)

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/v2/departments/:id/question-banks` | GET | List question banks |
| 2 | `/api/v2/departments/:id/question-banks` | POST | Create question bank |
| 3 | `/api/v2/departments/:id/question-banks/:id` | GET | Get bank details |
| 4 | `/api/v2/departments/:id/question-banks/:id` | PUT | Update bank |
| 5 | `/api/v2/departments/:id/question-banks/:id` | DELETE | Delete bank |
| 6 | `/api/v2/departments/:id/questions` | GET | List dept questions |
| 7 | `/api/v2/departments/:id/questions` | POST | Create question |
| 8 | `/api/v2/departments/:id/questions/:id` | GET/PUT/DELETE | Question CRUD |
| 9 | `/api/v2/learning-units/:id/questions` | GET | List linked questions |
| 10 | `/api/v2/learning-units/:id/questions` | POST | Link question |
| 11 | `/api/v2/learning-units/:id/questions/:id` | DELETE | Unlink question |
| 12 | `/api/v2/learning-units/:id/questions/bulk` | POST | Bulk link |

### Phase 2: Priority 2 - Week 11 Deadline

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 13 | Learning Unit `questionSelection` settings | - | Extend LU settings |
| 14 | `/api/v2/learning-units/:id/progress/:learnerId/questions` | GET | Get progress |
| 15 | `/api/v2/learning-units/:id/progress/:learnerId/questions/:id` | POST | Update progress |

### Phase 3: Priority 3 - Week 13 Deadline

| # | Feature | Description |
|---|---------|-------------|
| 16 | Question hierarchy fields | `parentQuestionId`, `relatedQuestionIds`, etc. |
| 17 | Adaptive testing config | `skipRelatedOnCorrect`, `repeatWrongAnswers`, etc. |
| 18 | `/api/v2/admin/questions/copy` | POST | Cross-dept question copy |
| 19 | `/api/v2/admin/question-banks/copy` | POST | Cross-dept bank copy |

### Phase 4: Priority 4 - Low (Shell Only)

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 20 | `/api/v2/learning-units/:id/ai-quiz/start` | POST | AI Quiz start (501) |
| 21 | `/api/v2/learning-units/:id/ai-quiz/:id/answer` | POST | AI Quiz answer (501) |
| 22 | `/api/v2/learning-units/:id/ai-quiz/analytics` | GET | AI analytics (501) |

---

## Model Updates Required

### Question.model.ts Extensions

```typescript
// New question types to add
type: 'multiple_select' | 'long_answer' | 'flashcard' | 'fill_in_blank'

// New fields
acceptedAnswers?: string[];          // For short_answer
matchThreshold?: number;             // Fuzzy matching (0-100)
sampleAnswer?: string;               // For long_answer
rubric?: string;                     // Grading rubric
pairs?: { left: string; right: string }[];  // For matching
cards?: { front: string; back: string; hint?: string }[];  // For flashcard
blanks?: { position: number; acceptedAnswers: string[]; matchThreshold: number }[];

// Hierarchy for adaptive testing
hierarchy?: {
  parentQuestionId?: ObjectId;
  relatedQuestionIds: ObjectId[];
  prerequisiteQuestionIds: ObjectId[];
  conceptTag?: string;
  difficultyProgression?: number;
}
```

### New Models Required

1. **LearningUnitQuestion.model.ts** - Question-to-LearningUnit link
   ```typescript
   {
     learningUnitId: ObjectId;
     questionId: ObjectId;
     sequence: number;
     pointsOverride: number | null;
   }
   ```

2. **LearnerQuestionProgress.model.ts** - Per-learner question progress
   ```typescript
   {
     learnerId: ObjectId;
     learningUnitId: ObjectId;
     questionId: ObjectId;
     correctCount: number;
     incorrectCount: number;
     lastAttemptAt: Date;
     isActive: boolean;
     masteredAt: Date | null;
   }
   ```

---

## Lookup Values to Add

```
question-type:
  - multiple_choice
  - multiple_select
  - true_false
  - short_answer
  - long_answer
  - matching
  - flashcard
  - fill_in_blank

question-difficulty:
  - easy
  - medium
  - hard

randomization-level:
  - in_order
  - by_difficulty
  - completely_random
```

---

## Key Design Decisions

1. **Department Scoping**: Questions are scoped to departments, not courses
2. **No Cascade Delete**: Deleting questions with dependencies returns error with dependency list
3. **Question Banks**: Soft collections - questions can belong to multiple banks via `questionBankIds[]`
4. **Cross-Dept Copy**: Admin-only, creates deep copies with new IDs
5. **AI Quiz**: Shell endpoints return 501 until LLM integration ready
6. **Hierarchy Validation**: Prevent circular dependencies in parent/related/prerequisite relationships
7. **Admin Settings**: Configurable defaults via database settings

---

## Admin Settings Required

| Setting Key | Default | Description |
|-------------|---------|-------------|
| `question.matchThreshold.default` | `80` | Default fuzzy match % for short_answer |
| `question.bulkOperations.maxItems` | `500` | Max items per bulk operation |

**Implementation:**
- Add settings to `Settings` collection with category `'question'`
- Create seed script: `scripts/seed-question-settings.ts`
- Extend settings controller: `GET/PUT /api/v2/settings/question`

**Schema:**
```typescript
{
  category: 'question',
  settings: {
    matchThreshold: { default: 80, min: 50, max: 100 },
    bulkOperations: { maxItems: 500, maxBanksPerCopy: 10 }
  }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/routes/department-question-banks.routes.ts` | NEW |
| `src/routes/department-questions.routes.ts` | NEW |
| `src/routes/learning-unit-questions.routes.ts` | NEW |
| `src/routes/learner-question-progress.routes.ts` | NEW |
| `src/routes/admin-questions.routes.ts` | NEW |
| `src/routes/questions.routes.ts` | DELETE (no backwards compat) |
| `src/controllers/content/question-banks.controller.ts` | NEW |
| `src/controllers/content/department-questions.controller.ts` | NEW |
| `src/controllers/content/learning-unit-questions.controller.ts` | NEW |
| `src/controllers/progress/learner-question-progress.controller.ts` | NEW |
| `src/controllers/admin/question-copy.controller.ts` | NEW |
| `src/controllers/content/questions.controller.ts` | DELETE |
| `src/services/content/question-banks.service.ts` | NEW |
| `src/services/content/department-questions.service.ts` | NEW |
| `src/services/content/learning-unit-questions.service.ts` | NEW |
| `src/services/progress/learner-question-progress.service.ts` | NEW |
| `src/models/assessment/Question.model.ts` | Extend with types, hierarchy |
| `src/models/content/LearningUnitQuestion.model.ts` | NEW |
| `src/models/progress/LearnerQuestionProgress.model.ts` | NEW |
| `src/validators/question-bank.validator.ts` | NEW |
| `src/validators/department-question.validator.ts` | NEW |
| `src/validators/learning-unit-question.validator.ts` | NEW |
| `scripts/seed-question-settings.ts` | NEW - Admin settings seed |
| `src/app.ts` | Update routes - remove old, add new |

---

## Acceptance Criteria

### Phase 1
- [ ] Question Banks CRUD working for department-scoped banks
- [ ] Department-scoped question CRUD with new question types
- [ ] Question linking to learning units
- [ ] Bulk question linking (max from admin settings)
- [ ] Delete returns dependency list if linked
- [ ] Hierarchy validation prevents circular dependencies
- [ ] Admin settings seeded with defaults

### Phase 2
- [ ] questionSelection settings on Learning Units
- [ ] Learner progress tracking per question
- [ ] Progress updates from assessment engine
- [ ] `GET/PUT /api/v2/settings/question` endpoints working

### Phase 3
- [ ] Question hierarchy fields implemented
- [ ] Adaptive testing configuration
- [ ] Admin cross-department copy endpoints

### Phase 4
- [ ] AI Quiz shell endpoints return 501
- [ ] Old `/api/v2/questions` routes removed

---

## Testing Requirements

- Unit tests for all services
- Integration tests for all endpoints
- Test department scoping isolation
- Test deletion dependency checking
- Test bulk operations

---

## Notes

- Existing `/api/v2/questions` endpoints remain for backwards compatibility
- New department-scoped endpoints provide cleaner API structure
- UI team can mock endpoints while waiting for implementation
