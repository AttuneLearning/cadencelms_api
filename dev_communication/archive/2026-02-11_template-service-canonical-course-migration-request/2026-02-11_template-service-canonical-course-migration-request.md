# Template Service CanonicalCourse Migration Request

**Date:** 2026-02-11
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-144

---

## Request

Please migrate template usage and template-link deletion logic from legacy `Course` references to the `CanonicalCourse + CourseVersion` model.

## Context

Template endpoints are active UI dependencies. Current implementation still uses legacy `Course`:

- `src/services/content/templates.service.ts:4` imports `Course`.
- `src/services/content/templates.service.ts:331` reads usage from `Course.metadata.templateId`.
- `src/services/content/templates.service.ts:507` force delete updates `Course.metadata.templateId`.

This conflicts with versioned course architecture and causes contract risk for template-management UI as we standardize on canonical course IDs.

## Requirements

1. Replace template usage lookup with canonical-course aware query logic.
2. Replace force-delete unlink logic with canonical-course aware update path.
3. Ensure `GET /api/v2/templates/:id` returns stable used-by course rows with canonical IDs and display title/code.
4. Document final response contract for `usedByCourses` so UI can remove temporary adapters.
5. Add or update tests covering usage lookup and force-delete unlink behavior.

## Proposed Approach (Optional)

Use `CanonicalCourse` as stable identifier and resolve display title from current published (or latest draft) `CourseVersion`. During rollout, return both `id` and optional compatibility field if needed.

## Questions

1. Will template linkage live on `CanonicalCourse`, `CourseVersion`, or both?
2. Should API return version metadata (`versionId`, `status`) in `usedByCourses`?

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI-ISS-144 completion and cleanup of legacy assumptions in template UI

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Implemented in `API-ISS-043` (`dev_communication/backend/issues/completed/API-ISS-043_template-service-canonical-course-migration.md`). Template usage/unlink logic is canonical-course based and contract notes now document canonical `usedByCourses` fields.

---

*Move to `archive/` when thread is complete*
