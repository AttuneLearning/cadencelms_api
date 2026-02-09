# Learner Endpoint Audit — 6 Issues Filed (API-ISS-037 to API-ISS-042)

**Date:** 2026-02-09
**From:** UI Team
**To:** API Team
**Priority:** Critical (037), High (038-042)
**Related Issues:** API-ISS-037, API-ISS-038, API-ISS-039, API-ISS-040, API-ISS-041, API-ISS-042

---

## Summary

During manual UAT testing of the learner experience, we audited every link on the Learner Dashboard and sidebar. **None of the learner-specific pages work correctly.** We've filed 6 API issues:

### Critical — Data Leak

| Issue | Endpoint | Problem |
|-------|----------|---------|
| **API-ISS-037** | `GET /enrollments` | `_userId` param unused — returns ALL enrollments for ALL users. Also missing `type: 'course'` support and `course` filter. |

### High — Missing Endpoints

| Issue | Endpoint | Problem |
|-------|----------|---------|
| **API-ISS-038** | `GET /enrollments/my/programs` | Route does not exist — 404 |
| **API-ISS-039** | `GET /messages` (all 7 endpoints) | No message routes exist at all — entire inbox feature non-functional |

### High — Authorization Bypass

| Issue | Endpoint | Problem |
|-------|----------|---------|
| **API-ISS-040** | `GET /learners/:id/certificates` | Accepts any learnerId — no ownership check |
| **API-ISS-041** | `GET /learning-events/learner/:id` | Accepts any learnerId — no ownership check |
| **API-ISS-042** | `GET /progress/learner/:id` | Accepts any learnerId — no ownership check |

### Common Pattern (ISS-040, 041, 042)

All three endpoints follow the same pattern: `GET /.../learner/:learnerId`. The UI correctly passes the authenticated user's ID, but the API doesn't verify ownership. A malicious user could change the URL parameter to access another user's data.

**Recommended fix**: Add middleware that, for learner-role users, asserts `:learnerId === req.user.userId`. Staff/admin with appropriate permissions should bypass.

## Impact on UI

| Learner Page | API Issue | Status |
|-------------|-----------|--------|
| Dashboard | ISS-037, ISS-042 | Shows all users' data |
| My Courses | ISS-037 | Shows all enrollments |
| My Programs | ISS-038 | 404 error |
| My Learning | ISS-037, ISS-041 | Shows all users' data |
| My Progress | ISS-037 | Shows all users' data |
| Inbox | ISS-039 | 404 error |
| Certificates | ISS-040 | Works but insecure |
| Course Player | ISS-037 | Can't verify enrollment |

## Priority Recommendation

1. **ISS-037 first** — fixes 5 pages at once (My Courses, Dashboard, Progress, Learning, Player)
2. **ISS-039 second** — unblocks Inbox
3. **ISS-038 third** — unblocks My Programs
4. **ISS-040/041/042** — security fixes, can be batched with a shared middleware

---

## Response Section (For Recipient)

**Status:** Pending
**Response Date:**

---

*Move to `archive/` when thread is complete*
