# Flashcard/Retention LearningUnitQuestion Migration Request

**Date:** 2026-02-11
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** API-ISS-013, UI-ISS-145, UI-ISS-142

---

## Request

Please migrate flashcard and retention/remediation flows from legacy module metadata linking (`Question.metadata.moduleId`) and legacy course refs to `LearningUnitQuestion` linkage and canonical course identifiers.

## Context

Audit shows no direct `CourseContent` in these flows, but there are still legacy patterns:

- `src/services/assessment/flashcard.service.ts:191` filters by `metadata.moduleId`.
- `src/services/assessment/retention-check.service.ts:211` filters by `metadata.moduleId`.
- Course-scoped models still reference `Course`:
  - `src/models/content/CourseFlashcardConfig.model.ts:153`
  - `src/models/activity/FlashcardProgress.model.ts:95`
  - `src/models/activity/RetentionCheck.model.ts:159`
  - `src/models/activity/Remediation.model.ts:96`

This creates drift from the canonical course + learning-unit question architecture used elsewhere.

## Requirements

1. Replace question selection logic in flashcard and retention services to derive cards from `LearningUnitQuestion` relationships.
2. Align course-scoped records with canonical course IDs and model references.
3. Preserve current public endpoint behavior under `/api/v2/courses/:courseId/...` while enforcing canonical ID semantics.
4. Return any new source fields needed by UI (`learningUnitId`, `learningUnitQuestionId`, or equivalent provenance).
5. Add regression tests for selection, retention checks, and remediation creation under migrated linkage.

## Proposed Approach (Optional)

Resolve module -> learning units -> linked questions (`LearningUnitQuestion`) for card pools, then keep response payload backward-compatible while adding explicit provenance fields for frontend migration.

## Questions

1. Will `courseId` in these endpoints continue to be canonical-only after migration?
2. What canonical source fields will be exposed in retention card payloads?
3. Is data backfill/migration needed for existing flashcard progress and remediation records?

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI-ISS-145 (frontend alignment for flashcard/retention migration)

---

## Response Section (For Recipient)

**Status:** [Received | In Progress | Complete | Declined]
**Response Date:** YYYY-MM-DD

[Response content here]

---

*Move to `archive/` when thread is complete*
