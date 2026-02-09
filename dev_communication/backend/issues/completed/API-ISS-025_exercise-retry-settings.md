# API-ISS-025: Exercise Retry Settings — maxAttempts Enforcement & gradingPolicy

## Status: COMPLETE
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: API Team
## Related: UI-ISS-096 (COMPLETED), API-ISS-009
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

The UI team has completed the exercise retry flow (UI-ISS-096) including retry buttons, attempt counters, and attempt history display. The API needs to fully support this by:

1. Enforcing `maxAttempts` server-side on exam attempt creation
2. Adding a `gradingPolicy` field to exercises/assessments
3. Returning attempt metadata in responses

The `maxAttempts` field already appears in some contracts (learning-units, assessment-attempts) but needs verification that it's fully enforced.

---

## Requirements

1. **`maxAttempts` on Exercise/Assessment model**: `number | null` (null = no limit). Default: 1
2. **Server-side enforcement**: `POST /api/v2/exam-attempts` must reject with `400 MAX_ATTEMPTS_REACHED` if learner has reached the limit
3. **`gradingPolicy` field**: `'best' | 'last' | 'average'` on Exercise/Assessment model. Determines which attempt score is the official grade. Default: `'best'`
4. **Attempt numbering**: Each exam attempt response should include `attemptNumber` (1-indexed) and `maxAttempts`
5. **Attempt history endpoint**: `GET /api/v2/exercises/:exerciseId/attempts?learnerId=:id` — returns all attempts for a learner on a specific exercise, ordered by date

---

## Technical Specification

### Model Changes

```typescript
// Exercise/Assessment model additions
{
  maxAttempts: number | null,     // null = unlimited, default 1
  gradingPolicy: 'best' | 'last' | 'average'  // default 'best'
}
```

### Endpoint Changes

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/v2/exam-attempts` | Enforce maxAttempts, return attemptNumber |
| GET | `/api/v2/exam-attempts/:id` | Include attemptNumber, maxAttempts in response |
| GET | `/api/v2/exercises/:id/attempts` | New — list attempts for exercise by learner |
| PUT | `/api/v2/exercises/:id` | Accept maxAttempts, gradingPolicy fields |

### Response Enhancement

```json
{
  "id": "attempt_123",
  "exerciseId": "ex_456",
  "learnerId": "learner_789",
  "attemptNumber": 2,
  "maxAttempts": 3,
  "gradingPolicy": "best",
  "score": 85,
  "status": "completed",
  "startedAt": "2026-02-08T10:00:00Z",
  "completedAt": "2026-02-08T10:30:00Z"
}
```

---

## Tests Required

1. [ ] Creating attempt when maxAttempts reached returns 400
2. [ ] Creating attempt when maxAttempts is null always succeeds
3. [ ] attemptNumber increments correctly
4. [ ] gradingPolicy 'best' returns highest score as official grade
5. [ ] gradingPolicy 'last' returns most recent score
6. [ ] gradingPolicy 'average' returns mean of all attempt scores
7. [ ] Attempt history endpoint returns correct data sorted by date

---

## Acceptance Criteria

- [ ] maxAttempts enforced server-side
- [ ] gradingPolicy field stored and used for grade calculation
- [ ] attemptNumber and maxAttempts in all attempt responses
- [ ] Attempt history endpoint functional
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
