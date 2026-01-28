# UI-ISS-069: Missing Question Bank page for managing assessment questions

**Date:** 2026-01-22
**Reporter:** User
**Priority:** High
**Status:** Open

## Description

There is no dedicated Question Bank page for staff to create, organize, and manage assessment questions. This blocks workflows that require reusing questions across assessments and importing/exporting question sets.

## Evidence

- No `QuestionBank` page exists under `src/pages/staff` or `src/pages/admin`.
- Question APIs exist (`src/entities/question/api/questionApi.ts`), but no UI entry point for managing them.

## Expected Behavior

- Staff can access a Question Bank from the staff navigation.
- Users can list, search, filter, and create questions.
- Users can edit, delete, and bulk import/export questions.

## Suggested UI/Flow

1. Add a "Question Bank" link in the staff sidebar (Assessment/Content section).
2. Create a new page (e.g., `src/pages/staff/questions/QuestionBankPage.tsx`).
3. Provide filters (type, difficulty, tags, status), search, and pagination.
4. Include actions: create, edit, delete, bulk import.

## Related Files

- `src/entities/question/api/questionApi.ts`
- `src/entities/question/model/types.ts`
- (New) `src/pages/staff/questions/QuestionBankPage.tsx`
