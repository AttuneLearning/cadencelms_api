# UI-ISS-070: Missing Create Quiz Page

## Status: COMPLETE
## Priority: High
## Created: 2026-01-22
## Updated: 2026-01-28
## Completed: 2026-01-28
## Requested By: UI Team
## Assigned To: Implemented
## Related: UI-ISS-069

---

## Overview

There is no dedicated Create Quiz page for staff to author quizzes (assessment content) and attach them to modules/learning units. This blocks quiz creation workflows and prevents assessment authoring in the UI.

---

## Requirements

1. Staff can create a quiz from a dedicated Create Quiz page
2. Quiz supports selecting questions (from Question Bank)
3. Configure settings (time limit, attempts, passing score)
4. Quiz can be associated with a module/learning unit
5. Question ordering controls

---

## Technical Specification

### Evidence

- No quiz authoring page exists under `src/pages/staff`
- Exam/assessment APIs exist (`src/entities/exam-attempt` and exercises), but there is no UI entry point to build quizzes

### Suggested UI/Flow

1. Add "Create Quiz" CTA in course/module authoring flows
2. Create a new page (e.g., `src/pages/staff/assessments/CreateQuizPage.tsx`)
3. Provide fields for title, description, time limit, attempts, passing score, shuffle questions
4. Provide a question picker (from Question Bank) and ordering controls
5. Save and return to module editor with the new quiz attached

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/staff/assessments/CreateQuizPage.tsx` | Create | Quiz authoring page |
| Module editor | Modify | Add "Create Quiz" CTA |

### Approach

Integrate with `src/entities/exam-attempt` and `src/entities/question` APIs.

---

## Tests Required

1. [ ] Create Quiz page is accessible
2. [ ] Questions can be selected from Question Bank
3. [ ] Quiz settings can be configured
4. [ ] Quiz saves and attaches to module

---

## Acceptance Criteria

- [ ] Create Quiz page accessible from module authoring
- [ ] Title, description fields work
- [ ] Time limit configuration works
- [ ] Attempts configuration works
- [ ] Passing score configuration works
- [ ] Shuffle questions option works
- [ ] Question picker shows Question Bank questions
- [ ] Question ordering works
- [ ] Quiz saves correctly
- [ ] Quiz attaches to module/learning unit
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

*Add notes during implementation*

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
