# API-ISS-007: Align PermissionsService with 3-Part AccessRights Format

## Status: COMPLETE
## Priority: High
## Created: 2026-01-22
## Completed: 2026-01-22
## Requested By: System Review

---

## Overview

The `PermissionsService` uses 2-part permission format (`resource:action`) while the actual authorization system uses 3-part format (`domain:resource:action`). This causes inconsistency between what users receive at login vs what the `/api/v2/permissions` endpoints return.

---

## Problem

### What Users Receive at Login (Correct - 3-part)
```typescript
[
  "content:courses:manage",
  "content:programs:manage",
  "reports:department:read",
  "grades:own-classes:manage"
]
```

### What PermissionsService Uses (Incorrect - 2-part)
```typescript
// From permissions.service.ts BUILT_IN_ROLES
[
  "users:read", "users:write",
  "courses:read", "courses:manage",
  "grades:override",
  "reports:read"
]
```

---

## Impact

| Endpoint | Issue |
|----------|-------|
| `GET /api/v2/permissions` | Returns 2-part permissions |
| `GET /api/v2/permissions/roles` | Role permissions don't match actual system |
| `GET /api/v2/permissions/roles/:roleId` | Inconsistent permission format |
| `POST /api/v2/permissions/roles` | Creates roles with wrong permission format |
| `GET /api/v2/permissions/user/:userId` | Returns permissions that don't match login |
| `POST /api/v2/permissions/check` | Checks against wrong permission format |

---

## Root Cause

Two parallel authorization systems exist:

| System | Model | Format | Used By |
|--------|-------|--------|---------|
| **AccessRights** | `AccessRight.model.ts` | `domain:resource:action` | Login, `requireAccessRight`, `authorize.ts` |
| **Permissions** | `Permission.model.ts` | `resource:action` | `PermissionsService`, `/api/v2/permissions` |

The `PermissionsService` should be using the `AccessRight` model and 3-part format.

---

## Solution

### Option A: Refactor PermissionsService (Recommended)

1. Update `BUILT_IN_ROLES` in `permissions.service.ts` to use 3-part format
2. Change `PermissionsService` to query `AccessRight` model instead of `Permission` model
3. Update validation logic to accept 3-part format
4. Ensure `listPermissions()` returns data from `AccessRight` collection

### Option B: Deprecate PermissionsService

1. Mark `/api/v2/permissions` endpoints as deprecated
2. Direct clients to use the access rights from login response
3. Eventually remove the 2-part Permission system

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/auth/permissions.service.ts` | Refactor to use AccessRight model and 3-part format |
| `src/controllers/auth/permissions.controller.ts` | Update validation for 3-part format |
| `contracts/api/permissions.contract.ts` | Already correct (uses 3-part format) |

---

## BUILT_IN_ROLES Update Reference

Should align with `seed-access-rights.ts` and `seed-role-definitions.ts`:

```typescript
'department-admin': {
  permissions: [
    'content:courses:manage',
    'content:programs:manage',
    'content:lessons:manage',
    'content:exams:manage',
    'content:scorm:manage',
    'content:courses:read',
    'content:classes:manage',
    'content:lessons:read',
    'content:classes:read',
    'content:classes:manage-own',
    'staff:department:manage',
    'learner:department:manage',
    'learner:department:read',
    'enrollment:department:manage',
    'enrollment:department:read',
    'reports:content:read',
    'reports:department:read',
    'reports:department:export',
    'reports:class:read',
    'reports:class:export',
    'settings:department:manage',
    'grades:department:read',
    'grades:own-classes:manage'
  ]
}
```

---

## Acceptance Criteria

- [x] `PermissionsService` uses 3-part permission format
- [x] `GET /api/v2/permissions` returns permissions from AccessRight collection
- [x] `GET /api/v2/permissions/roles` returns roles with 3-part permissions
- [x] Role CRUD operations validate 3-part format
- [x] `POST /api/v2/permissions/check` works with 3-part permissions
- [x] Consistency between login permissions and permissions endpoints

---

## Notes

- The contract (`permissions.contract.ts`) already documents 3-part format correctly
- The `AccessRight` model has proper validation regex: `/^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/`
- The `Permission` model (2-part) may be deprecated after this change
