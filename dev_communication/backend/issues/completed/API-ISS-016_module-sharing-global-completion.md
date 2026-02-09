# API-ISS-016: Module Sharing & Global Completion

## Status: PENDING
## Priority: High
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-014, API-ISS-015 (depends on)
## Phase: 2 - Module Sharing & Global Completion

---

## Overview

Transform modules from being course-owned to department-owned (shared across courses). Implement global module completion tracking so that completing a module in one course counts as complete for all courses containing that module.

**Key architectural change:** Module.courseId is removed and replaced with Module.ownerDepartmentId.

---

## Requirements

1. Modify Module model: remove `courseId`, add `ownerDepartmentId`
2. Create `ModuleCompletion` model for global completion tracking
3. Implement module completion propagation across enrollments
4. Create endpoint to view where a module is used
5. Create endpoints for global completion queries
6. Migration script for existing data

---

## Technical Specification

### Model Changes

#### Module (Modified)

```typescript
// REMOVE
courseId: ObjectId;

// ADD
ownerDepartmentId: ObjectId;  // Department that "owns" this module for permissions
isShared: boolean;            // Can other departments use this module?
```

### New Model

#### ModuleCompletion

```typescript
interface IModuleCompletion extends Document {
  learnerId: ObjectId;
  moduleId: ObjectId;

  // Where completion happened (for audit)
  completedInCourseVersionId: ObjectId;
  completedInEnrollmentId: ObjectId;

  // Completion details
  completedAt: Date;
  score: number | null;

  // Always true - this completion applies globally
  isGlobalCompletion: boolean;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/modules/{id}/usage` | Get courses using this module |
| GET | `/api/v2/learners/{id}/module-completions` | Get global completions |
| POST | `/api/v2/module-completions` | Record module completion |
| GET | `/api/v2/departments/{id}/modules` | List modules owned by department |
| GET | `/api/v2/departments/{id}/modules/available` | List modules available to department |

### GET /api/v2/modules/{id}/usage

Shows all course versions that include this module. Critical for "this will affect X courses" warning.

**Response (per UI team spec 2026-02-04):**
```typescript
interface ModuleUsageResponse {
  moduleId: string;
  moduleTitle: string;
  usedInCourseVersions: {
    courseVersionId: string;
    canonicalCourseCode: string;
    courseTitle: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    isLocked: boolean;
  }[];
  totalCourseVersions: number;
  // For warning message display
  affectedPublishedCourses: number;
  affectedDraftCourses: number;
}
```

### POST /api/v2/module-completions

**Request:**
```json
{
  "learnerId": "...",
  "moduleId": "...",
  "courseVersionId": "...",
  "enrollmentId": "...",
  "score": 85
}
```

**Business Logic:**
1. Create ModuleCompletion record
2. Find ALL enrollments for this learner containing this module
3. Update progress on each enrollment
4. Check if any certificate requirements are now met
5. Emit event: `module.completed.global`

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/progress/ModuleCompletion.model.ts` | Global completion tracking |
| `src/services/moduleCompletion.service.ts` | Completion propagation logic |
| `src/controllers/moduleCompletion.controller.ts` | Route handlers |

### Files to Modify

| File | Change |
|------|--------|
| `src/models/academic/Module.model.ts` | Remove courseId, add ownerDepartmentId |
| `src/services/module.service.ts` | Update queries for new model |
| `src/services/enrollment.service.ts` | Use ModuleCompletion for progress |

### Migration Script

```typescript
// scripts/migrations/002_module_sharing.ts

1. Add ownerDepartmentId to Module (copy from course.departmentId)
2. Set isShared = false for all existing modules
3. Remove courseId field completely (no backward compatibility)
4. Create ModuleCompletion records from existing progress data
5. Update all queries to use CourseVersionModule join instead of courseId
```

---

## Tests Required

1. [ ] Module usage endpoint returns all courses
2. [ ] Module completion propagates to all enrollments
3. [ ] Global completion query returns correct data
4. [ ] Department modules list works correctly
5. [ ] Available modules includes shared modules
6. [ ] Cannot delete module that is in use
7. [ ] Progress updates correctly across courses
8. [ ] Migration preserves existing completions

---

## Acceptance Criteria

- [ ] Module model updated (courseId removed, ownerDepartmentId added)
- [ ] ModuleCompletion model created
- [ ] Usage endpoint shows all course versions using module
- [ ] Completion propagates globally
- [ ] Department module listing works
- [ ] Migration script tested
- [ ] All existing queries updated to use new model (no legacy fallbacks)
- [ ] Tests pass
- [ ] UI team notified of model change

---

## Questions / Clarifications

1. **How do permissions work for shared modules?**
   - Owner department has full edit rights
   - Other departments can use but not edit shared modules
   - Department admins can toggle `isShared`

2. **What about module prerequisites across courses?**
   - Prerequisites are module-to-module, not course-specific
   - If Module B requires Module A, this applies everywhere

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
- [ ] Phase 2 complete notification sent
