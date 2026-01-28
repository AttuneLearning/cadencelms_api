# UI Team - Question Bank & Learning Activity Editor API Contract Proposal

## Date: 2026-01-23
## From: UI Team
## To: API Team
## Priority: High
## Related Issues: UI-ISS-068 (Learning Activity Flow)
## Status: UPDATED with clarifications from Product

---

## Summary

The UI team is implementing comprehensive Learning Activity Editor forms and a Question Bank system. This message proposes the API contracts needed to support these features. We need confirmation on which endpoints exist and which need to be created.

**Spec Documents:**
- `api/agent_coms/ui/specs/LEARNING_ACTIVITY_IMPLEMENTATION_PLAN.md`
- `api/agent_coms/ui/specs/LEARNING_ACTIVITY_EDITOR_FORMS.md`
- `api/agent_coms/ui/specs/QUESTION_BANK_EDITOR_FORM.md`

---

## Key Decisions (from Product)

1. **Question Bank Scope:** Questions are **department-scoped** (not course-scoped)
2. **Cross-Department Copying:** System admins can copy questions/banks between departments
3. **Deletion Rules:** Linked questions require deleting dependents first (no cascade)
4. **SCORM Validation:** Confirmed - upload validates packages
5. **Randomization:** Multiple levels with repetition tracking (see Section 7)
6. **Adaptive Testing:** Support hierarchy-based question skipping (see Section 8)
7. **AI Quizzing:** Low priority but build API shell now (see Section 9)

---

## 1. Question Bank Endpoints (NEW - DEPARTMENT SCOPED)

The Question Bank is a **department-level** repository of reusable questions that can be linked to multiple Learning Units (Exercise, Assessment types).

### 1.1 List Questions in Department

```
GET /api/v2/departments/:departmentId/questions
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by question type (multiple_choice, true_false, short_answer, long_answer, matching, flashcard, fill_in_blank) |
| `difficulty` | string | Filter by difficulty (easy, medium, hard) |
| `tags` | string | Comma-separated tag filter |
| `search` | string | Search question text |
| `bankId` | string | Filter by question bank |
| `page` | number | Pagination |
| `limit` | number | Page size |

**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "departmentId": "uuid",
      "bankId": "uuid",
      "type": "multiple_choice",
      "text": "What is the capital of France?",
      "difficulty": "easy",
      "tags": ["geography", "europe"],
      "points": 10,
      "explanation": "Paris has been the capital since...",
      "options": [
        { "id": "a", "text": "London", "isCorrect": false },
        { "id": "b", "text": "Paris", "isCorrect": true },
        { "id": "c", "text": "Berlin", "isCorrect": false },
        { "id": "d", "text": "Madrid", "isCorrect": false }
      ],
      "hierarchy": {
        "parentQuestionId": null,
        "relatedQuestionIds": ["uuid-2", "uuid-3"],
        "prerequisiteQuestionIds": []
      },
      "usageCount": 3,
      "createdAt": "2026-01-23T10:00:00Z",
      "updatedAt": "2026-01-23T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### 1.2 Question Bank Collections

```
GET /api/v2/departments/:departmentId/question-banks
POST /api/v2/departments/:departmentId/question-banks
GET /api/v2/departments/:departmentId/question-banks/:bankId
PUT /api/v2/departments/:departmentId/question-banks/:bankId
DELETE /api/v2/departments/:departmentId/question-banks/:bankId
```

**Question Bank Object:**
```json
{
  "id": "uuid",
  "departmentId": "uuid",
  "name": "Geography Fundamentals",
  "description": "Basic geography questions for intro courses",
  "questionCount": 45,
  "tags": ["geography"],
  "createdAt": "2026-01-23T10:00:00Z"
}
```

### 1.3 Create Question

```
POST /api/v2/departments/:departmentId/questions
```

**Request Body:**
```json
{
  "bankId": "uuid",
  "type": "multiple_choice",
  "text": "What is the capital of France?",
  "difficulty": "easy",
  "tags": ["geography", "europe"],
  "points": 10,
  "explanation": "Paris has been the capital since...",
  "options": [
    { "text": "London", "isCorrect": false },
    { "text": "Paris", "isCorrect": true },
    { "text": "Berlin", "isCorrect": false },
    { "text": "Madrid", "isCorrect": false }
  ],
  "hierarchy": {
    "relatedQuestionIds": ["uuid-2", "uuid-3"],
    "prerequisiteQuestionIds": []
  }
}
```

### 1.4 Copy Questions Between Departments (System Admin Only)

```
POST /api/v2/admin/questions/copy
```

**Request Body:**
```json
{
  "questionIds": ["uuid-1", "uuid-2", "uuid-3"],
  "sourceDepartmentId": "uuid",
  "targetDepartmentId": "uuid",
  "targetBankId": "uuid"
}
```

**Response:**
```json
{
  "copied": 3,
  "newQuestionIds": ["uuid-a", "uuid-b", "uuid-c"],
  "mappings": [
    { "sourceId": "uuid-1", "targetId": "uuid-a" }
  ]
}
```

### 1.5 Copy Question Bank Between Departments (System Admin Only)

```
POST /api/v2/admin/question-banks/copy
```

**Request Body:**
```json
{
  "bankId": "uuid",
  "sourceDepartmentId": "uuid",
  "targetDepartmentId": "uuid",
  "newName": "Geography Fundamentals (Copy)"
}
```

### 1.6 Delete Question

```
DELETE /api/v2/departments/:departmentId/questions/:questionId
```

**Error Response (if linked):**
```json
{
  "error": "QUESTION_HAS_DEPENDENCIES",
  "message": "Cannot delete question. It is linked to 3 learning units.",
  "dependencies": [
    { "learningUnitId": "uuid", "title": "Module 1 Quiz" },
    { "learningUnitId": "uuid", "title": "Final Assessment" }
  ]
}
```

**Note:** User must unlink question from all learning units before deletion.

---

## 2. Question Type Variants

#### Multiple Choice / True-False
```json
{
  "type": "multiple_choice" | "true_false",
  "text": "Question text",
  "options": [
    { "text": "Option A", "isCorrect": false },
    { "text": "Option B", "isCorrect": true }
  ]
}
```

#### Short Answer (Auto-graded)
```json
{
  "type": "short_answer",
  "text": "What is React?",
  "acceptedAnswers": ["A JavaScript library", "JavaScript library for UI"],
  "matchThreshold": 80
}
```
> `matchThreshold` (0-100): Percentage match for auto-grading fuzzy answers. Default: 80.

#### Long Answer / Essay (Manual grading)
```json
{
  "type": "long_answer",
  "text": "Explain the process of photosynthesis",
  "sampleAnswer": "Photosynthesis is the process by which...",
  "rubric": "Full marks for mentioning: light, chlorophyll, CO2, glucose"
}
```

#### Matching
```json
{
  "type": "matching",
  "text": "Match the countries to their capitals",
  "pairs": [
    { "left": "France", "right": "Paris" },
    { "left": "Germany", "right": "Berlin" },
    { "left": "Spain", "right": "Madrid" }
  ]
}
```

#### Flashcard
```json
{
  "type": "flashcard",
  "text": "Vocabulary Set: Chapter 3",
  "cards": [
    { "front": "Bonjour", "back": "Hello", "hint": "French greeting" },
    { "front": "Merci", "back": "Thank you" }
  ]
}
```

#### Fill in the Blank
```json
{
  "type": "fill_in_blank",
  "text": "The capital of France is ___.",
  "blanks": [
    { "position": 0, "acceptedAnswers": ["Paris"], "matchThreshold": 100 }
  ]
}
```

---

## 3. Learning Unit Question Linking (NEW)

Link questions from the Question Bank to specific Learning Units (Exercise/Assessment types).

### 3.1 Get Questions for Learning Unit

```
GET /api/v2/learning-units/:learningUnitId/questions
```

**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "questionId": "uuid",
      "learningUnitId": "uuid",
      "sequence": 1,
      "pointsOverride": null,
      "question": {
        "id": "uuid",
        "type": "multiple_choice",
        "text": "What is the capital of France?",
        "difficulty": "easy",
        "options": [...]
      }
    }
  ]
}
```

### 3.2 Link Question to Learning Unit

```
POST /api/v2/learning-units/:learningUnitId/questions
```

**Request Body:**
```json
{
  "questionId": "uuid",
  "sequence": 1,
  "pointsOverride": 15
}
```

### 3.3 Bulk Link Questions

```
POST /api/v2/learning-units/:learningUnitId/questions/bulk
```

**Request Body:**
```json
{
  "questions": [
    { "questionId": "uuid-1", "sequence": 1 },
    { "questionId": "uuid-2", "sequence": 2 },
    { "questionId": "uuid-3", "sequence": 3 }
  ]
}
```

### 3.4 Update Question Link (reorder, override points)

```
PUT /api/v2/learning-units/:learningUnitId/questions/:linkId
```

### 3.5 Unlink Question

```
DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
```

---

## 4. Learning Unit Settings Extension (VERIFY/EXTEND)

### 4.1 Assessment Settings (Updated with Randomization)

```json
{
  "id": "uuid",
  "type": "assessment",
  "title": "Final Quiz",
  "settings": {
    "timeLimit": 30,
    "passingScore": 70,
    "maxAttempts": 3,
    "shuffleAnswers": true,
    "showCorrectAnswers": "after_submission",
    "gradingMethod": "highest_attempt",
    
    "questionSelection": {
      "mode": "manual",
      "randomCount": null,
      "filters": null,
      "randomizationLevel": "in_order",
      "repetitionThreshold": null,
      "allowUserRandomizationChoice": true
    }
  }
}
```

**New Question Selection Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `mode` | enum | 'manual', 'random', 'adaptive' |
| `randomCount` | number | Number of questions to select (random mode) |
| `filters` | object | `{ type, difficulty, tags, bankId }` |
| `randomizationLevel` | enum | 'in_order', 'by_difficulty', 'completely_random' |
| `repetitionThreshold` | number | Correct answers before question is "turned off" for this testing round |
| `allowUserRandomizationChoice` | boolean | If true, learner can choose randomization level |

---

## 5. Question Hierarchy for Adaptive Testing (NEW - MEDIUM PRIORITY)

### 5.1 Question Hierarchy Model

Each question can define relationships for adaptive testing:

```json
{
  "id": "uuid",
  "hierarchy": {
    "parentQuestionId": "uuid",
    "relatedQuestionIds": ["uuid-2", "uuid-3"],
    "prerequisiteQuestionIds": ["uuid-0"],
    "conceptTag": "geography-capitals",
    "difficultyProgression": 2
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `parentQuestionId` | uuid | Parent in concept hierarchy |
| `relatedQuestionIds` | uuid[] | Questions testing same concept (skip if parent answered correctly) |
| `prerequisiteQuestionIds` | uuid[] | Must answer these correctly first |
| `conceptTag` | string | Groups questions by concept for adaptive logic |
| `difficultyProgression` | number | Order within difficulty progression (1=easiest) |

### 5.2 Adaptive Testing Settings

```json
{
  "settings": {
    "questionSelection": {
      "mode": "adaptive",
      "adaptiveConfig": {
        "skipRelatedOnCorrect": true,
        "repeatWrongAnswers": true,
        "repeatDelay": 3,
        "difficultyProgression": "increase_on_correct",
        "maxDifficultyJump": 2,
        "conceptMastery": {
          "correctThreshold": 3,
          "action": "skip_related"
        }
      }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `skipRelatedOnCorrect` | boolean | Skip related questions when parent answered correctly |
| `repeatWrongAnswers` | boolean | Re-present missed questions |
| `repeatDelay` | number | Questions between repeat of wrong answer |
| `difficultyProgression` | enum | 'increase_on_correct', 'decrease_on_wrong', 'maintain' |
| `maxDifficultyJump` | number | Max difficulty levels to skip |
| `conceptMastery.correctThreshold` | number | Correct answers to "master" concept |
| `conceptMastery.action` | enum | 'skip_related', 'reduce_weight', 'complete' |

---

## 6. Learner Question Progress Tracking (NEW)

Track per-learner progress for repetition and adaptive features.

### 6.1 Get Learner Question Progress

```
GET /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions
```

**Response:**
```json
{
  "progress": [
    {
      "questionId": "uuid",
      "correctCount": 2,
      "incorrectCount": 1,
      "lastAttemptAt": "2026-01-23T10:00:00Z",
      "isActive": true,
      "masteredAt": null
    }
  ],
  "sessionStats": {
    "questionsAnswered": 15,
    "correctThisSession": 12,
    "masteredThisSession": 5,
    "activeQuestionCount": 20
  }
}
```

### 6.2 Update Question Progress (Internal - called by assessment engine)

```
POST /api/v2/learning-units/:learningUnitId/progress/:learnerId/questions/:questionId
```

**Request Body:**
```json
{
  "isCorrect": true,
  "attemptId": "uuid",
  "timeSpent": 45
}
```

---

## 7. AI-Assisted Quizzing (NEW - LOW PRIORITY, BUILD SHELL)

> **Priority:** Low - but build API shell now for future implementation

### 7.1 AI Quiz Session Endpoints

```
POST /api/v2/learning-units/:learningUnitId/ai-quiz/start
```

**Request Body:**
```json
{
  "learnerId": "uuid",
  "aiConfig": {
    "enabled": true,
    "model": "default",
    "adaptationLevel": "moderate",
    "allowQuestionGeneration": false,
    "questionBankScope": ["uuid-bank-1", "uuid-bank-2"]
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "active",
  "aiEnabled": true,
  "nextQuestion": { ... }
}
```

### 7.2 AI Quiz Answer Submission

```
POST /api/v2/learning-units/:learningUnitId/ai-quiz/:sessionId/answer
```

**Request Body:**
```json
{
  "questionId": "uuid",
  "answer": "Paris",
  "timeSpent": 30
}
```

**Response (AI-enhanced):**
```json
{
  "isCorrect": true,
  "feedback": "Correct! Paris has been the capital of France since 987 AD.",
  "aiInsight": "You're showing strong knowledge of European capitals. Let's try something harder.",
  "nextQuestion": {
    "id": "uuid",
    "type": "multiple_choice",
    "text": "What is the capital of Liechtenstein?",
    "aiReason": "Increased difficulty based on correct streak"
  },
  "sessionProgress": {
    "questionsAnswered": 5,
    "correctRate": 0.8,
    "estimatedMastery": 0.65
  }
}
```

### 7.3 AI Quiz Configuration (Instructor Settings)

```json
{
  "settings": {
    "aiQuizzing": {
      "enabled": false,
      "allowLearnerToggle": false,
      "adaptationLevel": "moderate",
      "allowQuestionGeneration": false,
      "feedbackLevel": "detailed",
      "maxSessionDuration": 30,
      "questionBankScope": "linked_only"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | AI quizzing available for this unit |
| `allowLearnerToggle` | boolean | Can learner enable/disable AI |
| `adaptationLevel` | enum | 'minimal', 'moderate', 'aggressive' |
| `allowQuestionGeneration` | boolean | Can AI generate new questions (future) |
| `feedbackLevel` | enum | 'none', 'correct_only', 'detailed', 'conversational' |
| `maxSessionDuration` | number | Minutes |
| `questionBankScope` | enum | 'linked_only', 'department', 'all_accessible' |

### 7.4 AI Quiz Analytics (Future)

```
GET /api/v2/learning-units/:learningUnitId/ai-quiz/analytics
```

**Response (placeholder):**
```json
{
  "totalSessions": 0,
  "avgMasteryImprovement": null,
  "mostEffectiveAdaptations": [],
  "learnerFeedback": []
}
```

---

## 8. Summary of Required Endpoints

### High Priority (Sprint 3-4)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v2/departments/:id/questions` | GET | NEW |
| `/api/v2/departments/:id/questions` | POST | NEW |
| `/api/v2/departments/:id/questions/:id` | GET/PUT/DELETE | NEW |
| `/api/v2/departments/:id/question-banks` | CRUD | NEW |
| `/api/v2/learning-units/:id/questions` | GET/POST/DELETE | NEW |
| `/api/v2/learning-units/:id/questions/bulk` | POST | NEW |

### Medium Priority (Sprint 5-6)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v2/admin/questions/copy` | POST | NEW |
| `/api/v2/admin/question-banks/copy` | POST | NEW |
| `/api/v2/learning-units/:id/progress/:learnerId/questions` | GET/POST | NEW |
| Question hierarchy fields | - | EXTEND |
| Adaptive testing settings | - | EXTEND |

### Low Priority (Build Shell Now)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v2/learning-units/:id/ai-quiz/start` | POST | SHELL |
| `/api/v2/learning-units/:id/ai-quiz/:id/answer` | POST | SHELL |
| `/api/v2/learning-units/:id/ai-quiz/analytics` | GET | SHELL |
| AI quiz settings fields | - | SHELL |

---

## 9. Lookup Values (VERIFY)

### Question Type Lookup
```
GET /api/v2/lookup-values?category=question-type
```

Expected values:
- `multiple_choice`
- `multiple_select`
- `true_false`
- `short_answer`
- `long_answer`
- `matching`
- `flashcard`
- `fill_in_blank`

### Question Difficulty Lookup
```
GET /api/v2/lookup-values?category=question-difficulty
```

Expected values:
- `easy`
- `medium`
- `hard`

### Randomization Level Lookup
```
GET /api/v2/lookup-values?category=randomization-level
```

Expected values:
- `in_order`
- `by_difficulty`
- `completely_random`

---

## 10. Response Requested

Please reply with:
1. Confirmation of department-scoped question model
2. Timeline for high-priority endpoints
3. Feasibility of adaptive testing features
4. AI quizzing shell structure approval
5. Any concerns with deletion dependency rules

Thank you!
