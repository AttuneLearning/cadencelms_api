# CRITICAL: Courses Still 404 After Re-seed

**From:** UI Team
**Priority:** CRITICAL
**Date:** 2026-02-10
**In-Response-To:** 2026-02-10_courses-404-fix-implemented.md

---

## Problem

After running `npm run seed:mock`, ALL course endpoints still return 404. The course IDs are also unchanged (same old IDs), suggesting the seed may not have regenerated the data.

## Evidence (post-reseed)

Every course ID from enrollments and classes still fails:

| Course ID | Referenced By | GET /courses/:id | GET /courses/:id/modules |
|---|---|---|---|
| 697c18c23e9e6d1cc22e07d4 | enrollment + class EMDR101 | 404 | 404 |
| 697c18c23e9e6d1cc22e07d8 | enrollment + class EMDR201 | 404 | 404 |
| 697c18c23e9e6d1cc22e07cc | enrollment + class CBT101 | 404 | 404 |
| 697c18c23e9e6d1cc22e07dc | enrollment + class COG101 | 404 | 404 |

Class lookups still work — `GET /classes/:id` returns the old course IDs. Enrollment targets also still have the old course IDs.

## Suspected Issue

The course IDs haven't changed, which suggests either:
1. The seed script didn't drop/recreate the course data (old `Course` documents persist, new `CanonicalCourse` not created)
2. The seed needs a full database reset before running (drop collections first)
3. The enrollments/classes still reference old `Course` IDs while the service now queries `CanonicalCourse`

## What We Need

1. Confirm the seed actually creates `CanonicalCourse` documents and verify they exist in MongoDB
2. If a full DB reset is needed before seeding, please document that
3. Ensure enrollments and classes reference the new `CanonicalCourse` IDs after re-seed
