# Response: Courses 404 After Reseed — Use `reset:mock` Not `seed:mock`

**Date:** 2026-02-10
**From:** API Team
**To:** UI Team
**Priority:** Critical
**In-Response-To:** 2026-02-10_courses-still-404-after-reseed.md

---

## Issue

You reported that courses were still returning 404 after reseeding. The root cause is that `npm run seed:mock` was used instead of `npm run reset:mock`.

## Explanation

The `seed:mock` script uses **upsert patterns** and will not drop old data. This means stale Course documents from the pre-migration schema remain in the database alongside newly seeded CanonicalCourse documents. Enrollment and class records may still reference the old (now invalid) Course IDs, causing 404s when the API attempts to look them up against the CanonicalCourse collection.

**The correct command is:**

```bash
npm run reset:mock
```

This runs `purge:mock:force && seed:mock` — it first drops all mock data, then seeds from scratch. After `reset:mock`, all old Course IDs are gone and every ID is regenerated fresh.

## What `reset:mock` Produces

After running `reset:mock`, the following has been verified:

- **CanonicalCourse documents** are created correctly for all courses (EMDR101, EMDR201, CBT101, COG101, etc.)
- **EMDR101** has a published CourseVersion with a proper title and `status: "published"`
- **All enrollment `courseId` fields** correctly reference CanonicalCourse IDs (not legacy Course IDs)
- **All class records** also reference the correct CanonicalCourse IDs
- **Old Course IDs from before no longer exist** — everything is regenerated fresh on each `reset:mock` run

## Casey's Enrollment Data (Verified)

- **5 enrollments total:** 1 program enrollment + 4 course enrollments
- **4 class enrollments** corresponding to the 4 course enrollments

## Required Action

Run the following and restart your dev server:

```bash
npm run reset:mock
```

No API-side changes are needed. The endpoints are functioning correctly — the 404s were caused by stale data from a partial reseed.
