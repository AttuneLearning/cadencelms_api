# UI-UI-ISS-024: Update LearningEvent Types to Kebab-Case

**Priority:** High  
**Phase:** 1 - Foundation  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 4  
**Depends On:** None  
**Blocks:** UI-ISS-025, UI-ISS-026, UI-ISS-027

---

## Summary

Update all LearningEvent type definitions to use kebab-case naming convention per API team recommendation. This aligns with the standardized naming convention across the entire Report System.

---

## Background

The API team has standardized on **kebab-case (hyphens)** for all enum values. This provides:
- URL-friendliness (no encoding needed)
- CSS/HTML attribute compatibility
- Clear word separation
- Consistency across the system

---

## Requirements

### 1. Update EventType Enum

**Current (underscores):**
```typescript
type EventType =
  | 'content_started'
  | 'content_completed'
  | 'assessment_started'
  | 'assessment_submitted'
  | ...
```

**Updated (kebab-case):**
```typescript
type EventType =
  | 'content-started'
  | 'content-completed'
  | 'assessment-started'
  | 'assessment-submitted'
  | 'course-enrolled'
  | 'course-started'
  | 'course-completed'
  | 'module-started'
  | 'module-completed'
  | 'scorm-launched'
  | 'scorm-completed'
  | 'discussion-posted'
  | 'discussion-replied'
  | 'assignment-submitted'
  | 'assignment-graded';
```

### 2. Files to Update

- [ ] `src/entities/learning-event/model/types.ts`
- [ ] `src/entities/learning-event/api/learningEventApi.ts` (if exists)
- [ ] Any components using EventType literals
- [ ] Any API calls with event type filters
- [ ] Test files with event type mocks

### 3. Create Migration Helper

Consider creating a mapping constant for backward compatibility if needed:

```typescript
// src/shared/lib/eventTypeMigration.ts
export const LEGACY_EVENT_TYPE_MAP: Record<string, EventType> = {
  'content_started': 'content-started',
  'content_completed': 'content-completed',
  // ...
};

export function normalizeEventType(type: string): EventType {
  return LEGACY_EVENT_TYPE_MAP[type] || type as EventType;
}
```

---

## Acceptance Criteria

- [ ] All EventType values use kebab-case
- [ ] No TypeScript errors after update
- [ ] All tests pass
- [ ] No runtime errors with existing data
- [ ] API calls use correct kebab-case values

---

## Notes

- Coordinate with API team UI-ISS-024 (LookupValue seeding)
- Eventually, event types will be fetched from `/api/v2/lookup-values?type=event-type`
- For now, hardcode the kebab-case values
