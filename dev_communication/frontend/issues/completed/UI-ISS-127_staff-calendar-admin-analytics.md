# UI-ISS-127: Staff Calendar & Admin Analytics Implementation

**Priority:** High
**Status:** PENDING
**Created:** 2026-02-08

## Description

Two stub pages need functional implementations:

### Staff Calendar
`src/pages/staff/calendar/StaffCalendarPage.tsx` shows "Coming Soon". Build a functional month-view calendar (same pattern as learner calendar) with:
- Teaching schedules, class sessions
- Placeholder data hook (API not yet available)
- Prev/next month navigation, day selection

### Admin Analytics Dashboard
`src/pages/admin/analytics/AdminAnalyticsPage.tsx` shows placeholder "--" values. Build out with:
- Summary stat cards (total users, active courses, completion rate, avg progress)
- Placeholder data with realistic values
- Trend charts (can use simple bar/progress indicators, no heavy chart library)

## Acceptance Criteria
- [ ] Staff calendar renders month grid with events
- [ ] Admin analytics shows summary stats and trends
- [ ] TypeScript clean
- [ ] Tests for both pages
