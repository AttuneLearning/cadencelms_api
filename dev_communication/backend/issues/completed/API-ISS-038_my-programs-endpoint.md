# API-ISS-038: GET /enrollments/my/programs — Endpoint Does Not Exist

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-037

---

## Overview

The UI's "My Programs" page calls `GET /api/v2/enrollments/my/programs` to retrieve the authenticated learner's program enrollments with progress data. This route does not exist in the API — returns 404.

---

## Requirements

1. Create `GET /enrollments/my/programs` endpoint
2. Filter by authenticated user (from JWT/session)
3. Return program enrollments with nested program details and progress
4. Support pagination (`page`, `limit`) and status filter (`active`, `completed`, `withdrawn`)

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/enrollments/my/programs` | List authenticated user's program enrollments |

### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default 1) |
| limit | number | No | Items per page (default 20) |
| status | string | No | Filter: `active`, `completed`, `withdrawn` |

### Expected Response

```json
{
  "status": "success",
  "data": {
    "programs": [
      {
        "id": "program-id",
        "name": "EMDR Introduction",
        "code": "EMDR101",
        "description": "...",
        "credential": "certificate",
        "duration": 12,
        "durationUnit": "weeks",
        "department": { "id": "dept-id", "name": "EMDR" },
        "enrollment": {
          "id": "enrollment-id",
          "status": "active",
          "enrolledAt": "2026-01-15T...",
          "completedAt": null,
          "progress": 45
        },
        "coursesCompleted": 2,
        "coursesTotal": 5,
        "certificate": { "enabled": true, "title": "EMDR Certificate" }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## Alternative Approach

If creating a new route is too much work, this could be handled by fixing `GET /enrollments` (API-ISS-037) to support `?type=program` filter and return enriched program data. The UI can adapt to either approach.

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| My Programs | `/learner/programs` | Page shows error / empty |

---

## Acceptance Criteria

- [ ] `GET /enrollments/my/programs` returns 200 with program enrollments
- [ ] Only returns the authenticated user's enrollments
- [ ] Pagination works correctly
- [ ] Status filter works
- [ ] Tests pass
