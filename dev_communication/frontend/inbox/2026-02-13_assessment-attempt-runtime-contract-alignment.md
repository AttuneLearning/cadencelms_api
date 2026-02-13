# Assessment Attempt Runtime/Contract Alignment (assessmentId Canonical)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-047

---

## Request

Please wire learner assessment attempt flows to the canonical `assessmentId` endpoints and updated error handling below.

## Context

Backend runtime was aligned to the updated contracts so assessment attempts are now explicitly `assessmentId`-authoritative, with optional `learningUnitId` launch context validation.

## Requirements

1. Use `POST /api/v2/assessments/:assessmentId/attempts/start` for attempt start.
2. Include `enrollmentId` in start payload (required, ObjectId).
3. If sending `learningUnitId`, ensure it corresponds to the same assessment unit; backend now enforces this mapping.
4. Continue sending response payloads as `responses: [{ questionId, response }]` for save/submit flows.
5. Handle updated start/save/submit status codes:
- `400 LEARNING_UNIT_ASSESSMENT_MISMATCH`
- `404 LEARNING_UNIT_NOT_FOUND`
- `409` conflict paths (`attempt already in progress`, `max attempts`, `attempt not in progress`)
- `422` validation errors (e.g. missing `enrollmentId`, invalid request body)

## Proposed Approach (Optional)

- Keep FE route state based on `assessmentId`.
- Pass `learningUnitId` only as launch provenance (deep-link/module launches).
- Treat `moduleId` as optional on start; backend can derive from `learningUnitId` when omitted.

## Questions

1. Do you want a typed FE error-code map generated from `contracts/api/assessment-attempts.contract.ts` as a follow-up?

## Timeline

- **Needed by:** ASAP
- **Blocking:** Final FE attempt-start wiring and error-state UX consistency

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
