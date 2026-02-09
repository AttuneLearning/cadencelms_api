# API-ISS-042: GET /progress/learner/:learnerId — Must Verify Authenticated User

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: API-ISS-040, API-ISS-041

---

## Overview

`GET /api/v2/progress/learner/:learnerId` returns overall progress data for a specific learner. Same pattern as certificates and learning events — accepts any `learnerId` without verifying the authenticated user owns the data.

Used by the Learner Dashboard for "Hours Studied" stat and referenced by the Progress Dashboard page.

---

## Requirements

1. When the authenticated user is a learner, verify `:learnerId` matches their own user ID
2. Return 403 if a learner attempts to access another learner's progress
3. Staff/admin with `learner:grades:read` permission should continue to access any learner's progress

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/progress/learner/:learnerId` | Get learner's overall progress |

### Current Behavior

- Accepts any `learnerId`
- Only checks `learner:grades:read` or `grades:own:read` permission
- Does NOT verify ownership for `grades:own:read`

### Expected Behavior

- Learners with `grades:own:read`: `learnerId` must equal `req.user.userId`, or return 403
- Staff/Admin with `learner:grades:read`: access any learner

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| Dashboard | `/learner/dashboard` | Hours Studied stat insecure |
| Progress | `/learner/progress` | Uses enrollments (API-ISS-037) but references progress |

---

## Acceptance Criteria

- [ ] Learners can only access their own progress
- [ ] 403 returned when accessing another learner's progress
- [ ] Staff/admin access preserved
- [ ] Tests pass
