# UI-ISS-145: Flashcard/Retention Alignment for LearningUnitQuestion Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: API Team (backend inbox message: 2026-02-11_flashcard-retention-learning-unit-link-migration-request.md)
## Assigned To: Unassigned
## Related: API-ISS-013, UI-ISS-142, UI-ISS-144

---

## Overview

Backend audit found flashcard/retention flows do not use `CourseContent`, but still rely on legacy course refs and question linkage via `Question.metadata.moduleId`. Backend is being asked to migrate to `CanonicalCourse` and `LearningUnitQuestion` linkage.

Current backend evidence:
- `src/services/assessment/flashcard.service.ts:191` uses `metadata.moduleId`.
- `src/services/assessment/retention-check.service.ts:211` uses `metadata.moduleId`.
- Course-scoped models still use `ref: 'Course'`:
  - `src/models/content/CourseFlashcardConfig.model.ts:153`
  - `src/models/activity/FlashcardProgress.model.ts:95`
  - `src/models/activity/RetentionCheck.model.ts:159`
  - `src/models/activity/Remediation.model.ts:96`

---

## Requirements

1. Align flashcard and retention API clients with backend contract changes from module-metadata linking to learning-unit-question linking.
2. Verify route param semantics remain consistent (`courseId` should be canonical course ID after migration).
3. Update UI assumptions around source content context (module-only context may become learning-unit aware).
4. Validate retention/remediation UI still renders correctly after backend model migration.

---

## Technical Specification

### Endpoints (expected backend impact)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/courses/:courseId/flashcard-progress` | Progress computed from learning-unit question links |
| GET | `/api/v2/courses/:courseId/retention-checks/pending` | Retention checks sourced from LU question links |
| GET | `/api/v2/courses/:courseId/retention-checks/:checkId` | Card payload remains stable but source mapping changes |
| GET | `/api/v2/courses/:courseId/remediations/active` | Remediation behavior unchanged; backing linkage changed |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/entities/flashcards/api/*` | Modify | Align request/response typing with migrated contract |
| `src/features/retention-check/*` | Modify | Ensure UI handles updated source metadata fields |
| `src/features/remediation/*` | Modify | Confirm remediation steps with updated backend model |

### Approach

Implement compatibility adapters for transition period, then remove legacy parsing once backend migration is fully deployed.

---

## Tests Required

1. [ ] Flashcard progress loads with canonical course IDs.
2. [ ] Retention check list/detail flows render with migrated payload.
3. [ ] Remediation status/actions remain functional end-to-end.
4. [ ] No regressions in adaptive/playlist flows sharing these course IDs.

---

## Acceptance Criteria

- [ ] Flashcard/retention/remediation UI works against migrated backend.
- [ ] No dependence on legacy module metadata linkage in client logic.
- [ ] Canonical course identifiers are handled consistently.
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Will card payload include explicit `learningUnitId` and/or `learningUnitQuestionId`?**
   Needed to finalize UI typing and analytics event payloads.

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
