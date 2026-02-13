# Canonical Course Migration - UI Contract Clarifications (Templates/Retention/Progress/Reports)

**Date:** 2026-02-13
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-144, UI-ISS-145, UI-ISS-146, UI-ISS-147

---

## Request

Please confirm final response contracts for canonical-course/learning-unit migration surfaces so UI can complete the queued alignment issues without guessing payload fields.

## Context

UI queue items 144-147 each depend on backend-migrated payload details that are currently ambiguous in frontend issue specs.

We can proceed immediately after contract confirmation, but we are pausing implementation of those specific issues until your response to avoid incorrect UI typing/parsing.

## Requirements

1. Confirm final `GET /api/v2/templates/:id` `usedByCourses` row shape for canonical linkage.
2. Confirm flashcard/retention payload fields for LU/LU-question linkage (especially identifiers exposed to UI).
3. Confirm progress payload module identity semantics after migration.
4. Confirm transcript/report row contract fields for canonical course/version references.

## Questions

1. **UI-ISS-144 (templates):**
   What are the final `usedByCourses[]` fields (for example `id`, `code`, `title`, `versionId`, `courseVersionStatus`)?

2. **UI-ISS-145 (flashcard/retention):**
   Will card/retention payloads include explicit `learningUnitId` and/or `learningUnitQuestionId`?

3. **UI-ISS-146 (progress):**
   In migrated progress responses, what does `moduleId` represent (`Module._id`, `LearningUnit._id`, derived key, or mixed)?

4. **UI-ISS-147 (reports/transcript):**
   What canonical/course-version fields should UI expect in transcript rows and course/program report rows?

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI-ISS-144, UI-ISS-145, UI-ISS-146, UI-ISS-147 completion

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Addressed under `API-ISS-052` with contract clarifications and runtime-confirmed answers:

1. **Templates (`GET /api/v2/templates/:id`) `usedByCourses[]` row shape**
   - `id: string`
   - `code: string`
   - `title: string`
   - `versionId?: string`
   - `version?: number`
   - `versionStatus?: 'draft' | 'published' | 'archived'`

2. **Flashcard/retention LU linkage fields**
   - Yes, card payloads include explicit provenance fields in runtime:
   - `learningUnitId?: string`
   - `learningUnitQuestionId?: string`
   - plus `sourceModuleId?: string`
   - Contracts now reflect this for flashcard session and retention-check card payloads.

3. **Progress `moduleId` semantics**
   - Canonical identity is `Module._id`.
   - Treat `moduleProgress[].moduleId` as authoritative.

4. **Transcript/report canonical course/version references**
   - Transcript course rows use canonical `courseId` (`CanonicalCourse._id`) plus `courseCode` and `courseName`.
   - Course/program report course rows use canonical `courseId`.
   - `courseVersionId`/`version` fields are not currently included in these transcript/report row payloads.

---

*Move to `archive/` when thread is complete*
