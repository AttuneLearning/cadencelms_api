# UI-ISS-103: Notifications — Full Wiring & Integration

## Status: PENDING
## Priority: Low
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-099
## Category: Delayed — Later Priority

---

## Overview

**Delayed priority — implement later, after critical gaps and next-phase items.**

Notification UI components exist (bell icon, notification list, notification items) but are not wired to real data or the learner header. This issue tracks completing the notification system integration.

### Existing Infrastructure

- `NotificationBell` component with unread count and urgent pulsing
- `NotificationItem`, `NotificationList` components
- Notification entity with types: course version available, certificate earned, access expiring, badge earned, etc.
- No polling/WebSocket connection
- Not wired into learner header/layout

---

## Requirements

1. Wire `NotificationBell` into the learner header/layout
2. Connect to notification API endpoint (polling initially, WebSocket later)
3. Real-time or near-real-time notification delivery
4. Mark as read/unread
5. Click notification to navigate to relevant page
6. Notification preferences (opt in/out per type) — settings page
7. Badge count in sidebar navigation
8. Consider relationship to unified messaging inbox (UI-ISS-099) — notifications may feed into or coexist with the messaging system

---

## Dependencies

- API notification endpoints
- WebSocket or polling infrastructure
- UI-ISS-099 (messaging system) — determine if notifications merge into messaging inbox or remain separate

---

## Acceptance Criteria

- [ ] Design decisions documented (separate bell vs. merged with messaging)
- [ ] API requirements communicated
- [ ] Implementation issues created when prioritized

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
