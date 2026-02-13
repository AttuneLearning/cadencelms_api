# API-ISS-043: Template Service CanonicalCourse Migration

## Status: COMPLETE
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-13
## Requested By: UI Team (inbox message: 2026-02-11_template-service-canonical-course-migration-request.md)
## Assigned To: Codex
## Related: UI-ISS-144

---

## Overview

Template usage lookups and force-delete unlink logic still depend on legacy `Course` and `metadata.templateId`. Migrate template-course linkage handling to `CanonicalCourse + CourseVersion`.

Current evidence:
- `src/services/content/templates.service.ts:4`
- `src/services/content/templates.service.ts:331`
- `src/services/content/templates.service.ts:507`

---

## Requirements

1. Replace template usage lookup with canonical-course aware query/update logic.
2. Replace force-delete unlink flow to update canonical/versioned course linkage.
3. Keep `GET /api/v2/templates/:id` stable while returning canonical IDs in `usedByCourses`.
4. Document final response contract fields for UI migration (`id`, `code`, `title`, optional version fields).
5. Add/update tests for usage lookup and force-delete unlink behavior.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/templates/:id` | Template detail with `usedByCourses` |
| DELETE | `/api/v2/templates/:id?force=true` | Force-delete and unlink from courses |

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `src/services/content/templates.service.ts` | Modify | Remove legacy `Course` dependency path |
| `src/controllers/content/templates.controller.ts` | Verify | Contract passthrough/stability |
| `tests/*templates*` | Add/modify | Regression + contract coverage |

---

## Acceptance Criteria

- [x] No runtime dependency on legacy `Course` for template usage/unlink operations.
- [x] `usedByCourses` returns canonical course identity and UI-safe display fields.
- [x] Force-delete unlink behavior remains correct.
- [x] Tests pass.

---

## Progress Notes

- 2026-02-12: Migrated template usage resolution to canonical path:
  - `Program.certificate.templateId` -> `CanonicalCourse.programId` -> `CourseVersion` title/status.
- 2026-02-12: Removed legacy runtime dependency on `Course.metadata.templateId` from `TemplatesService`.
- 2026-02-12: Force delete now unlinks `Program.certificate.templateId` and reports affected canonical courses.
- 2026-02-12: Added regression tests in `tests/unit/services/templates.service.test.ts` for:
  - canonical `usedByCourses` payload,
  - stale `usageCount` guard behavior,
  - force-delete unlink flow.

## Response Contract Notes (UI)

`GET /api/v2/templates/:id` now returns:

```json
{
  "usedByCourses": [
    {
      "id": "canonicalCourseId",
      "code": "COURSE101",
      "title": "Course Title",
      "versionId": "optionalCourseVersionId",
      "version": 2,
      "versionStatus": "published"
    }
  ]
}
```

- `id` is canonical course ID.
- `versionId`, `version`, and `versionStatus` are optional when version resolution is available.

---

## Completion

**Completed Date:** 2026-02-13

**Verification**
- `timeout 30 env NODE_ENV=test npx jest --runInBand tests/unit/services/templates.service.test.ts` (pass)
- `timeout 30 npm run contracts:validate` (pass)

**Commits**
| Hash | Description |
|------|-------------|
| TBD | Finalize contract docs for canonical template `usedByCourses` fields and close issue |
