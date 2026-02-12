# API-ISS-046: Reports Service CanonicalCourse + LearningUnit Migration

## Status: COMPLETED
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-12
## Requested By: UI Team (inbox message: 2026-02-11_reports-service-canonical-learningunit-migration-request.md)
## Assigned To: Codex
## Related: UI-ISS-147, API-ISS-045

---

## Overview

`ReportsService` still uses legacy `Course` + `CourseContent` logic for active `/api/v2/reports/*` endpoints and exports. Migrate report generation internals to canonical/versioned course and learning-unit linkage.

Current evidence:
- `src/services/reporting/reports.service.ts:209`
- `src/services/reporting/reports.service.ts:254`
- `src/services/reporting/reports.service.ts:454`
- `src/services/reporting/reports.service.ts:773`
- `src/services/reporting/reports.service.ts:1035`

---

## Requirements

1. Replace runtime `CourseContent` reads in reporting flows with canonical/versioned + learning-unit data pipelines.
2. Standardize course identity in report payloads to canonical course IDs.
3. Preserve behavior for completion/performance/transcript/course/program/department/export routes.
4. Document response field changes (course row identity, module analytics identity, transcript labels).
5. Add regression tests for report and export endpoints.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/reports/completion` | Completion report |
| GET | `/api/v2/reports/performance` | Performance report |
| GET | `/api/v2/reports/transcript/:learnerId` | Learner transcript |
| GET | `/api/v2/reports/course/:courseId` | Course report |
| GET | `/api/v2/reports/program/:programId` | Program report |
| GET | `/api/v2/reports/department/:departmentId` | Department report |
| GET | `/api/v2/reports/export` | Report export |

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `src/services/reporting/reports.service.ts` | Modify | Primary migration surface |
| `src/controllers/reporting/reports.controller.ts` | Verify | Response compatibility |
| `tests/*reports*` | Add/modify | Regression + contract tests |

---

## Acceptance Criteria

- [x] No runtime `CourseContent.find` usage remains in reports service.
- [x] Reports return canonical course IDs consistently.
- [x] Transcript/course/module report fields are documented and UI-safe.
- [x] Tests pass.

## Completion Notes (2026-02-12)

- Replaced legacy report internals with canonical/versioned context derivation in:
  - `src/services/reporting/reports.service.ts`
- Added canonical course + learning-unit context helpers to support:
  - completion report
  - performance report
  - transcript generation
  - course report
  - program report
  - department report
  - transcript department filtering
- Standardized module identity fields to canonical module + LU-based rows for course analytics.
- Updated authorization integration fixture setup to include canonical course records:
  - `tests/integration/authorization/service-layer-authorization.test.ts`
- Added focused migration guard coverage:
  - `tests/unit/services/progress-reports-canonical-migration.test.ts`
