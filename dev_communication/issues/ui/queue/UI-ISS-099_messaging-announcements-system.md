# UI-ISS-099: Messaging, Announcements & Reminders System — Placeholder

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-098, UI-ISS-103
## Category: Placeholder — Future Design & Implementation

---

## Overview

**This is a placeholder issue for future design and implementation.**

Design and implement a unified messaging and announcement system with a single inbox for all communications. This covers:

1. **Learner ↔ Learner messaging** — direct messages between learners
2. **Learner ↔ Staff/Admin messaging** — questions, support, feedback
3. **Announcements** — system-wide or course-specific announcements from staff/admins
4. **Reminders** — automated reminders for upcoming events, expiring enrollments, incomplete courses
5. **One unified inbox** — all messages, announcements, reminders, and date-related notifications arrive in a single messaging inbox

---

## Conceptual Requirements

### Unified Inbox
- Single inbox page accessible from sidebar navigation
- All message types (direct messages, announcements, reminders, system notifications) in one stream
- Filter/tabs: All | Messages | Announcements | Reminders
- Unread count badge in sidebar and header
- Mark as read/unread, archive, delete

### Messaging
- Direct messages between learners (within same course/department)
- Messages to/from staff and admins
- Conversation threading
- Attachments support (optional, TBD)

### Announcements
- Staff/admins can post announcements to:
  - Entire department
  - Specific course enrollees
  - Specific program enrollees
  - All learners
- Announcements appear in learner inbox
- Pinned/important announcements
- Read receipts (optional, TBD)

### Reminders
- Automated reminders for:
  - Enrollment expiring soon (ties to UI-ISS-098)
  - Course not accessed in X days
  - Certificate expiring
  - Incomplete assessments
- Manual reminders from staff/admins
- All reminders flow into the unified inbox

### Date Information
- All date-related notifications (valid-until warnings, certificate expiry, etc.) appear in the inbox
- One place for learners to see all time-sensitive information

---

## Dependencies

- API messaging endpoints (to be specified)
- WebSocket or polling infrastructure for real-time messages
- UI-ISS-098 (dates/deadlines) feeds into reminders
- UI-ISS-103 (notifications) — notifications may evolve into this system or coexist

---

## Questions to Answer Before Implementation

1. Real-time (WebSocket) vs. polling for message delivery?
2. Message retention policy — how long are messages kept?
3. Privacy: can learners message any learner, or only within same course?
4. Moderation: are messages moderated by staff?
5. Email notifications for new messages?
6. How does this relate to the existing notification bell (UI-ISS-103)?

---

## Acceptance Criteria

- [ ] Design document produced with UX mockups
- [ ] API requirements communicated to API team
- [ ] Follow-up implementation issues created

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
