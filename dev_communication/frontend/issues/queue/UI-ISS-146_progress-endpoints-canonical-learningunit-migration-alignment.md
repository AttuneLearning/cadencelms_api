# UI-ISS-146: Progress Endpoints Alignment for CanonicalCourse + LearningUnit Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: API Team (backend inbox message: 2026-02-11_progress-service-canonical-learningunit-migration-request.md)
## Assigned To: Unassigned
## Related: UI-ISS-144, UI-ISS-145, API migration request (progress)

---

## Overview

Backend progress endpoints are still using legacy `Course` + `CourseContent` internally and are being requested for migration to `CanonicalCourse + CourseVersion + LearningUnit/LearningUnitQuestion`.

Current backend evidence:
- `src/services/analytics/progress.service.ts:184`
- `src/services/analytics/progress.service.ts:400`
- `src/services/analytics/progress.service.ts:646`
- `src/services/analytics/progress.service.ts:907`
- `src/services/analytics/progress.service.ts:1091`
- `src/services/analytics/progress.service.ts:1231`

Active routes:
- `src/routes/progress.routes.ts:26`
- `src/routes/progress.routes.ts:37`
- `src/routes/progress.routes.ts:59`
- `src/routes/progress.routes.ts:71`
- `src/routes/progress.routes.ts:83`
- `src/routes/progress.routes.ts:94`
- `src/routes/progress.routes.ts:105`

---

## Requirements

1. Align frontend progress entity types with migrated payloads from learning-unit-based module progress.
2. Ensure progress UI handles canonical course IDs consistently.
3. Verify module-level progress rendering still works if module identity shifts from legacy content IDs to learning unit IDs.
4. Add resilient parsing for rollout window (old/new shapes).

---

## Technical Specification

### Endpoints (expected backend impact)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/progress/course/:courseId` | Course progress with learning-unit-derived modules |
| GET | `/api/v2/progress/program/:programId` | Program progress using canonical course relationships |
| GET | `/api/v2/progress/class/:classId` | Class progress over migrated module/unit model |
| GET | `/api/v2/progress/learner/:learnerId` | Learner summary from migrated progress pipeline |
| GET | `/api/v2/progress/reports/summary` | Aggregated progress summary from migrated model |
| GET | `/api/v2/progress/reports/detailed` | Detailed learner/module progress from migrated model |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/entities/progress/api/*` | Modify | Update types/parsers for migrated payloads |
| `src/features/progress/*` | Modify | Align module progress rendering to new IDs/fields |
| `src/pages/*progress*` | Modify | Verify page-level integration and fallback handling |

### Approach

Support backward-compatible adapters first, then remove legacy mapping once backend migration is stable in production.

---

## Tests Required

1. [ ] Course progress page renders with migrated module/unit fields.
2. [ ] Learner/program progress summaries remain accurate with canonical IDs.
3. [ ] Detailed progress table handles migrated module identifiers.
4. [ ] No 403/404 regression handling leaks into completion logic.

---

## Acceptance Criteria

- [ ] Progress pages work with migrated backend responses.
- [ ] Canonical course IDs are handled consistently in client state/routes.
- [ ] Module/unit progress visualization remains correct.
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Final module identity in response**
   Confirm whether `moduleId` maps to `LearningUnit._id`, content ID, or both in transitioned payloads.

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
