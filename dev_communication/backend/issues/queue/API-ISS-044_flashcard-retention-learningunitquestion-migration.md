# API-ISS-044: Flashcard/Retention LearningUnitQuestion Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: UI Team (inbox message: 2026-02-11_flashcard-retention-learning-unit-link-migration-request.md)
## Assigned To: Unassigned
## Related: API-ISS-013, UI-ISS-145, UI-ISS-142

---

## Overview

Flashcard/retention flows do not use `CourseContent`, but still rely on legacy module linkage (`Question.metadata.moduleId`) and legacy `Course` references. Migrate selection/provenance to `LearningUnitQuestion` and canonical course semantics.

Current evidence:
- `src/services/assessment/flashcard.service.ts:191`
- `src/services/assessment/retention-check.service.ts:211`
- `src/models/content/CourseFlashcardConfig.model.ts:153`
- `src/models/activity/FlashcardProgress.model.ts:95`
- `src/models/activity/RetentionCheck.model.ts:159`
- `src/models/activity/Remediation.model.ts:96`

---

## Requirements

1. Replace question pool selection in flashcard/retention services with `LearningUnitQuestion`-driven linkage.
2. Align course-scoped record semantics to canonical course IDs.
3. Preserve existing endpoint paths under `/api/v2/courses/:courseId/...` with canonical ID meaning.
4. Expose provenance fields needed by UI (`learningUnitId`, `learningUnitQuestionId`, or equivalent).
5. Add regression tests for flashcard session selection, retention checks, and remediation flow.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/courses/:courseId/flashcard-progress` | Flashcard progress summary |
| GET | `/api/v2/courses/:courseId/retention-checks/pending` | Pending retention checks |
| GET | `/api/v2/courses/:courseId/retention-checks/:checkId` | Retention check details |
| GET | `/api/v2/courses/:courseId/remediations/active` | Active remediations |

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `src/services/assessment/flashcard.service.ts` | Modify | Replace `metadata.moduleId` selection |
| `src/services/assessment/retention-check.service.ts` | Modify | Replace module metadata linkage |
| `src/services/assessment/remediation.service.ts` | Verify | Canonical/provenance consistency |
| `src/models/activity/*.model.ts` | Review/modify | Course ref semantics as needed |
| `tests/*flashcard*`, `tests/*retention*`, `tests/*remediation*` | Add/modify | Regression coverage |

---

## Acceptance Criteria

- [ ] No selection logic depends on `Question.metadata.moduleId`.
- [ ] Flashcard/retention/remediation payloads include stable source provenance for UI.
- [ ] Course ID semantics are canonical and documented.
- [ ] Tests pass.

