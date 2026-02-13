# Update: Contract-Runtime Alignment P2 Implemented (Action Required)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-050

---

## Request

Update frontend integrations to the canonical endpoint surface and regenerate any route assumptions from current contract artifacts.

## Context

P2 implementation is now in code and parity-enforced:
- Contract/runtime parity tests added and passing.
- Legacy overlap removed:
  - `exam-attempts` legacy contract surface removed.
  - `/api/v2/content/media*` duplicate route surface removed; canonical media remains `/api/v2/media`.
- Contract paths normalized to runtime canonical endpoints:
  - Module access endpoints consolidated under `/api/v2/module-access`.
  - Enrollment grade endpoints use `/api/v2/enrollments/:enrollmentId/grades/*`.
  - Matching exercise update endpoint uses `/api/v2/content/exercises/:id/matching`.
- Media purpose/storage enums aligned across model + contract types.

## Requirements

1. Pull latest `contracts/dist/` artifacts and re-run FE API typings.
2. Remove FE usage of deleted/legacy surfaces (`exam-attempts`, `/content/media*`, old singular `/grade/*` paths).
3. Verify FE modules using module-access and matching exercise updates use canonical paths and payloads.

## Timeline

- **Needed by:** Before next FE contract sync merge
- **Blocking:** Stable cross-team contract/runtime parity enforcement

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
