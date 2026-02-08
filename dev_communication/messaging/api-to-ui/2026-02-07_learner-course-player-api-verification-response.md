# Learner Course Player — API Verification Response

**Date:** 2026-02-07
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** `ui-to-api/2026-02-07_learner-course-player-api-verification.md`

---

## Summary

All three requested capabilities **already exist** in the API. No new endpoints needed. Details below with exact usage.

---

## 1. Enrollment Filtering by Course — EXISTS

Two options are available:

### Option A: Query parameter (recommended for your use case)
```
GET /api/v2/enrollments?course={courseId}
```
- Note: the param name is `course`, not `courseId`
- Supports `&limit=1` for fetching a single match
- Access: `enrollment:department:read` OR `enrollment:own:read`
- Learners automatically see only their own enrollments (service-layer filtering)

### Option B: Dedicated course enrollments endpoint
```
GET /api/v2/enrollments/course/{courseId}
```
- Returns all enrollments for a course
- Access: `enrollment:department:read` (staff only)

**For the course player**, use **Option A** with the learner's own token — service layer will return only their enrollment:
```
GET /api/v2/enrollments?course={courseId}&limit=1
```

---

## 2. Module/Lesson Progress per Enrollment — EXISTS (use course progress endpoint)

There is no `/enrollments/:id/progress` endpoint, but the **course progress endpoint** provides exactly the module-by-module breakdown you need:

### Primary endpoint
```
GET /api/v2/progress/course/{courseId}
```
- Access: `grades:own:read` (learner's own) OR `reports:own-classes:read` (instructor)
- Returns module-level progress with completion status

### Response shape
```json
{
  "courseId": "...",
  "courseTitle": "...",
  "progress": {
    "completionPercent": 65,
    "modulesCompleted": 5,
    "modulesTotal": 8
  },
  "moduleProgress": [
    {
      "moduleId": "...",
      "moduleTitle": "...",
      "status": "completed" | "in_progress" | "not_started",
      "completionPercent": 100,
      "timeSpent": 1234,
      "score": 85,
      "lastAccessedAt": "..."
    }
  ]
}
```

### Alternative: Bulk module completion check
```
GET /api/v2/module-completions/check?moduleIds={id1},{id2},{id3}
```
- Access: `content:lessons:read`
- Quick boolean check of which modules the current user has completed
- Useful for sidebar completion indicators without full progress data

### Per-learner completions
```
GET /api/v2/learners/{learnerId}/module-completions
```
- Access: `content:lessons:read`
- Returns all global module completions for a learner
- Filterable by `moduleId`, `completedAfter`, `completedBefore`

---

## 3. Aggregate Time Spent / Hours Studied — EXISTS

### Primary endpoint (comprehensive learner overview)
```
GET /api/v2/progress/learner/{learnerId}
```
- Access: `grades:own:read` (own data) OR `learner:grades:read` (staff)
- Returns `summary.totalTimeSpent` (in seconds) across all enrollments

### Response includes
```json
{
  "learnerId": "...",
  "learnerName": "...",
  "summary": {
    "programsEnrolled": 2,
    "programsCompleted": 1,
    "coursesEnrolled": 5,
    "coursesCompleted": 3,
    "totalCreditsEarned": 12,
    "totalTimeSpent": 45600,        // ← seconds — divide by 3600 for hours
    "averageScore": 87,
    "currentStreak": 5,
    "longestStreak": 14,
    "lastActivityAt": "2026-02-07T...",
    "joinedAt": "2025-09-01T..."
  },
  "programProgress": [...],
  "courseProgress": [...],
  "recentActivity": [...],
  "achievements": [...]
}
```

For the **dashboard "Hours Studied" stat card**, use:
```typescript
const response = await api.get(`/api/v2/progress/learner/${learnerId}`);
const hoursStudied = Math.round(response.data.summary.totalTimeSpent / 3600);
```

---

## Recommended Integration Approach

For the course player flow:

1. **Get enrollment:** `GET /api/v2/enrollments?course={courseId}&limit=1`
2. **Get module progress for sidebar:** `GET /api/v2/progress/course/{courseId}`
3. **Quick completion check (optional):** `GET /api/v2/module-completions/check?moduleIds=...`

For the dashboard stats:

4. **Get hours studied + overview:** `GET /api/v2/progress/learner/{learnerId}`

---

## Access Rights Summary

| Endpoint | Learner Permission | Staff Permission |
|----------|-------------------|-----------------|
| `GET /enrollments?course=...` | `enrollment:own:read` | `enrollment:department:read` |
| `GET /progress/course/:id` | `grades:own:read` | `reports:own-classes:read` |
| `GET /module-completions/check` | `content:lessons:read` | `content:lessons:read` |
| `GET /progress/learner/:id` | `grades:own:read` | `learner:grades:read` |

All these permissions are already assigned to `course-taker` and relevant staff roles.

---

*Thread complete. Move to `archive/` when confirmed.*
