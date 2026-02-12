# Fix: GET /courses/:id 404 — Seed + Service Migrated to New Course Model

**Date:** 2026-02-10
**From:** API Team
**To:** UI Team
**Priority:** Critical
**In-Response-To:** 2026-02-10_CRITICAL_courses-endpoint-returning-404.md

---

## Summary

Root cause confirmed and fixed. The seed script was creating courses in the old `Course` collection, but `courses.service.ts` (and `course-segments.service.ts`) query `CanonicalCourse`. The IDs you had were old `Course` document IDs that don't exist in `CanonicalCourse`.

## What Changed

### 1. Seed script (`scripts/seed-mock-data.ts`)

- **Replaced `ensureCourse()`** with `ensureCanonicalCourse()` — all 9 courses (BH101, BH201, CBT101, CBT201, EMDR101, EMDR201, COG101, COG201, COG301) now create `CanonicalCourse` + `CourseVersion` v1 (published).
- **Consolidated content creation** — `seedCourseContentData()` no longer creates duplicate CanonicalCourse records; it finds the one created by `ensureCanonicalCourse` and adds modules/LearningUnits to its existing CourseVersion.
- **Old `Course` model import removed** from seed.

### 2. Course segments service (`src/services/academic/course-segments.service.ts`)

- Migrated from old `Course` + `CourseContent` models to `CanonicalCourse` + `CourseVersion` + `CourseVersionModule` + `Module`.
- `GET /courses/:id/modules` now resolves `CanonicalCourse` → published `CourseVersion` → `CourseVersionModule` → `Module`.

## Action Required: Re-seed

After pulling this change, **you must purge and re-seed the mock database** to get clean data with new course IDs:

```bash
npm run reset:mock
```

This drops all collections and re-seeds from scratch. Running `seed:mock` alone will NOT work because the old `Course` collection records and stale IDs will persist.

The old course IDs (e.g., `697c18c23e9e6d1cc22e07d4`) will no longer exist. All course IDs will now be `CanonicalCourse` document IDs. The UI should resolve new IDs from `GET /enrollments` or `GET /classes` as before — no endpoint contract changes.

## Endpoints Affected

| Endpoint | Status | Notes |
|---|---|---|
| `GET /courses/:id` | Fixed | Now queries CanonicalCourse |
| `GET /courses/:id/modules` | Fixed | Returns modules via CourseVersionModule → Module |

## No Contract Changes

The response shapes for `GET /courses/:id` and `GET /courses/:id/modules` are unchanged. Only the internal model backing the queries changed. Course IDs will be different after re-seeding but all cross-references (enrollments, classes) will be consistent.

## Verification

- `npx tsc --noEmit` — 0 errors
- 58 new unit tests for `course-segments.service.ts`, all passing
- Full unit suite: 150/151 suites pass (1 pre-existing failure unrelated)
