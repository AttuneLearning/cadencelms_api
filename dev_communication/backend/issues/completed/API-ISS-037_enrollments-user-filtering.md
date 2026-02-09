# API-ISS-037: GET /enrollments — Missing User Filtering & Course Type Support

## Status: PENDING
## Priority: Critical
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: Comms message `2026-02-09_enrollment-endpoint-filtering-bugs.md`

---

## Overview

`GET /api/v2/enrollments` has three critical bugs that break all learner enrollment features:

1. **`_userId` parameter unused** — the authenticated user's ID is passed to the service but stored as `_userId` (underscore-prefixed, ignored). Returns ALL enrollments system-wide — this is a **data leak**.
2. **No `type: 'course'` support** — only queries `ProgramEnrollment` and `ClassEnrollment`. Direct course enrollments are invisible.
3. **`course` filter ignored** — `filters.course` is accepted but never applied to queries.

---

## Requirements

1. Use the `userId` parameter to filter enrollments so each learner only sees their own
2. Query `type: 'course'` enrollments in addition to program and class
3. Apply `filters.course` when provided to filter by target course ID
4. Maintain existing pagination response shape (`page, limit, total, totalPages, hasNext, hasPrev`)

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/enrollments` | List enrollments for authenticated user |

### Current Behavior (Broken)

```
// enrollments.service.ts line ~145
static async listEnrollments(filters: ListEnrollmentsFilters, _userId: string) {
  // _userId is NEVER referenced — queries return ALL enrollments
}
```

### Expected Behavior

- When a learner calls `GET /enrollments`, only their enrollments are returned
- When `?course=<courseId>` is passed, results are filtered to that course
- Course-type enrollments (not just program/class) are included

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| My Courses | `/learner/courses` | Shows all users' enrollments |
| Dashboard | `/learner/dashboard` | Stats include all users' data |
| My Progress | `/learner/progress` | Progress shows all users |
| My Learning | `/learner/learning` | Activity from all users |
| Course Player | `/learner/courses/:id/player` | Can't verify enrollment |

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/enrollment/enrollments.service.ts` | Modify | Use userId in queries, add course-type support, apply course filter |

---

## Acceptance Criteria

- [ ] `GET /enrollments` returns only the authenticated user's enrollments
- [ ] Course-type enrollments are included in results
- [ ] `?course=<courseId>` filter works correctly
- [ ] Pagination totals are accurate
- [ ] Tests pass
