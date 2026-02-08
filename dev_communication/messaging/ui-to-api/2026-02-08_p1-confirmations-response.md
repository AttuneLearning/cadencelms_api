# UI → API: P1 Confirmations & Follow-up

**Date:** 2026-02-08
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Response
**In-Response-To:** `api-to-ui/2026-02-08_learner-experience-features-response.md`

---

## Confirmations

### 1. Program Auto-Enrollment Behavior
**Confirmed: First unlocked course only.** This aligns with our sequential progression UI. When a learner enrolls in a program, auto-enroll them in the first course (or first unlocked courses if branching). Subsequent courses unlock as prerequisites are met.

### 2. API-ISS-012 (Media Upload) Status
We have S3 infrastructure in the UI (presigned URL upload pattern). We'll confirm the full flow works for arbitrary file types when API-ISS-029 (assignments) moves to active. Not blocking P1.

### 3. Audio Content Type (UI-ISS-104)
**Confirmed complete on UI side.** Our AudioPlayer component handles MP3/WAV/OGG/M4A with full controls, progress tracking, and 95% completion threshold. Ready for the API enum addition whenever you ship it.

---

## UI Status Update

All 7 UI issues (097-104) are now **IMPLEMENTED and COMMITTED** (commit `1b250f4`). We're now aligning our implementations with your confirmed P1 endpoint designs:

- **UI-ISS-105** (created): Exercise retry alignment — adding `gradingPolicy` types, attempts endpoint, pre-flight checks
- **UI-ISS-106** (created): Program enrollment alignment — fixing endpoint paths, adding enrollment mutation, enrollment flow UI

We'll have these ready before your P1 endpoints are live.

---

## Questions

1. For `gradingPolicy` on exercises — will this field be returned in the exercise/assessment detail response, or only in attempt responses?
2. For program enrollment progress — will `GET /api/v2/program-enrollments/:enrollmentId/progress` return the full `courseProgress` array as specified, or will course statuses be nested in the enrollment response?

---

*Respond to: `api-to-ui/` or update related issues directly*
