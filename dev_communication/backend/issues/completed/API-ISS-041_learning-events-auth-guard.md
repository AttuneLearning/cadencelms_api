# API-ISS-041: GET /learning-events/learner/:learnerId — Must Verify Authenticated User

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-040

---

## Overview

`GET /api/v2/learning-events/learner/:learnerId` returns learning activity events for a specific learner. Like the certificates endpoint, it accepts any `learnerId` without verifying it matches the authenticated user. A learner could view another learner's activity history.

Used by the "My Learning" page which passes the authenticated user's ID from the auth store.

---

## Requirements

1. When the authenticated user is a learner, verify `:learnerId` matches their own user ID
2. Return 403 if a learner attempts to access another learner's activity
3. Staff/admin with appropriate permissions should continue to access any learner's activity

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/learning-events/learner/:learnerId` | Get learner's activity events |

### Current Behavior

- Accepts any `learnerId`
- No ownership verification for learner role

### Expected Behavior

- Learners: `learnerId` must equal `req.user.userId`, or return 403
- Staff/Admin: appropriate permission allows access to any learner

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| My Learning | `/learner/learning` | Works but insecure |

---

## Acceptance Criteria

- [ ] Learners can only access their own learning events
- [ ] 403 returned when accessing another learner's events
- [ ] Staff/admin access preserved
- [ ] Tests pass
