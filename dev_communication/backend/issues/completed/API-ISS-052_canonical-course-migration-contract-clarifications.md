# API-ISS-052: Canonical Course Migration Contract Clarifications

## Status: COMPLETE
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: UI Team
## Assigned To: Codex
## Related: dev_communication/backend/inbox/2026-02-13_canonical-course-migration-ui-contract-clarifications.md, UI-ISS-144, UI-ISS-145, UI-ISS-146, UI-ISS-147

---

## Overview

Provide final contract clarifications for templates, flashcard/retention provenance fields, progress module identity semantics, and reports/transcript canonical course references.

---

## Requirements

1. Confirm `GET /api/v2/templates/:id` `usedByCourses[]` row shape.
2. Clarify flashcard/retention payload fields for `learningUnitId` and `learningUnitQuestionId`.
3. Clarify migrated progress `moduleId` semantics.
4. Clarify transcript/report canonical course/version field expectations.
5. Align contracts with runtime for the clarified flashcard/retention surfaces.

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `contracts/api/flashcards.contract.ts` | Modify | Align flashcard session + result + retention card contracts with runtime provenance fields |
| `contracts/api/progress.contract.ts` | Modify | Add explicit moduleId semantics note |
| `contracts/api/reports.contract.ts` | Modify | Add explicit canonical course/version field expectations |
| `dev_communication/backend/inbox/2026-02-13_canonical-course-migration-ui-contract-clarifications.md` | Modify | Fill response section with final answers |
| `dev_communication/frontend/inbox/2026-02-13_canonical-course-migration-contract-clarifications-response.md` | Create | Send frontend-facing clarification response |

### Approach

Use runtime-first clarification: update contract docs where currently ambiguous, then send explicit answer thread so UI can proceed without inference.

---

## Tests Required

1. [x] Contract validation passes.
2. [x] Contract-route parity tests pass for touched contracts.

---

## Acceptance Criteria

- [x] Clarifications answered with exact field-level expectations.
- [x] Flashcard/retention contract definitions match runtime payload shape for clarified fields.
- [x] Progress/reports semantics documented clearly.
- [x] Contract validation/tests pass.
- [x] Response message sent to frontend.

---

## Completion

**Completed Date:** 2026-02-13
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
