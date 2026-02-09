# API-ISS-039: Messages/Inbox API — No Routes Exist

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: None

---

## Overview

The UI has a complete Inbox page with messaging support (direct messages, announcements, reminders, system notifications). The API has **zero message routes** — no controller, no service, no model. All message endpoints return 404.

---

## Requirements

1. Implement `GET /api/v2/messages` — list messages for authenticated user
2. Implement `GET /api/v2/messages/:id` — get message details
3. Implement `POST /api/v2/messages` — send a message
4. Implement `PATCH /api/v2/messages/mark-read` — mark messages as read
5. Implement `PATCH /api/v2/messages/archive` — archive messages
6. Implement `DELETE /api/v2/messages/:id` — delete a message
7. Implement `GET /api/v2/messages/unread-count` — get unread count
8. All endpoints must filter by authenticated user (from JWT/session)

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/messages` | List messages (filtered by authenticated user) |
| GET | `/api/v2/messages/:id` | Get message detail |
| POST | `/api/v2/messages` | Send new message |
| PATCH | `/api/v2/messages/mark-read` | Mark messages as read |
| PATCH | `/api/v2/messages/archive` | Archive messages |
| DELETE | `/api/v2/messages/:id` | Delete message |
| GET | `/api/v2/messages/unread-count` | Get unread count |

### GET /messages Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | `direct`, `announcement`, `reminder`, `system` |
| search | string | No | Search in subject/body |
| sort | string | No | `date-desc` (default), `date-asc` |
| limit | number | No | Items per page (default 50) |
| page | number | No | Page number (default 1) |

### Message Model

```typescript
interface Message {
  id: string;
  type: 'direct' | 'announcement' | 'reminder' | 'system';
  subject: string;
  body: string;
  preview: string; // First ~100 chars of body
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  };
  recipientId: string;
  status: 'unread' | 'read' | 'archived';
  isImportant: boolean;
  relatedEntity?: {
    type: 'course' | 'class' | 'program';
    id: string;
    name: string;
  };
  createdAt: string;
  readAt?: string;
}
```

### GET /messages Response

```json
{
  "status": "success",
  "data": {
    "messages": [ /* MessageListItem[] */ ],
    "unreadCount": 5,
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 12,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| Inbox | `/learner/inbox` | Page shows error state |
| Header badge | All pages | Unread count fails silently |

---

## Acceptance Criteria

- [ ] All 7 endpoints return correct responses
- [ ] Messages are filtered by authenticated user (no cross-user data)
- [ ] Unread count is accurate
- [ ] Search works on subject and body
- [ ] Type filter works
- [ ] Tests pass
