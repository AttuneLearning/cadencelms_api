# Course-Level Cognitive Depth Overrides - Implementation Plan

## Overview

This plan covers course-level cognitive depth overrides, department adaptive settings, and bulk question depth updates requested in `agent_coms/messages/2026-01-24_ui_request_course_level_depth_overrides.md`.

**Related Contracts:**
- `contracts/api/cognitive-depth-levels.contract.ts`
- `contracts/api/questions.contract.ts`
- `contracts/api/department-adaptive-settings.contract.ts`

**Dependencies:**
- Existing cognitive depth levels model/service (`src/models/content/CognitiveDepthLevel.model.ts`, `src/services/content/cognitive-depth-levels.service.ts`).
- Knowledge node system (for adaptive selection and validation).

---

## Phase Summary

| Phase | Name | Goal | Dependencies |
|------|------|------|--------------|
| 1 | Data Model | Store course overrides + dept settings | Existing cognitive depth levels | 
| 2 | Course Overrides API | GET/PUT/DELETE course endpoints | Phase 1 |
| 3 | Department Adaptive Settings API | allowCourseDepthOverrides flag | Phase 1 |
| 4 | Bulk Question Depth Updates | PATCH bulk endpoint | Phase 1 |
| 5 | Tests & Docs | Integration/unit coverage | Phases 1-4 |

---

## Phase 1: Data Model

**Goal:** Persist course overrides and department settings.

### 1.1 Course Overrides Storage

New model `CourseDepthOverride`.

**Files:**
- `src/models/content/CourseDepthOverride.model.ts` (new)

**Schema Outline:**
- `courseId: ObjectId` (index)
- `slug: string` (index)
- `advanceThreshold?: number` (0.0 - 1.0)
- `minAttempts?: number`
- `description?: string`
- `createdBy: ObjectId`
- `createdAt: Date`
- `updatedAt: Date`
- unique index `{ courseId: 1, slug: 1 }`

### 1.2 Department Adaptive Settings Flag

Add explicit field to Department schema:
- `allowCourseDepthOverrides: boolean` (default `false`)

**Files:**
- `src/models/organization/Department.model.ts`

**Migration:** Add field with default `false` to existing departments.

---

## Phase 2: Course Overrides API

**Goal:** Merge course overrides into depth level resolution.

### 2.1 Service Updates

**Files:**
- `src/services/content/cognitive-depth-levels.service.ts`

**Tasks:**
- Add `getForCourse(courseId)` that merges system → department → course.
  - Returns `{ levels, canOverride, hasOverrides }`.
  - Each level includes `source: 'system' | 'department' | 'course'`.
- Add `upsertCourseOverride(courseId, slug, data)`.
  - Must check `allowCourseDepthOverrides` on department; return 403 if false.
- Add `deleteCourseOverride(courseId, slug)` and `deleteAllCourseOverrides(courseId)`.
- Validate slugs exist at department/system scope before allowing overrides.

### 2.2 Controller + Routes

**Files:**
- `src/controllers/content/course-cognitive-depth-levels.controller.ts` (new)
- `src/routes/course-cognitive-depth-levels.routes.ts` (new)
- `src/app.ts` (route registration)

**Endpoints:**
- `GET /api/v2/courses/:courseId/cognitive-depth-levels`
  - Response includes:
    - `levels[]` with `source` field on each
    - `canOverride: boolean` (from department settings)
    - `hasOverrides: boolean` (true if any course overrides exist)
- `PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug`
  - Returns `403 Forbidden` if `allowCourseDepthOverrides = false`
- `DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug`
- `DELETE /api/v2/courses/:courseId/cognitive-depth-levels`

---

## Phase 3: Department Adaptive Settings API

**Goal:** Expose `allowCourseDepthOverrides` toggle.

**Files:**
- `src/controllers/content/department-adaptive-settings.controller.ts` (new)
- `src/routes/department-adaptive-settings.routes.ts` (new)
- `src/validators/department-adaptive-settings.validator.ts` (new)

**Endpoints:**
- `GET /api/v2/departments/:departmentId/adaptive-settings`
- `PATCH /api/v2/departments/:departmentId/adaptive-settings`

---

## Phase 4: Bulk Question Depth Updates

**Goal:** Allow batch updates to question cognitive depth.

**Files:**
- `src/controllers/content/department-questions.controller.ts` (add handler)
- `src/routes/department-questions.routes.ts` (add PATCH /bulk)
- `src/services/content/questions.service.ts` (add bulk update method)
- `src/validators/department-questions.validator.ts` (new or extend)

**Tasks:**
- Validate all `questionIds` are in the department.
- Validate `cognitiveDepth` slug using `CognitiveDepthLevelsService.validateSlug`.
- Return per-question results (updated/failed).

---

## Phase 5: Tests & Documentation

**Tests:**
- `tests/integration/adaptive-learning/cognitive-depth-levels.test.ts` (course endpoints)
- `tests/integration/questions/questions-bulk.test.ts` (bulk updates)
- Unit tests for new service methods

**Docs:**
- Update contracts (already started)
- Add seed/migration notes if needed

---

## Open Questions

1. Should course overrides copy on course clone?
2. Should overrides be audited in AuditLog?

---

## Resolved Decisions

| Decision | Resolution |
|----------|------------|
| Threshold format | `0.0-1.0` (consistent with existing model) |
| `source` field | String enum: `"system"` \| `"department"` \| `"course"` |
| Response metadata | Include `canOverride` and `hasOverrides` in GET response |
| Department setting storage | Explicit field `allowCourseDepthOverrides` on Department schema |
| Override not allowed error | `403 Forbidden` with message |
| Data model approach | New `CourseDepthOverride` model (not extending existing) |

---

## Out of Scope

- UI implementation details
- Automatic data migration of existing cognitiveDepth values
