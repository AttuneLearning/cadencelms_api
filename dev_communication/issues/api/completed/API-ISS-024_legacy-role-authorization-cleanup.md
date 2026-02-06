# API-ISS-024: Legacy Role Authorization Cleanup

**Priority:** High
**Created:** 2026-02-05
**Completed:** 2026-02-05
**Status:** Completed
**Related:** UI message `2026-02-05_roles-vs-usertypes-field-mismatch.md`, `2026-02-05_permission-string-alignment.md`

---

## Summary

The codebase contained lingering references to the old role-based authorization scheme that needed to be migrated to the new permission-based system. This included:

1. Direct `user.roles?.includes()` checks instead of `allAccessRights`
2. Queries using `{ roles: 'learner' }` instead of `{ userTypes: 'learner' }`
3. Legacy middleware that bypasses the new permission system

---

## Resolution

All issues have been fixed:

### Category 1: Legacy `user.roles?.includes()` Checks - FIXED

| File | Status | Change |
|------|--------|--------|
| `src/controllers/analytics/progress.controller.ts` | Fixed | Changed to `allAccessRights?.includes('system:*')` |
| `src/controllers/reporting/reports.controller.ts` | Fixed | Changed to `allAccessRights?.includes('system:*')` |
| `src/controllers/progress/module-access.controller.ts` | Fixed | Changed to `allAccessRights?.includes('system:*')` |
| `src/services/analytics/progress.service.ts` | Fixed | Updated scoping functions |
| `src/services/reporting/reports.service.ts` | Fixed | Updated all 3 scoping functions |

### Category 2: Wrong Field Name in Queries - FIXED

| File | Status | Change |
|------|--------|--------|
| `src/services/users/learners.service.ts:82` | Fixed | `{ userTypes: 'learner' }` |
| `src/services/users/learners.service.ts:308` | Fixed | `{ userTypes: 'learner' }` |
| `src/services/users/learners.service.ts:467` | Fixed | `userTypes: ['learner']` |
| `src/services/users/staff.service.ts:312` | Fixed | `userTypes: ['staff']` |

### Category 3: Legacy Middleware - Deferred

- `authenticate.ts` - Legacy `authorize()` function marked for future removal
- `isAuthenticated.ts:208` - Intentional backward compat, low priority

---

## Fix Pattern Applied

### For role checks:
```typescript
// OLD (wrong)
if (user.roles?.includes('system-admin')) { ... }

// NEW (correct)
if (user.allAccessRights?.includes('system:*') || user.userTypes?.includes('global-admin')) { ... }
```

### For department role checks:
```typescript
// OLD (wrong)
if (user.roles?.includes('instructor')) { ... }

// NEW (correct)
const isInstructor = user.departmentMemberships?.some((m: any) => m.roles?.includes('instructor'));
if (isInstructor) { ... }
```

### For queries:
```typescript
// OLD (wrong)
const users = await User.find({ roles: 'learner' });

// NEW (correct)
const users = await User.find({ userTypes: 'learner' });
```

---

## Verification

- All unit tests pass (2145 tests)
- Type check passes (`npx tsc --noEmit`)
- No remaining `user.roles?.includes()` patterns in src/
- `/api/v2/users/learners` should now return correct results

---

## Notes

- DepartmentMembership.roles references are VALID (part of new system)
- RoleDefinition model is VALID (part of new system)
- `isAuthenticated.ts` line 208 is intentional backward compat (low priority)
