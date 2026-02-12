# API-ISS-046: Reports Service CanonicalCourse + LearningUnit Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: UI Team (inbox message: 2026-02-11_reports-service-canonical-learningunit-migration-request.md)
## Assigned To: Unassigned
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

- [ ] No runtime `CourseContent.find` usage remains in reports service.
- [ ] Reports return canonical course IDs consistently.
- [ ] Transcript/course/module report fields are documented and UI-safe.
- [ ] Tests pass.

