# Assignment Submission System — API Contracts

**From:** API Team
**To:** UI Team
**Date:** 2026-02-08
**Related Issue:** API-ISS-029

---

## Overview

Assignment submission system is now live. Learners submit text and/or file-based work for staff grading. Two routers:

- **`/api/v2/assignments`** — assignment CRUD (staff) + nested submission endpoints (learners)
- **`/api/v2/submissions`** — submission-level operations

---

## Endpoints

### Assignment Management (Staff — `content:courses:manage`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/v2/assignments` | `{ courseId, title, instructions, submissionType, maxScore, moduleId?, allowedFileTypes?, maxFileSize?, maxFiles?, maxResubmissions? }` | `201` Assignment object |
| `GET` | `/api/v2/assignments/:assignmentId` | — | `200` Assignment object |
| `PUT` | `/api/v2/assignments/:assignmentId` | Partial assignment fields + `isPublished?` | `200` Assignment object |
| `DELETE` | `/api/v2/assignments/:assignmentId` | — | `200` Soft-deleted assignment |

### Submission Lifecycle (Learner — `content:courses:read`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/v2/assignments/:assignmentId/submissions` | `{ enrollmentId, textContent?, files? }` | `201` Submission (status: draft) |
| `GET` | `/api/v2/assignments/:assignmentId/submissions` | Query: `learnerId?`, `status?`, `page?`, `limit?` | `200` Paginated submissions |
| `GET` | `/api/v2/submissions/:submissionId` | — | `200` Submission object |
| `PUT` | `/api/v2/submissions/:submissionId` | `{ textContent?, files? }` | `200` Updated draft |
| `POST` | `/api/v2/submissions/:submissionId/submit` | — | `200` Submission (status: submitted) |

### Grading (Staff — `content:courses:manage`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/v2/submissions/:submissionId/grade` | `{ grade, feedback? }` | `200` Submission (status: graded) |
| `POST` | `/api/v2/submissions/:submissionId/return` | `{ returnReason }` | `200` Submission (status: returned) |

---

## Key Types

### Assignment

```typescript
{
  _id: ObjectId;
  courseId: ObjectId;
  moduleId?: ObjectId;
  title: string;              // max 200
  instructions: string;       // max 10000
  submissionType: 'text' | 'file' | 'text_and_file';
  allowedFileTypes: string[]; // default: ['pdf','docx','jpg','png']
  maxFileSize: number;        // default: 10485760 (10MB)
  maxFiles: number;           // default: 5, range 1-20
  maxScore: number;
  maxResubmissions: number | null; // null=unlimited, 0=none, default: 0
  isPublished: boolean;
  createdBy: ObjectId;
  isDeleted: boolean;
}
```

### AssignmentSubmission

```typescript
{
  _id: ObjectId;
  assignmentId: ObjectId;
  learnerId: ObjectId;
  enrollmentId: ObjectId;
  submissionNumber: number;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  textContent: string | null;
  files: Array<{ fileId, fileName, fileUrl, fileSize, mimeType }>;
  submittedAt: Date | null;
  grade: number | null;
  feedback: string | null;
  gradedBy: ObjectId | null;
  gradedAt: Date | null;
  returnedAt: Date | null;
  returnReason: string | null;
}
```

---

## Submission Lifecycle

```
draft → submitted → graded
                  → returned (learner creates new submission)
```

- **Draft**: Learner can edit text/files via `PUT /submissions/:id`
- **Submit**: `POST /submissions/:id/submit` — must have text or files
- **Grade**: Staff sets score + optional feedback
- **Return**: Staff returns for resubmission with reason; learner creates new submission (subject to `maxResubmissions` limit)

---

## File Attachments

Files use the existing media upload system. Upload via `/api/v2/media` with `purpose: 'assignment'`, then include the file references in the submission body.

```typescript
files: [{
  fileId: "media_attachment_id",
  fileName: "report.pdf",
  fileUrl: "https://...",
  fileSize: 1048576,
  mimeType: "application/pdf"
}]
```

---

## Authorization Notes

- **Staff** (`content:courses:manage`): Full assignment CRUD, grading, returning
- **Learners** (`content:courses:read`): Create/edit/submit own submissions, view own submissions
- `GET /submissions/:id`: Staff can view any; learners restricted to own (checked via `authorize.check()`)
- No enrollment check in service (consistent with assessments, discussions)
