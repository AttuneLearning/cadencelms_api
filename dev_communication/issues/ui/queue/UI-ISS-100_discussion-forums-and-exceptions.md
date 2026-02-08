# UI-ISS-100: Discussion Forums & Exceptions

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-099, UI-ISS-096
## Category: Next Phase — After Critical Gaps

---

## Overview

**Next-phase feature — implement after critical gaps (UI-ISS-094, 095, 096) are resolved.**

Implement discussion forums for courses and a system for granting learner exceptions. Forums allow learners to discuss course content, ask questions, and interact with peers and instructors. Exceptions allow staff/admins to grant individual learner overrides to standard course rules.

### Discussion Forums
Forums are a common LMS feature for collaborative learning and peer interaction within courses.

### Exceptions System
Staff and admins need the ability to grant exceptions to individual learners, including:
- **Extra exam/quiz attempts** — override the maxAttempts setting for a specific learner (ties to UI-ISS-096)
- **Extended access** — extend enrollment validity/expiry for a learner
- **Module unlock** — manually unlock a locked module for a learner who hasn't met prerequisites
- **Grade override** — manually adjust a learner's grade on an assessment
- **Excused content** — mark a lesson or assessment as excused/not required for a specific learner
- **Exception log** — all exceptions are logged with reason, granted by, and timestamp for audit purposes

---

## Conceptual Requirements

### Discussion Forums
1. **Course-level forums**: Each course has a discussion forum
2. **Module/lesson-level threads**: Optional discussion threads tied to specific lessons
3. **Thread creation**: Learners and staff can create discussion threads
4. **Replies**: Nested replies with threading
5. **Moderation**: Staff can pin, lock, delete, or hide threads
6. **Search**: Search within course forum
7. **Notifications**: New replies notify thread participants (integrates with UI-ISS-099/103)
8. **Rich text**: Basic rich text in posts (bold, italic, links, code blocks)
9. **Instructor answers**: Staff replies can be marked as "instructor answer"

### Exceptions System
10. **Grant extra attempts**: Staff can give a specific learner additional quiz/exam attempts beyond maxAttempts
11. **Extend enrollment access**: Staff can extend a learner's enrollment validity period
12. **Manual module unlock**: Staff can unlock a module for a learner regardless of prerequisite status
13. **Grade override**: Staff can manually set or adjust a learner's assessment score
14. **Excuse content**: Staff can mark content as not required for a specific learner
15. **Exception UI on staff side**: Accessible from learner enrollment detail or class roster
16. **Exception visibility for learner**: Learner sees updated limits (e.g., "Attempt 2 of 5" after exception granted)
17. **Audit trail**: All exceptions logged with reason, who granted, and when

---

## Dependencies

- API forum/discussion endpoints (to be specified)
- API exception/override endpoints (to be specified)
- UI-ISS-096 (exercise retry) — exceptions extend the retry system
- UI-ISS-099 (messaging system) — notifications for forum activity
- Course player integration (optional: discussion tab within player)

---

## Acceptance Criteria

- [ ] Design document produced
- [ ] API requirements communicated
- [ ] Implementation issues created when prioritized

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
