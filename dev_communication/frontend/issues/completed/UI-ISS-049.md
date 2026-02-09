# UI-ISS-049: Create Department Management Page

## Status: PENDING
## Priority: High
## Created: 2026-01-20
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-048 (can develop in parallel)

---

## Overview

There is no page for department administrators to manage their department's subdepartments, programs, and certificates. Create a Department Management page that displays subdepartments and programs with CRUD actions.

---

## Requirements

1. List of subdepartments with their program counts
2. List of programs in the current department
3. Actions to create/edit subdepartments and programs
4. Certificate configuration per program
5. Access Control: `department-admin` or `system-admin` roles only

---

## Technical Specification

### Page Layout

```
+------------------------------------------------------------------+
| Department Management                                    [+ Add]  |
| [Current Department Name]                                         |
+------------------------------------------------------------------+
| Subdepartments (N)                              [+ New Subdept]   |
+------------------------------------------------------------------+
| Expandable list of child departments with program counts          |
+------------------------------------------------------------------+
|                                                                   |
| Programs (N)                                    [+ New Program]   |
+------------------------------------------------------------------+
| Table: Name | Courses | Certificate | Status | Actions           |
+------------------------------------------------------------------+
```

### Route

`/staff/departments/:deptId/manage`

### Data Requirements

- `useDepartmentHierarchy(deptId)` - Get subdepartments
- `useDepartmentPrograms(deptId)` - Get programs (may need API endpoint)

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/departments/DepartmentManagementPage.tsx` | Create | Main page |
| `src/pages/staff/departments/__tests__/DepartmentManagementPage.test.tsx` | Create | Tests |
| `src/app/router/index.tsx` | Modify | Add route |
| `src/pages/staff/departments/index.ts` | Modify | Export component |

### Approach

```typescript
export const DepartmentManagementPage: React.FC = () => {
  const { deptId } = useParams();
  const { data: hierarchy } = useDepartmentHierarchy(deptId);
  const { data: programs } = useDepartmentPrograms(deptId);

  return (
    <div>
      <PageHeader title="Department Management" />
      <SubdepartmentSection departments={hierarchy?.children} />
      <ProgramSection programs={programs} />
    </div>
  );
};
```

---

## Tests Required

1. [ ] Page renders with department name in header
2. [ ] Subdepartments section shows child departments
3. [ ] Programs section shows department's programs
4. [ ] Page is protected by role-based access

---

## Acceptance Criteria

- [ ] Page renders with department name in header
- [ ] Subdepartments section shows child departments
- [ ] Programs section shows department's programs
- [ ] Create subdepartment button opens form dialog
- [ ] Create program button opens form dialog
- [ ] Edit actions work for both subdepartments and programs
- [ ] Page is protected by role-based access
- [ ] Loading states displayed while fetching data
- [ ] Empty states shown when no subdepartments/programs
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
