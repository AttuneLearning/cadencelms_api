# API-ISS-011: Matching Exercise Implementation

## Status: PENDING
## Priority: High
## Created: 2026-01-28
## Updated: 2026-01-28
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-009, API-ISS-012, UI-ISS-072
## Depends-On: API-ISS-009 (Question Model Update)

---

## Overview

Implement standalone matching exercises where learners drag-and-drop items to connect Column A (prompts) with Column B (answers). Matching exercises are built from multiple Questions that have `'matching'` in their `questionTypes` array.

**Key Design**: Each Question contributes ONE match pair:
- `questionText` → Column A
- `correctAnswers[0]` → Column B

Multiple Questions are combined to create a full matching exercise.

---

## Requirements

1. Add `'matching'` as a valid ExerciseType
2. Matching exercise configuration (pairs from question selection)
3. Session endpoint returning shuffled Column B
4. Result submission and auto-grading
5. Attempt history tracking
6. Support for partial credit scoring

---

## Technical Specification

### Updated ExerciseType

```typescript
type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment' | 'flashcard' | 'matching';
```

### Matching Exercise Config (stored on Exercise)

```typescript
interface MatchingExerciseConfig {
  questionIds: ObjectId[];           // Questions to include as pairs
  shuffleColumnB: boolean;           // Randomize answer positions
  allowPartialCredit: boolean;       // Score based on correct count
  showFeedbackOnDrop: boolean;       // Immediate or after submit
  maxAttempts?: number;              // null = unlimited
  timeLimit?: number;                // Seconds, null = unlimited
  columnALabel?: string;             // e.g., "Organelle"
  columnBLabel?: string;             // e.g., "Function"
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/content/exercises` | Create matching exercise (type='matching') |
| GET | `/api/v2/content/exercises/:id/matching-session` | Get shuffled pairs for attempt |
| POST | `/api/v2/content/exercises/:id/matching-result` | Submit matches |
| GET | `/api/v2/content/exercises/:id/matching-attempts` | Get attempt history |

### Session Response

```json
{
  "sessionId": "session_abc123",
  "exerciseId": "ex_001",
  "title": "Cell Organelles Matching",
  "instructions": "Match each organelle to its function",
  "timeLimit": 300,
  "columnALabel": "Organelle",
  "columnBLabel": "Function",
  "columnA": [
    { "id": "q_001", "text": "Mitochondria", "media": null },
    { "id": "q_002", "text": "Ribosome", "media": null },
    { "id": "q_003", "text": "Nucleus", "media": null }
  ],
  "columnB": [
    { "id": "q_002", "text": "Protein synthesis", "media": null },
    { "id": "q_001", "text": "Produces ATP", "media": null },
    { "id": "q_003", "text": "Contains DNA", "media": null }
  ],
  "showFeedbackOnDrop": false
}
```

Note: Column B is shuffled. Learner must match `columnA[i].id` to `columnB[j].id`.

### Result Submission

```json
{
  "sessionId": "session_abc123",
  "matches": [
    { "columnAId": "q_001", "columnBId": "q_001" },
    { "columnAId": "q_002", "columnBId": "q_003" },
    { "columnAId": "q_003", "columnBId": "q_002" }
  ],
  "timeSpent": 45
}
```

### Result Response

```json
{
  "attemptId": "attempt_xyz",
  "score": 33.33,
  "passed": false,
  "correctCount": 1,
  "totalPairs": 3,
  "results": [
    {
      "columnAId": "q_001",
      "matchedColumnBId": "q_001",
      "correctColumnBId": "q_001",
      "correct": true,
      "explanation": "Mitochondria produce ATP..."
    },
    {
      "columnAId": "q_002",
      "matchedColumnBId": "q_003",
      "correctColumnBId": "q_002",
      "correct": false,
      "explanation": "Ribosomes synthesize proteins..."
    }
  ]
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/models/assessment/Exercise.model.ts` | Modify | Add 'matching' type, add config schema |
| `src/services/content/matching-exercise.service.ts` | Create | Matching exercise logic |
| `src/controllers/content/matching-exercise.controller.ts` | Create | Route handlers |
| `src/routes/matching-exercise.routes.ts` | Create | Route definitions |
| `contracts/api/matching-exercises.contract.ts` | Update | Align with Question integration |
| `tests/integration/matching-exercise.test.ts` | Create | Integration tests |

### Approach

1. **Phase 1: Model Update**
   - Add 'matching' to ExerciseType enum
   - Add matchingConfig field to Exercise model
   - Update validators

2. **Phase 2: Service Layer**
   - Implement session building (pull Questions, build columns)
   - Implement shuffling algorithm
   - Implement result grading
   - Implement attempt tracking

3. **Phase 3: API Endpoints**
   - Create routes and controllers
   - Add validation
   - Add authorization

4. **Phase 4: Integration**
   - Test with real Question data
   - Verify media support works

---

## Tests Required

1. [ ] Create matching exercise with valid questions
2. [ ] Create matching exercise fails without matching-type questions
3. [ ] Session returns correct column structure
4. [ ] Session shuffles Column B
5. [ ] Session tracks attempts remaining
6. [ ] Result: all correct = 100% score
7. [ ] Result: partial correct with allowPartialCredit
8. [ ] Result: all-or-nothing without allowPartialCredit
9. [ ] Result: max attempts enforced
10. [ ] Result: time limit enforced
11. [ ] Attempt history returns all attempts
12. [ ] Explanations included in results

---

## Acceptance Criteria

- [ ] 'matching' added to ExerciseType
- [ ] Matching exercise can be created from Questions
- [ ] Session endpoint returns properly structured columns
- [ ] Column B shuffled differently each attempt
- [ ] Results correctly graded
- [ ] Partial credit works when enabled
- [ ] Attempt history tracked
- [ ] Time limit enforced
- [ ] Media support works in both columns
- [ ] All tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Can the same Question appear in multiple matching exercises?**
   Yes - Questions are reusable

2. **How many pairs minimum/maximum?**
   Minimum 2, recommended max 10-12 for usability

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
