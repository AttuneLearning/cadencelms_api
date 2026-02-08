# UI-ISS-106: Program Enrollment — P1 API Alignment

## Status: IN PROGRESS
## Priority: P1
## Created: 2026-02-08
## Related: API-ISS-030, UI-ISS-102

---

## Overview

UI-ISS-102 (learner programs view) is implemented with list/detail pages, but the enrollment flow and API endpoints need alignment with API team's confirmed P1 design (API-ISS-030).

## Requirements

### API Endpoint Alignment
1. Add `enrollProgram()` function: `POST /api/v2/programs/:programId/enroll`
2. Fix `getMyPrograms()` endpoint from `/enrollments/my/programs` to `/api/v2/learners/:learnerId/program-enrollments`
3. Add `getProgramEnrollmentProgress()`: `GET /api/v2/program-enrollments/:enrollmentId/progress`

### Hook Updates
4. Add `useEnrollProgram()` mutation hook with cache invalidation
5. Export learner mutation hooks from program entity index

### Type Alignment
6. Align ProgramCourseItem types with API spec: add `order`, `prerequisiteMet`, ensure `status` values match
7. Add query key for program enrollment progress

### UI — Enrollment Flow
8. Add "Enroll in Program" button on ProgramDetailPage for unenrolled programs
9. Handle enrollment mutation (loading, success, error states)
10. After enrollment, show first unlocked course as "Start Course" CTA
11. Reflect auto-enrollment in first course per API team's confirmed behavior

## Files to Modify

- `src/entities/program/api/learnerProgramApi.ts` — fix endpoints, add enrollProgram, add progress
- `src/entities/program/hooks/useLearnerPrograms.ts` — add useEnrollProgram mutation
- `src/entities/program/hooks/index.ts` — export new hooks
- `src/entities/program/index.ts` — export learner mutations
- `src/entities/program/model/programKeys.ts` — add progress query key
- `src/pages/learner/programs/ProgramDetailPage.tsx` — enrollment UI

## Acceptance Criteria

- [ ] Learners can enroll in a program from ProgramDetailPage
- [ ] API endpoints match confirmed P1 spec
- [ ] Progress endpoint wired for per-course tracking
- [ ] Types aligned with API response shapes
- [ ] Enrollment mutation with proper cache invalidation
- [ ] TypeScript 0 errors
- [ ] Tests pass
