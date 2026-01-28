# UI-ISS-065: Department admin (instructor) missing access to multiple nav links

**Date:** 2026-01-22
**Reporter:** User
**Priority:** Critical
**Status:** Resolved
**Resolved:** 2026-01-22

## Description

User `riley.instructor@lms.edu` who has department-admin role cannot access multiple sidebar navigation links. This appears to be a widespread permission checking failure after the unified authorization refactor.

## Affected User

- Email: riley.instructor@lms.edu
- Role: department-admin / instructor
- UserType: staff (no learner rights)

## Inaccessible Links

1. **My Courses** - Cannot access
2. **My Classes** - Cannot access
3. **Course Summary** - Cannot access
4. **Analytics** - Cannot access
5. **Reports** - Cannot access
6. **Grading** - Cannot access
7. **My Progress** - Greyed out (expected - no learner rights)
8. **Department Switching** - Cannot switch departments

## Expected Behavior

A department-admin should have access to:
- Course management features (My Courses, My Classes, Course Summary)
- Analytics and Reports for their department
- Grading functionality
- Ability to switch between departments they have access to

"My Progress" being greyed out is expected since this user has no learner rights.

## Likely Cause

The unified authorization refactor (ADR-AUTH-001) changed how permissions are checked:
- Old: `hasPermission(perm, { type: 'department', id: deptId })`
- New: `hasPermission(perm, deptId)`

Possible issues:
1. `departmentRights` not being populated correctly from API response
2. Permission checks in sidebar/routes not using correct API
3. `useDepartmentContext` hook not returning correct permission data
4. Route guards failing due to signature mismatch

## Troubleshooting Steps

1. Check browser console for `[AuthStore]` logs showing `departmentRights` after login
2. Verify API response includes `globalRights`, `departmentRights`, `departmentHierarchy`
3. Check if `useDepartmentContext.hasPermission()` is working correctly
4. Verify sidebar permission checks in `Sidebar.tsx`
5. Check ProtectedRoute permission evaluation
6. **IMPORTANT: Ensure only ONE access check is happening** - consolidate any duplicate/conflicting permission checks into a single unified check

## Related Issues

- UI-ISS-063: User Management sidebar link greyed out for global-admin
- UI-ISS-064: Manage Courses nav link redirects to login screen

## Related Code

- `src/features/auth/model/authStore.ts` - Unified auth state
- `src/widgets/sidebar/Sidebar.tsx` - Nav permission checks
- `src/shared/hooks/useDepartmentContext.ts` - Department permission hook
- `src/app/router/ProtectedRoute.tsx` - Route guards

## Resolution

**Root Cause:** The `useDepartmentContext` hook had its own permission checking logic that was NOT using the unified authorization model from `authStore`. It was checking `roleHierarchy.allPermissions` and `currentDepartmentAccessRights` from `navigationStore` instead of delegating to `authStore.hasPermission()`.

Additionally, `DepartmentContext.tsx` was using the old scope object format `{ type: 'department', id: deptId }` instead of the new `departmentId` string parameter.

**Fix Applied:**

1. **`src/shared/hooks/useDepartmentContext.ts`** - Refactored to delegate ALL permission checks to `authStore`:
   - `hasPermission()` now calls `authStore.hasPermission(permission, departmentId)`
   - `hasAnyPermission()` now calls `authStore.hasAnyPermission(permissions, departmentId)`
   - `hasAllPermissions()` now calls `authStore.hasAllPermissions(permissions, departmentId)`

2. **`src/shared/contexts/DepartmentContext.tsx`** - Fixed permission function call:
   - Changed from: `globalHasPermission(permission, { type: 'department', id: departmentId })`
   - Changed to: `globalHasPermission(permission, departmentId)`

3. **Updated tests** in `useDepartmentContext.test.ts` to use the new `departmentRights` state structure instead of `currentDepartmentAccessRights`.

This ensures a SINGLE source of truth for authorization (ADR-AUTH-001) - all permission checks now flow through `authStore.hasPermission()` which checks `globalRights` first, then `departmentRights[departmentId]`.
