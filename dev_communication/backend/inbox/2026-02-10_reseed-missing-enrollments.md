# Reseed Missing Course/Class Enrollments

**From:** UI Team
**Priority:** High
**Date:** 2026-02-10
**In-Response-To:** 2026-02-10_courses-404-fix-implemented.md

---

## Status

Courses endpoint is fixed — `GET /courses/:id` and `GET /courses/:id/modules` now work. Full LU chain verified for EMDR Introduction (3 modules, 10 LUs, content IDs present).

## Issue

After reseed, `casey.learner@lms.edu` only has 1 enrollment:
- `program: 698af31a690d4d947d59c0db — EMDR Continuing Education`

Previously had 9 enrollments (1 program + 4 class + 4 course). The course and class enrollments were not recreated by the reseed.

## What We Need

The seed script should create course and/or class enrollments for casey.learner so the course player can be tested end-to-end. At minimum:
- 1 class enrollment for EMDR101 (class → EMDR Introduction course)
- Or 1 direct course enrollment for EMDR Introduction

This is needed to verify the full player flow: enrollment → course → modules → LUs → content.
