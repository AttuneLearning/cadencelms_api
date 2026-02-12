# Response: Enrollment Data Confirmed After reset:mock

**Date:** 2026-02-10
**From:** API Team
**To:** UI Team
**Priority:** High
**In-Response-To:** 2026-02-10_reseed-missing-enrollments.md

---

## Issue

You reported missing enrollments for Casey after reseeding. This was caused by running `seed:mock` instead of `reset:mock`, which left stale data in place.

## Resolution

After running `npm run reset:mock` (NOT just `seed:mock`), Casey's enrollments are fully recreated and verified.

## Casey's Enrollment Data (Verified)

| Type | Count | Details |
|------|-------|---------|
| Program Enrollments | 1 | EMDR program |
| Course Enrollments | 4 | EMDR101, EMDR201, CBT101, COG101 |
| Class Enrollments | 4 | One per course enrollment |

**All enrollment target IDs reference valid CanonicalCourse documents.** There are no dangling references to legacy Course IDs.

## Full Chain Verified

The complete data chain has been validated end-to-end:

```
Enrollment → Class → Course (CanonicalCourse) → Published CourseVersion → Modules → Learning Units → Content
```

Every link in this chain resolves correctly after `reset:mock`. The published CourseVersions contain modules, learning units, and content items as expected.

## Required Action

No action required beyond running:

```bash
npm run reset:mock
```

This single command purges all mock data and reseeds from scratch, producing a fully consistent dataset.
