# UI-ISS-141: Build Discussion Forum UI

## Status: PENDING
## Priority: Medium
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: API Team (inbox message: 2026-02-08_discussion-forum-contracts.md)
## Assigned To: Unassigned
## Related: API-ISS-028

---

## Overview

Course-scoped discussion forums API is live (API-ISS-028). Build the full forum UI — thread listing, thread detail with replies, creation/editing, moderation controls, and search.

---

## API Contracts

### Routers
- **`/api/v2/courses/:courseId/discussions`** — thread listing, creation, search
- **`/api/v2/discussions`** — thread CRUD, pin/lock, replies
- **`/api/v2/replies`** — reply CRUD, mark as instructor answer

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/courses/:courseId/discussions` | List threads (paginated, filterable by moduleId/lessonId) |
| POST | `/courses/:courseId/discussions` | Create thread |
| GET | `/courses/:courseId/discussions/search?q=` | Search threads |
| GET | `/discussions/:threadId` | Get thread detail |
| PUT | `/discussions/:threadId` | Update thread (author/moderator) |
| DELETE | `/discussions/:threadId` | Soft-delete thread |
| PUT | `/discussions/:threadId/pin` | Pin/unpin (moderator) |
| PUT | `/discussions/:threadId/lock` | Lock/unlock (moderator) |
| GET | `/discussions/:threadId/replies` | List replies (paginated, nested via parentReplyId) |
| POST | `/discussions/:threadId/replies` | Create reply (403 if locked) |
| PUT | `/replies/:replyId` | Update reply |
| DELETE | `/replies/:replyId` | Soft-delete reply |
| PUT | `/replies/:replyId/mark-answer` | Mark as instructor answer (moderator) |

### Key Types

**Thread**: `{ _id, courseId, moduleId?, lessonId?, authorId: {_id, firstName, lastName, email}, authorType: 'learner'|'staff', title, body, isPinned, isLocked, replyCount, lastReplyAt, lastReplyBy, createdAt, updatedAt }`

**Pagination**: `{ page, limit, total, totalPages }`

### Permissions
- `content:courses:read` — all enrolled users: read, create, edit/delete own
- `content:discussions:moderate` — staff: pin, lock, mark answer, edit/delete any

### Behavior
- Thread listing: pinned first, then by lastReplyAt descending
- Search: MongoDB text index on title + body, relevance sorted
- Replies support nesting via `parentReplyId`
- Soft-delete (not returned in listings)

---

## Requirements

### Entity Layer
1. `src/entities/discussion/` — thread types, API functions, query keys, hooks
2. `src/entities/reply/` — reply types, API functions, query keys, hooks

### Features
3. Thread list — paginated, filterable by module/lesson, pinned threads highlighted
4. Thread detail — full thread with nested reply tree
5. Create/edit thread form — title + body (with markdown or rich text)
6. Create/edit reply — inline reply form, nested reply support
7. Search — search bar with results
8. Moderation toolbar — pin, lock, mark answer (staff only)
9. Thread status indicators — pinned badge, locked badge, instructor answer badge

### Pages
10. Course discussions page — thread list within course context
11. Thread detail page — thread + replies
12. Integration with course player sidebar (optional — link to discussions per module/lesson)

---

## Tests Required

1. [ ] Discussion entity hooks — list, create, update, delete threads
2. [ ] Reply entity hooks — list, create, update, delete, mark answer
3. [ ] Thread list — pagination, filtering, pinned-first sort
4. [ ] Thread detail — renders thread + reply tree
5. [ ] Create thread form — validation, submission
6. [ ] Reply form — inline creation, nested replies
7. [ ] Search — query submission, results rendering
8. [ ] Moderation controls — pin/lock/mark-answer (staff only visibility)

---

## Acceptance Criteria

- [ ] Users can view course discussion threads (paginated)
- [ ] Users can create new threads scoped to course/module/lesson
- [ ] Users can reply to threads (including nested replies)
- [ ] Staff can pin, lock threads and mark instructor answers
- [ ] Locked threads prevent new replies
- [ ] Search returns relevant results
- [ ] Author can edit/delete own posts
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
