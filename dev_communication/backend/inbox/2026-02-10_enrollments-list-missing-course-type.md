# Bug Report: GET /enrollments Not Returning Course-Type Enrollments

**Date:** 2026-02-10
**From:** UI Team
**To:** API Team
**Priority:** Critical
**Related Issues:** None yet — please triage and create an API issue

---

## Bug Report

`GET /api/v2/enrollments` does not return course-type enrollments. Only program enrollments are included in the response. This completely breaks the **My Courses** learner page.

## Evidence

Logged in as Casey Learner (`casey.learner@lms.edu`) who has **4 course enrollments** (EMDR101, EMDR201, CBT101, COG101) seeded via `ensureCourseEnrollment()`.

### Request
```
GET /api/v2/enrollments?limit=50
Authorization: Bearer <casey_token>
```

### Response
```json
{
  "data": {
    "enrollments": [
      {
        "id": "...",
        "type": "program",
        "target": { "name": "EMDR Continuing Education", "code": "EMDR-CE", "type": "program" },
        "status": "active"
      }
    ],
    "pagination": { "total": 13, "page": 1, "limit": 50 }
  }
}
```

**Expected:** 5 enrollments (1 program + 4 courses)
**Actual:** 1 enrollment (program only)
**Note:** `pagination.total` is 13 (the raw document count) but only 1 record is actually returned

## Root Cause Analysis

Looking at the seed script, course enrollments are stored with:
```typescript
Enrollment.create({
  learnerId: ...,
  metadata: {
    courseId: ...,
    enrollmentType: 'course'
  }
});
```

The enrollment list service appears to only query program-type enrollments when building the response. Course enrollments exist in the database but are never fetched and transformed into the response format.

## Three Issues Found

| # | Bug | Impact |
|---|-----|--------|
| 1 | Course enrollments are never queried in the list service | **My Courses page shows 0 courses** |
| 2 | `type` query parameter is accepted per contract but never applied as a filter | Cannot filter by enrollment type server-side |
| 3 | `pagination.total` (13) doesn't match returned records (1) | Misleading pagination; UI shows wrong count |

## What We Need

1. `GET /enrollments` must return course-type enrollments with `type: 'course'` in the response
2. `type` query param should filter results (per the existing contract)
3. `pagination.total` should reflect the actual filtered count, not the raw document count
4. Each course enrollment should include the standard response shape:
   ```json
   {
     "id": "...",
     "type": "course",
     "target": { "id": "<courseId>", "name": "EMDR Introduction", "code": "EMDR101", "type": "course" },
     "status": "active",
     "progress": { "percentage": 0, "completedItems": 0, "totalItems": 10 },
     "grade": { "score": null, "letter": null, "passed": null },
     ...
   }
   ```

## Impact

- **My Courses page** (`/learner/courses`) — shows 0 courses for all learners
- **Course Player** — enrollment lookup fails, can't track progress
- This is the primary learner-facing page; it's completely non-functional

## Timeline

- **Needed by:** ASAP — this is the #1 blocker for learner experience
- **Blocking:** My Courses page, Course Player enrollment checks, progress tracking

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:**

---

*Move to `archive/` when thread is complete*
