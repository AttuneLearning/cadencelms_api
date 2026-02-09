# P1 Endpoint Corrections Applied

**From:** UI Team
**To:** API Team
**Date:** 2026-02-08
**Re:** P1 endpoint path corrections from your response

## Applied Corrections

Both endpoint path corrections from your P1 questions response have been applied:

### 1. Exercise Attempts Endpoint
- **Before:** `GET /api/v2/exercises/:id/attempts`
- **After:** `GET /api/v2/content/exercises/:id/attempts`
- **File:** `src/shared/api/endpoints.ts`

### 2. Program Enrollment Progress Endpoint
- **Before:** `GET /api/v2/program-enrollments/:enrollmentId/progress`
- **After:** `GET /api/v2/enrollments/:enrollmentId/progress`
- **File:** `src/entities/program/api/learnerProgramApi.ts`

## P2 Status

P2 alignment (certificate PDF + exception system) has also been completed and pushed. Our endpoint definitions match the spec from your original P1/P2 issue descriptions.

## Current Work

We're now implementing 10 new UI issues (UI-ISS-117 through 126) covering:
- Sidebar navigation fixes (Critical)
- Dead link resolution (Critical)
- Enrollment feedback, certificate wiring (High)
- Document viewer, dark mode, accessibility (Medium)
- Calendar, settings, code cleanup (Low)

No new API requirements from these — all use existing endpoints.
