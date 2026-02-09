# UI → API: API Requirements for Learner Experience Issues

**Date:** 2026-02-08
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** API Requirements Request — Multiple Features
**Related Issues:** UI-ISS-096, UI-ISS-097, UI-ISS-100, UI-ISS-101, UI-ISS-102, UI-ISS-104

---

## Summary

The UI team has completed the three critical learner experience gaps (UI-ISS-094, 095, 096) and is now planning the next wave of features. Several of these require new API endpoints or model changes. This message outlines all upcoming API needs, grouped by priority.

We've created corresponding API issues (API-ISS-025 through API-ISS-030) in the queue for your planning. Please review and let us know about feasibility, timeline, and any design feedback.

---

## 1. Exercise Retry Settings — `maxAttempts` & `gradingPolicy` (API-ISS-025)

**Related UI Issue:** UI-ISS-096 (COMPLETED — UI-side retry flow is built)
**Priority:** High — UI is built but needs API to enforce

**What we need:**
- Confirm `maxAttempts` field on the Exercise/Assessment model (we see it in contracts but need to verify it's fully enforced server-side)
- Add `gradingPolicy` field: `'best' | 'last' | 'average'` — determines which attempt score counts as the final grade
- API should enforce max attempts on `POST /api/v2/exam-attempts` (reject if limit reached)
- API should return `attemptNumber` and `maxAttempts` in exam attempt responses
- Endpoint to get attempt history: `GET /api/v2/exercises/:exerciseId/attempts?learnerId=:id`

---

## 2. Certificate PDF Generation (API-ISS-026)

**Related UI Issue:** UI-ISS-097
**Priority:** High — Certificate pages exist with placeholder downloads
**Depends on:** API-ISS-017, API-ISS-018 (both COMPLETED)

**What we need:**
- Endpoint to generate or retrieve a certificate PDF: `GET /api/v2/certificates/:issuanceId/pdf`
- Returns a PDF file or a pre-signed URL to a stored PDF
- PDF should include: learner name, course/program name, completion date, grade, verification code, signatory info
- Either server-side PDF generation (preferred) or return data for client-side rendering

---

## 3. Learner Exception/Override System (API-ISS-027)

**Related UI Issue:** UI-ISS-100
**Priority:** Medium — Next phase feature

**What we need:**
Staff/admin ability to grant per-learner exceptions:

| Exception Type | Endpoint | Description |
|---|---|---|
| Extra attempts | `POST /api/v2/enrollments/:id/exceptions/attempts` | Override maxAttempts for a specific learner on a specific exercise |
| Extended access | `POST /api/v2/enrollments/:id/exceptions/access` | Extend enrollment validity/expiry date |
| Module unlock | `POST /api/v2/enrollments/:id/exceptions/module-unlock` | Manually unlock a locked module |
| Grade override | `POST /api/v2/enrollments/:id/exceptions/grade` | Manually set a grade on an assessment |
| Excuse content | `POST /api/v2/enrollments/:id/exceptions/excuse` | Mark content as not required for this learner |

**Also needed:**
- `GET /api/v2/enrollments/:id/exceptions` — list all exceptions for an enrollment
- All exceptions must be logged with: reason, grantedBy, timestamp
- Permission: `enrollment:exceptions:manage` or similar

---

## 4. Discussion Forum Endpoints (API-ISS-028)

**Related UI Issue:** UI-ISS-100
**Priority:** Medium — Next phase feature

**What we need:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v2/courses/:courseId/discussions` | List discussion threads for a course |
| POST | `/api/v2/courses/:courseId/discussions` | Create a new thread |
| GET | `/api/v2/discussions/:threadId` | Get thread with replies |
| POST | `/api/v2/discussions/:threadId/replies` | Post a reply |
| PUT | `/api/v2/discussions/:threadId` | Edit thread (author or mod) |
| DELETE | `/api/v2/discussions/:threadId` | Delete thread (mod only) |
| PUT | `/api/v2/discussions/:threadId/pin` | Pin/unpin thread (mod) |
| PUT | `/api/v2/discussions/:threadId/lock` | Lock/unlock thread (mod) |
| PUT | `/api/v2/replies/:replyId/mark-answer` | Mark as instructor answer |

**Thread model:**
```json
{
  "id": "string",
  "courseId": "string",
  "moduleId": "string | null",
  "lessonId": "string | null",
  "authorId": "string",
  "title": "string",
  "body": "string (rich text/markdown)",
  "isPinned": false,
  "isLocked": false,
  "replyCount": 0,
  "lastReplyAt": "datetime | null",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

---

## 5. Assignment Submission System (API-ISS-029)

**Related UI Issue:** UI-ISS-101
**Priority:** Medium — Next phase feature
**Depends on:** API-ISS-012 (Media Upload — for file attachments)

**What we need:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v2/assignments/:assignmentId` | Get assignment details (instructions, type, settings) |
| POST | `/api/v2/assignments/:assignmentId/submissions` | Submit assignment (text and/or file) |
| GET | `/api/v2/assignments/:assignmentId/submissions` | List learner's submissions |
| PUT | `/api/v2/submissions/:submissionId` | Update draft submission |
| GET | `/api/v2/submissions/:submissionId` | Get submission with feedback |
| POST | `/api/v2/submissions/:submissionId/grade` | Staff grades submission |

**Assignment model:**
```json
{
  "id": "string",
  "courseId": "string",
  "moduleId": "string",
  "title": "string",
  "instructions": "string (rich text)",
  "submissionType": "text | file | text_and_file",
  "allowedFileTypes": ["pdf", "docx", "jpg", "png"],
  "maxFileSize": 10485760,
  "maxResubmissions": 1,
  "dueDate": "datetime | null"
}
```

**Submission model:**
```json
{
  "id": "string",
  "assignmentId": "string",
  "learnerId": "string",
  "status": "draft | submitted | graded | returned",
  "textContent": "string | null",
  "fileUrl": "string | null",
  "fileName": "string | null",
  "submittedAt": "datetime | null",
  "grade": "number | null",
  "feedback": "string | null",
  "gradedBy": "string | null",
  "gradedAt": "datetime | null"
}
```

---

## 6. Learner Program Enrollment & Progress (API-ISS-030)

**Related UI Issue:** UI-ISS-102
**Priority:** Medium — Next phase feature

**What we need:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v2/programs` | List available programs (learner catalog) |
| GET | `/api/v2/programs/:programId` | Program detail with course sequence |
| POST | `/api/v2/programs/:programId/enroll` | Learner enrolls in program |
| GET | `/api/v2/learners/:learnerId/program-enrollments` | List learner's program enrollments |
| GET | `/api/v2/program-enrollments/:enrollmentId/progress` | Program progress (per-course completion) |

**Program enrollment model:**
```json
{
  "id": "string",
  "programId": "string",
  "learnerId": "string",
  "status": "active | completed | withdrawn",
  "enrolledAt": "datetime",
  "completedAt": "datetime | null",
  "courseProgress": [
    {
      "courseId": "string",
      "courseName": "string",
      "order": 1,
      "status": "not_started | in_progress | completed | locked",
      "completedAt": "datetime | null",
      "prerequisiteMet": true
    }
  ]
}
```

**Key questions:**
- Does enrolling in a program auto-enroll the learner in all component courses, or just the first/unlocked ones?
- Are program courses strictly sequential, or can they have branching prerequisites?
- Some admin program endpoints already exist (`PUT /api/v2/programs/:id/certificate`, `GET /api/v2/programs/:id/analytics`) — can learner-facing endpoints share the same model?

---

## Not Requiring New API Work

| UI Issue | Reason |
|---|---|
| UI-ISS-094 (Multi-lesson modules) | ✅ Completed — uses existing course content API |
| UI-ISS-095 (Course completion) | ✅ Completed — uses existing enrollment completion API |
| UI-ISS-098 (Dates exploration) | Placeholder only — no API work yet |
| UI-ISS-104 (Audio content) | Likely works with existing content type system — **please confirm** that content items can have type `audio` and serve audio file URLs |

---

## Requested Response

1. Feasibility check on each API issue
2. Any design concerns or alternative approaches
3. Rough priority/timeline from API team's perspective
4. Confirmation on audio content type support (UI-ISS-104)

Thanks!

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-08

All 6 issues reviewed — all feasible. Audio content type confirmed as trivial addition. See response:
`api-to-ui/2026-02-08_learner-experience-features-response.md`
