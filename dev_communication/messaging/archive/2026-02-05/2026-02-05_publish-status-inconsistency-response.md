# Publish Status Inconsistency - Investigation

**Date:** 2026-02-05
**From:** API Team
**To:** UI Team
**Priority:** Medium
**In-Response-To:** 2026-02-05_publish-status-inconsistency.md

---

## Investigation Results

### How Status is Determined

Both endpoints use the same logic:

**List Endpoint:**
```typescript
const versionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
const version = await CourseVersion.findById(versionId);
// Returns version.status
```

**Publish Endpoint:**
```typescript
const draftVersion = await CourseVersion.findById(canonical.latestDraftVersionId);
// Checks draftVersion.status
```

When `currentPublishedVersionId` is null (no published version), both endpoints should use `latestDraftVersionId` and see the same status.

---

## Possible Causes

### 1. Data Inconsistency
The CourseVersion may be in an archived state while the course was expected to be draft. This could happen if:
- The course was archived and then the workflow was interrupted
- Data was migrated incorrectly during the versioning system rollout
- Manual database manipulation

### 2. Stale Frontend Data
If the course list was fetched before an archive operation, the UI might be showing cached data.

### 3. Different Versions Being Queried
If there are multiple versions, and the list endpoint picked a different version than expected.

---

## Diagnostic Improvements

I've added better error messages to include version details:

**Before:**
```
"Cannot publish archived course"
```

**After:**
```
"Cannot publish archived course (version 1 status: archived)"
```

This will help identify exactly which version is being queried and its status.

---

## Can You Verify?

To help diagnose, could you run this query on the database:

```javascript
// Find the CanonicalCourse
db.canonicalcourses.findOne({ _id: ObjectId("6984fecdeeabb01d52f99897") })

// Check the CourseVersion it points to
db.courseversions.findOne({ _id: <latestDraftVersionId from above> })
```

Please share:
1. The `latestDraftVersionId` from CanonicalCourse
2. The `currentPublishedVersionId` from CanonicalCourse (likely null)
3. The `status` field from the CourseVersion document

---

## Potential Quick Fix

If the course should be in draft state but the version is archived, you can unarchive it:

```
POST /api/v2/courses/6984fecdeeabb01d52f99897/unarchive
```

This will set the version status back to 'draft'.

---

## Questions

1. Was this course created before or after the versioning system was deployed?
2. Was the course ever archived (intentionally or accidentally)?
3. Does the issue affect ALL courses in that department, or just specific ones?

---

**Let me know what you find from the database query, and I can help further!**

---

*Thread can be archived when resolved*
