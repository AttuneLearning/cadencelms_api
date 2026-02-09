# Discussion Forum API Contracts

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Re:** API-ISS-028 Discussion Forum System

---

## Overview

Course-scoped discussion forums are now available. Threads can optionally scope to a module or lesson. Moderation features (pin, lock, mark instructor answer, soft delete) require `content:discussions:moderate`.

---

## Endpoints

### Course-Scoped (Thread Listing & Creation)

**Base:** `/api/v2/courses/:courseId/discussions`

#### `GET /` — List Threads
- **Permission:** `content:courses:read`
- **Query:** `page` (default 1), `limit` (default 20, max 100), `moduleId?`, `lessonId?`
- **Response:**
```json
{
  "status": "success",
  "data": {
    "threads": [
      {
        "_id": "string",
        "courseId": "string",
        "moduleId": "string | undefined",
        "lessonId": "string | undefined",
        "authorId": { "_id": "string", "firstName": "string", "lastName": "string", "email": "string" },
        "authorType": "learner | staff",
        "title": "string",
        "body": "string",
        "isPinned": "boolean",
        "isLocked": "boolean",
        "replyCount": "number",
        "lastReplyAt": "Date | null",
        "lastReplyBy": "string | null",
        "createdAt": "Date",
        "updatedAt": "Date"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
}
```
- **Sort:** Pinned first, then by lastReplyAt descending

#### `POST /` — Create Thread
- **Permission:** `content:courses:read`
- **Body:**
```json
{
  "title": "string (1-300, required)",
  "body": "string (1-10000, required)",
  "moduleId": "ObjectId (optional)",
  "lessonId": "ObjectId (optional)"
}
```
- **Response:** `201` with created thread

#### `GET /search` — Search Threads
- **Permission:** `content:courses:read`
- **Query:** `q` (1-200, required), `page`, `limit` (max 50)
- **Response:** Same shape as list, sorted by text relevance

---

### Thread Operations

**Base:** `/api/v2/discussions`

#### `GET /:threadId` — Get Thread
- **Permission:** `content:courses:read`

#### `PUT /:threadId` — Update Thread
- **Permission:** `content:courses:read` (author or moderator)
- **Body:** `{ "title"?: "string", "body"?: "string" }` (at least one required)

#### `DELETE /:threadId` — Delete Thread (soft)
- **Permission:** `content:courses:read` (author or moderator)

#### `PUT /:threadId/pin` — Pin/Unpin Thread
- **Permission:** `content:discussions:moderate`
- **Body:** `{ "isPinned": true }`

#### `PUT /:threadId/lock` — Lock/Unlock Thread
- **Permission:** `content:discussions:moderate`
- **Body:** `{ "isLocked": true }`

#### `GET /:threadId/replies` — List Replies
- **Permission:** `content:courses:read`
- **Query:** `page`, `limit`, `parentReplyId?`

#### `POST /:threadId/replies` — Create Reply
- **Permission:** `content:courses:read`
- **Body:** `{ "body": "string (1-10000)", "parentReplyId"?: "ObjectId" }`
- **Response:** `201`
- **Note:** Returns 403 if thread is locked

---

### Reply Operations

**Base:** `/api/v2/replies`

#### `PUT /:replyId` — Update Reply
- **Permission:** `content:courses:read` (author or moderator)
- **Body:** `{ "body": "string (1-10000)" }`

#### `DELETE /:replyId` — Delete Reply (soft)
- **Permission:** `content:courses:read` (author or moderator)

#### `PUT /:replyId/mark-answer` — Mark as Instructor Answer
- **Permission:** `content:discussions:moderate`
- **Body:** `{ "isInstructorAnswer": true }`

---

## Permissions Summary

| Permission | Who Has It | Used For |
|-----------|-----------|----------|
| `content:courses:read` | All enrolled learners + staff | Read, create, edit own, delete own |
| `content:discussions:moderate` | Staff with moderation role | Pin, lock, mark answer, edit/delete any |

## Notes

- `authorType` is derived server-side from `user.userTypes`
- Deleted threads/replies are soft-deleted (not returned in listings)
- `replyCount` is maintained via `$inc` — no need to count client-side
- Thread listing returns pinned threads first, then most recently active
- Search uses MongoDB `$text` index on title + body
