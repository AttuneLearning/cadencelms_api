# UI-ISS-140: Wire Calendar Pages to Real API Endpoints

## Status: PENDING
## Priority: Medium
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: API Team (inbox message: 2026-02-08_calendar-feeds-implemented.md)
## Assigned To: Unassigned
## Related: API-ISS-032

---

## Overview

Calendar feed endpoints are live (API-ISS-032). The UI calendar pages (Admin, Staff, Learner) currently use placeholder data hooks. Replace with real API integration.

---

## API Contracts

### Endpoints

```
GET /api/v2/calendar/learner?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/staff?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/system?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Response Shape
```json
{ "status": "success", "data": { "events": [...] } }
```

### Event Model
- Discriminated union on `kind: 'point' | 'span'`
- Each event has `feedId` for toggle filtering
- `actionUrl` is a relative path (prefix with base URL as needed)
- `metadata` contains source IDs for additional lookups

### Feeds
- **Learner**: class-session (span), enrollment-start (point), enrollment-expiry (point)
- **Staff**: class-session (span)
- **System**: academic-date (span)

### Constraints
- Both `startDate` and `endDate` required
- Max 90-day range (422 if exceeded)
- Auth: `isAuthenticated` for learner/staff (self-scoped), `academic:calendar:view` or `academic:years:read` for system

---

## Requirements

1. Create `src/entities/calendar-event/api/` with API functions for each feed
2. Create query hooks: `useLearnerCalendarEvents`, `useStaffCalendarEvents`, `useSystemCalendarEvents`
3. Replace placeholder hooks in `AdminCalendarPage`, `StaffCalendarPage`, `LearnerCalendarPage`
4. Wire `startDate`/`endDate` from the calendar's visible month range
5. Map API event shapes to existing calendar widget's event model
6. Support feed toggle checkboxes using `feedId`

---

## Files to Modify

| File | Action |
|------|--------|
| `src/entities/calendar-event/` | Update API layer + hooks (entity already scaffolded) |
| `src/pages/admin/calendar/AdminCalendarPage.tsx` | Replace placeholder with system feed hook |
| `src/pages/staff/calendar/StaffCalendarPage.tsx` | Replace placeholder with staff feed hook |
| `src/pages/learner/calendar/LearnerCalendarPage.tsx` | Replace placeholder with learner feed hook |
| `src/widgets/calendar/` | Verify widget accepts real event data shape |

---

## Tests Required

1. [ ] Calendar API functions — correct endpoint calls with date params
2. [ ] Calendar hooks — loading, success, error states
3. [ ] Calendar pages — render events from API data
4. [ ] Feed toggle filtering works with feedId

---

## Acceptance Criteria

- [ ] All three calendar pages fetch from real API endpoints
- [ ] Events render correctly in month-view grid
- [ ] Feed toggle checkboxes filter events by feedId
- [ ] 90-day max range respected
- [ ] Loading and error states handled
- [ ] Tests pass
- [ ] Code reviewed

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
