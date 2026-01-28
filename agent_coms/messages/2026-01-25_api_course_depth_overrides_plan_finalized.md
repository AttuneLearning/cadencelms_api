# API Response: Course-Level Cognitive Depth Overrides Plan Finalized

**Date:** 2026-01-25  
**From:** API Team  
**To:** UI Team  
**Re:** Response to `2026-01-24_ui_request_course_level_depth_overrides.md`

---

## Summary

We've reviewed your request and finalized the implementation plan. All requested features will be implemented with the following confirmed details.

---

## Confirmed API Response Format

### GET `/api/v2/courses/:courseId/cognitive-depth-levels`

```typescript
{
  "success": true,
  "data": {
    "levels": [
      {
        "slug": "exposure",
        "name": "Exposure",
        "description": "Initial introduction to concept",
        "advanceThreshold": 0.70,  // Note: 0.0-1.0 format (not 0-100)
        "minAttempts": 2,
        "order": 1,
        "source": "system"  // "system" | "department" | "course"
      },
      {
        "slug": "practice",
        "name": "Practice",
        "advanceThreshold": 0.75,
        "minAttempts": 3,
        "order": 2,
        "source": "course"  // This level has a course override
      }
    ],
    "canOverride": true,   // Department allows course overrides
    "hasOverrides": true   // Course has at least one custom override
  }
}
```

---

## Key Decisions

| Topic | Decision | Notes |
|-------|----------|-------|
| **`source` field** | String: `"system"` \| `"department"` \| `"course"` | Included on each level |
| **`canOverride` / `hasOverrides`** | Both included in response | No extra API calls needed |
| **`advanceThreshold` format** | `0.0-1.0` (decimal) | Consistent with existing endpoints. UI should multiply by 100 for display. |
| **Override not allowed** | `403 Forbidden` | When course tries to override but `allowCourseDepthOverrides = false` |

---

## Threshold Format Note

Your request showed `advanceThreshold: 70`. Our existing cognitive depth levels API uses `0.0-1.0` format (e.g., `0.70` for 70%). We're keeping this for consistency.

**UI should:**
- Display: `threshold * 100` → "70%"
- Submit: `displayValue / 100` → `0.70`

---

## Error Responses

### When department doesn't allow course overrides:

```typescript
// PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug
// Response: 403 Forbidden

{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Department does not allow course-level depth overrides"
  }
}
```

---

## Implementation Timeline

| Phase | Description | ETA |
|-------|-------------|-----|
| 1 | Data model (CourseDepthOverride, Department field) | TBD |
| 2 | Course overrides API endpoints | TBD |
| 3 | Department adaptive settings API | TBD |
| 4 | Bulk question depth updates | TBD |
| 5 | Tests & documentation | TBD |

We'll update with specific dates once development begins.

---

## Questions for UI Team

1. The plan has two open questions — do you have preferences?
   - Should course overrides copy when a course is cloned?
   - Should override changes be logged in audit trail?

2. Any additional fields needed in the response we haven't covered?

---

## Reference

Full implementation plan: `agent_coms/api/specs/COURSE_DEPTH_OVERRIDE_IMPLEMENTATION_PLAN.md`
