### UI-UI-ISS-022: Admin Sidebar Links Redirect to Login - Auth Error Page Implementation

**Type:** bug/improvement  
**Priority:** High  
**Status:** ✅ Implemented (pending testing)  
**Date Created:** 2026-01-15  
**Date Completed:** 2026-01-15  

---

## Problem Statement

All admin-specific sidebar navigation links (e.g., `/admin/analytics`, `/admin/users`) were redirecting users back to the login screen instead of loading the target page. This made debugging auth issues extremely difficult because:

1. Direct redirects to `/login` provided no visibility into WHY the auth check failed
2. The API client interceptor also did hard redirects on token refresh failure
3. No way to distinguish between different auth failure modes (no token, expired session, missing userType, etc.)

---

## Root Cause Analysis

### Findings:

1. **Old Role System:** ✅ **NOT in use** - Admin routes correctly use V2 system with `userTypes={['global-admin']}` and `isAdminSessionActive`

2. **Login Redirects Found in 3 Places:**
   - `ProtectedRoute.tsx` line 139: `<Navigate to="/login" ...>`
   - `DashboardPage` line 16-18: `<Navigate to="/login" ...>`
   - `client.ts` line 230: `window.location.href = '/login'` (hard redirect on token refresh failure)

3. **Escalation Flow is Correct:**
   - `AdminOnlyRoute` → wraps in `ProtectedRoute` (checks auth + userType) → then checks `isAdminSessionActive`
   - If not escalated, redirects to `/staff/dashboard` (not login)
   - The login redirect indicated the issue was earlier in the chain (auth check failing)

---

## Solution Implemented

### 1. Created AuthErrorPage (`src/pages/auth-error/index.tsx`)

A debug-friendly error page that shows:
- Current auth state (isAuthenticated, tokens present)
- Role hierarchy info (userTypes, permissions count)
- Admin session state (isAdminSessionActive, expiry)
- Attempted path and failure reason
- Collapsible JSON debug output
- "Force Re-initialize Auth" button for stuck states

### 2. Updated Redirects (3 files)

| File | Old Behavior | New Behavior |
|------|-------------|--------------|
| `ProtectedRoute.tsx` | `Navigate to="/login"` | `Navigate to="/auth-error"` with reason |
| `DashboardPage` | `Navigate to="/login"` | `Navigate to="/auth-error"` with reason |
| `client.ts` | `window.location.href = '/login'` | `/auth-error?reason=token-refresh-failed` |

### 3. Added Route

Added `/auth-error` route in `src/app/router/index.tsx`

---

## Files Modified

- `src/pages/auth-error/index.tsx` - **NEW** - AuthErrorPage component
- `src/app/router/index.tsx` - Import AuthErrorPage, add route
- `src/app/router/ProtectedRoute.tsx` - Redirect to auth-error instead of login
- `src/pages/dashboard/index.tsx` - Redirect to auth-error instead of login
- `src/shared/api/client.ts` - Redirect to auth-error on token refresh failure

---

## Escalation Auth Flow (Documented)

```
User clicks admin sidebar link (e.g., /admin/analytics)
         ↓
React Router <Link> navigates
         ↓
AdminOnlyRoute renders
         ↓
├─ First: ProtectedRoute checks:
│    ├─ isAuthenticated? → if false → /auth-error (reason: no-auth)
│    └─ roleHierarchy has 'global-admin'? → if false → /unauthorized
│
└─ Then: AdminOnlyRoute checks:
     └─ isAdminSessionActive? → if false → /staff/dashboard
                              → if true → render page ✅
```

---

## Current State

**Status:** Changes implemented, **pending testing**

The changes provide diagnostic capability - when the admin sidebar redirect issue occurs again, the AuthErrorPage will show:
- Whether `isAuthenticated` is false
- Whether `roleHierarchy` is null
- Whether it was a token refresh failure
- Full debug JSON for troubleshooting

**This may or may not fix the underlying issue** - it depends on what the root cause is. The AuthErrorPage will help identify the actual cause when it happens.

---

## Testing Required

1. Log in as global-admin user
2. Escalate to admin session (enter escalation password)
3. Navigate to Admin Dashboard
4. Click various admin sidebar links
5. **If redirect occurs:** Check the AuthErrorPage debug info to identify root cause
6. **If no redirect:** Issue may have been related to stale state/token refresh

---

## Potential Follow-up Issues

If AuthErrorPage reveals the root cause, a follow-up issue may be needed for:
- Token refresh timing issues
- Admin session state not persisting across navigation
- RoleHierarchy becoming null during SPA navigation
- API returning 401 unexpectedly

---

## Commits

- Pending commit (changes not yet committed)
