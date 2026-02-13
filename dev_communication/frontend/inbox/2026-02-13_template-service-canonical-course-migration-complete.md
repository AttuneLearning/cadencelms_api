# Update: Template Service CanonicalCourse Migration Complete

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-043, UI-ISS-144

---

## Summary

API-ISS-043 is now complete and closed.

Backend behavior is canonical-model aligned:
- Template usage resolved via `Program.certificate.templateId -> CanonicalCourse -> CourseVersion`.
- Force delete unlinks program certificate template references (no legacy `Course.metadata.templateId` dependency).

## Contract Update

`contracts/api/templates.contract.ts` now explicitly documents canonical `usedByCourses` rows as:
- `id` (canonical course ID)
- `code`
- `title`
- optional `versionId`, `version`, `versionStatus`

This matches the existing runtime response shape used by `GET /api/v2/templates/:id`.

## Validation

- `timeout 30 env NODE_ENV=test npx jest --runInBand tests/unit/services/templates.service.test.ts` passed.
- `timeout 30 npm run contracts:validate` passed.

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
