# UI-ISS-129: Test Coverage — Feature Components

**Priority:** Medium
**Status:** PENDING
**Created:** 2026-02-08

## Description

Add unit tests for recently implemented feature modules:

### Features needing tests:
1. `src/features/player/ui/AudioPlayer.tsx` — audio content player
2. `src/features/player/ui/AssignmentPlayer.tsx` — assignment submission player
3. `src/features/messaging/` — inbox UI, compose dialog, thread view
4. `src/features/exception-management/ui/ExceptionHistoryTable.tsx` — exception history display
5. `src/features/catalog/ui/EnrollmentSection.tsx` — enrollment with toast (updated in ISS-119)
6. `src/features/notifications/ui/NotificationBell.tsx` — notification bell with click navigation (updated in ISS-118)

## Acceptance Criteria
- [ ] Tests for all feature components
- [ ] Mock hooks and verify render behavior
- [ ] All tests pass
- [ ] TypeScript clean
