# UI-ISS-070: Missing Create Quiz page for authoring quizzes

**Date:** 2026-01-22
**Reporter:** User
**Priority:** High
**Status:** Open

## Description

There is no dedicated Create Quiz page for staff to author quizzes (assessment content) and attach them to modules/learning units. This blocks quiz creation workflows and prevents assessment authoring in the UI.

## Evidence

- No quiz authoring page exists under `src/pages/staff`.
- Exam/assessment APIs exist (`src/entities/exam-attempt` and exercises), but there is no UI entry point to build quizzes.

## Expected Behavior

- Staff can create a quiz from a dedicated Create Quiz page.
- Quiz supports selecting questions (from Question Bank) and configuring settings (time limit, attempts, passing score).
- Quiz can be associated with a module/learning unit.

## Suggested UI/Flow

1. Add "Create Quiz" CTA in course/module authoring flows.
2. Create a new page (e.g., `src/pages/staff/assessments/CreateQuizPage.tsx`).
3. Provide fields for title, description, time limit, attempts, passing score, shuffle questions.
4. Provide a question picker (from Question Bank) and ordering controls.
5. Save and return to module editor with the new quiz attached.

## Related Files

- `src/entities/exam-attempt` (attempts + grading)
- `src/entities/question` (question API + types)
- (New) `src/pages/staff/assessments/CreateQuizPage.tsx`
