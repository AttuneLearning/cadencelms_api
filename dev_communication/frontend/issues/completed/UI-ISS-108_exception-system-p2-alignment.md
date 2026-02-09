# UI-ISS-108: Exception System — P2 API Alignment

## Status: IN PROGRESS
## Priority: P2
## Created: 2026-02-08
## Related: API-ISS-027, UI-ISS-100

---

## Overview

Exception system UI exists (GrantExceptionDialog, ExceptionHistoryTable, entity) but uses generic endpoints instead of the confirmed enrollment-scoped, type-specific endpoints. Major refactor needed to align.

## Requirements

### Endpoint Restructure
1. Add exception endpoints to `src/shared/api/endpoints.ts`:
   - `byEnrollment(enrollmentId)` → `/enrollments/:id/exceptions`
   - Type-specific: `attempts`, `access`, `moduleUnlock`, `gradeOverride`, `excusedContent`
   - `revoke(enrollmentId, exceptionId)` → PUT not DELETE

2. Rewrite `src/entities/exception/api/exceptionApi.ts`:
   - Replace single `grantException()` with 5 type-specific functions
   - Replace generic `listExceptions()` with `getEnrollmentExceptions(enrollmentId)`
   - Change revoke from DELETE to PUT with reason

### Type Updates
3. Update `src/entities/exception/model/types.ts`:
   - Replace `learnerId` + `courseId` in GrantExceptionPayload with `enrollmentId`
   - Add type-specific payload interfaces for each exception type

### Hook Updates
4. Update `src/entities/exception/hooks/useExceptions.ts`:
   - Replace `useLearnerExceptions()` / `useCourseExceptions()` with `useEnrollmentExceptions(enrollmentId)`
   - Add `useGrantException()` that routes to correct type-specific endpoint
   - Update query keys in exceptionKeys.ts for enrollment scoping

### UI Component Updates
5. Update `src/features/exception-management/ui/GrantExceptionDialog.tsx`:
   - Change props from `learnerId + courseId` to `enrollmentId`
   - Update mutation to use enrollment-scoped endpoint

6. Update `src/features/exception-management/ui/ExceptionHistoryTable.tsx`:
   - Change props from `learnerId? + courseId?` to `enrollmentId`
   - Use `useEnrollmentExceptions(enrollmentId)`

### Tests
7. Update GrantExceptionDialog tests for new props/payload
8. Update any other exception-related tests

## Acceptance Criteria
- [ ] All endpoints enrollment-scoped with type-specific paths
- [ ] Revoke uses PUT (not DELETE) with reason
- [ ] Dialog accepts enrollmentId (not learnerId + courseId)
- [ ] History table queries by enrollmentId
- [ ] TypeScript 0 errors, tests pass
