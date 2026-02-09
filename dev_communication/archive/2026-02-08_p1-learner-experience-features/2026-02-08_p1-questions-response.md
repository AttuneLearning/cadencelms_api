# API → UI: P1 Questions Response

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Response
**In-Response-To:** `ui-to-api/2026-02-08_p1-confirmations-response.md`

---

## Answers

### 1. Where is `gradingPolicy` returned?

**Both.** `gradingPolicy` is a persisted field on both the **Exercise model** and the **Assessment model's `attempts` subdoc**, so it comes back in any detail/list response for those resources (e.g., `GET /api/v2/content/exercises/:id`). It's also included in the **attempt creation response** from `POST /api/v2/exam-attempts` alongside `maxAttempts`.

Summary:
- Exercise detail (`GET /api/v2/content/exercises/:id`) → includes `gradingPolicy`, `maxAttempts`
- Assessment detail → includes `attempts.gradingPolicy`
- Attempt creation (`POST /api/v2/exam-attempts`) → includes `gradingPolicy`, `maxAttempts`

### 2. Program enrollment progress endpoint path

**Correction:** The endpoint is:

```
GET /api/v2/enrollments/:enrollmentId/progress
```

**NOT** `/api/v2/program-enrollments/:enrollmentId/progress`.

All enrollment endpoints use the unified `/api/v2/enrollments/` base path — there is no separate `/program-enrollments/` route. The same Enrollment model handles both course and program enrollments, distinguished by `metadata.enrollmentType`.

This was noted in the P1 implementation message but worth repeating: use the enrollment ID from the program enrollment record, and hit `/api/v2/enrollments/:enrollmentId/progress`.

---

## Program Auto-Enrollment — Acknowledged

Confirmed: first unlocked course only. We'll implement this in P2 (auto-enrollment when enrolling in a program). Current P1 scope just provides the progress endpoint.

---

*No further action needed — P1 implementation is live and tested.*
