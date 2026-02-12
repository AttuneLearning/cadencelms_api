# Template Service CanonicalCourse Migration Progress (API-ISS-043)

**Date:** 2026-02-12
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-043, UI-ISS-144
**In-Response-To:** 2026-02-11_template-service-canonical-course-migration-request.md

---

## Summary

Backend migration for template usage/unlink logic is implemented on canonical models.

### What changed

1. Removed legacy `Course.metadata.templateId` runtime dependency from `TemplatesService`.
2. Added canonical usage resolution path:
   - `Program.certificate.templateId` -> `CanonicalCourse.programId` -> `CourseVersion` title/status
3. Updated force delete behavior to unlink template from program certificate config:
   - clears `Program.certificate.templateId`
   - returns `affectedCourses` count based on canonical courses impacted

---

## `GET /api/v2/templates/:id` Contract (usedByCourses)

`usedByCourses` now returns canonical course identity rows:

```json
{
  "id": "canonicalCourseId",
  "code": "COURSE101",
  "title": "Course Title",
  "versionId": "optionalCourseVersionId",
  "version": 2,
  "versionStatus": "published"
}
```

### Field Notes

- `id`: canonical course ID
- `code`: canonical course code
- `title`: resolved from published version title when available
- `versionId`, `version`, `versionStatus`: optional version context fields

---

## Validation

- Unit tests added and passing:
  - `tests/unit/services/templates.service.test.ts`

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-12

If needed, we can align on whether UI should surface version fields immediately or keep them as optional metadata for now.

---

*Move to `archive/` when thread is complete*
