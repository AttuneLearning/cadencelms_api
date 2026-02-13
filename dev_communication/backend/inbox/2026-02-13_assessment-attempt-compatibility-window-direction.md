# Product Direction: No Compatibility Window for Assessment Attempt Migration

**Date:** 2026-02-13
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** API-ISS-047, UI-ISS-149

---

## Request

Please proceed with the assessment-attempt contract/runtime alignment with **no legacy compatibility window**.

## Context

This is a new product with no active production users. Product owner direction is to prioritize the ideal end-state architecture now rather than preserving transitional compatibility.

## Requirements

1. Treat the canonical route as source of truth immediately:
   - `assessmentId` authoritative for attempt lifecycle
   - `learningUnitId` contextual/provenance only
2. Prioritize RESTful contract clarity and optimized data paths over backward-compat behavior.
3. Do not maintain `exam-attempts` compatibility for new frontend implementation work.

## Proposed Approach

- Complete API-ISS-047 with strict contract alignment and validation.
- Frontend will proceed directly against assessment-attempt APIs and canonical LU->assessment linkage.

## Questions

- None.

## Timeline

- **Needed by:** ASAP
- **Blocking:** UI migration to canonical assessment launch/attempt flow in learner course player

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

No response required for this direction; this is product-owner guidance for implementation alignment.

---

*Move to `archive/` when thread is complete*
