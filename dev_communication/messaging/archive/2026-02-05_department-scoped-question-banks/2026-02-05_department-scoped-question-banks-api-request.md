# Department-Scoped Question Banks API Request

**Date:** 2026-02-05
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** API-ISS-008 (from spec), UI-ISS-068, UI-ISS-069, UI-ISS-070

---

## Request

The UI team needs the department-scoped Question Bank API endpoints to be implemented as defined in the contracts. We are ready to begin integration and need confirmation of endpoint availability.

## Context

We have completed the foundational UI work and are blocked on question bank functionality. The comprehensive spec exists at `dev_communication/specs/learning/Question_Bank_System_Implementation.md` and contracts are defined at:
- `contracts/api/question-banks.contract.ts`
- `contracts/api/learning-unit-questions.contract.ts`

Our UAT tests for instructor workflow are failing on question bank access because the endpoints don't exist yet.

## Requirements

### P1 - Blocking (Week 9 deadline)

1. **Question Banks CRUD**
   ```
   GET    /api/v2/departments/:departmentId/question-banks
   POST   /api/v2/departments/:departmentId/question-banks
   GET    /api/v2/departments/:departmentId/question-banks/:bankId
   PUT    /api/v2/departments/:departmentId/question-banks/:bankId
   DELETE /api/v2/departments/:departmentId/question-banks/:bankId
   ```

2. **Department Questions CRUD**
   ```
   GET    /api/v2/departments/:departmentId/questions
   POST   /api/v2/departments/:departmentId/questions
   GET    /api/v2/departments/:departmentId/questions/:questionId
   PUT    /api/v2/departments/:departmentId/questions/:questionId
   DELETE /api/v2/departments/:departmentId/questions/:questionId
   ```

3. **Learning Unit Question Linking**
   ```
   GET    /api/v2/learning-units/:learningUnitId/questions
   POST   /api/v2/learning-units/:learningUnitId/questions
   POST   /api/v2/learning-units/:learningUnitId/questions/bulk
   PUT    /api/v2/learning-units/:learningUnitId/questions/:linkId
   DELETE /api/v2/learning-units/:learningUnitId/questions/:linkId
   ```

### Question Types Required

The UI needs support for these question types from the monolithic Question model:
- `multiple_choice`
- `multiple_select`
- `true_false`
- `short_answer`
- `long_answer`
- `matching`
- `flashcard`
- `fill_in_blank`

## Design Principles (Per Spec)

| Principle | Decision |
|-----------|----------|
| **No Backwards Compatibility** | Nothing in production, always ideal API design |
| **Department Scoped** | All questions/banks scoped to departments |
| **No Cascade Delete** | Return error with dependency list |

## Questions

1. What is the current implementation status of these endpoints?
2. Are there any changes to the contracts we should be aware of?
3. Can we get an ETA for P1 endpoints?

## Timeline

- **Needed by:** Week 9 (P1 endpoints)
- **Blocking:** Question Bank UI, Instructor workflow UAT tests, Exercise/Assessment question linking

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-05

All P1 endpoints are fully implemented and tested. See response message:
`api-to-ui/2026-02-05_department-scoped-question-banks-response.md`

---

*Move to `archive/` when thread is complete*
