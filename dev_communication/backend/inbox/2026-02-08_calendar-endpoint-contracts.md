# Calendar API Endpoint Contracts

**Date:** 2026-02-08
**From:** UI Team
**To:** API Team
**Priority:** Medium
**Related Issues:** N/A (new feature)

---

## Request

The UI team has built a shared calendar widget system with support for three separate feed endpoints, date-range span events, and reminder CRUD. We need the API team to implement the following endpoints when capacity allows.

## Context

We replaced three duplicated calendar pages (~1040 lines) with a unified `CalendarWidget` architecture. The widget supports:
- **Point events** (single-date) and **span events** (date ranges with Gantt-style bars)
- **Three independent feeds**: learner, staff, system — each from its own endpoint
- **Multi-role composability**: staff page shows both staff + learner feeds with independent toggle checkboxes
- **Reminder integration** (deferred but types/endpoints ready)

The UI currently uses placeholder data hooks. Once the API ships these endpoints, we swap `useCalendarFeedPlaceholder` for `useCalendarFeed` (one-line change per page).

## Requirements

### 1. Feed Endpoints

All three feeds share the same contract:

```
GET /api/v2/calendar/learner?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/staff?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/system?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Response shape:**
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "string",
        "feedId": "learner | staff | system",
        "kind": "point",
        "title": "string",
        "date": "ISO date string",
        "time": "optional string (e.g. '9:00 AM - 10:30 AM')",
        "location": "optional string",
        "eventType": "string (see below)",
        "description": "optional string",
        "actionUrl": "optional string",
        "metadata": "optional object"
      },
      {
        "id": "string",
        "feedId": "learner | staff | system",
        "kind": "span",
        "title": "string",
        "startDate": "ISO date string",
        "endDate": "ISO date string",
        "eventType": "string",
        "description": "optional string",
        "actionUrl": "optional string",
        "metadata": "optional object"
      }
    ]
  }
}
```

**Event types by feed:**

| Feed | Event Types |
|------|------------|
| learner | `enrollment-start`, `enrollment-expiry`, `deadline`, `class-session` |
| staff | `class-session`, `office-hours`, `meeting`, `grading-deadline` |
| system | `system-event`, `academic-date`, `department-event`, `maintenance-window` |

**Key design notes:**
- Events use a **discriminated union** on `kind`: `'point'` (single date) vs `'span'` (date range)
- `startDate`/`endDate` query params define the visible window (the UI sends the full month grid range including leading/trailing days)
- Learner feed: scoped to the authenticated user's enrollments, deadlines, class sessions
- Staff feed: scoped to the authenticated user's teaching assignments, office hours, meetings
- System feed: system-wide events visible to admins (academic dates, maintenance windows, department events)

### 2. Reminder Endpoints (Deferred)

```
POST   /api/v2/calendar/reminders    { eventId: string, minutesBefore: number }
DELETE /api/v2/calendar/reminders/:id
```

These can be implemented later. The UI types are ready but no UI for reminders exists yet.

## Timeline

- **Needed by:** When convenient (UI uses placeholder data in the meantime)
- **Blocking:** Nothing — the UI is fully functional with placeholder data

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:**

---

*Move to `archive/` when thread is complete*
