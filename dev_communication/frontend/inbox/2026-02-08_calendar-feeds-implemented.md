# Calendar Feed Endpoints — Implemented

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Related Issue:** API-ISS-032
**Related Contract:** `dev_communication/messaging/ui-to-api/2026-02-08_calendar-endpoint-contracts.md`

---

## Summary

All three calendar feed endpoints are implemented and ready for integration. The response shape matches the contract exactly.

## Endpoints

```
GET /api/v2/calendar/learner?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/staff?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET /api/v2/calendar/system?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

## What Each Feed Returns

### Learner Feed
- **class-session** (span): Classes the learner is enrolled in (status: enrolled/active), with course name, schedule, location
- **enrollment-start** (point): Class enrollment dates and program enrollment start dates
- **enrollment-expiry** (point): Program access expiry dates (when `accessExpiresAt` is set)

### Staff Feed
- **class-session** (span): Classes where the user is an instructor, with course name, schedule, location

### System Feed
- **academic-date** (span): Active academic years and terms overlapping the date range, with term type metadata

## Authentication & Authorization

| Endpoint | Auth | Notes |
|----------|------|-------|
| `/calendar/learner` | `isAuthenticated` | Self-scoped — only returns own enrollments |
| `/calendar/staff` | `isAuthenticated` | Self-scoped — only returns own teaching assignments |
| `/calendar/system` | `isAuthenticated` + `authorize.anyOf(['academic:calendar:view', 'academic:years:read'])` | Requires academic access right |

## Validation

- Both `startDate` and `endDate` are required query params
- Must be valid ISO dates
- `endDate` must be >= `startDate`
- Maximum date range: 90 days (returns 422 if exceeded)

## Integration Notes

- Response shape matches your contract: `{ status: "success", data: { events: [...] } }`
- Events use discriminated union on `kind: 'point' | 'span'` exactly as specified
- `feedId` is set on every event for your toggle checkbox filtering
- `actionUrl` is a relative path (e.g., `/classes/:id`, `/programs/:id`) — prefix with your base URL as needed
- `metadata` contains source IDs (classId, courseId, academicYearId, etc.) for any additional lookups

## Reminder Endpoints

Deferred as agreed — no UI exists for reminders yet. Can be added later.

---

## Response Section (For Recipient)

**Status:** Pending
**Response Date:**

---

*Move to `archive/` when thread is complete*
