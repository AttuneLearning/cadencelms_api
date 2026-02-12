# UI-ISS-139: Build Assignment Submission & Grading UI

## Status: PENDING
## Priority: Medium
## Created: 2026-02-09
## Updated: 2026-02-09
## Requested By: API Team (inbox message: 2026-02-08_assignment-submission-contracts.md)
## Assigned To: Unassigned
## Related: API-ISS-029

---

## Overview

The assignment submission system API is live (API-ISS-029). The UI needs pages and components for the full assignment lifecycle: staff creating/managing assignments, learners submitting work (text and/or file), staff grading and returning submissions.

---

## API Contracts

### Routers
- **`/api/v2/assignments`** — assignment CRUD (staff) + nested submission endpoints (learners)
- **`/api/v2/submissions`** — submission-level operations

### Key Endpoints

| Method | Path | Actor | Description |
|--------|------|-------|-------------|
| POST | `/assignments` | Staff | Create assignment |
| GET | `/assignments/:id` | Staff | Get assignment |
| PUT | `/assignments/:id` | Staff | Update assignment |
| DELETE | `/assignments/:id` | Staff | Soft-delete assignment |
| POST | `/assignments/:id/submissions` | Learner | Create submission (draft) |
| GET | `/assignments/:id/submissions` | Both | List submissions |
| GET | `/submissions/:id` | Both | Get submission detail |
| PUT | `/submissions/:id` | Learner | Update draft |
| POST | `/submissions/:id/submit` | Learner | Submit for grading |
| POST | `/submissions/:id/grade` | Staff | Grade submission |
| POST | `/submissions/:id/return` | Staff | Return for resubmission |

### Key Types

**Assignment**: `{ _id, courseId, moduleId?, title, instructions, submissionType: 'text'|'file'|'text_and_file', allowedFileTypes, maxFileSize, maxFiles, maxScore, maxResubmissions, isPublished, createdBy, isDeleted }`

**Submission**: `{ _id, assignmentId, learnerId, enrollmentId, submissionNumber, status: 'draft'|'submitted'|'graded'|'returned', textContent, files: [{fileId, fileName, fileUrl, fileSize, mimeType}], submittedAt, grade, feedback, gradedBy, gradedAt, returnedAt, returnReason }`

### Lifecycle
```
draft → submitted → graded
                  → returned (learner creates new submission)
```

File uploads use existing media system: `POST /api/v2/media` with `purpose: 'assignment'`.

---

## Requirements

### Entity Layer
1. `src/entities/assignment/` — types, API functions, query keys, hooks
2. `src/entities/submission/` — types, API functions, query keys, hooks

### Staff Features
3. Assignment builder form (title, instructions, submission type, file constraints, scoring, resubmission settings)
4. Assignment list view within course management
5. Submission review list (filterable by status, learner)
6. Grading interface — score input, feedback, grade/return actions

### Learner Features
7. Assignment detail view (instructions, constraints, submission history)
8. Submission editor — text input and/or file upload
9. Draft save + submit flow
10. Submission status display (draft/submitted/graded/returned)
11. Grade/feedback viewing after grading

### Pages
12. Staff: Assignment management page within course admin
13. Staff: Submission grading page
14. Learner: Assignment submission page within course player

---

## Tests Required

1. [ ] Assignment entity hooks — CRUD operations
2. [ ] Submission entity hooks — lifecycle operations
3. [ ] Assignment builder form — validation, field rendering
4. [ ] Submission editor — text input, file upload UI
5. [ ] Grading interface — score input, feedback, submit/return actions
6. [ ] Submission status display — all 4 states render correctly

---

## Acceptance Criteria

- [ ] Staff can create, edit, publish, and delete assignments
- [ ] Learners can create drafts, attach files, and submit
- [ ] Staff can grade submissions with score + feedback
- [ ] Staff can return submissions with reason
- [ ] Learners see grade/feedback after grading
- [ ] Resubmission limit enforced in UI
- [ ] Tests pass
- [ ] Code reviewed

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
