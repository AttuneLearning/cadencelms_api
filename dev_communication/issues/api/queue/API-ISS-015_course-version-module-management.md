# API-ISS-015: Course Version Module Management

## Status: PENDING
## Priority: High
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-014 (depends on)
## Phase: 1 - Core Versioning Foundation

---

## Overview

Implement the CourseVersionModule join table and endpoints for managing which modules belong to which course versions. This enables the same module to be included in multiple course versions with version-specific ordering and settings.

---

## Requirements

1. Create `CourseVersionModule` model (join table)
2. Implement module management endpoints for course versions
3. Support version-specific module ordering
4. Support version-specific module settings (isRequired, availability)
5. Validate modules can only be modified on draft versions
6. Copy module associations when creating new version

---

## Technical Specification

### New Model

#### CourseVersionModule

```typescript
interface ICourseVersionModule extends Document {
  courseVersionId: ObjectId;
  moduleId: ObjectId;
  order: number;                         // Position in this version
  isRequired: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  createdAt: Date;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/course-versions/{id}/modules` | List modules for version |
| POST | `/api/v2/course-versions/{id}/modules` | Add module to version |
| DELETE | `/api/v2/course-versions/{id}/modules/{moduleId}` | Remove module |
| PATCH | `/api/v2/course-versions/{id}/modules/reorder` | Reorder modules |
| PATCH | `/api/v2/course-versions/{id}/modules/{moduleId}` | Update module settings |

### GET /api/v2/course-versions/{id}/modules

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "cvmId",
      "moduleId": "...",
      "module": {
        "id": "...",
        "title": "Introduction to Python",
        "description": "...",
        "estimatedDuration": 120,
        "isPublished": true
      },
      "order": 1,
      "isRequired": true,
      "availableFrom": null,
      "availableUntil": null
    }
  ]
}
```

### POST /api/v2/course-versions/{id}/modules

**Request:**
```json
{
  "moduleId": "...",
  "order": 3,
  "isRequired": true,
  "availableFrom": null,
  "availableUntil": null
}
```

**Validation:**
- Course version must be in 'draft' status
- Module must exist and be in same department (or shared)
- Module cannot already be in this version

### PATCH /api/v2/course-versions/{id}/modules/reorder

**Request:**
```json
{
  "moduleOrder": [
    { "moduleId": "...", "order": 1 },
    { "moduleId": "...", "order": 2 },
    { "moduleId": "...", "order": 3 }
  ]
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/academic/CourseVersionModule.model.ts` | Join table schema |
| `src/services/courseVersionModule.service.ts` | Module management logic |
| `src/controllers/courseVersionModule.controller.ts` | Route handlers |
| `src/validators/courseVersionModule.validator.ts` | Request validation |

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/v2/courseVersion.routes.ts` | Add module sub-routes |
| `src/services/courseVersion.service.ts` | Copy modules on version create |

### Version Creation Logic

When creating a new version (API-ISS-014), copy all CourseVersionModule entries:

```typescript
async function createVersion(canonicalCourseId: string, changeNotes: string) {
  // ... create new CourseVersion ...

  // Copy module associations from current published version
  const currentVersion = await CourseVersion.findById(canonical.currentPublishedVersionId);
  const modules = await CourseVersionModule.find({ courseVersionId: currentVersion._id });

  await CourseVersionModule.insertMany(
    modules.map(m => ({
      courseVersionId: newVersion._id,
      moduleId: m.moduleId,
      order: m.order,
      isRequired: m.isRequired,
      availableFrom: m.availableFrom,
      availableUntil: m.availableUntil
    }))
  );
}
```

---

## Tests Required

1. [ ] List modules for a version
2. [ ] Add module to draft version
3. [ ] Cannot add module to published version
4. [ ] Cannot add duplicate module
5. [ ] Remove module from draft version
6. [ ] Cannot remove from published version
7. [ ] Reorder modules
8. [ ] Update module settings (isRequired, availability)
9. [ ] Modules copied when creating new version
10. [ ] Module order preserved correctly

---

## Acceptance Criteria

- [ ] CourseVersionModule model created with indexes
- [ ] All 5 endpoints implemented
- [ ] Draft-only modification enforced
- [ ] Modules copied on version creation
- [ ] Proper population of module details in GET
- [ ] Tests pass
- [ ] Contract updated with module endpoints

---

## Questions / Clarifications

1. **Can modules from other departments be added?**
   TBD - For Phase 2 (module sharing), we may allow "shared" modules across departments. For now, same department only.

2. **What happens to progress if module is removed from version?**
   Progress is preserved. Learners who started on that version keep their progress even if a future version removes the module.

---

## Implementation Notes

*Add notes during implementation*

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Phase 1 complete notification sent
