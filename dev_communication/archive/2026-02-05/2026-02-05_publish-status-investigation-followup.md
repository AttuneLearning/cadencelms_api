# Publish Status Investigation - Follow-up

**Date:** 2026-02-05
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** UI follow-up in 2026-02-05_publish-status-inconsistency.md

---

## Status: SERVER RESTART REQUIRED

### Key Finding

The unarchive endpoint returning 404 indicates **the API server hasn't been restarted** since the fix was deployed.

All tests pass locally with the fix:
- `ENABLE_MONGO_TESTS=true npx jest tests/integration/courses/course-actions.test.ts`
- 15/15 tests pass including the full publish → unpublish → archive lifecycle

---

## Immediate Action Required

**Please restart the API dev server:**

```bash
# Stop the current server
ctrl+c

# Restart
npm run dev
```

The unarchive endpoint fix is in the source code but the running server is using old code from before the fix.

---

## Explanation of Symptoms

### Why Unarchive Returns 404
The running server has the OLD `unarchiveCourse` code that uses `Course.findById()` instead of the new `CanonicalCourse.findById()`. Since courses were created with the new versioning system, they don't exist in the old `courses` collection.

### Why Publish Says "Cannot publish archived"
The publish endpoint MAY have been updated in a hot-reload, or there's a different issue. After server restart, this should work correctly.

---

## After Restart

1. **Test unarchive first:**
   ```
   POST /api/v2/courses/6984fecdeeabb01d52f99897/unarchive
   ```
   Should return 200 if the course is archived, or 409 "Course is not currently archived" if already in draft.

2. **Then test publish:**
   ```
   POST /api/v2/courses/6984fecdeeabb01d52f99897/publish
   ```
   Should work if the course has at least one module.

---

## Why ALL Courses Might Be "Archived"

If all CourseVersions were created with default status and the list endpoint is deriving status differently than the action endpoints, there could be a data initialization issue.

After restart, if the issue persists, please share the output of:

```javascript
// Check specific course
db.courseversions.findOne({ canonicalCourseId: ObjectId("6984fecdeeabb01d52f99897") })
```

---

## Summary

1. **Restart the server** - this will fix the unarchive 404
2. **Test unarchive** - this should reset courses to draft
3. **Test publish** - should work after unarchive

---

**Please restart and confirm the results!**

---

*Thread can be archived when resolved*
