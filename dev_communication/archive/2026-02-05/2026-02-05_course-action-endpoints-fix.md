# Course Action Endpoints - Bug Fixed

**Date:** 2026-02-05
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-05_course-action-endpoints-model-mismatch.md

---

## Status: FIXED

The course action endpoints have been updated to use the new versioned course system (`CanonicalCourse` + `CourseVersion`).

---

## What Was Fixed

### Root Cause
The action endpoints (`publishCourse`, `unpublishCourse`, `archiveCourse`, `unarchiveCourse`) were querying the old `Course` model while the list endpoint had been migrated to use `CanonicalCourse` + `CourseVersion`.

### Solution
Updated all action methods in `src/services/academic/courses.service.ts` to:

1. **Find by CanonicalCourse** - Now queries `CanonicalCourse.findById(courseId)` instead of `Course.findById()`
2. **Get appropriate version** - Uses `latestDraftVersionId` or `currentPublishedVersionId` based on the action
3. **Update CourseVersion status** - Sets `status`, `publishedAt`, `lockedAt`, etc. on the version
4. **Update CanonicalCourse pointers** - Updates `currentPublishedVersionId` when publishing/unpublishing

---

## Endpoints Fixed

| Endpoint | Action |
|----------|--------|
| POST /api/v2/courses/:id/publish | Publishes the latest draft version |
| POST /api/v2/courses/:id/unpublish | Reverts published version to draft |
| POST /api/v2/courses/:id/archive | Archives the current version |
| POST /api/v2/courses/:id/unarchive | Restores archived version to draft |

---

## Test Coverage

All 15 tests pass:

```
POST /api/v2/courses/:id/publish
  ✓ should publish a draft course with at least one module
  ✓ should return 400 when publishing course without modules
  ✓ should return 409 when course is already published
  ✓ should return 404 for non-existent course
  ✓ should return 401 without auth token

POST /api/v2/courses/:id/unpublish
  ✓ should unpublish a published course
  ✓ should accept unpublish reason
  ✓ should return 409 when course is not published
  ✓ should return 404 for non-existent course

POST /api/v2/courses/:id/archive
  ✓ should archive a draft course
  ✓ should archive a published course
  ✓ should accept archive reason
  ✓ should return 409 when course is already archived
  ✓ should return 404 for non-existent course

Lifecycle
  ✓ should handle complete lifecycle (publish → unpublish → republish → archive)
```

---

## Response Format (Unchanged)

```json
{
  "success": true,
  "data": {
    "id": "CanonicalCourse ID",
    "status": "published|draft|archived",
    "publishedAt": "ISO date or null",
    "archivedAt": "ISO date or null"
  }
}
```

---

## Ready for Integration

The endpoints now work correctly with courses created using the versioned system. Course IDs from the list endpoint can now be used with action endpoints.

---

**Let us know if you encounter any other issues!**

---

*Thread can be archived when UI integration is verified*
