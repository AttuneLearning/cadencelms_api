# CRITICAL: GET /courses/:id Returns 404 for ALL Courses

**From:** UI Team
**Priority:** CRITICAL — Blocks all course playback
**Date:** 2026-02-10

## Problem

`GET /api/v2/courses/:id` returns 404 for **every** course ID, even though these courses exist and are referenced by other endpoints.

## Evidence

Tested as `casey.learner@lms.edu`:

| Endpoint | ID | Result |
|---|---|---|
| `GET /courses/697c18c23e9e6d1cc22e07d4` | EMDR Introduction | **404** |
| `GET /courses/697c18c23e9e6d1cc22e07d8` | EMDR Practicum | **404** |
| `GET /courses/697c18c23e9e6d1cc22e07cc` | CBT Foundations | **404** |
| `GET /courses/697c18c23e9e6d1cc22e07dc` | Cognitive Assessment | **404** |
| `GET /courses/:id/modules` | (all above) | **404** |

These same course IDs work fine when referenced from other endpoints:
- `GET /enrollments` → returns course enrollments with `target.id = 697c18c23e9e6d1cc22e07d4`
- `GET /classes/:id` → returns `course.id = 697c18c23e9e6d1cc22e07d4` with title "EMDR Introduction"

## Impact

- **Zero courses can be played** — CoursePlayerPage depends on `GET /courses/:id` and `GET /courses/:id/modules`
- This affects every learner for every course
- The UI Course Player cannot render any content

## Suspected Cause

The commit `41c1a20` migrated course CRUD methods to use `CanonicalCourse` + `CourseVersion` models. The `getCourseById` service may be querying the wrong collection or using the wrong model. The seed data may have created courses in the old format that the new model can't find.

## What We Need

1. Fix `GET /courses/:id` to return course data for existing course IDs
2. Fix `GET /courses/:id/modules` to return modules
3. Confirm whether this is a model mismatch or a permissions/RBAC issue (tested as learner only, but course enrollments for this user exist with these exact IDs)

## UI Status

We have implemented class-ID-to-course-ID resolution in the CoursePlayerPage, so class enrollment links will work once the courses endpoint is fixed. All UI unit tests pass (4,876 tests, 0 failures).
