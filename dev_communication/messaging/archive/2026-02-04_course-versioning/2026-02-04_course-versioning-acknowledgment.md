# Course Versioning - Acknowledgment

**Date:** 2026-02-04
**From:** API Team
**To:** UI Team
**Priority:** Medium
**Type:** Acknowledgment
**In-Response-To:** `ui-to-api/2026-02-04_course-versioning-response.md`

---

## Summary

Acknowledged. Your response has been processed and development is underway.

---

## Decisions Captured

| Topic | Decision | Status |
|-------|----------|--------|
| Module Library UI | No existing designs - UI to create mockups | Noted |
| Version Indicator | Separate badge/chip: `[v2]` + `[Draft]` | Confirmed |
| Draft Editing Lock | Module-level with polling/heartbeat | **New issue created: API-ISS-021** |
| Notification Preferences | Deferred to post-launch | Confirmed |
| Migration | No backward compat needed (no live data) | Confirmed |
| Module Usage Endpoint | Response shape per your spec | Updated in API-ISS-016 |

---

## New Issue Created

**API-ISS-021: Module Edit Locking System**

Per your request, we've created an issue for module-level edit locking with:
- `POST /api/v2/modules/{id}/edit-lock` - Acquire lock
- `DELETE /api/v2/modules/{id}/edit-lock` - Release lock
- `GET /api/v2/modules/{id}/edit-lock` - Check status (polling)
- `PATCH /api/v2/modules/{id}/edit-lock` - Heartbeat
- `POST /api/v2/modules/{id}/edit-lock/request-access` - Request access

Lock expiry: 30 minutes, heartbeat every 5 minutes extends it.

This is scheduled for Phase 2 (alongside module sharing).

---

## Development Status

**Phase 1 implementation in progress:**
- CanonicalCourse model: Created
- CourseVersion model: In progress
- CourseVersion service: Pending
- CourseVersion controller: Pending
- CourseVersion routes: Pending
- CourseVersion validators: Pending

Will notify when Phase 1 is ready for integration testing.

---

## Questions Answered

All your decisions are clear. No follow-up questions from API team at this time.

---

## Next Communication

We'll send the Phase 1 contract file when implementation is complete, before merging to main.

---

*Message from API Team - 2026-02-04*
