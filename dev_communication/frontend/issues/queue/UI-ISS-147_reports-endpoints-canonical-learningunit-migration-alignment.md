# UI-ISS-147: Reports Endpoints Alignment for CanonicalCourse + LearningUnit Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: API Team (backend inbox message: 2026-02-11_reports-service-canonical-learningunit-migration-request.md)
## Assigned To: Unassigned
## Related: UI-ISS-146, UI-ISS-144, UI-ISS-145

---

## Overview

Backend reports service is still on legacy `Course` + `CourseContent` internals and is being requested for migration to canonical/versioned course structures and learning-unit-based linkage.

Current backend evidence:
- `src/services/reporting/reports.service.ts:209`
- `src/services/reporting/reports.service.ts:254`
- `src/services/reporting/reports.service.ts:454`
- `src/services/reporting/reports.service.ts:773`
- `src/services/reporting/reports.service.ts:1035`

Active routes:
- `src/routes/reports.routes.ts:46`
- `src/routes/reports.routes.ts:68`
- `src/routes/reports.routes.ts:84`
- `src/routes/reports.routes.ts:120`
- `src/routes/reports.routes.ts:136`
- `src/routes/reports.routes.ts:152`
- `src/routes/reports.routes.ts:173`

---

## Requirements

1. Align reporting client types/parsers with migrated backend contracts.
2. Ensure report pages/export flows remain stable when course references become canonical IDs.
3. Validate course/module analytics sections under learning-unit-derived metrics.
4. Keep temporary compatibility for mixed response shapes during rollout.

---

## Technical Specification

### Endpoints (expected backend impact)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/reports/completion` | Completion metrics from migrated course/unit model |
| GET | `/api/v2/reports/performance` | Performance metrics from migrated model |
| GET | `/api/v2/reports/transcript/:learnerId` | Transcript course rows aligned to canonical courses |
| GET | `/api/v2/reports/course/:courseId` | Course report with migrated module/unit analytics |
| GET | `/api/v2/reports/program/:programId` | Program report with canonical course relations |
| GET | `/api/v2/reports/department/:departmentId` | Department rollups from migrated data paths |
| GET | `/api/v2/reports/export` | Export contract aligned with migrated report payloads |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/entities/reports/api/*` | Modify | Update contracts/types for migrated responses |
| `src/features/reports/*` | Modify | Adjust renderers for canonical IDs + new module analytics fields |
| `src/pages/*reports*` | Modify | Keep filters/exports functional with new payloads |

### Approach

Roll out compatibility mappers for old/new contract variants; remove legacy branch after backend migration completion.

---

## Tests Required

1. [ ] Completion/performance reports render with migrated payloads.
2. [ ] Course report module analytics remains correct with learning-unit-derived counts.
3. [ ] Transcript and export flows handle canonical IDs without regressions.
4. [ ] Pagination/filtering still works across migrated endpoints.

---

## Acceptance Criteria

- [ ] Report pages and exports function against migrated backend.
- [ ] Canonical course IDs are consistently handled in report state and links.
- [ ] No regression in transcript/report detail rendering.
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Transcript/course rows contract**
   Confirm canonical/course-version fields expected in transcript and course report rows.

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
