# Canonical Attempt + Media Parity Request

**Date:** 2026-02-13
**From:** UI Team
**To:** API Team
**Priority:** High
**Related Issues:** UI-ISS-156, UI-ISS-157, API-ISS-050

---

## Request

We need backend contract/runtime confirmation and likely API additions to complete canonical migration for staff grading and media library flows.

## Context

Frontend is removing legacy `/api/v2/exam-attempts/*` and `/api/v2/content/media*` usage.

Confirmed current backend state:
- Canonical assessment-attempt routes are mounted under `/api/v2/assessments/:assessmentId/attempts/*`.
- Legacy exam-attempt routes exist in source but are not mounted in `src/app.ts`.
- Canonical media routes are mounted under `/api/v2/media/*` with presigned upload flow.

Current UI dependencies that do not have clear canonical parity:
1. Staff grading dashboard currently needs an aggregate attempts list/filter surface (status/search/pagination across assessments), previously served by `/exam-attempts`.
2. Media library UI currently captures and displays title/description metadata and expects list/detail payload fields that are not clearly exposed in canonical `/media` list responses.
3. UI currently supports document uploads in content workflows (`type='document'`), while canonical media validation appears limited to image/video/audio MIME types.

## Requirements

1. Provide canonical replacement for staff grading aggregate queries previously using `/exam-attempts` list/filter.
2. Confirm canonical replacement for staff grading detail + grading actions where UI routes by `attemptId` only.
3. Confirm canonical media contract for title/description metadata parity in list/detail/create flows, or provide recommended UI downgrade behavior if those fields are intentionally removed.
4. Confirm supported contract for document uploads in staff content workflows (canonical media extension vs separate document endpoint).

## Proposed Approach (Optional)

Preferred canonical options (any equivalent is fine):
- Attempts: add staff-focused query endpoint (for example, assessment-attempt search/list by status/search with pagination) or provide a supported aggregator route.
- Media: expose metadata fields needed by content library (`title`, `description`) in `/media` list/detail responses, or document that filename-only UX is expected.
- Documents: if docs should remain supported, extend canonical upload/media contract to include document MIME types (or provide the canonical non-media upload endpoint for docs).

## Questions

1. What canonical endpoint should UI use for staff grading dashboard list/search/filter across assessments?
2. Can grading detail by `attemptId` remain supported without requiring UI to already know `assessmentId`?
3. For media, should UI persist title/description as metadata and expect it in list/detail payloads, or should UI migrate to filename-only display?
4. What is the canonical backend route/contract for document file uploads used in content authoring?

## Timeline

- **Needed by:** ASAP
- **Blocking:** Completion of UI-ISS-156 (legacy exam-attempt removal) and full UX parity in UI-ISS-157 (media migration)

---

## Response Section (For Recipient)

**Status:** Complete
**Response Date:** 2026-02-13

Implemented under `API-ISS-051` and now available in runtime + contracts.

1. Staff grading aggregate list/search/filter:
   - `GET /api/v2/assessment-attempts`
   - Query supports `status`, `search`, `assessmentId`, `learnerId`, `enrollmentId`, `sort`, `page`, `limit`.
2. Attempt detail + grading by `attemptId` only:
   - `GET /api/v2/assessment-attempts/:attemptId`
   - `POST /api/v2/assessment-attempts/:attemptId/grade`
3. Media metadata parity:
   - `title` and `description` are accepted in `POST /api/v2/media/upload-url`
   - persisted through confirm flow
   - returned by list/detail/update responses on `/api/v2/media`
4. Document uploads:
   - Canonical path remains `/api/v2/media/*`
   - `mediaType: document` and document MIME validation are supported.

Legacy `/api/v2/exam-attempts/*` and `/api/v2/content/media*` should remain removed on UI side.

---

*Move to `archive/` when thread is complete*
