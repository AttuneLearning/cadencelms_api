# API-ISS-029: Assignment Submission System

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-101, API-ISS-012 (Media Upload)
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

Implement a standalone assignment system (separate from quiz/exam) where learners can submit text and/or file-based work for staff grading. Assignments are a content type within courses alongside SCORM, video, documents, and exercises.

---

## Requirements

1. **Assignment model** as a course content type
2. **Submission model** with draft/submitted/graded/returned states
3. **File upload** for submissions (depends on API-ISS-012 media upload)
4. **Text submissions** with rich text support
5. **Staff grading**: Score, feedback, rubric (optional)
6. **Resubmission**: Configurable per assignment
7. **Submission history**: Track all submissions per learner per assignment

---

## Technical Specification

### New Models

#### Assignment

```typescript
interface IAssignment extends Document {
  courseId: ObjectId;
  moduleId: ObjectId;
  title: string;
  instructions: string;            // Rich text / markdown
  submissionType: 'text' | 'file' | 'text_and_file';
  allowedFileTypes: string[];       // e.g., ['pdf', 'docx', 'jpg']
  maxFileSize: number;              // Bytes, default 10MB
  maxResubmissions: number;         // 0 = no resubmission, null = unlimited
  rubricId: ObjectId | null;        // Optional rubric for grading
  maxScore: number;                 // Maximum possible score
  isPublished: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### AssignmentSubmission

```typescript
interface IAssignmentSubmission extends Document {
  assignmentId: ObjectId;
  learnerId: ObjectId;
  enrollmentId: ObjectId;
  submissionNumber: number;         // 1-indexed
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  textContent: string | null;
  files: Array<{
    fileId: ObjectId;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  submittedAt: Date | null;
  grade: number | null;
  feedback: string | null;          // Staff feedback text
  gradedBy: ObjectId | null;
  gradedAt: Date | null;
  returnedAt: Date | null;          // If returned for resubmission
  returnReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/assignments/:assignmentId` | Get assignment details |
| POST | `/api/v2/assignments` | Create assignment (staff) |
| PUT | `/api/v2/assignments/:assignmentId` | Update assignment (staff) |
| POST | `/api/v2/assignments/:assignmentId/submissions` | Create/submit (learner) |
| PUT | `/api/v2/submissions/:submissionId` | Update draft submission |
| GET | `/api/v2/submissions/:submissionId` | Get submission with feedback |
| GET | `/api/v2/assignments/:assignmentId/submissions?learnerId=` | List submissions |
| POST | `/api/v2/submissions/:submissionId/grade` | Grade submission (staff) |
| POST | `/api/v2/submissions/:submissionId/return` | Return for resubmission (staff) |

---

## Tests Required

1. [ ] Create assignment with valid settings
2. [ ] Submit text assignment
3. [ ] Submit file assignment (with upload)
4. [ ] Resubmission count enforced
5. [ ] Grade submission sets score and feedback
6. [ ] Return submission allows resubmission
7. [ ] Draft auto-save works
8. [ ] Submission history returns all submissions ordered
9. [ ] Only enrolled learners can submit
10. [ ] Only staff can grade

---

## Acceptance Criteria

- [ ] Assignment CRUD functional
- [ ] Submission lifecycle (draft → submitted → graded/returned) works
- [ ] File upload integrated
- [ ] Grading and feedback functional
- [ ] Resubmission limits enforced
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
