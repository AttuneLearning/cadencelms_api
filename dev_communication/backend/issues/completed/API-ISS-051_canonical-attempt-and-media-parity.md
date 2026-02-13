# API-ISS-051: Canonical Attempt + Media Parity

## Status: COMPLETE
## Priority: High
## Created: 2026-02-13
## Updated: 2026-02-13
## Requested By: UI Team
## Assigned To: Codex
## Related: dev_communication/backend/inbox/2026-02-13_canonical-attempt-and-media-parity-request.md, UI-ISS-156, UI-ISS-157, API-ISS-050

---

## Overview

Provide canonical backend parity for staff grading and media library migration after legacy `/exam-attempts` and `/content/media*` surface removal.

---

## Requirements

1. Add canonical staff-facing aggregate assessment-attempt query surface (status/search/pagination across assessments).
2. Add canonical attemptId-only detail and grading actions for staff workflows.
3. Add canonical media title/description metadata parity in upload/list/detail/update flows.
4. Extend canonical media upload support to document MIME types for staff content workflows.
5. Update contracts and add tests for new behavior.

---

## Technical Specification

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/assessment-attempts` | Staff aggregate attempt list/search/filter |
| GET | `/api/v2/assessment-attempts/:attemptId` | Attempt detail by attemptId (no assessmentId path requirement) |
| POST | `/api/v2/assessment-attempts/:attemptId/grade` | Manual grading by attemptId |

### Media Contract Extensions

- Include `title` and `description` metadata fields in canonical media create/list/detail/update payloads.
- Support `document` media type for upload/list filtering and validation.

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/routes/v2/assessment-attempts-global.routes.ts` | Create | Canonical top-level attempt routes |
| `src/controllers/progress/assessment-attempts.controller.ts` | Modify | Add staff aggregate/detail/grade handlers |
| `src/services/progress/assessment-attempts.service.ts` | Modify | Add aggregate query + attempt-by-id access paths |
| `src/app.ts` | Modify | Mount canonical top-level attempt routes |
| `src/config/storage.config.ts` | Modify | Add document constraints |
| `src/models/content/MediaAttachment.model.ts` | Modify | Add `document` type + title/description fields |
| `src/models/content/MediaUploadRequest.model.ts` | Modify | Persist title/description through upload workflow |
| `src/services/content/media.service.ts` | Modify | Carry title/description and document support |
| `src/controllers/content/media.controller.ts` | Modify | Expose title/description + document type filtering |
| `contracts/api/assessment-attempts.contract.ts` | Modify | Document canonical staff aggregate/attemptId-only endpoints |
| `contracts/api/media.contract.ts` | Modify | Document title/description/document support |
| `contracts/types/media-types.ts` | Modify | Add `document` media type + metadata fields |
| `tests/unit/...` | Create/Modify | Coverage for attempt aggregate and media document/metadata parity |

### Approach

Implement canonical endpoints and type model directly (no compatibility shims), align contracts to runtime, then validate with targeted tests plus contract/type gates.

---

## Tests Required

1. [x] Staff aggregate attempt list/search/filter works with pagination.
2. [x] Attempt detail/grade by attemptId works without assessmentId path dependency.
3. [x] Media title/description persist and return in list/detail/update.
4. [x] Document MIME uploads validate and succeed for canonical media upload flow.

---

## Acceptance Criteria

- [x] Canonical staff grading aggregate/list/detail/grade surfaces available.
- [x] Media metadata parity (`title`, `description`) available in canonical flows.
- [x] Document uploads supported in canonical media route.
- [x] Contracts updated to match runtime behavior.
- [x] Tests pass
- [x] Code reviewed

---

## Implementation Notes

- This issue is the backend follow-up for UI migration blockers after API-ISS-050.
- Direction remains ideal-first endpoint/type structure with no legacy compatibility maintenance.

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
