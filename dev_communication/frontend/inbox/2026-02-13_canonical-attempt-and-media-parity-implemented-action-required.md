# Canonical Attempt + Media Parity - Implemented (Action Required)

**Date:** 2026-02-13
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-13_canonical-attempt-and-media-parity-request.md
**Related Issues:** API-ISS-051 (complete), UI-ISS-156, UI-ISS-157

---

## Status

Complete

## Summary

Canonical staff grading aggregate + attemptId-only grading/detail endpoints are now live, and canonical media contract now includes title/description parity and document upload support.

---

## Implementation Details

### New/Confirmed Canonical Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/assessment-attempts` | Staff aggregate list/search/filter across assessments |
| GET | `/api/v2/assessment-attempts/:attemptId` | Attempt detail by attemptId |
| POST | `/api/v2/assessment-attempts/:attemptId/grade` | Staff grading by attemptId |

### Media Contract Parity

| Surface | Change |
|--------|--------|
| `POST /api/v2/media/upload-url` | accepts optional `title`, `description` |
| `POST /api/v2/media/confirm` | returns persisted `title`, `description` |
| `GET /api/v2/media` | list rows include `title`, `description` |
| `GET /api/v2/media/:mediaId` | detail includes `title`, `description` |
| `PUT /api/v2/media/:mediaId` | supports updating `title`, `description` |
| Media types | `document` supported in canonical media upload/list/validation |

### Query/Filter Notes

`GET /api/v2/assessment-attempts` query supports:
- `status`, `search`, `assessmentId`, `learnerId`, `enrollmentId`, `sort`, `page`, `limit`

---

## Response to Questions

1. **What canonical endpoint should UI use for staff grading dashboard list/search/filter across assessments?**
   Use `GET /api/v2/assessment-attempts`.

2. **Can grading detail by attemptId remain supported without requiring UI to already know assessmentId?**
   Yes. Use `GET /api/v2/assessment-attempts/:attemptId` and `POST /api/v2/assessment-attempts/:attemptId/grade`.

3. **For media, should UI persist title/description metadata and expect it in list/detail payloads?**
   Yes. Title/description are canonical and returned in list/detail/update flows.

4. **What is the canonical backend route/contract for document uploads?**
   Continue using canonical `/api/v2/media/*`; `document` MIME types are now first-class in validation and filtering.

---

## Next Steps

- [ ] UI remove all remaining `/api/v2/exam-attempts/*` usage.
- [ ] UI remove all remaining `/api/v2/content/media*` usage.
- [ ] UI switch staff grading dashboard to `/api/v2/assessment-attempts` aggregate and attemptId-only detail/grade routes.
- [ ] UI consume `title`/`description` + `document` support from canonical `/api/v2/media`.

---

## Integration Notes

- This is implemented ideal-first; no compatibility layer is provided for legacy endpoints.
- Contracts have been updated and contract validation passes.

