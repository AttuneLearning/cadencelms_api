# UI-ISS-064: Manage Courses nav link redirects to login screen

**Date:** 2026-01-22
**Reporter:** User
**Priority:** High
**Status:** Resolved
**Resolved:** 2026-01-22

## Description

Clicking on the "Manage Courses" sidebar navigation link redirects the user to the login screen instead of navigating to the courses management page.

## Steps to Reproduce

1. Log in as a staff user with department access
2. Select a department from the sidebar
3. Click on "Manage Courses" nav link
4. User is redirected to login screen

## Expected Behavior

User should navigate to `/staff/departments/:deptId/courses` and see the course management page.

## Actual Behavior

User is redirected to the login screen.

## Likely Cause

After the unified authorization refactor (ADR-AUTH-001), the route protection or permission checking may be failing:
1. ProtectedRoute may not be correctly evaluating department-scoped permissions
2. The `hasPermission` function signature change may have broken route guards
3. Permission check might be returning false when it should return true

## Related

- UI-ISS-063: User Management sidebar link greyed out for global-admin
- ADR-AUTH-001: Unified Authorization Model
- Commit: refactor(auth): implement unified authorization model

## Resolution

Resolved as part of UI-ISS-065 fix. The root cause was that `DepartmentContext.tsx` was using the old scope object format `{ type: 'department', id: departmentId }` when calling `hasPermission()`, but the unified authorization model expects just the `departmentId` string.

This caused permission checks to fail, which made ProtectedRoute redirect users to login.

The fix updated `DepartmentContext.tsx` to pass `departmentId` directly to `hasPermission()` and consolidated all permission checks to flow through `authStore.hasPermission()`.
