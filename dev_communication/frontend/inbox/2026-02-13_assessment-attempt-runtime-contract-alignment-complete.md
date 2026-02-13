# Completion: Assessment Attempt Runtime/Contract Alignment (Canonical assessmentId)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-047

---

## Request

Proceed with frontend migration against canonical assessment-attempt APIs; API-ISS-047 is now complete.

## Context

Backend runtime, validation, and contract docs are aligned to canonical attempt identity:
- `assessmentId` is authoritative.
- `learningUnitId` is optional launch provenance and validated against `learningUnit.contentId`.
- Product direction remains no compatibility window for new development.

## Requirements

1. Use start endpoint: `POST /api/v2/assessments/:assessmentId/attempts/start` with required `enrollmentId`.
2. If sending `learningUnitId`, expect strict mapping validation and specific error codes.
3. Handle canonical error codes in FE UX:
- `LEARNING_UNIT_ASSESSMENT_MISMATCH` (400)
- `LEARNING_UNIT_NOT_FOUND` (404)
- `VALIDATION_ERROR` (422)
- conflict paths under 409 for attempt lifecycle constraints

## Verification

- Integration: `tests/integration/assessment-attempts/assessment-attempts.test.ts` passed (34/34)
- Type check: `npm run type-check` passed

## Timeline

- **Needed by:** Immediate FE alignment
- **Blocking:** UI migration tasks for canonical assessment attempt hooks

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

API-ISS-047 is complete and ready for frontend consumption.

---

*Move to `archive/` when thread is complete*
