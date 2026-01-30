# UI-ISS-051: Implement Program CRUD

## Status: PENDING
## Priority: Medium
## Created: 2026-01-20
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-049 (depends on)

---

## Overview

Department administrators cannot create, edit, or manage programs from the UI. Programs are collections of courses that lead to certificates or credentials.

---

## Requirements

1. Create new programs in their department
2. Edit existing program details
3. Add/remove courses from programs
4. Change program status (Draft/Active/Archived)
5. Course ordering via drag-and-drop

---

## Technical Specification

### Create Program Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | 1-200 characters |
| code | text | Yes | Alphanumeric, max 35 chars, unique |
| description | textarea | No | Max 2000 characters |
| departmentId | hidden | Yes | Auto-filled from context |
| courses | multi-select | No | Select from department's courses |
| requiredCredits | number | No | Min 0 |
| status | select | Yes | draft, active, archived |
| certificateEnabled | checkbox | No | Default false |

### Program Status Workflow

```
Draft -> Active -> Archived
          ^         |
          +---------+ (can reactivate)
```

### Form Validation (Zod)

```typescript
const programSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z.string().min(1).max(35).regex(/^[A-Za-z0-9]+$/),
  description: z.string().max(2000).optional(),
  departmentId: z.string().min(1),
  courses: z.array(z.string()).optional(),
  requiredCredits: z.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'archived']),
  certificateEnabled: z.boolean().optional(),
});
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/programs/ui/ProgramForm.tsx` | Create | Create/edit form |
| `src/features/programs/ui/ProgramList.tsx` | Create | List component |
| `src/features/programs/ui/CourseSelector.tsx` | Create | Multi-select for courses |
| `src/features/programs/ui/__tests__/ProgramForm.test.tsx` | Create | Tests |
| `src/entities/program/` | Create | Entity if not exists |

### Approach

Create hooks: `usePrograms(deptId)`, `useProgram(id)`, `useCreateProgram()`, `useUpdateProgram()`, `useDeleteProgram()`

---

## Tests Required

1. [ ] Create program form opens in modal/page
2. [ ] Form validates all required fields
3. [ ] Course multi-select shows department courses
4. [ ] Courses can be reordered within program

---

## Acceptance Criteria

- [ ] Create program form opens in modal/page
- [ ] Form validates all required fields
- [ ] Course multi-select shows department courses
- [ ] Courses can be reordered within program
- [ ] Status dropdown works correctly
- [ ] Successful creation adds program to list
- [ ] Edit form pre-populates existing values
- [ ] Successful edit updates list
- [ ] Archive action changes status
- [ ] Error messages displayed for failures
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Are API endpoints for programs available?**
   Verify with API team

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
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
