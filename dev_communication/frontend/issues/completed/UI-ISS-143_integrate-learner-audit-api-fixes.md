# UI-ISS-143: Integrate Learner Audit API Fixes

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: API Team (inbox message: 2026-02-09_learner-audit-issues-implemented.md)
## Assigned To: Unassigned
## Related: API-ISS-033, API-ISS-037, API-ISS-038, API-ISS-039, API-ISS-040, API-ISS-041, API-ISS-042

---

## Overview

The API team resolved 7 learner endpoint issues affecting enrollment filtering, messages, auth guards, and the content double-nesting bug. Several of these require UI updates to take advantage of fixes or remove workarounds.

---

## API Changes Summary

### API-ISS-033: Content Double-Nesting Fixed (Critical)
- Content endpoints now return `{ status, data: { ... } }` instead of `{ status, data: { data: { ... } } }`
- **UI impact**: `getContent()` in `src/entities/content/api/contentApi.ts` has a defensive `data.data` unwrap that should be removed

### API-ISS-037: Enrollment Filtering Fixed
- `GET /enrollments` now defaults to authenticated user's enrollments
- Course-type enrollments supported via `?type=course`
- Course filter via `?course=<courseId>` works correctly
- **UI impact**: Verify existing enrollment hooks work correctly (may "just work")

### API-ISS-038: New Endpoint — `GET /api/v2/enrollments/my/programs`
- Returns program enrollments for current user
- Response: `{ programs: [{ id, name, code, description, department, enrollment, coursesCompleted, coursesTotal }], pagination }`
- **UI impact**: Wire learner programs page to this endpoint

### API-ISS-039: Messages/Inbox API — Full Implementation
- 7 new endpoints at `/api/v2/messages`:
  - `GET /` — list (query: type, search, sort, page, limit)
  - `GET /unread-count` — unread count
  - `GET /:id` — detail
  - `POST /` — send
  - `PATCH /mark-read` — bulk mark read
  - `PATCH /archive` — bulk archive
  - `DELETE /:id` — soft delete
- Message types: `direct`, `announcement`, `reminder`, `system`
- **UI impact**: Wire existing message entity/inbox UI to real API

### API-ISS-040/041/042: Auth Guards Fixed
- Learner endpoints now enforce ownership (`assertLearnerOwnership` middleware)
- `GET /learners/:id/certificates`, `GET /learning-events/learner/:learnerId`, `GET /progress/learner/:learnerId`
- **UI impact**: No changes needed — these are server-side guards

---

## Requirements

### Critical — Content Unwrap Fix
1. Remove defensive `data.data` unwrap from `getContent()` in `src/entities/content/api/contentApi.ts`
2. Verify content rendering still works in course player

### Messages/Inbox Integration
3. Update `src/entities/message/api/` to use real endpoints
4. Wire `useUnreadCount` to `GET /messages/unread-count`
5. Wire inbox page to `GET /messages` with filtering/pagination
6. Wire message detail to `GET /messages/:id`
7. Implement mark-read, archive, delete actions
8. Implement send message feature

### Programs Page Integration
9. Update learner programs page to use `GET /enrollments/my/programs`
10. Display program progress (coursesCompleted/coursesTotal)

### Verification
11. Verify enrollment hooks work correctly with fixed filtering
12. Verify learner dashboard, my-courses, my-progress pages still work

---

## Files to Modify

| File | Action |
|------|--------|
| `src/entities/content/api/contentApi.ts` | Remove `data.data` defensive unwrap |
| `src/entities/message/api/` | Wire to real message endpoints |
| `src/entities/message/hooks/` | Update hooks for real API |
| `src/features/messages/` | Wire inbox features to real API |
| Learner programs page | Wire to `/enrollments/my/programs` |

---

## Tests Required

1. [ ] Content API — returns correct shape without double unwrap
2. [ ] Message hooks — list, detail, unread count, mark-read, archive, delete
3. [ ] Inbox page — renders messages, supports filtering
4. [ ] Programs page — renders program enrollments with progress
5. [ ] Enrollment hooks — verify existing functionality not broken

---

## Acceptance Criteria

- [ ] Content renders correctly without double-nesting workaround
- [ ] Inbox shows real messages from API
- [ ] Unread count badge works with real data
- [ ] Messages can be read, archived, and deleted
- [ ] Learner programs page shows program enrollments
- [ ] All existing learner pages still work
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
