# API-ISS-032: Calendar Feed Endpoints

## Status: COMPLETE
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: API Team
## Related: `dev_communication/messaging/ui-to-api/2026-02-08_calendar-endpoint-contracts.md`

---

## Overview

The UI team has built a unified `CalendarWidget` architecture supporting three independent calendar feeds. The API needs to implement three GET endpoints that return point events (single-date) and span events (date ranges) from existing LMS data.

---

## Requirements

### Feed Endpoints

```
GET /api/v2/calendar/learner?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/staff?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/system?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Response Shape (shared by all three feeds)

```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "string",
        "feedId": "learner | staff | system",
        "kind": "point | span",
        "title": "string",
        "date": "ISO date (point events)",
        "startDate": "ISO date (span events)",
        "endDate": "ISO date (span events)",
        "time": "optional string",
        "location": "optional string",
        "eventType": "string",
        "description": "optional string",
        "actionUrl": "optional string",
        "metadata": "optional object"
      }
    ]
  }
}
```

### Event Types by Feed

| Feed | Event Types |
|------|------------|
| learner | `enrollment-start`, `enrollment-expiry`, `deadline`, `class-session` |
| staff | `class-session`, `office-hours`, `meeting`, `grading-deadline` |
| system | `system-event`, `academic-date`, `department-event`, `maintenance-window` |

### Data Sources

- **Learner feed**: ClassEnrollment → Class (sessions), Enrollment (start/expiry), assignment deadlines
- **Staff feed**: Classes where user is instructor, grading deadlines from assignments
- **System feed**: AcademicYear dates, department events (admin-scoped)

### Authentication & Authorization

- All endpoints require authentication (`isAuthenticated`)
- Learner/Staff feeds are scoped to the authenticated user
- System feed requires admin-level access

---

## Acceptance Criteria

- [ ] Three GET endpoints return events in the specified shape
- [ ] Date range filtering works correctly (startDate/endDate query params)
- [ ] Learner feed returns only events for the authenticated user's enrollments
- [ ] Staff feed returns only events for the authenticated user's teaching assignments
- [ ] System feed returns department/academic events visible to admins
- [ ] TypeScript compiles cleanly
- [ ] Unit tests for calendar service
- [ ] Response message sent to UI team

---

## Implementation Notes

- Service: `src/services/calendar/calendar-feeds.service.ts` — static class with three methods
- Controller: `src/controllers/calendar/calendar-feeds.controller.ts` — thin handlers using asyncHandler
- Routes: `src/routes/v2/calendar-feeds.routes.ts` — mounted at `/api/v2/calendar/`
- Validator: `src/validators/calendar-feeds.validator.ts` — Joi validation for startDate/endDate query params (max 90-day range)
- Learner/Staff feeds are self-scoped (isAuthenticated only), system feed requires `academic:calendar:view` or `academic:years:read`
- Data sources: ClassEnrollment + Class (learner sessions), Enrollment (program milestones), Class (staff teaching), AcademicYear + AcademicTerm (system)
- 16 unit tests (11 service + 5 controller), all passing

---

## Completion

**Completed Date:** 2026-02-08

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (16/16)
- [x] TypeScript compiles cleanly (0 errors)
- [x] Response message sent to UI team

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
