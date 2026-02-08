# API-ISS-021: Module Edit Locking System

## Status: PENDING
## Priority: Medium
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team (response 2026-02-04)
## Assigned To: Unassigned
## Related: API-ISS-016 (module sharing), UI-ISS-001
## Phase: 2 - Module Sharing (addition)

---

## Overview

Implement optimistic locking at the MODULE level to prevent simultaneous edits by multiple users. Since modules are shared across courses, this is the natural boundary for edit locks.

This was requested by UI team in their course versioning response (2026-02-04).

---

## Requirements

1. Add `editLock` tracking to modules
2. Implement lock acquisition, release, and heartbeat endpoints
3. Support access request flow
4. Locks expire after 30 minutes of inactivity
5. Polling-based notifications (no WebSockets)

---

## Technical Specification

### Model Addition (or separate collection)

```typescript
interface IModuleEditLock {
  moduleId: ObjectId;
  userId: ObjectId;
  userName: string;
  acquiredAt: Date;
  expiresAt: Date;                       // acquiredAt + 30 minutes
  lastHeartbeat: Date;
  accessRequest: {
    userId: ObjectId;
    userName: string;
    requestedAt: Date;
  } | null;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v2/modules/{id}/edit-lock` | Acquire edit lock |
| DELETE | `/api/v2/modules/{id}/edit-lock` | Release lock |
| GET | `/api/v2/modules/{id}/edit-lock` | Check lock status |
| PATCH | `/api/v2/modules/{id}/edit-lock` | Heartbeat (extend lock) |
| POST | `/api/v2/modules/{id}/edit-lock/request-access` | Request access |

### POST /api/v2/modules/{id}/edit-lock

Acquire lock on a module for editing.

**Response (success):**
```json
{
  "status": "success",
  "data": {
    "moduleId": "...",
    "isLocked": true,
    "lock": {
      "userId": "...",
      "userName": "John Doe",
      "acquiredAt": "2026-02-04T...",
      "expiresAt": "2026-02-04T..."
    },
    "accessRequest": null
  }
}
```

**Response (already locked):**
```json
{
  "status": "error",
  "code": "MODULE_LOCKED",
  "message": "This module is currently being edited by John Doe",
  "data": {
    "moduleId": "...",
    "isLocked": true,
    "lock": {
      "userId": "...",
      "userName": "John Doe",
      "acquiredAt": "2026-02-04T...",
      "expiresAt": "2026-02-04T..."
    },
    "accessRequest": null
  }
}
```

### GET /api/v2/modules/{id}/edit-lock

Check current lock status. Used for polling (30-60 second intervals).

**Response:**
```typescript
interface ModuleEditLockResponse {
  moduleId: string;
  isLocked: boolean;
  lock: {
    userId: string;
    userName: string;
    acquiredAt: string;
    expiresAt: string;
  } | null;
  accessRequest: {
    userId: string;
    userName: string;
    requestedAt: string;
  } | null;  // Most recent requester only
}
```

### PATCH /api/v2/modules/{id}/edit-lock

Heartbeat - extend the lock expiry. Called every 5 minutes while actively editing.

**Response:** Same as GET, with updated `expiresAt`.

### POST /api/v2/modules/{id}/edit-lock/request-access

Request access to a locked module. Stores most recent requester only.

**Response:**
```json
{
  "status": "success",
  "message": "Access request sent to current editor"
}
```

### DELETE /api/v2/modules/{id}/edit-lock

Release lock explicitly (on save, close, or navigate away).

---

## Business Logic

### Lock Lifecycle

1. **Acquire:** User opens module for editing
   - If no active lock (or expired), create new lock
   - If active lock by another user, return error with lock info
   - Lock expires after 30 minutes

2. **Heartbeat:** Client sends every 5 minutes while editing
   - Resets `expiresAt` to now + 30 minutes
   - Resets `lastHeartbeat` to now
   - Only lock holder can heartbeat

3. **Release:** User saves, closes, or navigates away
   - Delete lock record
   - If user closes browser without releasing, lock expires naturally

4. **Access Request:** Another user wants to edit
   - Store request (most recent only, no queue)
   - Lock holder sees request on next poll
   - Lock holder can release or continue

### Lock Scope Clarification

| Lock Type | Scope | Purpose |
|-----------|-------|---------|
| `editLock` (this feature) | Temporary, per-module | Prevent simultaneous edits |
| `isLocked` on CourseVersion | Permanent, per-version | Version superseded/archived |

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/academic/ModuleEditLock.model.ts` | Lock tracking (separate collection) |
| `src/services/moduleEditLock.service.ts` | Lock business logic |
| `src/controllers/moduleEditLock.controller.ts` | Route handlers |

### Files to Modify

| File | Change |
|------|--------|
| `src/routes/v2/modules.routes.ts` | Add edit-lock sub-routes |

### TTL Index for Auto-Expiry

```typescript
// MongoDB TTL index to auto-delete expired locks
moduleEditLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## Tests Required

1. [ ] Acquire lock successfully
2. [ ] Cannot acquire lock when already locked by another user
3. [ ] Lock expires after 30 minutes without heartbeat
4. [ ] Heartbeat extends lock expiry
5. [ ] Release lock explicitly
6. [ ] Check lock status returns correct data
7. [ ] Access request stored correctly
8. [ ] Only most recent access request kept
9. [ ] Lock holder can see access request
10. [ ] TTL index auto-deletes expired locks

---

## Acceptance Criteria

- [ ] ModuleEditLock model with TTL index
- [ ] All 5 endpoints implemented
- [ ] 30-minute expiry with heartbeat extension
- [ ] Access request flow working
- [ ] Polling-friendly responses (no WebSockets)
- [ ] Tests pass

---

## Questions / Clarifications

1. **Should lock be in separate collection or embedded in Module?**
   Separate collection recommended - cleaner TTL handling, no Module document bloat.

2. **What if module is in locked CourseVersion?**
   `editLock` only applies to draft versions. Modules in locked CourseVersions are already uneditable.

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
- [ ] UI team notified
