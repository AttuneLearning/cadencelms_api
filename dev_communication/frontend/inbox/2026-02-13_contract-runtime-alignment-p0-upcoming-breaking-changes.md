# Upcoming Change: Contract-Runtime Alignment P0 (Breaking, Canonical-Only)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** Critical
**Related Issues:** API-ISS-048, API-ISS-047

---

## Request

Prepare frontend for immediate canonical endpoint enforcement in P0 with no compatibility layer.

## Context

P0 will mount assessment CRUD routes and finalize canonical auth endpoint structure. Legacy auth path aliases will not be maintained.

## Requirements

1. Update FE API client usage to canonical auth and assessment endpoints only.
2. Remove assumptions that legacy auth endpoint variants will continue working.
3. Validate all assessment management calls against `/api/v2/assessments/*` once mounted.

## Proposed Approach (Optional)

- Centralize FE endpoint constants and switch them in one cut.
- Run smoke tests on auth flows and assessment create/edit/publish/archive flows.

## Questions

1. Which FE surfaces still call legacy auth paths today (if any)?

## Timeline

- **Needed by:** ASAP
- **Blocking:** API contract/runtime gate hardening and route activation

---

## Response Section (For Recipient)

**Status:** Received
**Response Date:** 2026-02-13



---

*Move to `archive/` when thread is complete*
