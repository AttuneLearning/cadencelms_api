# API-ISS-045: Progress Service CanonicalCourse + LearningUnit Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: UI Team (inbox message: 2026-02-11_progress-service-canonical-learningunit-migration-request.md)
## Assigned To: Unassigned
## Related: UI-ISS-146

---

## Overview

`ProgressService` still uses legacy `Course` + `CourseContent` internals across active `/api/v2/progress/*` endpoints. Migrate to canonical/versioned course resolution and learning-unit-based mappings.

Current evidence:
- `src/services/analytics/progress.service.ts:184`
- `src/services/analytics/progress.service.ts:400`
- `src/services/analytics/progress.service.ts:646`
- `src/services/analytics/progress.service.ts:907`
- `src/services/analytics/progress.service.ts:1091`
- `src/services/analytics/progress.service.ts:1231`

---

## Requirements

1. Replace runtime `CourseContent` lookups with canonical course -> version -> module -> learning unit derivation.
2. Standardize `courseId` semantics as canonical course IDs across progress endpoints.
3. Preserve existing authorization behavior while migrating internals.
4. Publish response contract updates for module progress identity fields.
5. Add regression tests for all progress endpoints and report variants under this service.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/progress/course/:courseId` | Course progress |
| GET | `/api/v2/progress/program/:programId` | Program progress |
| GET | `/api/v2/progress/class/:classId` | Class progress |
| GET | `/api/v2/progress/learner/:learnerId` | Learner summary |
| GET | `/api/v2/progress/reports/summary` | Progress summary report |
| GET | `/api/v2/progress/reports/detailed` | Detailed progress report |

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `src/services/analytics/progress.service.ts` | Modify | Primary migration surface |
| `src/controllers/analytics/progress.controller.ts` | Verify | Contract compatibility |
| `tests/*progress*` | Add/modify | Regression + contract tests |

---

## Acceptance Criteria

- [ ] No runtime `CourseContent.find` usage remains in progress service.
- [ ] Progress endpoints operate correctly with canonical course identities.
- [ ] Module/unit progress response fields are documented and stable.
- [ ] Tests pass.

