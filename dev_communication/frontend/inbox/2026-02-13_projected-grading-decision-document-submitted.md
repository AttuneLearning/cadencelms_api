# Projected Grading Decision Document Submitted (Phase 1 + Phase 2)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-054

---

Shared decision document is now available for concurrent UI planning and implementation:

- `dev_communication/shared/specs/learning/ASSESSMENT_PROJECTED_GRADING_PHASES_1_2_DECISION.md`

Key alignment points:

1. Canonical staff grading endpoint remains `POST /api/v2/assessment-attempts/:attemptId/grade` for approve/override.
2. Staff detail should read projected fields from `GET /api/v2/assessment-attempts/:attemptId`.
3. Learner feedback remains hidden until grading completion.
4. No compatibility layer is being preserved; this is the intended endpoint/type structure moving forward.

Please open UI issues for projected grading staff review surfaces and learner feedback gating alignment against this decision document.
