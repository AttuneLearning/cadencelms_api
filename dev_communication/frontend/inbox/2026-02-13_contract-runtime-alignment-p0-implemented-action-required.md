# Update: Contract-Runtime Alignment P0 Implemented (Action Required)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** Critical
**Related Issues:** API-ISS-048, API-ISS-049, API-ISS-050

---

## Request

Move all frontend callers to canonical auth and assessments endpoints immediately. No compatibility aliases will be added.

## Context

P0 implementation is now in code:
- `/api/v2/assessments` CRUD/publish/archive routes are mounted and covered by integration tests.
- Auth contracts are aligned to runtime canonical paths.
- Contract export/docs scripts now hard-fail on partial output.

## Requirements

1. Use canonical auth endpoints only:
   - `POST /api/v2/auth/register/staff`
   - `POST /api/v2/auth/register/learner`
   - `POST /api/v2/auth/password/forgot`
   - `PUT /api/v2/auth/password/reset/:token`
   - `PUT /api/v2/auth/password/change`
2. Use `/api/v2/assessments/*` for assessment management flows.
3. Remove any FE references to legacy auth password path variants.

## Proposed Approach (Optional)

- Update FE endpoint constants in one pass.
- Run auth + assessment management smoke tests against canonical-only endpoints.

## Questions

1. Are any FE routes still calling `/forgot-password`, `/reset-password`, or `/change-password` variants?

## Timeline

- **Needed by:** ASAP
- **Blocking:** P1/P2 contract structure and parity automation rollout

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
