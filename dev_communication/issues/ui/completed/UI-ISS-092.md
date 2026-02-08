# UI-ISS-092: Add "My Courses" to Learner Sidebar Navigation

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: N/A

---

## Overview

The learner sidebar nav (`LEARNER_CONTEXT_NAV` in `navItems.ts`) does not include "My Courses" (`/learner/courses`). The route and page exist and work, but learners can only reach it via dashboard cards — there is no persistent nav link.

---

## Requirements

1. Add "My Courses" entry to `LEARNER_CONTEXT_NAV`
2. Route to `/learner/courses`
3. Position it as the first item (before "My Classes")

---

## Technical Specification

### Current LEARNER_CONTEXT_NAV (navItems.ts line 180)

```typescript
export const LEARNER_CONTEXT_NAV: ContextNavItem[] = [
  { label: 'My Classes',     path: '/learner/classes',  icon: Calendar },
  { label: 'Calendar',       path: '/learner/calendar', icon: CalendarDays },
  { label: 'Course Catalog', path: '/learner/catalog',  icon: BookOpen, requiredPermission: 'course:view-catalog' },
];
```

### Expected

```typescript
export const LEARNER_CONTEXT_NAV: ContextNavItem[] = [
  { label: 'My Courses',     path: '/learner/courses',  icon: GraduationCap },
  { label: 'My Classes',     path: '/learner/classes',   icon: Calendar },
  { label: 'Calendar',       path: '/learner/calendar',  icon: CalendarDays },
  { label: 'Course Catalog', path: '/learner/catalog',   icon: BookOpen, requiredPermission: 'course:view-catalog' },
];
```

---

## Implementation

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/sidebar/config/navItems.ts` | Modify | Add "My Courses" entry to `LEARNER_CONTEXT_NAV` as first item |

---

## Tests Required

1. [ ] "My Courses" link appears in learner sidebar
2. [ ] Clicking "My Courses" navigates to `/learner/courses`
3. [ ] Existing sidebar tests updated if needed

---

## Acceptance Criteria

- [ ] "My Courses" visible in learner sidebar nav
- [ ] Navigates to `/learner/courses` (MyCoursesPage)
- [ ] Tests pass

---

## Implementation Notes

Single-file change. No API impact. No backwards compatibility.

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

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
