# API-ISS-055: Remove API Prefixes and Normalize Endpoint Paths

## Status: PENDING
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: Product Owner
## Assigned To: Codex
## Related: ADR-API-001, ADR-API-004, ADR-API-003, API reassessment 2026-02-13

---

## Overview

Remove `/api/v2` and `/api` prefixes from all backend route surfaces and all related references (tests, fixtures, contracts, generated artifacts, docs, worker URLs) so the active API follows canonical prefixless resource paths.

This issue tracks planning and execution scope only. Development must not begin until explicit product-owner start approval is given.

---

## Requirements

1. Replace active prefixed paths with canonical prefixless paths (`/{resource}` style).
2. Update all internal and test references to match new paths.
3. Regenerate contract/openapi artifacts from normalized paths.
4. Remove obsolete prefixed-path references and route artifacts.
5. Ship as one no-compatibility migration.

---

## Technical Specification

### Target Path Policy

| Before | After |
|--------|-------|
| `/api/v2/courses` | `/courses` |
| `/api/v2/assessments/:assessmentId/attempts` | `/assessments/:assessmentId/attempts` |
| `/api/v2/assessment-attempts/:attemptId/grade` | `/assessment-attempts/:attemptId/grade` |

### Scope Areas

- `src/app.ts` route mounts
- `src/routes/**` and controller route comments
- `tests/**` integration/e2e path usage
- `contracts/**` source + generated outputs
- worker/service URL strings
- development communication docs referencing active endpoints

---

## Implementation

### Files to Modify/Create

| File/Area | Action | Description |
|-----------|--------|-------------|
| `src/app.ts` | Modify | Replace base mounts to prefixless paths |
| `src/routes/**` | Modify | Align route comments and path assumptions |
| `tests/**` | Modify | Rewrite endpoint URLs in tests and fixtures |
| `contracts/api/**` | Modify | Update endpoint contracts |
| `contracts/dist/**` | Regenerate | Refresh generated contract outputs |
| `dev_communication/**` | Modify | Update active endpoint references |

### Approach

One-shot migration aligned to ADR-API-004 with no compatibility layer.

---

## Tests Required

1. [ ] All integration suites pass with new prefixless endpoints.
2. [ ] Contract generation and validation pass.
3. [ ] No remaining `/api/v2` or `/api` runtime route references for active endpoints.

---

## Acceptance Criteria

- [ ] Prefixless route policy is implemented across runtime, tests, and contracts.
- [ ] No compatibility aliases retained.
- [ ] Generated artifacts updated and committed.
- [ ] Full API regression passes.

---

## Questions / Clarifications

1. **Start permission**
   Awaiting explicit product-owner go-ahead before implementation begins.

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
