# Reports Service CanonicalCourse + LearningUnit Migration Request

**Date:** 2026-02-11
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-147, UI-ISS-146

---

## Request

Please migrate reporting service internals from legacy `Course` + `CourseContent` to `CanonicalCourse + CourseVersion + LearningUnit/LearningUnitQuestion` data paths.

## Context

Current report-generation code still uses legacy mappings:

- `src/services/reporting/reports.service.ts:209`
- `src/services/reporting/reports.service.ts:254`
- `src/services/reporting/reports.service.ts:454`
- `src/services/reporting/reports.service.ts:773`
- `src/services/reporting/reports.service.ts:1035`

These power active reporting endpoints (`/api/v2/reports/*`) and exports consumed by UI reporting pages.

## Requirements

1. Replace runtime `CourseContent` reads in reporting flows with canonical/versioned course + learning-unit pipelines.
2. Standardize course identity to canonical course IDs across all report payloads.
3. Keep endpoint behavior stable for completion/performance/course/program/department reports and export.
4. Document any response field changes (especially course/module row identities and transcript/course labels).
5. Add regression tests for report endpoints and export paths.

## Proposed Approach (Optional)

Migrate shared report data builders first, then endpoint-specific formatters. Provide a transition window with backward-compatible fields where practical.

## Questions

1. Which response fields will be newly introduced for course-version context?
2. Are transcripts expected to expose canonical + version identifiers per course row?

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI-ISS-147 completion and removal of temporary compatibility parsing in report UI

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Implemented in `API-ISS-046` (`dev_communication/backend/issues/completed/API-ISS-046_reports-service-canonical-learningunit-migration.md`). Reporting internals and payload identities were aligned to canonical learning-unit structures.

---

*Move to `archive/` when thread is complete*
