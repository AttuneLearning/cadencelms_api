# UI Request: Course-Level Cognitive Depth Overrides

**Date:** 2026-01-24
**From:** UI Team
**To:** API Team
**Priority:** Medium
**Related Issue:** UI-ISS-050 (Knowledge Nodes & Adaptive Learning Integration)

---

## Summary

The UI team is building the Knowledge Node Designer page, which includes a settings panel for configuring cognitive depth thresholds. To support course-level customization (allowing course designers to adjust adaptive learning thresholds for their specific courses), we need additional API endpoints.

---

## Feature Request

### 1. Course-Level Cognitive Depth Overrides

Allow courses to override department cognitive depth settings when permitted.

**New Endpoints:**

```typescript
// Get cognitive depth levels for a course (merged: system + department + course)
GET /api/v2/courses/:courseId/cognitive-depth-levels

Response:
{
  "success": true,
  "data": {
    "levels": [
      {
        "slug": "exposure",
        "name": "Exposure",
        "description": "Initial introduction to concept",
        "advanceThreshold": 70,
        "minAttempts": 2,
        "order": 1,
        "source": "department"  // "system" | "department" | "course"
      },
      {
        "slug": "practice",
        "name": "Practice",
        "advanceThreshold": 75,  // Course override (dept was 80)
        "minAttempts": 3,
        "order": 2,
        "source": "course"
      },
      // ... more levels
    ],
    "canOverride": true,  // Department allows course overrides
    "hasOverrides": true  // Course has custom settings
  }
}
```

```typescript
// Create/update course-level override for a depth level
PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug

Request:
{
  "advanceThreshold": 75,
  "minAttempts": 3,
  "description": "Custom description for this course"  // optional
}

Response:
{
  "success": true,
  "data": {
    "slug": "practice",
    "name": "Practice",
    "advanceThreshold": 75,
    "minAttempts": 3,
    "source": "course"
  }
}
```

```typescript
// Delete course-level override (revert to department/system)
DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug

Response:
{
  "success": true,
  "message": "Course override removed, reverting to department settings"
}
```

```typescript
// Reset all course overrides
DELETE /api/v2/courses/:courseId/cognitive-depth-levels

Response:
{
  "success": true,
  "message": "All course overrides removed"
}
```

---

### 2. Department Setting: Allow Course Overrides

Add a flag to department settings controlling whether courses can customize depth levels.

**Update Department Settings Endpoint:**

```typescript
// Get department adaptive learning settings
GET /api/v2/departments/:departmentId/adaptive-settings

Response:
{
  "success": true,
  "data": {
    "allowCourseDepthOverrides": false,  // NEW FIELD
    "defaultDepthLevels": ["exposure", "practice", "proficiency", "mastery"]
  }
}
```

```typescript
// Update department adaptive learning settings
PATCH /api/v2/departments/:departmentId/adaptive-settings

Request:
{
  "allowCourseDepthOverrides": true
}

Response:
{
  "success": true,
  "data": {
    "allowCourseDepthOverrides": true
  }
}
```

---

### 3. Bulk Question Depth Assignment

Enable bulk updating of cognitive depth for multiple questions at once.

```typescript
// Bulk update question cognitive depth
PATCH /api/v2/departments/:departmentId/questions/bulk

Request:
{
  "questionIds": ["q1", "q2", "q3", "q4"],
  "updates": {
    "cognitiveDepth": "exposure"
  }
}

Response:
{
  "success": true,
  "data": {
    "updated": 4,
    "failed": 0,
    "results": [
      { "id": "q1", "status": "updated" },
      { "id": "q2", "status": "updated" },
      { "id": "q3", "status": "updated" },
      { "id": "q4", "status": "updated" }
    ]
  }
}
```

**Use Case:** The Knowledge Node Designer has an "Unassigned Questions" section. Users can select multiple questions and bulk-assign them to a depth level.

---

## Permissions

| Endpoint | Required Permission |
|----------|---------------------|
| `GET /courses/:id/cognitive-depth-levels` | `content:course:read` or `content:own:read` |
| `PUT /courses/:id/cognitive-depth-levels/:slug` | `content:course:manage` |
| `DELETE /courses/:id/cognitive-depth-levels/:slug` | `content:course:manage` |
| `GET /departments/:id/adaptive-settings` | `content:department:read` |
| `PATCH /departments/:id/adaptive-settings` | `content:department:manage` |
| `PATCH /departments/:id/questions/bulk` | `content:department:manage` |

---

## Data Model Suggestions

### CourseDepthOverride (new collection/model)

```typescript
interface CourseDepthOverride {
  id: string;
  courseId: string;
  depthSlug: string;           // 'exposure', 'practice', etc.
  advanceThreshold?: number;   // Override value
  minAttempts?: number;        // Override value
  description?: string;        // Override value
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Department Model Update

Add to existing department model or settings:

```typescript
interface DepartmentAdaptiveSettings {
  allowCourseDepthOverrides: boolean;  // NEW FIELD
}
```

---

## Resolution Logic

When fetching cognitive depth levels, merge in this order:

```
1. Start with system defaults
2. Apply department overrides (if any)
3. Apply course overrides (if allowed AND if any)
```

```typescript
function getMergedDepthLevels(courseId: string): CognitiveDepthLevel[] {
  const course = await getCourse(courseId);
  const department = await getDepartment(course.departmentId);

  // Get base levels
  let levels = await getSystemDepthLevels();

  // Apply department overrides
  const deptOverrides = await getDepartmentDepthOverrides(department.id);
  levels = mergeOverrides(levels, deptOverrides);

  // Apply course overrides (if allowed)
  if (department.adaptiveSettings?.allowCourseDepthOverrides) {
    const courseOverrides = await getCourseDepthOverrides(courseId);
    levels = mergeOverrides(levels, courseOverrides);
  }

  return levels;
}
```

---

## UI Behavior

The UI will handle missing endpoints gracefully:

| Scenario | UI Behavior |
|----------|-------------|
| Course endpoints not implemented | Hide "Customize for this course" option |
| `allowCourseDepthOverrides` not in response | Assume `false`, hide course options |
| Bulk endpoint not implemented | Show individual update fallback (slower) |

---

## Priority

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Bulk question depth update | **High** | Significantly improves designer workflow |
| Department `allowCourseDepthOverrides` setting | **Medium** | Enables course customization |
| Course depth override endpoints | **Medium** | Full feature, can defer if needed |

---

## Questions

1. Should course overrides be copied when a course is duplicated/cloned?
2. Should there be an audit log for depth setting changes?
3. Any concerns about the cascade (system → dept → course) approach?

---

## Related Files

- UI Issue: `specs/UI-ISS-050_Knowledge_Nodes_Adaptive_Learning_Integration.md`
- Existing API: `contracts/api/cognitive-depth-levels.contract.ts`
- Existing API: `src/services/content/cognitive-depth-levels.service.ts`
