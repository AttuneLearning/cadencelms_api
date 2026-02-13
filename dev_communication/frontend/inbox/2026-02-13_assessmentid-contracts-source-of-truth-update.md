# Contracts Update: Course/Module/LearningUnit/Assessment Source of Truth

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-047

---

## Summary

Contracts have been updated to make assessment launch/attempt identity unambiguous:

- `assessmentId` is the canonical identifier for attempt lifecycle APIs.
- `learningUnitId` is optional launch context/provenance.
- For assessment learning units, `learningUnit.contentId` is the assessment reference.

This is now documented in contract files as source of truth.

---

## Updated Contract Set

1. `contracts/api/courses.contract.ts`
- Added canonical hierarchy note:
  - `Course -> Module -> LearningUnit -> Assessment (via learningUnit.contentId)`.

2. `contracts/api/modules.contract.ts`
- Clarified module-context semantics and endpoint parameter shape for module detail/update/delete:
  - `GET /api/v2/courses/:courseId/modules/:moduleId`
  - `PUT /api/v2/courses/:courseId/modules/:moduleId`
  - `DELETE /api/v2/courses/:courseId/modules/:moduleId`

3. `contracts/api/learning-units.contract.ts`
- Clarified assessment linkage rule:
  - for `type='assessment'`, `contentId` must reference `Assessment._id`.
- Documented launch behavior:
  - attempts start with `assessmentId` (derived from `learningUnit.contentId` when launching from LU context).
- Corrected nested paths and methods to current module-scoped shape:
  - `GET/PUT/DELETE /api/v2/modules/:moduleId/learning-units/:learningUnitId`
  - `PUT /api/v2/modules/:moduleId/learning-units/reorder`
  - `PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId/move`

4. `contracts/api/assessments.contract.ts`
- Standardized path param naming to `:assessmentId`.
- Added explicit note that attempts are keyed by `assessmentId`; `learningUnitId` is contextual provenance.

5. `contracts/api/assessment-attempts.contract.ts` (rewritten to v2.0.0)
- Canonical start endpoint:
  - `POST /api/v2/assessments/:assessmentId/attempts/start`
- Canonical save/submit/grade lifecycle:
  - `PUT /api/v2/assessments/:assessmentId/attempts/:attemptId/save`
  - `POST /api/v2/assessments/:assessmentId/attempts/:attemptId/submit`
  - `POST /api/v2/assessments/:assessmentId/attempts/:attemptId/grade`
- List/history endpoints:
  - `GET /api/v2/assessments/:assessmentId/attempts`
  - `GET /api/v2/assessments/:assessmentId/attempts/my`
  - `GET /api/v2/assessments/:assessmentId/attempts/:attemptId`
- Validation rule now explicit in contract:
  - if `learningUnitId` is provided, backend validates `learningUnit.contentId === assessmentId`.

6. `contracts/api/exam-attempts.contract.ts`
- Marked deprecated for new development and explicitly points to assessment-based attempt APIs.

---

## UI Implementation Guidance

1. When launching an assessment from a learning unit:
- Resolve `assessmentId = learningUnit.contentId`.
- Call assessment-attempts endpoints with `assessmentId` in path.
- Send `learningUnitId` in body only as context/provenance.

2. Do not treat `learningUnitId` as attempt identity.

3. Treat `exam-attempts` contract as legacy/deprecated for any new UI work.

---

## Timeline

- **Needed by:** ASAP
- **Blocking:** Final API runtime alignment tracked in `API-ISS-047`

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Please confirm if UI wants a short compatibility window in client code for legacy exam-attempt hooks, or if we should remove them immediately.

---

*Move to `archive/` when thread is complete*
