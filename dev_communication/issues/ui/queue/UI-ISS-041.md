# UI-ISS-041: Course Creation Requires Department Context

## Status: PENDING
## Priority: High
## Created: 2026-01-18
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-040

---

## Overview

Currently, `/staff/courses/new` allows creating a course without explicitly requiring a department context. Courses must belong to a department, but the current flow doesn't enforce this properly.

---

## Requirements

1. From Department View: `/staff/departments/:deptId/courses/create` with department pre-filled and locked
2. From "My Courses": Either disable button OR show department selector modal first
3. Only show departments where user has `course:create-department` permission
4. Single department users skip the selector

---

## Technical Specification

### Scenario 1: Create from Department Context

**URL:** `/staff/departments/:deptId/courses/create`

- Department field is read-only (shown but not editable)
- Department ID comes from URL param
- User must have `course:create-department` in that department

### Scenario 2: Create from "My Courses"

**URL:** `/staff/courses/new` (no department in URL)

Show Department Selector Modal:
- Shows only departments where user has `course:create-department`
- After selection, navigates to `/staff/departments/:deptId/courses/create`

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/courses/CourseEditorPage.tsx` | Modify | Accept deptId from URL |
| `src/pages/staff/courses/StaffCoursesPage.tsx` | Modify | Update create button logic |
| `src/shared/ui/department-selector-modal.tsx` | Create | Department selector modal |
| `src/app/router/index.tsx` | Modify | Add department-scoped route |

### Approach

```typescript
// CourseEditorPage.tsx
const CourseEditorPage: React.FC = () => {
  const { deptId } = useParams();
  const [selectedDepartment, setSelectedDepartment] = useState(deptId || null);
  const isDepartmentLocked = !!deptId;

  if (!selectedDepartment && !courseId) {
    return <DepartmentSelectorModal onSelect={handleDepartmentSelect} />;
  }
  // ... rest of form
}
```

---

## Tests Required

1. [ ] Cannot create course without selecting department
2. [ ] Department pre-filled when accessed from department nav
3. [ ] Department selector appears when accessed from "My Courses"
4. [ ] Single department users skip the selector

---

## Acceptance Criteria

- [ ] Cannot create course without selecting department
- [ ] When accessed from department nav, department is pre-filled and locked
- [ ] When accessed from "My Courses", department selector appears first
- [ ] Only shows departments where user has create permission
- [ ] Single department users skip the selector
- [ ] Course is correctly associated with department in API
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Is departmentId required for course creation?**
   Needs confirmation from API team

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
