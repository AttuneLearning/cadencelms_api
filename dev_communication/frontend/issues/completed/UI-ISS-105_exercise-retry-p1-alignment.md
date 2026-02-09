# UI-ISS-105: Exercise Retry — P1 API Alignment

## Status: IN PROGRESS
## Priority: P1
## Created: 2026-02-08
## Related: API-ISS-025, UI-ISS-096

---

## Overview

UI-ISS-096 (exercise retry flow) is implemented, but needs alignment with API team's confirmed P1 design (API-ISS-025). The API is adding `gradingPolicy`, server-side `maxAttempts` enforcement, and a new attempts history endpoint.

## Requirements

### Type Updates
1. Add `gradingPolicy: 'best' | 'last' | 'average'` to Assessment and Exercise types
2. Add `maxAttempts: number | null` to `StartExamAttemptResponse` and `SubmitExamResponse`

### API Integration
3. Add exercise attempts endpoint: `GET /api/v2/exercises/:exerciseId/attempts?learnerId=:id`
4. Add `getExerciseAttempts()` API function in examAttemptApi
5. Add query hook for fetching attempt history by exercise

### UI Enhancements
6. Pre-flight `maxAttempts` check before starting attempt in ExerciseTakingPage
7. Display `gradingPolicy` in ExamResultViewer (which attempt counts)
8. Show `maxAttempts` in AttemptHistory component
9. Handle API rejection when max attempts exhausted (error UX)

## Files to Modify

- `src/entities/assessment/model/types.ts` — add gradingPolicy
- `src/entities/exercise/model/types.ts` — add gradingPolicy
- `src/entities/exam-attempt/model/types.ts` — add maxAttempts to response types
- `src/shared/api/endpoints.ts` — add exercises.attempts endpoint
- `src/entities/exam-attempt/api/examAttemptApi.ts` — add getExerciseAttempts()
- `src/pages/learner/exercises/ExerciseTakingPage.tsx` — pre-flight check
- `src/entities/exam-attempt/ui/ExamResultViewer.tsx` — gradingPolicy display
- `src/entities/exam-attempt/ui/AttemptHistory.tsx` — maxAttempts display

## Acceptance Criteria

- [ ] `gradingPolicy` type exists on Assessment and Exercise models
- [ ] `maxAttempts` included in exam attempt response types
- [ ] Exercise attempts API function and endpoint defined
- [ ] Pre-flight maxAttempts check prevents unnecessary API calls
- [ ] Grading policy displayed to learners on results page
- [ ] TypeScript 0 errors
- [ ] Tests pass
