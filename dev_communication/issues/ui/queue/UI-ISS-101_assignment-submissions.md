# UI-ISS-101: Assignment Submissions

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-096, UI-ISS-094
## Category: Next Phase — After Critical Gaps

---

## Overview

**Next-phase feature — implement after critical gaps (UI-ISS-094, 095, 096) are resolved.**

Implement a general assignment submission workflow for non-quiz coursework. Currently, essay questions exist within quizzes, but there is no standalone assignment feature where learners can upload files, write text responses, or submit work for grading outside of the quiz/exam flow.

---

## Requirements

1. **Assignment content type** in course player (alongside SCORM, video, document)
2. **Text submission**: Rich text editor for written assignments
3. **File upload**: Upload documents (PDF, DOCX, images) as assignment submissions
4. **Multiple submission types**: Text-only, file-only, or text + file
5. **Submission status**: Draft (auto-save) → Submitted → Graded
6. **Resubmission**: Staff can allow resubmission (configurable)
7. **Submission confirmation**: Clear confirmation that submission was received
8. **View feedback**: Learner can view staff feedback, rubric scores, and grade after grading
9. **Submission history**: View previous submissions if resubmission is allowed

---

## Technical Considerations

- File upload infrastructure (S3 pre-signed URLs or similar)
- Maximum file size limits
- Supported file types
- Integration with course player as a content type
- Integration with grading workflow on staff side

---

## Dependencies

- API assignment endpoints (to be specified)
- File upload infrastructure
- Staff grading interface (may be separate issue)

---

## Acceptance Criteria

- [ ] Design document produced
- [ ] API requirements communicated
- [ ] Implementation issues created when prioritized

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
