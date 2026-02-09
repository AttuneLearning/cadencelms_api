# UI-ISS-131: Test Coverage — Admin & Staff Pages

**Priority:** Medium
**Status:** PENDING
**Created:** 2026-02-08

## Description

Add unit tests for admin and staff pages that lack test coverage:

### Admin pages needing tests:
1. `src/pages/admin/analytics/AdminAnalyticsPage.tsx`
2. `src/pages/admin/calendar/AdminCalendarPage.tsx`
3. `src/pages/admin/classes/ClassManagementPage.tsx`
4. `src/pages/admin/dashboard/AdminDashboardPage.tsx`

### Staff pages needing tests:
1. `src/pages/staff/dashboard/StaffDashboardPage.tsx`
2. `src/pages/staff/calendar/StaffCalendarPage.tsx`
3. `src/pages/staff/courses/` — course editor pages
4. `src/pages/staff/analytics/` — course analytics pages

## Acceptance Criteria
- [ ] Tests for all listed pages
- [ ] Mock hooks, verify rendering and key interactions
- [ ] All tests pass
- [ ] TypeScript clean
