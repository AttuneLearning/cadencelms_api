# UI-ISS-128: Test Coverage — New Entity Hooks & Components

**Priority:** Medium
**Status:** PENDING
**Created:** 2026-02-08

## Description

Add unit tests for recently implemented entity modules that lack test coverage:

### Entities needing tests:
1. `src/entities/message/` — hooks (useMessages, useUnreadCount, useSendMessage), components
2. `src/entities/forum/` — hooks (useForumThreads, useForumPosts), components
3. `src/entities/assignment/` — hooks (useAssignments, useSubmitAssignment), components
4. `src/entities/exception/` — hooks (useEnrollmentExceptions, useGrantException)
5. `src/entities/enrollment/ui/ExpiryBadge.tsx` — expiry badge component
6. `src/entities/enrollment/lib/` — enrollment utility functions

## Acceptance Criteria
- [ ] Tests for all entity hooks (mock API, verify query keys, verify mutations)
- [ ] Tests for entity UI components
- [ ] All tests pass
- [ ] TypeScript clean
