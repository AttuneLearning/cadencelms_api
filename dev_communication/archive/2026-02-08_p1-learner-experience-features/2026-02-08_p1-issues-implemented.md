# API → UI: P1 Issues Implemented — Audio, Exercise Retry, Program Progress

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Implementation Complete
**Related Issues:** UI-ISS-104, API-ISS-025, API-ISS-030, UI-ISS-105, UI-ISS-106

---

## Summary

All three P1 items from the learner experience feature request are now implemented, tested, and passing TypeScript/unit tests. Here are the exact API contracts for your integration work.

---

## 1. Audio Content Type (UI-ISS-104) — COMPLETE

**Change:** `'audio'` added to `ContentType` enum.

The existing content CRUD endpoints support audio content with no changes. Content items with `type: 'audio'` use the same `fileUrl`, `mimeType`, and `duration` fields as video.

**No new endpoints.** Existing endpoints work:
- `POST /api/v2/content` with `{ type: 'audio', fileUrl: '...', mimeType: 'audio/mpeg', duration: 1800 }`
- `GET /api/v2/content/:id` returns audio content like any other type

---

## 2. Exercise Retry Settings (API-ISS-025) — COMPLETE

### Model Changes

**Exercise model** — new fields:
```typescript
{
  maxAttempts?: number | null,     // null/undefined = unlimited, min 1
  gradingPolicy?: 'best' | 'last' | 'average'  // default: 'best'
}
```

**Assessment model** — `attempts` subdocument now includes:
```typescript
{
  maxAttempts: number | null,
  cooldownMinutes?: number,
  retakePolicy: 'anytime' | 'after_cooldown' | 'instructor_unlock',
  gradingPolicy?: 'best' | 'last' | 'average'  // NEW — default: 'best'
}
```

### Endpoint Changes

**`POST /api/v2/exam-attempts`** — Now enforces `maxAttempts`:
- Counts completed/graded/submitted attempts for the learner+exercise
- Returns `409 Conflict` with message `"Maximum attempts reached"` if limit hit
- Response now includes `maxAttempts` and `gradingPolicy` fields

**`GET /api/v2/content/exercises/:id/attempts`** — NEW endpoint:
- Lists all attempts for a specific exercise
- Supports query params: `page`, `limit`, `status`, `sort`
- Uses same response format as `GET /api/v2/exam-attempts`
- Auth: requires `isAuthenticated` (learners see own, staff see all)

### Response Enhancement (createAttempt)

```json
{
  "id": "...",
  "examId": "...",
  "examTitle": "...",
  "attemptNumber": 2,
  "maxAttempts": 3,
  "gradingPolicy": "best",
  "status": "started",
  "score": 0,
  "maxScore": 100,
  "timeLimit": 3600,
  "remainingTime": 3600,
  "questions": [...],
  "allowReview": true,
  "startedAt": "2026-02-08T10:00:00Z"
}
```

### Grade Calculation

New service method `ExamAttemptsService.calculateOfficialGrade(examId, learnerId, policy)` calculates the official grade based on policy:
- `'best'` — highest percentage across all graded attempts
- `'last'` — most recently graded attempt
- `'average'` — mean of all graded attempts

---

## 3. Program Enrollment Progress (API-ISS-030) — COMPLETE

### New Endpoint

**`GET /api/v2/enrollments/:enrollmentId/progress`**

Returns per-course progress within a program enrollment.

**Auth:** `enrollment:department:read` OR `enrollment:own:read`

### Response Shape

```json
{
  "enrollmentId": "abc123",
  "programId": "prog_456",
  "programName": "CBT Fundamentals",
  "programCode": "CBT-101",
  "learnerId": "learner_789",
  "status": "active",
  "enrolledAt": "2026-01-01T00:00:00Z",
  "progress": {
    "percentage": 33,
    "completedCourses": 1,
    "inProgressCourses": 1,
    "notStartedCourses": 1,
    "totalCourses": 3
  },
  "courses": [
    {
      "courseId": "course_1",
      "title": "Introduction to CBT",
      "code": "CBT-INTRO",
      "status": "completed",
      "enrollmentId": "ce_001",
      "enrolledAt": "2026-01-01T00:00:00Z",
      "completedAt": "2026-01-15T12:00:00Z"
    },
    {
      "courseId": "course_2",
      "title": "CBT Techniques",
      "code": "CBT-TECH",
      "status": "in_progress",
      "enrollmentId": "ce_002",
      "enrolledAt": "2026-01-16T00:00:00Z",
      "completedAt": null
    },
    {
      "courseId": "course_3",
      "title": "Advanced CBT",
      "code": "CBT-ADV",
      "status": "not_started",
      "enrollmentId": null,
      "enrolledAt": null,
      "completedAt": null
    }
  ]
}
```

### Course Status Values

| Status | Meaning |
|--------|---------|
| `not_started` | No enrollment exists for this course |
| `in_progress` | Active/pending/suspended enrollment exists |
| `completed` | Enrollment status is completed/graduated |

### How Progress Works

- Finds all published courses in the program's department
- Cross-references with the learner's course enrollments (stored as Enrollment docs with `metadata.enrollmentType: 'course'`)
- Calculates percentage as `completedCourses / totalCourses * 100` (rounded)

### Event Bus

Added `PROGRAM_COMPLETED` event constant (`'program.completed'`). Not yet emitted automatically — this will be wired when `COURSE_COMPLETED` events are implemented. Available for manual triggering if needed.

---

## What's NOT Included (Deferred)

Per the P1 scope, these are deferred to P2/P3:
- Auto-enrollment in courses when enrolling in program (P2)
- Course prerequisite/sequencing enforcement within programs (P2)
- Program completion auto-detection (needs `COURSE_COMPLETED` event wiring)
- Certificate auto-issuance on program completion (depends on above)

---

## Your UI Issues

These API changes directly support:
- **UI-ISS-105** (Exercise Retry P1 Alignment) — all API pieces ready
- **UI-ISS-106** (Program Enrollment P1 Alignment) — progress endpoint ready

Note on UI-ISS-106: The progress endpoint is at `GET /api/v2/enrollments/:enrollmentId/progress` (not `/api/v2/program-enrollments/...`). All enrollment endpoints use the unified `/api/v2/enrollments/` base path.

---

## Test Verification

All tests passing:
- `tests/unit/models/Content.test.ts` — 26 tests (including audio)
- `tests/unit/models/Exercise.model.test.ts` — 10 tests (maxAttempts, gradingPolicy)
- `tests/unit/models/Assessment.model.test.ts` — 59 tests (including gradingPolicy)
- `tests/unit/services/exam-attempts.service.test.ts` — 8 tests (maxAttempts enforcement, calculateOfficialGrade)
- `tests/unit/services/programProgress.service.test.ts` — 6 tests (progress calculation, access control)
- TypeScript: 0 errors

---

*Respond to: `ui-to-api/` or update UI-ISS-105/106 directly*
