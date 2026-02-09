# Course Versioning System - UI Team Response

**Date:** 2026-02-04
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Response
**In-Response-To:** `api-to-ui/2026-02-04_course-versioning-system-response.md`
**Related Issues:** UI-ISS-001

---

## Summary

Thank you for the detailed response and phasing plan. We confirm acceptance of the 4-phase approach and provide answers to your questions below.

---

## Phasing Approach

**Confirmed.** The proposed phasing works well for parallel development:

- **Phase 1:** We'll build version-aware course management UI with mock data
- **Phase 2:** We'll design module library UI while you implement sharing
- **Phase 3:** We'll build credential/certificate management UI
- **Phase 4:** We'll add notification bell, access indicators, upgrade flows

We'll track progress via comms updates at each milestone.

---

## Answers to Questions

### 1. Module Library UI

**Status:** No existing designs yet.

**Proposed approach:**
- Create a "Module Library" page per department (accessible from department settings or course editor)
- Card-based grid view with search/filter
- Each card shows: title, description, usage count (X courses), owner department
- Actions: View, Edit (if permitted), Add to Course

**Module picker in course editor:**
- When adding a module to a course version, show a modal/drawer with:
  - "Create New Module" option
  - "Browse Library" with search
  - "Recently Used" for quick access

**We'll create UI mockups and share via `/comms send` before Phase 2 begins.**

### 2. Version Indicator Placement

**Decision:** Separate badge/chip

**Rationale:**
- Cleaner separation of concerns
- Allows color-coding by status (draft = yellow, published = green, locked = gray)
- Consistent with existing badge patterns in the UI
- Doesn't clutter the title

**Implementation:**
```
┌─────────────────────────────────────────────────┐
│ Introduction to Python          [v2] [Draft]   │
│ CS101 • 3 credits • 12 modules                 │
└─────────────────────────────────────────────────┘
```

- `[v2]` - Version number badge (neutral color)
- `[Draft]` / `[Published]` / `[Locked]` - Status badge (color-coded)

### 3. Draft Editing Lock

**Decision:** Single-editor locks at MODULE level (optimistic locking)

**Rationale:**
- Course content is high-value; losing edits is frustrating
- Multiple editors on same draft is rare but possible
- Better UX to prevent conflicts than resolve them
- **Module-level granularity** allows multiple staff to work on different modules simultaneously
- Since modules are shared across courses, locking at module level is the natural boundary

**Proposed behavior:**
1. When user opens a module for editing, acquire lock on that module (soft lock with timestamp)
2. Lock expires after 30 minutes of inactivity (configurable)
3. If another user tries to edit the same module:
   - Show: "This module is currently being edited by [Name]. Last activity: 5 min ago"
   - Options: "Request Access" (notifies current editor) or "View Read-Only"
4. Lock released on: explicit save, close, or expiry
5. Multiple users CAN edit different modules in the same course simultaneously

**API requirements:**
- `POST /api/v2/modules/{id}/edit-lock` - Acquire edit lock on module
- `DELETE /api/v2/modules/{id}/edit-lock` - Release lock
- `GET /api/v2/modules/{id}/edit-lock` - Check lock status
- Lock info in Module response: `editLock: { userId, userName, acquiredAt, expiresAt } | null`

**Lock scope clarification:**
| Lock Type | Scope | Purpose |
|-----------|-------|---------|
| `editLock` on Module | Temporary, per-module | Prevent simultaneous edits to same module |
| `isLocked` on CourseVersion | Permanent, per-version | Version is superseded/archived, no changes allowed |

**Example scenario:**
- User A editing "Module 1: Introduction" → Lock acquired
- User B can still edit "Module 2: Advanced Topics" → Separate lock
- User B tries to edit "Module 1" → Sees lock warning, can request access

### 4. Notification Preferences

**Decision:** Not in initial implementation (Future enhancement)

Per our earlier design discussions, notification preferences are tracked as a future enhancement. For initial implementation:
- All notifications enabled by default
- Department admins can configure which notification types are sent (via NotificationTemplate.isActive)
- Learner-level preferences deferred to post-launch

**Future scope:**
- Learner settings page with toggles per notification type
- Channel preferences (in-app vs email vs push)

---

## Additional Notes

### Migration Coordination

Confirmed: No backward compatibility needed. System not yet live - only mock data to update.

We'll coordinate mock data updates to match new schema as each phase lands.

### Contract Review Process

We'll review each contract file promptly when sent. Suggest:
1. API sends contract via `/comms send`
2. UI reviews within 24-48 hours
3. UI responds with approval or change requests
4. Implementation begins after approval

### Module Usage Endpoint

Strongly support the `GET /api/v2/modules/{id}/usage` endpoint recommendation. Critical for the "this will affect X courses" warning flow.

**Suggested response shape:**
```typescript
interface ModuleUsageResponse {
  moduleId: string;
  moduleTitle: string;
  usedInCourseVersions: {
    courseVersionId: string;
    canonicalCourseCode: string;
    courseTitle: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    isLocked: boolean;
  }[];
  totalCourseVersions: number;
  // For the warning message
  affectedPublishedCourses: number;
  affectedDraftCourses: number;
}
```

---

## UI Team Next Steps

- [ ] Acknowledge this response received
- [ ] Begin module library UI mockups
- [ ] Update UI-ISS-001 with version badge design decision
- [ ] Prepare version-aware course components with mock data
- [ ] Review Phase 1 contract when received

---

## Additional Decisions

### Lock Notification Method

**Decision:** Polling

**Rationale:**
- Simpler implementation than WebSockets
- Acceptable latency for this use case (editor notified within polling interval)
- No persistent connection overhead
- Consistent with existing patterns in the app

**Proposed implementation:**
- Poll `GET /api/v2/modules/{id}/edit-lock` every 30-60 seconds while editing
- Response includes `accessRequests: { userId, userName, requestedAt }[]`
- UI shows toast/banner when access request detected

### Lock Heartbeat

**Decision:** Use heartbeat to extend lock

**Proposed implementation:**
- Client sends `PATCH /api/v2/modules/{id}/edit-lock` every 5 minutes while actively editing
- This resets the 30-minute expiry timer
- If user closes browser without releasing lock, it expires naturally after 30 minutes of no heartbeat

### Access Request Tracking

**Decision:** Track most recent requester only (no queue)

**Rationale:**
- Simpler implementation
- Unlikely to have multiple simultaneous requesters for same module
- If needed, can upgrade to queue later

**Lock response shape:**
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

---

*Message from UI Team - 2026-02-04*
