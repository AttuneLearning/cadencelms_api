# API-ISS-040: GET /learners/:id/certificates — Must Verify Authenticated User

## Status: PENDING
## Priority: High
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: UI Team
## Assigned To: Unassigned
## Related: None

---

## Overview

`GET /api/v2/learners/:learnerId/certificates` exists and works, but it accepts any `learnerId` without verifying it matches the authenticated user. A learner could fetch another learner's certificates by changing the URL parameter. This is a **data leak / authorization bypass**.

The UI passes `user._id` from the auth store, so it works correctly from the client side — but the API should enforce that learners can only access their own certificates.

---

## Requirements

1. When the authenticated user has role `learner`, verify that `:learnerId` matches their own user ID
2. Return 403 if a learner attempts to access another learner's certificates
3. Staff/admin users with `learner:pii:read` permission should continue to access any learner's certificates
4. Alternatively, support `GET /api/v2/learners/me/certificates` as a convenience endpoint that auto-resolves to the authenticated user

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/learners/:learnerId/certificates` | Get learner's certificates |

### Current Behavior (Insecure)

- Accepts any `learnerId` in URL
- Only checks `learner:pii:read` permission
- Does NOT verify the authenticated user owns the data

### Expected Behavior

- Learners: `learnerId` must equal `req.user.userId`, or return 403
- Staff/Admin: `learner:pii:read` permission allows access to any learner

---

## Impact

| UI Page | Route | Effect |
|---------|-------|--------|
| My Certificates | `/learner/certificates` | Works but insecure — any user's certs accessible |
| Dashboard | `/learner/dashboard` | Certificate count stat may be wrong |

---

## Acceptance Criteria

- [ ] Learners can only fetch their own certificates
- [ ] Attempting to fetch another learner's certificates returns 403
- [ ] Staff/admin with correct permissions can still access any learner's certificates
- [ ] Tests pass
