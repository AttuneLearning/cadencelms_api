# UI-ISS-096: Exercise Retry Flow with Configurable Attempt Limits

## Status: COMPLETE
## Priority: Critical
## Created: 2026-02-07
## Updated: 2026-02-08
## Requested By: Internal
## Assigned To: Claude
## Related: UI-ISS-094, UI-ISS-095
## Category: Critical Gap - Learner Experience

---

## Overview

Learners who fail a quiz or exam currently cannot re-attempt it. The exam results page has a commented-out "Retry Exam" button with a TODO. This issue covers:

1. A configurable **number of retries** setting for all quizzes and exams (staff/admin side)
2. A `<No Limit>` option for unlimited retries
3. The full retry flow on the learner side — showing remaining attempts, enabling retry, preventing exceeding the limit
4. Display of attempt history with scores for each attempt

---

## Requirements

### Staff/Admin Side — Retry Settings

1. Add a "Maximum Attempts" setting to quiz/exam creation and editing
2. Options: 1 (no retries), 2, 3, 5, 10, or **No Limit** (unlimited)
3. Default value: 1 (single attempt, no retries)
4. Setting should be per-exercise (quiz/exam), not global
5. Display current setting on exercise details/management views
6. Setting must be saved to and loaded from the API

### Learner Side — Retry Flow

7. On the exam results page, show "Retry" button if:
   - Learner did not pass AND
   - Attempts used < maximum allowed (or no limit is set)
8. Display: "Attempt X of Y" (or "Attempt X — Unlimited" if no limit)
9. Show attempt history: list of previous attempts with date, score, pass/fail
10. "Retry" button starts a new `startExamAttempt` call
11. If all attempts exhausted, show "No attempts remaining" message with final score
12. Best score or last score is used for grading (make configurable: best vs. last)

---

## Technical Specification

### Data Model Changes

```typescript
// Exercise/Quiz settings (staff-side)
interface ExerciseSettings {
  maxAttempts: number | null;  // null = no limit
  gradingPolicy: 'best' | 'last' | 'average';  // which attempt score counts
  // ...existing fields
}
```

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/exercise-player/ui/ExamResultsView.tsx` | Modify | Uncomment/implement retry button, add attempt counter |
| `src/features/exercise-player/ui/AttemptHistory.tsx` | Create | List of previous attempts with scores |
| `src/entities/exam-attempt/model/types.ts` | Modify | Add maxAttempts, attemptNumber fields |
| `src/entities/exam-attempt/api/examAttemptApi.ts` | Modify | Support retry (new attempt creation) |
| Staff quiz editor (TBD) | Modify | Add maxAttempts and gradingPolicy settings |
| Staff quiz/exam settings form | Modify | Add "Maximum Attempts" dropdown with No Limit option |

### Approach

1. **Staff Side**: Add `maxAttempts` field (dropdown: 1, 2, 3, 5, 10, No Limit) and `gradingPolicy` field (best/last/average) to quiz/exam creation/edit forms
2. **Learner Results Page**: 
   - Query attempt history for the exercise
   - Show "Attempt X of Y" badge
   - Show "Retry" button if attempts remain and not passed
   - Show attempt history table with expandable details
3. **Retry Action**: Call `startExamAttempt` which creates a new attempt, redirecting learner back into the exercise player
4. **No Limit option**: When `maxAttempts` is `null`, always allow retries regardless of attempt count

---

## Tests Required

1. [ ] Staff can set maxAttempts on quiz creation (including No Limit)
2. [ ] Staff can edit maxAttempts on existing quiz
3. [ ] Default maxAttempts is 1 for new quizzes
4. [ ] Learner sees "Attempt X of Y" on results page
5. [ ] Retry button appears when attempts remain and learner failed
6. [ ] Retry button hidden when all attempts used
7. [ ] Retry button hidden when learner passed
8. [ ] "No Limit" allows unlimited retries
9. [ ] Attempt history displays all previous attempts with scores
10. [ ] Clicking retry starts a new exam attempt
11. [ ] Grading policy correctly applies (best/last/average score)
12. [ ] Edge case: maxAttempts changed after learner has started attempts

---

## Acceptance Criteria

- [ ] Quizzes/exams have a configurable max attempts setting with No Limit option
- [ ] Learners can retry failed quizzes when attempts remain
- [ ] Attempt count and remaining attempts are clearly displayed
- [ ] Attempt history shows all previous attempts
- [ ] No Limit option works correctly (infinite retries)
- [ ] Grading policy (best/last/average) is configurable and applied
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Does the API already support maxAttempts on exercises?**
   Check the exam/exercise model on the API side. May need a coordinated API issue.
   
2. **Should the "No Limit" default change for different exercise types?**
   E.g., practice quizzes default to No Limit, final exams default to 1.

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
