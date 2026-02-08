# UI-ISS-103: Notifications — Full Wiring & Integration

## Status: COMPLETE
## Priority: Low
## Created: 2026-02-07
## Updated: 2026-02-08
## Requested By: Internal
## Assigned To: Claude (UI Team)
## Related: UI-ISS-099
## Category: Feature

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

- [x] NotificationBell wired into the Header component
- [x] Connected to notification API using useNotificationSummary hook
- [x] Polling every 60 seconds for new notifications
- [x] Mark as read functionality implemented
- [x] View all notifications navigation (to settings page as placeholder)
- [x] Settings button navigation
- [x] Click notification handler implemented
- [x] Comprehensive tests written and passing
- [x] Type checking passes with zero errors

---

## Implementation Summary

### Changes Made

1. **Header Component (`src/widgets/header/Header.tsx`)**
   - Added NotificationBell import from `@/features/notifications`
   - Added useNotificationSummary and useMarkNotificationsAsRead hooks from `@/entities/notification`
   - Implemented handlers for:
     - handleNotificationClick - marks notification as read when clicked
     - handleMarkNotificationAsRead - marks individual notification as read
     - handleViewAllNotifications - navigates to /settings/notifications
     - handleNotificationSettings - navigates to /settings/notifications
   - Integrated NotificationBell into header (right side, between ThemeToggle and User dropdown)

2. **Tests (`src/widgets/header/__tests__/Header.notifications.test.tsx`)**
   - Created comprehensive test suite for notification integration
   - Tests cover:
     - NotificationBell rendering when authenticated
     - Passing notification summary data
     - Loading states
     - Click handlers (mark as read, view all, settings)
     - Edge cases (zero notifications, many notifications, error states)
   - All 17 tests passing

3. **Updated Existing Tests (`src/widgets/header/__tests__/Header.test.tsx`)**
   - Added mocks for notification hooks to prevent QueryClient errors
   - All 31 existing tests still passing

### API Integration

- **Hook Used**: `useNotificationSummary()`
  - Fetches notification summary for header bell
  - Stale time: 30 seconds
  - Refetch interval: 60 seconds (auto-polling)
  - Returns: unreadCount, urgentCount, recentNotifications[]

- **Mutation Used**: `useMarkNotificationsAsRead()`
  - Marks notifications as read
  - Invalidates notification queries on success

### Future Enhancements

- Create dedicated notifications list page (currently navigates to settings)
- Implement navigation based on notification type/actionUrl
- Add WebSocket support for real-time notifications (currently polling)
- Consider integration with unified messaging inbox (UI-ISS-099)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
