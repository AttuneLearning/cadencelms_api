# Upcoming Change: Contract-Runtime Alignment P2 (Legacy Surface Removal)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-050

---

## Request

Plan UI updates for removal of overlapping legacy API surfaces during P2, with strict canonical endpoint parity enforcement.

## Context

P2 will add automated contract-route parity checks and remove overlapping legacy surfaces (for example, legacy attempt/media overlaps). This is an ideal-first cutover; compatibility shims will not be maintained.

## Requirements

1. Move FE usage to canonical endpoint families only before removal lands.
2. Eliminate FE dependencies on legacy overlapping APIs.
3. Validate FE error handling and payload assumptions against canonical contracts after cleanup.

## Proposed Approach (Optional)

- Inventory FE calls to legacy surfaces and migrate by domain (attempts, media, etc.).
- Add FE integration checks against generated OpenAPI/contracts after P2 branch is ready.

## Questions

1. Which FE modules still call legacy attempt or overlapping media endpoints today?

## Timeline

- **Needed by:** ASAP after P1
- **Blocking:** Final enforcement of one-to-one contract/runtime parity

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
