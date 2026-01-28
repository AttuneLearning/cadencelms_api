# UI-ISS-063: User Management sidebar link greyed out for global-admin

**Date:** 2026-01-22
**Reporter:** User
**Priority:** High
**Status:** Resolved
**Resolved:** 2026-01-22

## Description

The "User Management" sidebar link is greyed out (disabled/inaccessible) for users with `global-admin` userType and `system-admin` role. Global admins should have access to user management.

## Steps to Reproduce

1. Log in as a user with `global-admin` userType
2. Navigate to the admin dashboard
3. Observe the sidebar - "User Management" link is greyed out

## Expected Behavior

Global admin users should see the "User Management" link as active and be able to click it to access user management.

## Actual Behavior

The link is greyed out/disabled, preventing access to user management.

## Likely Cause

After the unified authorization refactor (ADR-AUTH-001), the permission checking may not be correctly evaluating `globalRights` for sidebar nav items. The sidebar permission check might be:
1. Looking for department-scoped rights when it should check global rights
2. Not properly handling the `system:*` wildcard permission
3. Using the wrong permission string for user management

## Investigation Points

1. Check `src/widgets/sidebar/config/navItems.ts` for the User Management item's `requiredPermission`
2. Check how sidebar renders nav items and evaluates permissions
3. Verify that `globalRights` includes the correct permission for global admins
4. Check if the permission check is incorrectly requiring a departmentId

## Related

- ADR-AUTH-001: Unified Authorization Model
- Commit: refactor(auth): implement unified authorization model

## Resolution

Resolved as part of UI-ISS-065 fix. The root cause was that `useDepartmentContext` and `DepartmentContext` were NOT using the unified `authStore.hasPermission()` function. They had their own permission checking logic that didn't properly check `globalRights`.

The fix consolidated all permission checks to use `authStore.hasPermission()` as the SINGLE source of truth, which properly checks `globalRights` (for `system:*` and other global permissions) before checking department-specific rights.
