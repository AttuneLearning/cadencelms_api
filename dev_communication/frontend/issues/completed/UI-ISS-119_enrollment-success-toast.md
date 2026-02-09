# UI-ISS-119: Enrollment Success Confirmation Toast

## Status: PENDING
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-082

---

## Overview

When a learner enrolls in a course via the catalog, there is **no success or error feedback**. The enrollment mutation fires silently and relies only on cache invalidation to update the UI. This leaves learners uncertain whether their enrollment succeeded. In contrast, program enrollment already shows a success toast — course enrollment should match.

---

## Requirements

1. Show a success toast when course enrollment completes successfully (e.g., "Successfully enrolled in {courseName}")
2. Show an error toast when enrollment fails with a meaningful message
3. Consider navigating to the enrolled course or showing a "Go to Course" action in the toast

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Catalog enrollment hook / mutation handler | Modify | Add `toast.success()` on mutation success |
| Catalog enrollment hook / mutation handler | Modify | Add `toast.error()` on mutation error |

### Current State (Course enrollment)
```tsx
// No success/error feedback — just fires mutation
```

### Reference Implementation (Program enrollment — already has toast)
```tsx
toast.success(`Successfully enrolled in ${programName}`);
```

---

## Acceptance Criteria

- [ ] Success toast appears after successful course enrollment
- [ ] Error toast appears if enrollment fails
- [ ] Toast includes course name for context
- [ ] Behavior matches existing program enrollment toast pattern
- [ ] Works from both catalog card and course detail enrollment flows

---

## Implementation Notes

*This is a quick win — follow the same pattern already used for program enrollment. The toast infrastructure (sonner/shadcn) is already in place.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
