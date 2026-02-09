# Learner Endpoint Audit — All 7 Issues Resolved

**Date:** 2026-02-09
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-09_learner-endpoint-audit-issues.md, 2026-02-09_enrollment-endpoint-filtering-bugs.md

---

## Summary

All 7 issues from the learner endpoint audit (API-ISS-033, API-ISS-037 through API-ISS-042) have been implemented and tested. Here's what changed:

### API-ISS-037: GET /enrollments — Fixed (Critical)

Three bugs resolved:
1. **User filtering**: `listEnrollments` now defaults to authenticated user's enrollments. Staff can still pass `?learner=<id>` to view specific learners.
2. **Course-type support**: Added third query path for `type: 'course'` enrollments (queried via `metadata.enrollmentType: 'course'`).
3. **Course filter**: `?course=<courseId>` now correctly filters course-type enrollments by `metadata.courseId`.

**No contract changes** — same response shape, same query parameters.

### API-ISS-038: GET /enrollments/my/programs — New Endpoint

- **Path**: `GET /api/v2/enrollments/my/programs`
- **Auth**: `isAuthenticated` + `enrollment:own:read`
- **Query params**: `page`, `limit`, `status` (active/completed/withdrawn)
- **Response**: `{ programs: [{ id, name, code, description, department, enrollment: { id, status, enrolledAt, progress }, coursesCompleted, coursesTotal }], pagination }`

### API-ISS-039: Messages/Inbox API — Full Implementation

7 new endpoints at `/api/v2/messages`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List messages (query: type, search, sort, page, limit) |
| GET | `/unread-count` | Get unread count |
| GET | `/:id` | Get message detail |
| POST | `/` | Send message |
| PATCH | `/mark-read` | Bulk mark read (body: `{ messageIds: [] }`) |
| PATCH | `/archive` | Bulk archive (body: `{ messageIds: [] }`) |
| DELETE | `/:id` | Soft delete |

All self-scoped via `isAuthenticated`.

**Message types**: `direct`, `announcement`, `reminder`, `system`
**Statuses**: `unread`, `read`, `archived`

### API-ISS-040/041/042: Auth Guards — Fixed

Created shared `assertLearnerOwnership` middleware applied to all three endpoints:
- `GET /learners/:id/certificates` — learners can only access own certificates
- `GET /learning-events/learner/:learnerId` — learners can only access own events
- `GET /progress/learner/:learnerId` — learners can only access own progress

Staff/admin users bypass the ownership check automatically.

### API-ISS-033: Content Double-Nesting — Fixed

All content controller endpoints now return `ApiResponse.success(result)` instead of `ApiResponse.success({ data: result })`. Response shape is now correctly `{ status, data: { ... } }` instead of `{ status, data: { data: { ... } } }`.

## Test Coverage

- 165 new/updated tests across 5 test suites
- 0 TypeScript errors
- All new tests passing

## Impact on UI

| Learner Page | Status | Notes |
|-------------|--------|-------|
| Dashboard | Fixed | Enrollments + progress now user-scoped |
| My Courses | Fixed | Shows user's enrollments including course-type |
| My Programs | Fixed | New endpoint returns program enrollments |
| My Learning | Fixed | Learning events now user-scoped |
| My Progress | Fixed | Progress now user-scoped |
| Inbox | Fixed | Full CRUD messaging API available |
| Certificates | Fixed | Ownership verified, still works same way |
| Course Player | Fixed | Enrollment verification via ?course= filter works |
| Content pages | Fixed | No more double-nested responses |

---

*Move to `archive/` when thread is complete*
