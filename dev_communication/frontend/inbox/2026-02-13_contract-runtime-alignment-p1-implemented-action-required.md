# Update: Contract-Runtime Alignment P1 Implemented (Action Required)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-049

---

## Request

Pull latest contract artifacts and move FE contract consumers to endpoint-only contract entries immediately.

## Context

P1 implementation is now in code:
- Contract tooling now exports/docs endpoint entries only and ignores non-endpoint metadata entries.
- Previously failing/skipped contracts were repaired and now export/document successfully.
- Generated JS contract artifacts were removed from `contracts/api/`; generated artifacts remain in `contracts/dist/` only.

## Requirements

1. Re-sync FE tooling from latest `contracts/dist/contracts.json` and `contracts/dist/contract-types.d.ts`.
2. Treat endpoint entries as canonical (`endpoint`, `method`, `request`, `response`) and stop consuming non-endpoint top-level entries.
3. Remove any FE assumptions that contract source files include generated `.js` siblings.

## Contract Surface Notes

- New endpoint-contract exports added for:
  - `certificate-templates.contract.ts`
  - `report-jobs.contract.ts`
  - `report-schedules.contract.ts`
  - `report-templates.contract.ts`
  - `admin-roles.contract.ts`
  - `user-type-revision.contract.ts`

## Timeline

- **Needed by:** Before P2 parity automation adoption
- **Blocking:** FE contract ingestion stability and endpoint generation parity

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
