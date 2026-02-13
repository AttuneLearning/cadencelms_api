# Upcoming Change: Contract-Runtime Alignment P1 (Contract Format Normalization)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-049

---

## Request

Prepare FE contract consumers for a strict contract format normalization pass in P1.

## Context

P1 will standardize `*.contract.ts` to endpoint-contract exports only and remove legacy/irregular export patterns. No backward-compatible export aliases will be kept.

## Requirements

1. Treat only canonical contract exports as supported (`*Contract` / `*Contracts`).
2. Remove FE reliance on any legacy contract export names or ad-hoc shapes.
3. Re-sync FE contract type ingestion after P1 lands.

## Proposed Approach (Optional)

- Add a single FE adapter layer for contract imports, then update once to canonical exports.
- Re-run FE generation/checks against fresh `contracts/dist` artifacts post-P1.

## Questions

1. Are there FE tools currently importing non-standard contract symbols we should flag before cutover?

## Timeline

- **Needed by:** ASAP after P0
- **Blocking:** Stable shared contract artifact generation for UI automation

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
