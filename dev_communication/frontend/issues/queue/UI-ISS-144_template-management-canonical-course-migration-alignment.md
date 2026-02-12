# UI-ISS-144: Template Management Alignment for CanonicalCourse Migration

## Status: PENDING
## Priority: High
## Created: 2026-02-11
## Updated: 2026-02-11
## Requested By: API Team (backend inbox message: 2026-02-11_template-service-canonical-course-migration-request.md)
## Assigned To: Unassigned
## Related: API migration request (templates), UI-ISS-145

---

## Overview

Backend will migrate template usage lookups away from legacy `Course` documents to `CanonicalCourse + CourseVersion`. The UI template-management views need to align with the updated response shape and identifiers used for "used by courses" references.

Current backend evidence:
- `src/services/content/templates.service.ts:4` imports legacy `Course`.
- `src/services/content/templates.service.ts:331` reads `Course.metadata.templateId`.
- `src/services/content/templates.service.ts:507` force-delete flow edits `Course.metadata.templateId`.

---

## Requirements

1. Update template detail UI to support canonical-course usage references from API (not legacy `Course` assumptions).
2. Update "Used by courses" rendering to tolerate versioned title data (`CourseVersion.title`) and optional missing published titles.
3. Ensure force-delete/reassignment UX still works with new backend semantics.
4. Remove any frontend assumptions that `usedByCourses[].id` is always a legacy `Course` ID.

---

## Technical Specification

### Endpoint (expected backend impact)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/templates/:id` | Returns `usedByCourses` based on canonical course linkage |
| DELETE | `/api/v2/templates/:id?force=true` | Removes template linkage using canonical course/version model |

### Response (target direction)

```json
{
  "status": "success",
  "data": {
    "id": "templateId",
    "usedByCourses": [
      {
        "id": "canonicalCourseId",
        "code": "CBT101",
        "title": "CBT Introduction",
        "versionId": "courseVersionId"
      }
    ]
  }
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/entities/template/api/*` | Modify | Align types/parsing for canonical-course usage payload |
| `src/features/template-management/*` | Modify | Update used-by table, delete confirmation details |
| `src/pages/*templates*` | Modify | Handle updated identifiers and labels |

### Approach

Use tolerant parsing during rollout (accept both old/new usage row shapes), then remove legacy fallback once backend migration is complete and deployed.

---

## Tests Required

1. [ ] Template detail renders used-by rows from canonical payload.
2. [ ] Force delete confirmation displays correct impacted-course count/list.
3. [ ] Template pages remain stable with mixed old/new response shapes during rollout.

---

## Acceptance Criteria

- [ ] Template detail works with canonical-course usage data.
- [ ] No UI breakage when legacy `Course` IDs are no longer returned.
- [ ] Force-delete/reassignment UX remains functional.
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Final response contract for `usedByCourses`**
   Confirm exact fields (`title`, `versionId`, `courseVersionStatus`) before final cleanup.

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
