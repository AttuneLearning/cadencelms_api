### UI-UI-ISS-023: System Reports Link Triggers Token Refresh Failure

**Type:** bug  
**Priority:** High  
**Status:** 🟢 Ready for Implementation (UI Fix)  
**Date Created:** 2026-01-15  
**Reported By:** User testing
**API Message:** `messages/2026-01-15_160000_ui_request_UI-ISS-023.md` (updated - UI fix identified)

---

## Problem Statement

Clicking the "System Reports" link (`/admin/reports`) in the admin sidebar causes a complete auth failure. The token refresh fails, which clears all authentication state and redirects to the auth-error page.

**Note:** Other admin links (e.g., Analytics) work correctly. This is specific to certain routes.

---

## Debug Information (from AuthErrorPage)

```json
{
  "isAuthenticated": false,
  "hasAccessToken": false,
  "hasRefreshToken": false,
  "accessTokenExpiry": null,
  "userId": null,
  "userEmail": null,
  "hasRoleHierarchy": false,
  "primaryUserType": null,
  "allUserTypes": [],
  "defaultDashboard": null,
  "permissionCount": 0,
  "isAdminSessionActive": false,
  "hasAdminToken": false,
  "adminSessionExpiry": null,
  "adminTokenExpiry": null,
  "attemptedPath": "/auth-error",
  "requiredUserTypes": [],
  "requiredPermission": null,
  "reason": "token-refresh-failed",
  "timestamp": "2026-01-15T16:11:36.322Z"
}
```

---

## Analysis

**Key Finding:** `reason: "token-refresh-failed"`

This means:
1. An API call was made that returned 401 Unauthorized
2. The client attempted to refresh the token via `/auth/refresh`
3. The refresh failed (possibly no refresh token cookie, or backend rejected it)
4. `clearAuthStorage()` was called, wiping all tokens
5. User was redirected to `/auth-error`

**Root Cause Identified: UI/API Endpoint Mismatch**

The UI is calling endpoints that don't exist in the API contracts:

| UI Endpoint | API Contract Status |
|-------------|---------------------|
| `GET /reports` | ❌ NOT DEFINED |
| `POST /reports` | ❌ NOT DEFINED |
| `GET /reports/:id` | ❌ NOT DEFINED |
| `DELETE /reports/:id` | ❌ NOT DEFINED |

The API contracts only define specific report endpoints:
- `GET /api/v2/reports/completion`
- `GET /api/v2/reports/performance`
- `GET /api/v2/reports/transcript/:learnerId`
- etc.

---

## Investigation Complete ✅

- [x] Check what API calls `/admin/reports` makes on mount → `useReports()` → `GET /reports`
- [x] Check endpoint definitions → `src/shared/api/endpoints.ts` line 179
- [x] Check API contracts → No `GET /reports` endpoint exists
- [x] Create API team message → `2026-01-15_160000_ui_request_UI-ISS-023.md`

---

## Corrected Root Cause: UI Implementation Error

The UI was built with the **wrong mental model** - assuming a queue-based system where reports are created, stored, and listed. But the contract provides **on-demand reports**.

| UI Assumes (Wrong) | Contract Provides (Correct) |
|--------------------|----------------------------|
| `POST /reports` → creates a report job | `GET /reports/export` → returns file immediately |
| `GET /reports` → lists stored reports | No list - reports are on-demand |
| Reports are stored, have IDs | Reports are generated on request |
| Reports have status: pending/ready | Export returns `fileUrl` directly |

**The contract endpoints ARE sufficient** - the UI just needs to be refactored.

---

## UI Fix Required

### Changes Needed:

1. **Remove `useReports()` call from ReportBuilderPage** (line 82)
   - This is what triggers the 401 → token refresh failure

2. **Remove the "Recent Reports" table** 
   - Reports aren't stored, so there's nothing to list

3. **Update ReportBuilderPage workflow:**
   - User selects report type (enrollment, performance, etc.)
   - User sets filters (date range, department, etc.)
   - User clicks "Generate" → calls `GET /reports/completion` or `GET /reports/export`
   - Display results inline OR download file

4. **Update endpoints.ts:**
   - Remove `reports.list`, `reports.create`, etc.
   - Add proper contract endpoints

### Contract Endpoints to Use:

| Report Type | Endpoint |
|-------------|----------|
| Enrollment/Completion | `GET /api/v2/reports/completion` |
| Performance | `GET /api/v2/reports/performance` |
| Course | `GET /api/v2/reports/course/:courseId` |
| Program | `GET /api/v2/reports/program/:programId` |
| Department | `GET /api/v2/reports/department/:departmentId` |
| Export (PDF/Excel) | `GET /api/v2/reports/export?reportType=...&format=...` |

---

## Resolution Options

### Option A: API Adds Reports List Endpoints
API team adds the missing CRUD endpoints for stored reports:
- `GET /api/v2/reports` - List generated reports
- `POST /api/v2/reports` - Create/queue a report
- `GET /api/v2/reports/:id` - Get report details
- `DELETE /api/v2/reports/:id` - Delete a report

### Option B: UI Removes Reports List Feature
UI changes to not call `useReports()` on mount:
- Remove the "recent reports" list from ReportBuilderPage
- Only call specific report endpoints when user generates a report
- Reports are generated on-demand, not queued

**Awaiting API team response** - see `messages/2026-01-15_160000_ui_request_UI-ISS-023.md`

---

## Files to Update (Once Direction Decided)

- `src/pages/admin/reports/` - Check what API calls are made on mount
- `src/shared/api/client.ts` - Token refresh logic (lines 176-240)
- `src/entities/*/api/` - API functions for reports
- Backend logs - Check what's happening on `/auth/refresh`

---

## Related Issues

- **UI-ISS-022:** Auth Error Page Implementation (provides the debug info that revealed this)
- **ISS-013:** Admin Escalation Modal (admin session management)

---

## Workaround

None currently - user must log in again after the redirect.

---

## Acceptance Criteria

- [ ] System Reports link works without triggering auth failure
- [ ] Token refresh works correctly when needed
- [ ] No auth state is lost during admin navigation
- [ ] All admin sidebar links function correctly
