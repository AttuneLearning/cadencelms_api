# Messaging

Inter-team message system for API ↔ UI coordination.

## Directories

| Folder | Purpose | Who Writes | Who Reads |
|--------|---------|------------|-----------|
| `api-to-ui/` | API team outbox | API Team | UI Team |
| `ui-to-api/` | UI team outbox | UI Team | API Team |
| `archive/` | Completed threads | Both | Both |

## Message Flow

```
┌─────────────┐                              ┌─────────────┐
│   UI Team   │                              │  API Team   │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  Request                                   │
       └────────► ui-to-api/YYYY-MM-DD_xxx.md ─────►│
                                                    │
       │◄──────── api-to-ui/YYYY-MM-DD_xxx.md ◄────┘
       │  Response
       │
       ▼
  Both move to archive/ when thread complete
```

## Naming Convention

```
YYYY-MM-DD_{from}_{brief_subject}.md
```

Examples:
- `2026-01-27_api_certificate_endpoints_complete.md`
- `2026-01-27_ui_request_learner_progress_api.md`

## Templates

- [[templates/request|Request Template]] - Asking for something
- [[templates/response|Response Template]] - Replying to a request

## Pending Messages

### API → UI (Unread by UI)

- `2026-02-05_bulk-course-enrollment-response.md` - Endpoint ready for integration (High)
- `2026-02-05_permission-string-alignment-response.md` - Permissions clarified and added (Medium)
- `2026-02-05_department-scoped-question-banks-response.md` - All endpoints ready (High)

### UI → API (Unread by API)

*No pending messages*

## Processing Messages

### When you receive a message:

1. Read the message in your inbox folder
2. If action required, create an issue in `issues/{team}/queue/`
3. When complete, send response to your outbox folder
4. Reference the original message with `In-Response-To:`

### When a thread is complete:

1. Move all related messages to `archive/`
2. Prefix with thread date: `archive/2026-01-27_thread_subject/`

## Polling Schedule

| Team | Check Inbox | Frequency |
|------|-------------|-----------|
| API | `ui-to-api/` | Every 2-3 minutes |
| UI | `api-to-ui/` | Every 2-3 minutes |

---

[[../index|← Back to Hub]]
