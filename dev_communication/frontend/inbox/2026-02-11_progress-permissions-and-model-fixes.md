# API Fix: Course Progress, Permissions & Module Access

**Date:** 2026-02-11
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** Course auto-completion, missing questions, learner progress 403s

---

## Summary

We found and fixed **3 critical issues** preventing the course player from working correctly for learners:

### Fix 1: `course-taker` Missing `grades:own:read` Permission

The progress endpoints (`/api/v2/progress/course/:courseId`, `/api/v2/progress/program/:programId`, `/api/v2/progress/learner/:learnerId`) all require `grades:own:read`, but the `course-taker` role only had `learner:progress:read`. **Learners were getting 403 on all progress endpoints.**

**Fixed:** Added `grades:own:read` to `course-taker` role definition. Learners must re-login to pick up the new permission in their JWT.

### Fix 2: Progress Service Using Legacy Course Model

The progress service was using `Course.findById()` which looks in the empty `courses` collection. All courses are now in `canonicalcourses` (CanonicalCourse model). **Every progress query returned "Course not found" (404).**

**Fixed:** Progress service now resolves courses from both `CanonicalCourse` + `CourseVersion` and legacy `Course` model. Course name is resolved from the published `CourseVersion.title`.

### Fix 3: Module Access Routes Not Mounted

The `/api/v2/module-access` routes existed but were never registered in `app.ts`. **The UI could not record or retrieve module access data.**

**Fixed:** Routes now mounted at `/api/v2/module-access`. Also fixed invalid access right format (`read:analytics` → `analytics:reports:read`).

---

## Updated Endpoints Now Accessible to Learners

| Endpoint | Method | What It Does |
|---|---|---|
| `/api/v2/progress/course/:courseId` | GET | Course progress with module breakdown |
| `/api/v2/progress/program/:programId` | GET | Program progress with course breakdown |
| `/api/v2/progress/learner/:learnerId` | GET | Comprehensive learner progress overview |
| `/api/v2/progress/class/:classId` | GET | Class progress with attendance |
| `/api/v2/module-access` | POST | Record module access (when learner opens a module) |
| `/api/v2/module-access/my` | GET | Get learner's own module access records |
| `/api/v2/module-access/:accessId` | PUT | Update module progress (`mark_learning_unit_started`, `update_progress`, `mark_completed`) |

## Questions Endpoint Verified Working

`GET /api/v2/learning-units/:learningUnitId/questions` returns questions with `options`, `correctAnswers`, `distractors`, `explanation`, `matchingPairs` — all working for `course-taker` role.

## Action Required

- **Learners must re-login** after this fix to get updated JWT with `grades:own:read` permission
- If you're seeing "auto-complete" behavior, check if the UI was treating 403/404 progress responses as "completed" — that's now fixed at the API level

---

**Status:** Complete
**Response Date:** 2026-02-11
