# Context: Multi-Tenant Model

**Category:** Domain
**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Tags:** #context #architecture #multi-tenant

## Overview

CadenceLMS uses a department-based multi-tenant architecture where most data is scoped to a specific department.

## Key Points

- **Department** is the primary tenant boundary
- **Departments can be hierarchical** (parent/child relationships)
- **Users can belong to multiple departments** with different roles in each
- **Most resources are department-scoped** via `departmentId` field
- **Some resources are system-wide** (e.g., system default cognitive depth levels)

## Department Hierarchy

Departments can have parent-child relationships:
- `parentDepartmentId` field links to parent
- `DepartmentCacheService` maintains hierarchy cache
- Some operations support `includeSubdepartments` query parameter

## Data Isolation

Resources typically include:
```typescript
{
  departmentId: ObjectId,  // Required - ownership
  // ... other fields
}
```

Queries always filter by department:
```typescript
Model.find({ departmentId, isDeleted: { $ne: true } })
```

## Cross-Department Access

Some scenarios allow cross-department access:
- Global admins can access all departments
- Learner progress can span multiple departments
- System defaults are shared across all departments

## Implications

1. **API Design:** Most endpoints scoped under `/departments/:departmentId/`
2. **Authorization:** Permissions checked against specific department
3. **Data Migration:** Must consider department ownership
4. **Reporting:** Can aggregate within department hierarchy

## Related Context

- [[project-overview]]
- [[api-conventions]]

## Related Patterns

- [[../patterns/department-scoping]]

## Links

- Memory log: [[../memory-log]]
