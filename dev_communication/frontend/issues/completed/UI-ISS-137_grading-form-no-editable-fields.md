# UI-ISS-137: Grading Form Has No Editable Fields and Fails to Submit

## Status: PENDING
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: Internal (UAT)
## Assigned To: Unassigned
## Related: None

---

## Overview

The grading form on the GradingDetailPage (`/staff/grading/:attemptId`) does not render editable fields and shows a "Failed to submit grade" error toast when attempting to grade. Observed for Casey Learner's COG101 M2 Assessment Skills - Knowledge Check submission.

**Symptoms:**
1. Score input fields and feedback textareas are not editable (appear present but non-interactive)
2. Clicking "Submit Grade" produces a destructive toast: "Failed to submit grade. Please try again."
3. No validation errors are shown inline

---

## Requirements

1. Score input fields must be editable for each question in the grading form
2. Feedback textareas must be editable for each question
3. Overall feedback textarea must be editable
4. Submitting a complete grade should succeed (or show a meaningful API error)

---

## Technical Specification

### Likely Root Cause

The `GradingForm` component (`src/features/grading/ui/GradingForm.tsx`) computes `gradeIndex` by searching `formValues.questionGrades` for a matching `questionId`:

```tsx
const gradeIndex = formValues.questionGrades?.findIndex(
  (g) => g.questionId === question.id
);
```

The `Controller` then uses this index:
```tsx
<Controller name={`questionGrades.${gradeIndex}.scoreEarned`} ... />
```

**If `gradeIndex` is `-1`** (question ID mismatch between `questions` prop and the form's `questionGrades` array), the Controller path becomes `questionGrades.-1.scoreEarned`, which is invalid. This would:
- Render an input not connected to form state (appears non-editable)
- Cause submission to fail because no scores are recorded in form data

**Possible causes of ID mismatch:**
- API returns `_id` but component expects `id` on the `ExamQuestion` type
- Question IDs in the attempt response don't match the IDs used during form initialization
- The `questions` array is re-ordered or filtered between the attempt fetch and form render

### Relevant Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/exam-attempts/:attemptId` | Fetch attempt with questions |
| POST | `/api/v2/exam-attempts/:attemptId/grade` | Submit grade |

---

## Implementation

### Files to Investigate/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/features/grading/ui/GradingForm.tsx` | Investigate/Modify | Fix gradeIndex lookup; add guard for -1 index |
| `src/entities/exam-attempt/model/types.ts` | Investigate | Verify `ExamQuestion.id` matches API response field |
| `src/entities/exam-attempt/hooks/useExamAttempts.ts` | Investigate | Verify response mapping / normalization |
| `src/pages/staff/grading/GradingDetailPage.tsx` | Investigate | Verify `attempt.questions` shape passed to form |

### Approach

1. **Reproduce:** Navigate to `/staff/grading`, select Casey Learner's COG101 M2 Knowledge Check, verify fields are non-editable
2. **Debug ID mismatch:** Log `question.id` vs `formValues.questionGrades[*].questionId` to confirm mismatch
3. **Fix:** Either normalize question IDs during form initialization, or fix the type mapping in the API response hook
4. **Guard:** Add a runtime guard in `GradingForm` — if `gradeIndex === -1`, log a warning and skip rendering (or use the array index as fallback)

---

## Tests Required

1. [ ] GradingForm renders editable score inputs for each question
2. [ ] GradingForm renders editable feedback textareas for each question
3. [ ] Score input accepts numeric values and updates form state
4. [ ] Submit button sends correct grade data to onSubmit callback
5. [ ] Form handles question ID formats from API correctly (`_id` vs `id`)

---

## Acceptance Criteria

- [ ] All score fields are editable on the grading form
- [ ] All feedback fields are editable on the grading form
- [ ] Grade can be submitted successfully for Casey Learner COG101 M2 Knowledge Check
- [ ] No "Failed to submit grade" error for valid submissions
- [ ] Existing grading tests continue to pass
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Does the API return `_id` or `id` for exam questions?**
   Need to verify the actual API response shape vs the `ExamQuestion` type definition.

2. **Is this issue specific to Knowledge Check question types, or all exam types?**
   Need to test other attempt types to determine scope.

---

## Implementation Notes

*Add notes during implementation*

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
