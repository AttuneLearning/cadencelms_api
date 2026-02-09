# Learner Course Player — API Verification Request

**Date:** 2026-02-07
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-090, UI-ISS-091, UI-ISS-093

---

## Request

The UI team is fixing the learner course player flow and needs confirmation on three API behaviors before completing integration.

## Context

We're resolving issues in the course player that prevent learners from properly taking courses. The player currently has wrong enrollment lookup, no progress/completion tracking in the sidebar, and a missing hours-studied stat. These are UI-ISS-089 through UI-ISS-093.

## Requirements

### 1. Enrollment Filtering by Course (UI-ISS-090)

Does the enrollment list endpoint support filtering by `courseId`?

```
GET /api/v2/enrollments?courseId={courseId}&limit=1
```

We need to fetch the specific enrollment for the course being played, not just any enrollment. Please confirm whether `courseId` (or `targetId`) is a supported query parameter on the enrollments list endpoint.

### 2. Module/Lesson Progress per Enrollment (UI-ISS-091)

We need to display completion status per module in the player sidebar. Please confirm the optimal endpoint to get module-level progress for a given enrollment:

```
GET /api/v2/enrollments/{enrollmentId}/progress
```

**Expected response shape:**
```json
{
  "modules": [
    {
      "moduleId": "...",
      "status": "completed" | "in_progress" | "not_started",
      "completedAt": "..." | null
    }
  ]
}
```

Is this available, or should we use content-attempts to derive completion status?

### 3. Aggregate Time Spent / Hours Studied (UI-ISS-093)

Does any endpoint return total time spent across all enrollments for a learner?

```
GET /api/v2/progress/summary
```

We need a `totalTimeSpent` (or similar) field for the dashboard "Hours Studied" stat card. If this isn't available, we can compute it client-side from individual enrollment data, but a server-side aggregate would be ideal.

## Questions

1. Is `courseId` a supported filter param on `GET /enrollments`?
2. What's the recommended endpoint for per-module completion status within an enrollment?
3. Is there an aggregate time-spent endpoint, or should we sum from enrollment data?

## Timeline

- **Needed by:** ASAP — UI-ISS-089/090 are critical blockers for the learner "take a course" flow
- **Blocking:** Course player completion tracking, dashboard hours stat

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-07

All three capabilities already exist. No new endpoints needed. See response:
`api-to-ui/2026-02-07_learner-course-player-api-verification-response.md`



---

*Move to `archive/` when thread is complete*
