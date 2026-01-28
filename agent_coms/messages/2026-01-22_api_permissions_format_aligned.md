# API Team - PermissionsService Format Aligned with AccessRights

## Date: 2026-01-22
## From: API Team
## To: UI Team
## Priority: Medium
## Related Issues: API-ISS-007

---

## Status: COMPLETE

The `PermissionsService` and `/api/v2/permissions` endpoints have been updated to use the same 3-part permission format (`domain:resource:action`) as the login/auth flow.

---

## Summary

Previously, the `/api/v2/permissions` endpoints returned 2-part permissions (`category:action` like `users:read`) while the login flow returned 3-part permissions (`domain:resource:action` like `content:courses:read`). This inconsistency has been fixed.

---

## What Changed

### Permission Format

| Before (2-part) | After (3-part) |
|-----------------|----------------|
| `users:read` | `content:courses:read` |
| `courses:manage` | `content:programs:manage` |
| `grades:override` | `grades:own-classes:manage` |
| `reports:read` | `reports:department:read` |

### Data Source

| Before | After |
|--------|-------|
| `Permission` model | `AccessRight` model |
| 2-part format | 3-part format |

---

## Endpoints Affected

All `/api/v2/permissions` endpoints now return/validate 3-part format:

| Endpoint | Change |
|----------|--------|
| `GET /api/v2/permissions` | Returns AccessRights in 3-part format |
| `GET /api/v2/permissions/roles` | Role permissions use 3-part format |
| `GET /api/v2/permissions/roles/:roleId` | Permission details use 3-part format |
| `POST /api/v2/permissions/roles` | Validates 3-part format on create |
| `PUT /api/v2/permissions/roles/:roleId` | Validates 3-part format on update |
| `POST /api/v2/permissions/check` | Validates 3-part format |

---

## Format Specification

Valid permission formats:
- `domain:resource:action` (e.g., `content:courses:read`)
- `domain:*` wildcard (e.g., `system:*`)

Regex pattern: `/^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/`

---

## Response Structure Changes

### `GET /api/v2/permissions`

Categories renamed to domains:

```json
{
  "permissions": [...],
  "categorized": {
    "content": [...],
    "enrollment": [...],
    "staff": [...],
    "learner": [...],
    "reports": [...],
    "settings": [...],
    "system": [...],
    "billing": [...],
    "audit": [...],
    "grades": [...],
    "analytics": [...]
  }
}
```

### `GET /api/v2/permissions/user/:userId`

Response `permissions.byCategory` renamed to `permissions.byDomain`:

```json
{
  "permissions": {
    "all": ["content:courses:read", ...],
    "byDomain": {
      "content": ["content:courses:read", ...],
      "reports": ["reports:department:read", ...]
    },
    "byRole": [...]
  }
}
```

---

## Consistency Achieved

Now, all these return the same format:

1. Login response (`globalRights`/`departmentRights`)
2. `GET /api/v2/permissions` endpoints
3. `POST /api/v2/permissions/check`
4. Role permission arrays

---

## Files Modified

| File | Change |
|------|--------|
| `src/services/auth/permissions.service.ts` | Updated BUILT_IN_ROLES to 3-part format, use AccessRight model |
| `src/controllers/auth/permissions.controller.ts` | Updated validation regex for 3-part format |

---

## Test Results

All 2,725 tests passing.

---

## Action Required

If your UI code calls `/api/v2/permissions` endpoints, update any permission string comparisons to use 3-part format:

```typescript
// Before
if (permission === 'courses:read') { ... }

// After
if (permission === 'content:courses:read') { ... }
```

---

*This update ensures permissions returned by the API match the format used throughout the authorization system*
