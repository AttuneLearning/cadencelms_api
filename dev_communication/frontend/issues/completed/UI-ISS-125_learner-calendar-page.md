# UI-ISS-125: Learner Calendar Page

## Status: PENDING
## Priority: Low
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-098, UI-ISS-117

---

## Overview

The learner Calendar page at `/learner/calendar` is a **placeholder stub** showing only a "Learner Calendar Coming Soon" message with a Calendar icon. There is no actual calendar functionality, no data fetching, and no event display. The page should show learner-relevant dates: enrollment validity windows, upcoming deadlines (if applicable), and scheduled events.

---

## Requirements

1. Render a functional calendar view (month/week/day)
2. Display learner-relevant events:
   - Course enrollment start/end dates (valid-until windows)
   - Assignment due dates (if applicable, per UI-ISS-098)
   - Scheduled live sessions or events (if applicable)
3. Allow clicking an event to navigate to the relevant course or content
4. Support month navigation (previous/next month)

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Learner calendar page component | Modify | Replace stub with calendar UI |

### Current State
```tsx
// Stub — Calendar icon + "Learner Calendar Coming Soon" text
// No data fetching, no calendar rendering
```

### Approach

Option A: Use a lightweight calendar library (react-big-calendar, @fullcalendar/react)
Option B: Build a simple custom month grid using date-fns + Tailwind grid
Option C: Use shadcn/ui calendar component as starting point

Recommended: Start with shadcn/ui `Calendar` component for month view, add event dots/badges.

### API Dependencies

Requires an endpoint to fetch learner events/dates. This may be:
- Aggregated from enrollment data (enrollment.validUntil, course start dates)
- A dedicated calendar events endpoint (to be defined)

See UI-ISS-098 for the broader dates & deadlines design.

---

## Acceptance Criteria

- [ ] Calendar renders with month view showing current month
- [ ] Month navigation (previous/next) works
- [ ] Enrollment dates appear as events on the calendar
- [ ] Clicking an event navigates to relevant course/content
- [ ] Today is visually highlighted
- [ ] Empty state when no events exist
- [ ] Can be added back to sidebar once complete (see UI-ISS-117)

---

## Implementation Notes

*This depends on UI-ISS-098 (dates & deadlines exploration) for the data model. Can be implemented with mock data initially and wired to the API later. The page was hidden from the sidebar in UI-ISS-107 — re-add it once this issue is complete.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
