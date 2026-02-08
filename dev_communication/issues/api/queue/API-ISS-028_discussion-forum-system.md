# API-ISS-028: Discussion Forum System

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-100, API-ISS-020
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

Implement a course-level discussion forum system where learners and staff can create discussion threads, post replies, and interact within a course context. Threads can optionally be scoped to a specific module or lesson.

---

## Requirements

1. **Discussion thread model** with course/module/lesson scoping
2. **Reply model** with nested threading
3. **Moderation**: Pin, lock, delete threads (staff/admin only)
4. **Instructor answers**: Mark a reply as "instructor answer"
5. **Pagination** for thread listing and replies
6. **Search** within course forum
7. **Permissions**: Learners can only access forums for courses they're enrolled in

---

## Technical Specification

### New Models

#### DiscussionThread

```typescript
interface IDiscussionThread extends Document {
  courseId: ObjectId;
  moduleId: ObjectId | null;        // Optional — scope to module
  lessonId: ObjectId | null;        // Optional — scope to lesson
  authorId: ObjectId;
  authorType: 'learner' | 'staff' | 'admin';
  title: string;
  body: string;                     // Markdown/rich text
  isPinned: boolean;
  isLocked: boolean;                // No new replies allowed
  replyCount: number;
  lastReplyAt: Date | null;
  lastReplyBy: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;          // Soft delete
}
```

#### DiscussionReply

```typescript
interface IDiscussionReply extends Document {
  threadId: ObjectId;
  parentReplyId: ObjectId | null;   // For nested replies
  authorId: ObjectId;
  authorType: 'learner' | 'staff' | 'admin';
  body: string;
  isInstructorAnswer: boolean;      // Marked by staff
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/courses/:courseId/discussions` | List threads (paginated, filterable by module/lesson) |
| POST | `/api/v2/courses/:courseId/discussions` | Create thread |
| GET | `/api/v2/discussions/:threadId` | Get thread with replies |
| PUT | `/api/v2/discussions/:threadId` | Edit thread (author or mod) |
| DELETE | `/api/v2/discussions/:threadId` | Soft delete (mod only) |
| PUT | `/api/v2/discussions/:threadId/pin` | Pin/unpin (mod) |
| PUT | `/api/v2/discussions/:threadId/lock` | Lock/unlock (mod) |
| POST | `/api/v2/discussions/:threadId/replies` | Post reply |
| PUT | `/api/v2/replies/:replyId` | Edit reply (author) |
| DELETE | `/api/v2/replies/:replyId` | Soft delete (author or mod) |
| PUT | `/api/v2/replies/:replyId/mark-answer` | Mark as instructor answer (staff only) |
| GET | `/api/v2/courses/:courseId/discussions/search?q=` | Search threads in course |

### Query Parameters (Thread Listing)

- `moduleId` — filter by module
- `lessonId` — filter by lesson
- `sort` — `recent | popular | unanswered`
- `page`, `limit` — pagination

---

## Tests Required

1. [ ] Create thread in course
2. [ ] Only enrolled learners can access course forums
3. [ ] Reply to thread (including nested replies)
4. [ ] Pin/unpin thread (staff only)
5. [ ] Lock thread prevents new replies
6. [ ] Mark reply as instructor answer (staff only)
7. [ ] Soft delete thread/reply
8. [ ] Search returns relevant threads
9. [ ] Pagination works correctly
10. [ ] Filter by module/lesson

---

## Acceptance Criteria

- [ ] Full CRUD for threads and replies
- [ ] Moderation features functional
- [ ] Access control enforced (enrollment check)
- [ ] Search and filtering work
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
