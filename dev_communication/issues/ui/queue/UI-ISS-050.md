# UI-ISS-050: Implement Subdepartment CRUD

## Status: PENDING
## Priority: Medium
## Created: 2026-01-20
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-049 (depends on)

---

## Overview

Department administrators cannot create or edit subdepartments from the UI. Implement the create and edit forms for subdepartments.

---

## Requirements

1. Create new subdepartments under their department
2. Edit existing subdepartment details
3. View subdepartment hierarchy
4. Modal dialog for create/edit forms
5. Form validation for all required fields

---

## Technical Specification

### Create Subdepartment Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | 1-100 characters |
| code | text | Yes | Alphanumeric, max 35 chars, unique within parent |
| description | textarea | No | Max 500 characters |
| parentId | hidden | Yes | Auto-filled from current department |

### Form Validation (Zod)

```typescript
const subdepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1).max(35).regex(/^[A-Za-z0-9]+$/),
  description: z.string().max(500).optional(),
  parentId: z.string().min(1),
});
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/departments/ui/SubdepartmentForm.tsx` | Create | Create/edit form |
| `src/features/departments/ui/SubdepartmentList.tsx` | Create | List component |
| `src/features/departments/ui/__tests__/SubdepartmentForm.test.tsx` | Create | Tests |

### Approach

Use existing hooks: `useCreateDepartment`, `useUpdateDepartment`

---

## Tests Required

1. [ ] Create subdepartment form opens in modal
2. [ ] Form validates all required fields
3. [ ] Successful creation adds subdepartment to list
4. [ ] Edit form pre-populates existing values

---

## Acceptance Criteria

- [ ] Create subdepartment form opens in modal
- [ ] Form validates all required fields
- [ ] Successful creation adds subdepartment to list
- [ ] Edit form pre-populates existing values
- [ ] Successful edit updates list
- [ ] Error messages displayed for validation failures
- [ ] API errors handled gracefully
- [ ] Loading states during submission
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

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
