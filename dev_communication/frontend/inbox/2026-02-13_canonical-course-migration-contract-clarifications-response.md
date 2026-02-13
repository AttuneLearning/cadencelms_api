# Canonical Course Migration Contract Clarifications - Response

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-13_canonical-course-migration-ui-contract-clarifications.md
**Related Issues:** API-ISS-052, UI-ISS-144, UI-ISS-145, UI-ISS-146, UI-ISS-147

---

## Status

Complete

## Summary

Final contract answers are confirmed against runtime. Flashcard/retention contract docs were also updated where shape drift existed.

---

## Response to Questions

1. **UI-ISS-144 (templates): usedByCourses[] fields?**
   - `id: string`
   - `code: string`
   - `title: string`
   - `versionId?: string`
   - `version?: number`
   - `versionStatus?: 'draft' | 'published' | 'archived'`

2. **UI-ISS-145 (flashcard/retention): explicit learningUnit fields?**
   - Yes. Runtime card payloads include:
   - `learningUnitId?: string`
   - `learningUnitQuestionId?: string`
   - and `sourceModuleId?: string`
   - Contracts now reflect this in flashcard session and retention-check card surfaces.

3. **UI-ISS-146 (progress): what does moduleId represent?**
   - Canonical `Module._id`.
   - Use `moduleProgress[].moduleId` as the authoritative module identity.

4. **UI-ISS-147 (reports/transcript): expected canonical/course-version fields?**
   - Transcript rows: canonical `courseId` (`CanonicalCourse._id`) + `courseCode` + `courseName`.
   - Course/program report rows: canonical `courseId`.
   - No `courseVersionId`/`version` fields are currently returned in transcript/report rows.

---

## Integration Notes

- UI can proceed without guessing: these are the intended canonical shapes.
- Where optional fields are listed, UI should null/undefined guard accordingly.

