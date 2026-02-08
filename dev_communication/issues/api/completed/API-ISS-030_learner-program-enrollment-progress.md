# API-ISS-030: Learner Program Enrollment & Progress

## Status: COMPLETE
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: API Team
## Related: UI-ISS-102, API-ISS-017, API-ISS-018
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

Program/learning path management endpoints exist for admins (program CRUD, certificate config, analytics), but there are no learner-facing endpoints for program discovery, enrollment, or progress tracking. This issue adds the learner side of the program experience.

---

## Requirements

1. **Program catalog** — learners can browse available programs
2. **Program enrollment** — learners can enroll in a program
3. **Program progress** — per-course completion within a program
4. **Course sequencing** — prerequisite/order enforcement within programs
5. **Program completion** — auto-detect when all courses are completed
6. **Integration with certificates** — trigger program certificate issuance on completion (API-ISS-017/018)

---

## Technical Specification

### New Model — ProgramEnrollment

```typescript
interface IProgramEnrollment extends Document {
  programId: ObjectId;
  learnerId: ObjectId;
  departmentId: ObjectId;
  status: 'active' | 'completed' | 'withdrawn' | 'suspended';
  enrolledAt: Date;
  completedAt: Date | null;
  withdrawnAt: Date | null;
  certificateIssuanceId: ObjectId | null;  // Link to issued certificate
  
  // Progress tracking
  totalCourses: number;
  completedCourses: number;
  progressPercentage: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/programs` | List published programs (learner catalog view) |
| GET | `/api/v2/programs/:programId` | Program detail with course sequence, prerequisites, certificate info |
| POST | `/api/v2/programs/:programId/enroll` | Enroll learner in program |
| GET | `/api/v2/learners/me/program-enrollments` | List current learner's program enrollments |
| GET | `/api/v2/program-enrollments/:enrollmentId` | Get enrollment detail |
| GET | `/api/v2/program-enrollments/:enrollmentId/progress` | Detailed per-course progress |
| PUT | `/api/v2/program-enrollments/:enrollmentId/withdraw` | Withdraw from program |

### Program Detail Response (Learner View)

```json
{
  "id": "prog_123",
  "name": "CBT Fundamentals",
  "description": "Complete certification in Cognitive Behavioral Therapy",
  "departmentId": "dept_456",
  "courses": [
    {
      "courseId": "course_1",
      "courseName": "Introduction to CBT",
      "order": 1,
      "isRequired": true,
      "prerequisites": []
    },
    {
      "courseId": "course_2",
      "courseName": "CBT Techniques",
      "order": 2,
      "isRequired": true,
      "prerequisites": ["course_1"]
    },
    {
      "courseId": "course_3",
      "courseName": "Advanced CBT",
      "order": 3,
      "isRequired": true,
      "prerequisites": ["course_2"]
    }
  ],
  "totalCourses": 3,
  "estimatedDuration": "40 hours",
  "certificate": {
    "enabled": true,
    "title": "CBT Fundamentals Certificate",
    "templateId": "tmpl_001"
  },
  "enrollmentCount": 45,
  "isEnrolled": false
}
```

### Progress Response

```json
{
  "enrollmentId": "pe_789",
  "programName": "CBT Fundamentals",
  "status": "active",
  "overallProgress": 33,
  "courseProgress": [
    {
      "courseId": "course_1",
      "courseName": "Introduction to CBT",
      "order": 1,
      "status": "completed",
      "grade": 92,
      "completedAt": "2026-01-15T12:00:00Z",
      "prerequisiteMet": true
    },
    {
      "courseId": "course_2",
      "courseName": "CBT Techniques",
      "order": 2,
      "status": "in_progress",
      "grade": null,
      "completedAt": null,
      "prerequisiteMet": true
    },
    {
      "courseId": "course_3",
      "courseName": "Advanced CBT",
      "order": 3,
      "status": "locked",
      "grade": null,
      "completedAt": null,
      "prerequisiteMet": false
    }
  ]
}
```

---

## Questions for API Team

1. **Auto-enrollment in courses**: When a learner enrolls in a program, should the API auto-create individual course enrollments for all (or first unlocked) courses?
2. **Course sequencing**: Are courses strictly sequential (linear), or can programs have branching prerequisite trees?
3. **Program completion detection**: Should a background job check for completion, or should it be triggered when each course enrollment completes?
4. **Existing program admin endpoints**: Can `GET /api/v2/programs` and `GET /api/v2/programs/:id` be reused for learner views with role-based response shaping, or do learners need separate endpoints?

---

## Tests Required

1. [ ] List published programs (learner catalog)
2. [ ] Enroll in program
3. [ ] Cannot enroll in same program twice
4. [ ] Progress reflects individual course completions
5. [ ] Course prerequisite enforcement within program
6. [ ] Program auto-completes when all courses finished
7. [ ] Certificate issued on program completion
8. [ ] Withdraw from program
9. [ ] Only published programs visible to learners

---

## Acceptance Criteria

- [ ] Learner can discover, enroll in, and track progress through programs
- [ ] Course sequencing/prerequisites enforced
- [ ] Program completion triggers certificate issuance
- [ ] Existing admin program endpoints unaffected
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
