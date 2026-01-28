# Question Bank System - Phased Implementation Plan
**Version:** 1.0
**Date:** 2026-01-23
**Purpose:** Parallel implementation tasks for Claude Code agent team
**Reference:** UI Team Requests in `agent_coms/messages/2026-01-23_ui_question_bank_*.md`
**Contracts:** `contracts/api/question-banks.contract.ts`, `contracts/api/learning-unit-questions.contract.ts`

---

## Overview

This document breaks down the Question Bank System implementation into phases with parallelizable tasks. Each task is designed to be independently implementable by a Claude Code agent.

### Design Principles

| Principle | Decision |
|-----------|----------|
| **No Backwards Compatibility** | Nothing in production, always ideal API design |
| **Department Scoped** | All questions/banks scoped to departments |
| **No Cascade Delete** | Return error with dependency list |
| **Hierarchy Validation** | Prevent circular dependencies in question relationships |
| **Admin Settings** | Configurable defaults via database settings |

### Terminology

| Term | Definition |
|------|------------|
| **QuestionBank** | A named collection of questions within a department |
| **Question** | A single question with type-specific answer configuration |
| **LearningUnitQuestion** | Link between a Question and LearningUnit (exercise/assessment) |
| **LearnerQuestionProgress** | Per-learner tracking of question mastery |
| **Hierarchy** | Parent/related/prerequisite relationships for adaptive testing |

### UI Team Requests (Priority Order)

| Request | Priority | Deadline |
|---------|----------|----------|
| Question Banks CRUD | P1 (Blocking) | Week 9 |
| Department Questions CRUD | P1 (Blocking) | Week 9 |
| Learning Unit Question Linking | P1 (Blocking) | Week 9 |
| Bulk Link Operations | P1 (Blocking) | Week 9 |
| questionSelection Settings | P2 (High) | Week 11 |
| Learner Progress Tracking | P2 (High) | Week 11 |
| Question Hierarchy Fields | P3 (Medium) | Week 13 |
| Adaptive Testing Config | P3 (Medium) | Week 13 |
| Admin Copy Endpoints | P3 (Medium) | Week 13 |
| AI Quiz Shell (501) | P4 (Low) | As needed |

---

## Files to Remove (Ideal API - No Backwards Compatibility)

```
DELETE: src/routes/questions.routes.ts
DELETE: src/controllers/content/questions.controller.ts
REFACTOR: src/services/content/questions.service.ts → department-questions.service.ts
DELETE: contracts/api/questions.contract.ts (replaced by question-banks.contract.ts)
```

---

## Admin Settings Required

| Setting Key | Default | Description |
|-------------|---------|-------------|
| `question.matchThreshold.default` | `80` | Default fuzzy match % for short_answer |
| `question.bulkOperations.maxItems` | `500` | Max items per bulk operation |

**Database Schema:**
```typescript
// Settings collection
{
  category: 'question',
  settings: {
    matchThreshold: { default: 80, min: 50, max: 100 },
    bulkOperations: { maxItems: 500, maxBanksPerCopy: 10 }
  }
}
```

---

## Phase 1: Model Creation & Schema Design
**Dependencies:** None
**Parallelism:** Tasks 1.1-1.4 can run in parallel

### Task 1.1: Extend Question Model
**Agent ID:** `agent-models-1`
**File:** `src/models/assessment/Question.model.ts`

**Requirements:**
1. Add new question types to enum
2. Add type-specific answer fields
3. Add hierarchy fields for adaptive testing
4. Add matchThreshold field with admin-setting default
5. Add validation for hierarchy (no circular dependencies)

**New Types:**
```typescript
type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'   // NEW
  | 'true_false'
  | 'short_answer'
  | 'long_answer'       // NEW (replaces 'essay')
  | 'matching'
  | 'flashcard'         // NEW
  | 'fill_in_blank';    // NEW
```

**New Fields:**
```typescript
// Type-specific answer fields
acceptedAnswers?: string[];           // For short_answer
matchThreshold?: number;              // 0-100, default from admin settings
sampleAnswer?: string;                // For long_answer
rubric?: string;                      // For long_answer grading
cards?: { front: string; back: string; hint?: string }[];  // For flashcard
blanks?: { position: number; acceptedAnswers: string[]; matchThreshold: number }[];  // For fill_in_blank

// Hierarchy for adaptive testing
hierarchy?: {
  parentQuestionId?: ObjectId;
  relatedQuestionIds: ObjectId[];
  prerequisiteQuestionIds: ObjectId[];
  conceptTag?: string;
  difficultyProgression?: number;
}
```

**Validation:**
```typescript
// Hierarchy circular dependency check
QuestionSchema.pre('save', async function() {
  if (this.hierarchy?.parentQuestionId) {
    await validateNoCircularDependency(this._id, this.hierarchy.parentQuestionId);
  }
});
```

**Tests Required:**
- `tests/unit/models/Question.model.test.ts`
- Test each question type validation
- Test hierarchy circular dependency prevention

---

### Task 1.2: Update QuestionBank Model
**Agent ID:** `agent-models-2`
**File:** `src/models/assessment/QuestionBank.model.ts`

**Requirements:**
1. Verify department scoping (already exists)
2. Add computed `questionCount` virtual
3. Add `usageCount` virtual (learning units using this bank)
4. Ensure indexes for `departmentId`, `isActive`

**Virtuals:**
```typescript
QuestionBankSchema.virtual('questionCount', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'questionBankIds',
  count: true
});

QuestionBankSchema.virtual('usageCount', {
  ref: 'LearningUnitQuestion',
  localField: '_id',
  foreignField: 'bankId',
  count: true
});
```

**Tests Required:**
- `tests/unit/models/QuestionBank.model.test.ts`

---

### Task 1.3: Create LearningUnitQuestion Model
**Agent ID:** `agent-models-3`
**File:** `src/models/content/LearningUnitQuestion.model.ts`

**Requirements:**
1. Link table for Question → LearningUnit
2. Support points override
3. Support sequence ordering
4. Track which bank the question came from

**Schema:**
```typescript
interface ILearningUnitQuestion extends Document {
  learningUnitId: ObjectId;           // ref: LearningUnit
  questionId: ObjectId;               // ref: Question
  bankId?: ObjectId;                  // ref: QuestionBank (for tracking)
  sequence: number;                   // Order in assessment
  pointsOverride: number | null;      // null = use question.points
  createdAt: Date;
  updatedAt: Date;
}

const LearningUnitQuestionSchema = new Schema({
  learningUnitId: { type: ObjectId, ref: 'LearningUnit', required: true, index: true },
  questionId: { type: ObjectId, ref: 'Question', required: true },
  bankId: { type: ObjectId, ref: 'QuestionBank' },
  sequence: { type: Number, required: true },
  pointsOverride: { type: Number, default: null }
}, { timestamps: true });

// Compound unique index - question can only be linked once per learning unit
LearningUnitQuestionSchema.index({ learningUnitId: 1, questionId: 1 }, { unique: true });
```

**Tests Required:**
- `tests/unit/models/LearningUnitQuestion.model.test.ts`

---

### Task 1.4: Create LearnerQuestionProgress Model
**Agent ID:** `agent-models-4`
**File:** `src/models/progress/LearnerQuestionProgress.model.ts`

**Requirements:**
1. Track per-learner progress on each question
2. Support mastery/repetition tracking
3. Track correct/incorrect counts

**Schema:**
```typescript
interface ILearnerQuestionProgress extends Document {
  learnerId: ObjectId;                // ref: User
  learningUnitId: ObjectId;           // ref: LearningUnit
  questionId: ObjectId;               // ref: Question
  correctCount: number;
  incorrectCount: number;
  lastAttemptAt: Date | null;
  isActive: boolean;                  // false when "mastered"
  masteredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LearnerQuestionProgressSchema = new Schema({
  learnerId: { type: ObjectId, ref: 'User', required: true },
  learningUnitId: { type: ObjectId, ref: 'LearningUnit', required: true },
  questionId: { type: ObjectId, ref: 'Question', required: true },
  correctCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  masteredAt: { type: Date, default: null }
}, { timestamps: true });

// Compound unique index
LearnerQuestionProgressSchema.index(
  { learnerId: 1, learningUnitId: 1, questionId: 1 },
  { unique: true }
);
```

**Tests Required:**
- `tests/unit/models/LearnerQuestionProgress.model.test.ts`

---

### Task 1.5: Add Question Settings to Settings Model
**Agent ID:** `agent-models-5`
**File:** `src/models/system/Settings.model.ts` (or create seed)

**Requirements:**
1. Add question category settings
2. Seed default values
3. Create service method to fetch settings

**Seed Script:** `scripts/seed-question-settings.ts`
```typescript
await Settings.findOneAndUpdate(
  { category: 'question' },
  {
    category: 'question',
    settings: {
      matchThreshold: { default: 80, min: 50, max: 100 },
      bulkOperations: { maxItems: 500, maxBanksPerCopy: 10 }
    }
  },
  { upsert: true }
);
```

**Tests Required:**
- `tests/unit/models/Settings.model.test.ts` (if new)

---

## Phase 1 Gate
**Approver:** QA/Architect
**Criteria:**
- [ ] All model schemas compile
- [ ] Unit tests pass
- [ ] Indexes created
- [ ] TypeScript types exported
- [ ] Hierarchy validation prevents circular dependencies

**Required Checks:**
```bash
npm test -- --testPathPattern=models
npx tsc --noEmit
```

---

## Phase 2: Services Implementation
**Dependencies:** Phase 1 complete
**Parallelism:** Tasks 2.1-2.4 can run in parallel

### Task 2.1: Create QuestionBanks Service
**Agent ID:** `agent-services-1`
**File:** `src/services/content/question-banks.service.ts`

**Methods:**
```typescript
class QuestionBanksService {
  // CRUD
  async list(departmentId: string, filters: ListFilters): Promise<PaginatedResult<QuestionBank>>
  async create(departmentId: string, data: CreateBankDto): Promise<QuestionBank>
  async getById(departmentId: string, bankId: string): Promise<QuestionBank>
  async update(departmentId: string, bankId: string, data: UpdateBankDto): Promise<QuestionBank>
  async delete(departmentId: string, bankId: string, force?: boolean): Promise<void>

  // Helpers
  async checkBankInUse(bankId: string): Promise<{ inUse: boolean; usageCount: number }>
}
```

**Tests Required:**
- `tests/unit/services/question-banks.service.test.ts`

---

### Task 2.2: Create DepartmentQuestions Service
**Agent ID:** `agent-services-2`
**File:** `src/services/content/department-questions.service.ts`

**Methods:**
```typescript
class DepartmentQuestionsService {
  // CRUD
  async list(departmentId: string, filters: ListFilters): Promise<PaginatedResult<Question>>
  async create(departmentId: string, data: CreateQuestionDto): Promise<Question>
  async getById(departmentId: string, questionId: string): Promise<Question>
  async update(departmentId: string, questionId: string, data: UpdateQuestionDto): Promise<Question>
  async delete(departmentId: string, questionId: string): Promise<void>

  // Validation
  async validateQuestionType(type: string, data: any): Promise<ValidationResult>
  async validateHierarchy(questionId: string, hierarchy: HierarchyDto): Promise<void>
  async checkQuestionDependencies(questionId: string): Promise<Dependency[]>

  // Settings
  async getDefaultMatchThreshold(): Promise<number>
}
```

**Type-Specific Validation:**
```typescript
// Multiple choice: 2+ options, at least 1 correct
// Multiple select: 2+ options, at least 1 correct
// True/false: exactly 2 options
// Short answer: acceptedAnswers required, matchThreshold optional
// Long answer: sampleAnswer optional, rubric optional
// Matching: pairs[] with 2+ items
// Flashcard: cards[] with 1+ items
// Fill in blank: blanks[] matching text placeholders
```

**Tests Required:**
- `tests/unit/services/department-questions.service.test.ts`
- Test each question type validation

---

### Task 2.3: Create LearningUnitQuestions Service
**Agent ID:** `agent-services-3`
**File:** `src/services/content/learning-unit-questions.service.ts`

**Methods:**
```typescript
class LearningUnitQuestionsService {
  // Linking
  async listLinked(learningUnitId: string): Promise<LinkedQuestion[]>
  async linkQuestion(learningUnitId: string, data: LinkQuestionDto): Promise<LearningUnitQuestion>
  async bulkLink(learningUnitId: string, data: BulkLinkDto): Promise<BulkLinkResult>
  async updateLink(learningUnitId: string, linkId: string, data: UpdateLinkDto): Promise<LearningUnitQuestion>
  async unlinkQuestion(learningUnitId: string, linkId: string): Promise<void>

  // Validation
  async validateLearningUnitType(learningUnitId: string): Promise<void>  // Must be exercise/assessment
  async validateQuestionDepartment(questionId: string, learningUnitId: string): Promise<void>

  // Settings
  async getBulkLimit(): Promise<number>
}
```

**Tests Required:**
- `tests/unit/services/learning-unit-questions.service.test.ts`

---

### Task 2.4: Create LearnerQuestionProgress Service
**Agent ID:** `agent-services-4`
**File:** `src/services/progress/learner-question-progress.service.ts`

**Methods:**
```typescript
class LearnerQuestionProgressService {
  async getProgress(learningUnitId: string, learnerId: string): Promise<ProgressResult>
  async updateProgress(
    learningUnitId: string,
    learnerId: string,
    questionId: string,
    data: UpdateProgressDto
  ): Promise<QuestionProgress>

  // Mastery calculation
  async checkMastery(progress: QuestionProgress, threshold: number): Promise<boolean>
}
```

**Tests Required:**
- `tests/unit/services/learner-question-progress.service.test.ts`

---

## Phase 2 Gate
**Approver:** QA/Architect
**Criteria:**
- [ ] All service methods implemented
- [ ] Unit tests >80% coverage
- [ ] No circular dependencies
- [ ] Hierarchy validation working

**Required Checks:**
```bash
npm test -- --testPathPattern=services
npx tsc --noEmit
```

---

## Phase 3: Controllers & Routes
**Dependencies:** Phase 2 complete
**Parallelism:** Tasks 3.1-3.6 can run in parallel (after services)

### Task 3.1: Question Banks Controller & Routes
**Agent ID:** `agent-controllers-1`
**Files:**
- `src/controllers/content/question-banks.controller.ts`
- `src/routes/department-question-banks.routes.ts`

**Endpoints:**
```
GET    /api/v2/departments/:departmentId/question-banks
POST   /api/v2/departments/:departmentId/question-banks
GET    /api/v2/departments/:departmentId/question-banks/:bankId
PUT    /api/v2/departments/:departmentId/question-banks/:bankId
DELETE /api/v2/departments/:departmentId/question-banks/:bankId
```

**Tests Required:**
- `tests/integration/question-banks/question-banks.test.ts`

---

### Task 3.2: Department Questions Controller & Routes
**Agent ID:** `agent-controllers-2`
**Files:**
- `src/controllers/content/department-questions.controller.ts`
- `src/routes/department-questions.routes.ts`

**Endpoints:**
```
GET    /api/v2/departments/:departmentId/questions
POST   /api/v2/departments/:departmentId/questions
GET    /api/v2/departments/:departmentId/questions/:questionId
PUT    /api/v2/departments/:departmentId/questions/:questionId
DELETE /api/v2/departments/:departmentId/questions/:questionId
```

**Tests Required:**
- `tests/integration/department-questions/department-questions.test.ts`

---

### Task 3.3: Learning Unit Questions Controller & Routes
**Agent ID:** `agent-controllers-3`
**Files:**
- `src/controllers/content/learning-unit-questions.controller.ts`
- `src/routes/learning-unit-questions.routes.ts`

**Endpoints:**
```
GET    /api/v2/learning-units/:learningUnitId/questions
POST   /api/v2/learning-units/:learningUnitId/questions
POST   /api/v2/learning-units/:learningUnitId/questions/bulk
PUT    /api/v2/learning-units/:learningUnitId/questions/:linkId
DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
```

**Tests Required:**
- `tests/integration/learning-unit-questions/learning-unit-questions.test.ts`

---

### Task 3.4: Learner Question Progress Controller & Routes
**Agent ID:** `agent-controllers-4`
**Files:**
- `src/controllers/progress/learner-question-progress.controller.ts`
- `src/routes/learner-question-progress.routes.ts`

**Endpoints:**
```
GET    /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions
POST   /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions/:questionId
```

**Tests Required:**
- `tests/integration/learner-question-progress/progress.test.ts`

---

### Task 3.5: Admin Question Copy Controller & Routes
**Agent ID:** `agent-controllers-5`
**Files:**
- `src/controllers/admin/question-copy.controller.ts`
- `src/routes/admin-questions.routes.ts`

**Endpoints:**
```
POST   /api/v2/admin/questions/copy
POST   /api/v2/admin/question-banks/copy
```

**Tests Required:**
- `tests/integration/admin/question-copy.test.ts`

---

### Task 3.6: Question Settings Controller (extend existing)
**Agent ID:** `agent-controllers-6`
**File:** `src/controllers/admin/settings.controller.ts` (extend)

**Endpoints:**
```
GET    /api/v2/settings/question
PUT    /api/v2/settings/question
```

**Tests Required:**
- `tests/integration/settings/question-settings.test.ts`

---

### Task 3.7: Cleanup Old Question Routes
**Agent ID:** `agent-controllers-7`
**Files:**
- DELETE `src/routes/questions.routes.ts`
- DELETE `src/controllers/content/questions.controller.ts`
- UPDATE `src/app.ts` - remove old routes, add new routes

---

### Task 3.8: AI Quiz Shell Endpoints (501)
**Agent ID:** `agent-controllers-8`
**Files:**
- `src/controllers/content/ai-quiz.controller.ts`
- `src/routes/ai-quiz.routes.ts`

**Endpoints (all return 501):**
```
POST   /api/v2/learning-units/:learningUnitId/ai-quiz/start
POST   /api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer
GET    /api/v2/learning-units/:learningUnitId/ai-quiz/analytics
```

**Implementation:**
```typescript
export const startAIQuiz = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'AI Quiz feature is not yet implemented'
  });
};
```

---

## Phase 3 Gate (MILESTONE: API Layer Complete)
**Approver:** QA/Architect
**Criteria:**
- [ ] All endpoints functional
- [ ] Integration tests pass
- [ ] Old question routes removed
- [ ] Error handling consistent

**Required Checks:**
```bash
npm run build
npm test
npx tsc --noEmit
npm run lint
```

**On Pass:**
- Tag: `question-bank-phase3-api-complete`
- Notify UI team: Priority 1 endpoints ready

---

## Phase 4: Validators
**Dependencies:** None (can run parallel with Phase 2-3)
**Parallelism:** All tasks can run in parallel

### Task 4.1: Question Bank Validator
**File:** `src/validators/question-bank.validator.ts`

### Task 4.2: Department Question Validator
**File:** `src/validators/department-question.validator.ts`

**Type-specific validation schemas for each question type.**

### Task 4.3: Learning Unit Question Validator
**File:** `src/validators/learning-unit-question.validator.ts`

### Task 4.4: Learner Question Progress Validator
**File:** `src/validators/learner-question-progress.validator.ts`

---

## Phase 4 Gate
**Approver:** QA/Architect
**Criteria:**
- [ ] All validators created
- [ ] Validation tests pass

---

## Phase 5: E2E Testing
**Dependencies:** Phase 3 complete
**Parallelism:** Tasks can run in parallel

### Task 5.1: Question Banks E2E
**File:** `tests/integration/question-banks/question-banks.test.ts`

### Task 5.2: Department Questions E2E
**File:** `tests/integration/department-questions/department-questions.test.ts`

### Task 5.3: Learning Unit Questions E2E
**File:** `tests/integration/learning-unit-questions/learning-unit-questions.test.ts`

### Task 5.4: Learner Progress E2E
**File:** `tests/integration/learner-question-progress/progress.test.ts`

### Task 5.5: Admin Copy E2E
**File:** `tests/integration/admin/question-copy.test.ts`

---

## Phase 5 Gate (MILESTONE: Feature Complete)
**Approver:** QA/Architect
**Criteria:**
- [ ] All E2E tests pass
- [ ] Full test suite passes
- [ ] Ready for UI integration

**Required Checks:**
```bash
npm run build
npm test
npx tsc --noEmit
npm run lint
```

**On Pass:**
- Tag: `question-bank-phase5-feature-complete`
- Export contracts to UI team
- Create response message in `agent_coms/messages/`

---

## Parallel Execution Plan

```
Wave 1: [agent-models-1..5]                    ─── Phase 1 Gate ───►
Wave 2: [agent-services-1..4] [agent-validators]  ─── Phase 2 Gate ───►
Wave 3: [agent-controllers-1..8]               ─── Phase 3 Gate (MILESTONE) ───►
Wave 4: [agent-testing-1..5]                   ─── Phase 5 Gate (MILESTONE) ───►
```

---

## Timeline Summary

| Week | Deliverables | UI Status |
|------|--------------|-----------|
| Week 7-8 | Phases 1-3 complete | UI building with mocks |
| **Week 9** | **All P1 endpoints ready** | **UI UNBLOCKED** |
| Week 10 | Phase 4 (validators) | UI integrating |
| **Week 11** | **Progress tracking ready** | **P2 features ready** |
| Week 12 | Admin copy, AI shell | UI integrating |
| **Week 13** | **Full feature complete** | **All features ready** |

---

## Cross-Team Communication

**Contracts Location:** `contracts/api/question-banks.contract.ts`, `contracts/api/learning-unit-questions.contract.ts`
**Messages Location:** `agent_coms/messages/`
**Issue Tracking:** `agent_coms/api/issue_queue/API-ISS-008_question_bank_system.md`
