# API → UI: Response — Learner Experience Feature Feasibility

**Date:** 2026-02-08
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Response
**In-Response-To:** `ui-to-api/2026-02-08_api-requirements-learner-experience-features.md`
**Related Issues:** API-ISS-025 through API-ISS-030, UI-ISS-096, UI-ISS-097, UI-ISS-100, UI-ISS-101, UI-ISS-102, UI-ISS-104

---

## Summary

We've reviewed all 6 API issues and the audio content question. All are feasible. Here's the breakdown by priority tier with design notes.

---

## 1. Exercise Retry Settings (API-ISS-025) — Effort: Low-Medium

**Assessment:** Mostly built. Infrastructure exists.

**What already exists:**
- `maxAttempts` field on both Exercise (`IMatchingConfig`) and Assessment (`IAttempts`) models
- `AssessmentAttempt` model with `attemptNumber`, `status`, `timing`, `scoring`
- Exam attempts route at `src/routes/exam-attempts.routes.ts`
- Assessment model already supports retry policy: `anytime | after_cooldown | instructor_unlock` with `cooldownMinutes`

**What we need to add:**
- `gradingPolicy: 'best' | 'last' | 'average'` field on Assessment model
- Service-layer enforcement of `maxAttempts` on POST (reject if limit reached)
- Ensure `attemptNumber` and `maxAttempts` are returned in exam attempt responses
- Verify/create `GET /api/v2/exercises/:exerciseId/attempts?learnerId=:id`

**No blockers.** Can start immediately.

---

## 2. Certificate PDF Generation (API-ISS-026) — Effort: Medium

**Assessment:** Models and routes are complete. Need PDF generation only.

**What already exists:**
- `CertificateDefinition`, `CertificateIssuance`, `CertificateRequirement` models — all complete
- Full certificate routes: manual issuance, revocation, upgrade, public verification (`/verify/:code`)
- `pdfUrl` field already on CertificateIssuance model (currently unused)
- S3/AWS infrastructure in place for file storage

**What we need to add:**
- Install PDF library (PDFKit recommended — lightweight, server-side)
- Create `GET /api/v2/certificates/:issuanceId/pdf` endpoint
- Service to generate PDF with: learner name, course/program, completion date, grade, verification code, signatory
- Store generated PDF to S3, cache URL in `pdfUrl` field

**Design decision:** We'll go server-side generation with S3 storage. First request generates + stores; subsequent requests return cached URL.

---

## 3. Learner Exception System (API-ISS-027) — Effort: Medium

**Assessment:** Pieces exist but scattered. Need unified model.

**What already exists:**
- `AccessExtensionRequest` model — learner-initiated access extension requests
- `ProgramAccessOverride` model — admin-level program overrides
- Grade override route at `PUT /api/v2/enrollments/:enrollmentId/grades/override` with `academic:grades:override` permission and immutable audit log
- Enrollment model has `accessExpiresAt`, `accessExtendedAt`, `accessExtensionReason` fields

**What we need to build:**
- Unified `LearnerException` model consolidating all exception types
- All 5 exception POST endpoints as specified in your request
- `GET /api/v2/enrollments/:id/exceptions` for listing
- Service enforcement: teach exam-attempts, content access, etc. to check for exceptions

**Design note:** We'll extend the existing `GradeChangeLog` audit pattern to all exception types. Every exception will log: reason, grantedBy, timestamp. Permission: `enrollment:exceptions:manage`.

**Your endpoint design looks good — we'll follow it as proposed.**

---

## 4. Discussion Forum (API-ISS-028) — Effort: Medium-High

**Assessment:** Greenfield — nothing exists yet.

**What exists:**
- `content:discussions:moderate` permission already defined in role migration
- Established model/service/route patterns to follow

**What we need to build:**
- `Discussion` model (thread) and `DiscussionReply` model
- All 9 endpoints as specified
- Discussion and reply services
- Permissions: `content:discussions:read`, `content:discussions:create`, `content:discussions:moderate`

**Design notes:**
- Thread model will match your proposed shape exactly
- Rich text body stored as markdown
- Soft delete with `isDeleted` (per project conventions)
- Department-scoped: discussions inherit department from course

**Your proposed API design is solid — no changes needed.**

---

## 5. Assignment Submission System (API-ISS-029) — Effort: Medium

**Assessment:** Greenfield but infrastructure ready.

**What exists:**
- `assignment` already exists as a ContentType enum value
- S3 file upload infrastructure ready (AWS SDK, MediaUploadRequest pattern)
- No Assignment or Submission models yet

**What we need to build:**
- `Assignment` model and `Submission` model (matching your proposed shapes)
- 6 endpoints as specified
- File upload integration using existing S3 presigner
- Grading service

**Dependency:** API-ISS-012 (Media Upload) — please confirm current status. We have S3 infrastructure but need to verify the presigned URL flow is complete for arbitrary file types.

**Your model designs look good. We'll follow them as proposed.**

---

## 6. Learner Program Enrollment & Progress (API-ISS-030) — Effort: Low

**Assessment:** Mostly exists. Just need learner-facing endpoints.

**What already exists:**
- `Program` model — fully implemented (ProgramType, certificate config, hierarchy, prerequisites)
- `Enrollment` model — fully implemented with program enrollment support (status: pending/active/suspended/withdrawn/completed/graduated/expired)
- Program routes: `GET /programs`, `GET /programs/:id`, `GET /programs/:id/enrollments`, `GET /programs/:id/courses`
- Program access override and policy system

**What we need to add:**
- `POST /api/v2/programs/:programId/enroll` — learner self-enrollment
- `GET /api/v2/learners/:learnerId/program-enrollments`
- `GET /api/v2/program-enrollments/:enrollmentId/progress` — per-course completion status

**Answers to your questions:**
1. **Auto-enroll in courses?** We recommend enrolling in the first unlocked course(s) only, not all. Subsequent courses unlock as prerequisites are met. This matches our existing access policy patterns.
2. **Sequential vs branching?** The Program model supports `parentProgramId` and hierarchical structure. We can support both sequential and prerequisite-based unlocking. Recommend starting with sequential (ordered by `order` field) with prerequisite checks.
3. **Shared model?** Yes — the Enrollment model already serves both admin and learner contexts. Learner-facing endpoints will use the same model with permission-filtered responses.

---

## 7. Audio Content Type (UI-ISS-104) — CONFIRMED: Trivial

**Current ContentType enum:** `'scorm' | 'video' | 'document' | 'quiz' | 'assignment' | 'external-link' | 'text'`

**Audio is NOT currently supported** but adding it is a one-line enum change. Audio files would use the same `fileUrl` + `mimeType` pattern as video. No new endpoints needed — existing content CRUD handles it.

**We'll add `'audio'` to the ContentType enum as part of the first batch.**

---

## Priority & Sequencing

| Priority | Issue | Feature | Effort | Dependencies |
|----------|-------|---------|--------|-------------|
| **P1** | UI-ISS-104 | Audio content type | Trivial | None |
| **P1** | API-ISS-025 | Exercise retry settings | Low-Medium | None |
| **P1** | API-ISS-030 | Program enrollment (learner) | Low | None |
| **P2** | API-ISS-026 | Certificate PDF | Medium | PDF library |
| **P2** | API-ISS-027 | Learner exceptions | Medium | None |
| **P3** | API-ISS-028 | Discussion forum | Medium-High | None |
| **P3** | API-ISS-029 | Assignment submission | Medium | API-ISS-012 |

**Rationale:** P1 items have most infrastructure in place and unblock existing UI work. P2 items need new models but are self-contained. P3 items are greenfield features for the next phase.

---

## Next Steps

1. We'll start P1 items immediately
2. Please confirm the auto-enrollment behavior for programs (first course only vs all courses)
3. Please confirm API-ISS-012 (Media Upload) status for assignment file uploads
4. We'll send progress updates as each issue is completed

---

*Respond to: `ui-to-api/` or update related issues directly*
