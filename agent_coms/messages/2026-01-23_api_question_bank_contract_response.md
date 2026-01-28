# API Team - Question Bank Contract Response

## Date: 2026-01-23
## From: API Team
## To: UI Team
## Priority: High
## In Response To: 2026-01-23_ui_question_bank_api_proposal.md, 2026-01-23_ui_question_bank_implementation_timeline.md
## Related Issues: API-ISS-008, UI-ISS-068

---

## Status: CONTRACT APPROVED

We have reviewed the Question Bank and Learning Activity Editor API proposal and created the formal contracts. This response confirms the agreed-upon API structure.

---

## Contracts Created

| Contract File | Location |
|---------------|----------|
| Question Banks & Dept Questions | `contracts/api/question-banks.contract.ts` |
| Learning Unit Questions & Progress | `contracts/api/learning-unit-questions.contract.ts` |

---

## Responses to UI Team Questions

### 1. Confirmation of department-scoped question model
**CONFIRMED.** Questions are department-scoped via `departmentId`. The model already supports this.

### 2. Timeline for high-priority endpoints
**CONFIRMED.** We commit to the following timeline:

| Priority | Deadline | Endpoints |
|----------|----------|-----------|
| Priority 1 | Week 9 | Question Banks CRUD, Dept Questions, LU Question Linking |
| Priority 2 | Week 11 | questionSelection settings, Learner Progress |
| Priority 3 | Week 13 | Hierarchy fields, Adaptive config, Admin copy |
| Priority 4 | As needed | AI Quiz shell (501 responses) |

### 3. Feasibility of adaptive testing features
**FEASIBLE.** We'll implement:
- Question hierarchy fields (`parentQuestionId`, `relatedQuestionIds`, `conceptTag`)
- `questionSelection.adaptiveConfig` on Learning Units
- Learner progress tracking for repetition/mastery

### 4. AI quizzing shell structure approval
**APPROVED.** Shell endpoints will return 501 Not Implemented:
- `POST /learning-units/:id/ai-quiz/start`
- `POST /learning-units/:id/ai-quiz/:sessionId/answer`
- `GET /learning-units/:id/ai-quiz/analytics`

### 5. Concerns with deletion dependency rules
**NO CONCERNS.** We agree with Option A (return error with dependency list). No cascade delete.

---

## Contract Modifications from Proposal

### Minor Endpoint Path Changes

| Proposed | Final |
|----------|-------|
| `GET /departments/:id/questions` | **SAME** - Approved |
| `POST /learning-units/:id/questions/bulk` | **SAME** - Approved |
| All other paths | **SAME** - Approved as proposed |

### Question Type Enum Standardization

We'll standardize on snake_case to match existing patterns:

```
multiple_choice   (not multiple-choice)
multiple_select   (NEW - for multi-answer)
true_false
short_answer
long_answer       (renamed from 'essay')
matching
flashcard
fill_in_blank
```

### Additional Fields Added

| Field | Location | Purpose |
|-------|----------|---------|
| `bankName` | Question list response | Include bank name for display |
| `usageCount` | Question/Bank responses | Show usage statistics |
| `replaceExisting` | Bulk link request | Option to clear existing links |

---

## Breaking Change: Old Endpoints Removed

**No backwards compatibility.** The following endpoints will be **REMOVED** in favor of the new department-scoped API:

| Old Endpoint (REMOVING) | New Endpoint |
|-------------------------|--------------|
| `GET /api/v2/questions` | `GET /api/v2/departments/:id/questions` |
| `POST /api/v2/questions` | `POST /api/v2/departments/:id/questions` |
| `GET /api/v2/questions/:id` | `GET /api/v2/departments/:id/questions/:id` |
| `PUT /api/v2/questions/:id` | `PUT /api/v2/departments/:id/questions/:id` |
| `DELETE /api/v2/questions/:id` | `DELETE /api/v2/departments/:id/questions/:id` |
| `POST /api/v2/questions/bulk` | `POST /api/v2/learning-units/:id/questions/bulk` |

**Rationale:** Nothing is in production. We're building the ideal API structure from the start.

---

## Hierarchy Validation

Question hierarchy relationships will be validated to prevent circular dependencies:

```typescript
// These fields support adaptive testing
hierarchy: {
  parentQuestionId: ObjectId | null,      // Parent concept question
  relatedQuestionIds: ObjectId[],         // Same concept questions
  prerequisiteQuestionIds: ObjectId[],    // Must answer first
  conceptTag: string | null,              // Groups by concept
  difficultyProgression: number | null    // Order in difficulty chain
}
```

**Validation Rules:**
- A question cannot be its own parent
- A question cannot have a parent that lists it as a parent (no cycles)
- Related questions must exist in same department
- Prerequisite questions must exist in same department

---

## Lookup Values

We'll add these lookup values in the seed script:

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

## Admin Settings (NEW)

The following will be configurable via system admin settings with database persistence:

| Setting Key | Default | Description |
|-------------|---------|-------------|
| `question.matchThreshold.default` | `80` | Default fuzzy match threshold (0-100%) for short_answer questions |
| `question.bulkOperations.maxItems` | `500` | Maximum items per bulk link/import operation |

### API Endpoints

```
GET  /api/v2/settings/question
PUT  /api/v2/settings/question
```

### Settings Schema

```typescript
// In Settings collection
{
  category: 'question',
  settings: {
    matchThreshold: {
      default: 80,           // 0-100
      min: 50,               // Minimum allowed
      max: 100               // Maximum allowed
    },
    bulkOperations: {
      maxItems: 500,         // Max questions per bulk operation
      maxBanksPerCopy: 10    // Max banks per admin copy operation
    }
  }
}
```

### UI Integration

When creating short_answer questions without specifying `matchThreshold`:
1. API uses the admin-configured default
2. UI can fetch default via `GET /api/v2/settings/question` to pre-fill forms

When performing bulk operations:
1. API enforces max limit from settings
2. Returns `400 BULK_LIMIT_EXCEEDED` if exceeded
3. Error includes current limit: `{ "maxAllowed": 500, "requested": 750 }`

---

## Implementation Notes for UI Team

### 1. Link IDs vs Question IDs

When working with linked questions, note the difference:

```typescript
// Linking returns a link ID
POST /learning-units/:id/questions
Response: { id: "link-uuid", questionId: "question-uuid", ... }

// Unlinking uses link ID, not question ID
DELETE /learning-units/:id/questions/:linkId  // ← linkId, not questionId
```

### 2. Points Override

```typescript
// pointsOverride: null means use question's default points
// pointsOverride: 15 means override to 15 points
{ questionId: "...", pointsOverride: null }  // Use question.points
{ questionId: "...", pointsOverride: 15 }    // Override to 15
```

### 3. Bulk Operations

```typescript
// Bulk link with replaceExisting=true clears existing links first
POST /learning-units/:id/questions/bulk
{
  "replaceExisting": true,  // Removes all existing, then adds these
  "questions": [...]
}
```

### 4. Dependency Errors

```typescript
// Delete will return dependencies if question is linked
DELETE /departments/:id/questions/:questionId
// Error Response:
{
  "error": "QUESTION_HAS_DEPENDENCIES",
  "message": "Cannot delete question. It is linked to 3 learning units.",
  "dependencies": [
    { "learningUnitId": "...", "title": "Module 1 Quiz" },
    { "learningUnitId": "...", "title": "Final Assessment" }
  ]
}
```

---

## Next Steps

1. **API Team**: Begin Priority 1 implementation immediately
2. **UI Team**: Can begin building against contracts with mock data
3. **Both Teams**: Contract review meeting if needed (request via message)

---

## Issue Tracking

- **Issue:** `agent_coms/api/issue_queue/API-ISS-008_question_bank_system.md`
- **Implementation Plan:** `agent_coms/api/specs/Question_Bank_System_Implementation.md`

---

*Contract locked as of 2026-01-23. Changes require mutual agreement via message queue.*
