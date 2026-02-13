# API Contract to Runtime Alignment Audit (Good / Okay / Bad)

**Date:** 2026-02-13  
**Team:** API  
**Scope:** `contracts/api/*` against current runtime routes/controllers/models in `src/`

## Evidence Snapshot

- `npm run contracts:validate`
- `npm run contracts:export`
- `npm run contracts:docs`
- Endpoint parity scan (contract `method+endpoint` vs mounted Express routes)
- Integration verification already run for assessment/learning-unit/question area:
`tests/integration/assessment-attempts/assessment-attempts.test.ts`, `tests/integration/learning-units/learning-units.test.ts`, `tests/integration/learning-unit-questions/learning-unit-questions.test.ts`, `tests/integration/questions/questions-bulk.test.ts`, `tests/integration/question-banks/question-banks.test.ts`, `tests/integration/department-questions/department-questions.test.ts` (all passing)

## Quantitative Summary

- Contract files discovered: `53`
- `contracts:validate`: `55` errors, `102` warnings
- `contracts:export`: `42` exported, `9` failed to compile, `2` skipped (no `*Contract` export)
- `contracts:docs`: partial generation succeeded but many contracts failed/skipped
- Endpoint parity scan: `362` parsed contract endpoints, `324` matched, `38` unmatched before manual filtering

## Good

- Assessment attempt lifecycle contract is aligned with runtime behavior and tested.
Path references: `contracts/api/assessment-attempts.contract.ts`, `src/routes/v2/assessment-attempts.routes.ts`, `src/validators/assessment-attempt.validator.ts`, `src/models/progress/AssessmentAttempt.model.ts`
- Learning unit + question linking endpoints are coherent and backed by integration tests.
Path references: `contracts/api/learning-units.contract.ts`, `contracts/api/learning-unit-questions.contract.ts`, `src/routes/v2/learning-units.routes.ts`, `src/routes/v2/learning-unit-questions.routes.ts`, `src/models/content/LearningUnitQuestion.model.ts`
- Department question bank/question endpoints are consistent and stable in integration coverage.
Path references: `contracts/api/question-banks.contract.ts`, `src/routes/department-question-banks.routes.ts`, `src/routes/department-questions.routes.ts`
- Core progress models use strong indexing and explicit enums.
Path references: `src/models/progress/AssessmentAttempt.model.ts`, `src/models/progress/ModuleAccess.model.ts`

## Okay

- Mixed contract styles exist (endpoint maps, schema-only files, type-only docs). This is workable but weakens single-source-of-truth guarantees.
Path references: `contracts/api/report-jobs.contract.ts`, `contracts/api/report-templates.contract.ts`, `contracts/api/certificate-templates.contract.ts`
- Several contracts intentionally include non-endpoint metadata (`resource`, `version`, internal function signatures). Current validator treats these as endpoint objects and reports false structural failures.
Path references: `contracts/api/authorization.contract.ts`, `contracts/api/permissions.contract.ts`, `contracts/api/roles.contract.ts`, `scripts/validate-contracts.ts`
- AI quiz endpoints are explicitly shell-only (`501 Not Implemented`). This is acceptable if clearly marked as non-production behavior.
Path references: `contracts/api/learning-unit-questions.contract.ts`, `src/routes/v2/ai-quiz.routes.ts`
- Overlapping media surfaces (`/api/v2/content/media` and `/api/v2/media`) can be intentional, but contract ownership is fragmented.
Path references: `contracts/api/content.contract.ts`, `contracts/api/media.contract.ts`, `src/routes/content.routes.ts`, `src/routes/media.routes.ts`

## Bad

- Assessments router exists but is not mounted in app; all `/api/v2/assessments` contract endpoints are unreachable.
Path references: `src/routes/v2/assessments.routes.ts`, `src/app.ts`
- High-value contract files fail compilation and are excluded from clean contract generation.
Path references: `contracts/api/admin-roles.contract.ts`, `contracts/api/auth-v2.contract.ts`, `contracts/api/demographics.contract.ts`, `contracts/api/flashcards.contract.ts`, `contracts/api/matching-exercises.contract.ts`, `contracts/api/media.contract.ts`, `contracts/api/report-schedules.contract.ts`, `contracts/api/report-templates.contract.ts`, `contracts/api/user-type-revision.contract.ts`
- Some contract files are skipped because they do not export `*Contract` or `*Contracts`, so they are effectively undocumented in generated artifacts.
Path references: `contracts/api/certificate-templates.contract.ts`, `contracts/api/report-jobs.contract.ts`
- Major endpoint drift clusters:
- Auth contract vs runtime paths/methods diverge (`/register`, `forgot-password`, `reset-password`, `change-password`).
Path references: `contracts/api/auth.contract.ts`, `contracts/api/auth-v2.contract.ts`, `src/routes/auth.routes.ts`
- Module access contract paths diverge from runtime (`/modules/:moduleId/access` style vs `/api/v2/module-access` resource style).
Path references: `contracts/api/module-access.contract.ts`, `src/routes/v2/module-access.routes.ts`
- Flashcard authoring contract is module-scoped, but runtime flashcard/retention surface is course-scoped and question-based.
Path references: `contracts/api/flashcards.contract.ts`, `src/routes/flashcard.routes.ts`, `src/routes/retention-check.routes.ts`, `src/models/activity/FlashcardProgress.model.ts`, `src/models/content/CourseFlashcardConfig.model.ts`
- Grade override contract path drift (`/grade/...` vs runtime `/grades/...`).
Path references: `contracts/api/enrollments.contract.ts`, `src/routes/grade-override.routes.ts`
- OpenAPI/export tooling silently produces partial outputs while reporting many contract failures, increasing risk of distributing incomplete specs.
Path references: `scripts/export-contracts.ts`, `scripts/generate-openapi.ts`, `contracts/dist/openapi.yaml`, `contracts/dist/contracts.json`
- Contract types drift from runtime model/controller constraints in media domain (provider and purpose enums differ).
Path references: `contracts/types/media-types.ts`, `contracts/api/media.contract.ts`, `src/models/content/MediaAttachment.model.ts`, `src/controllers/content/media.controller.ts`, `src/config/storage.config.ts`

## Recommendations

### P0 (Immediate)

1. Mount assessments router in `src/app.ts` (`app.use('/api/v2/assessments', assessmentsRoutes)`).
2. Define canonical auth endpoint set and align both contracts and routes in one pass (`auth.contract.ts`, `auth-v2.contract.ts`, `src/routes/auth.routes.ts`).
3. Add CI quality gate that fails on any contract compile/export/doc generation failure (no partial success accepted).

### P1 (Near-term)

1. Separate endpoint contracts from documentation/type-only content.
Use `*.contract.ts` for endpoint objects only; move type narratives to `*.types.ts` or `docs/`.
2. Normalize report/certificate contract format to real `*Contract` exports and remove route-level schema duplication comments like "inlined ... to avoid rootDir issues".
3. Remove checked-in generated `*.contract.js` files from `contracts/api/`; keep generated artifacts in `contracts/dist/` only.
4. Reconcile module-access and flashcard contracts with current API design (either implement contract endpoints or rewrite contracts to current resource paths).

### P2 (Stabilization)

1. Add an automated route-contract parity test that introspects mounted Express routes and verifies `method+path` coverage for every endpoint contract.
2. Align media enums across contracts, model, controller, and storage config.
3. Publish deprecation map for overlapping/legacy surfaces (for example exam-attempt vs assessment-attempt, content/media vs media).

## Suggested Execution Order

1. Fix runtime accessibility and hard drift (`assessments` mounting + auth/module-access alignment).
2. Repair compile-breaking/skipped contract files so generation is deterministic.
3. Refactor tooling expectations and file conventions (`contract` vs `types` vs `docs`).
4. Enforce with CI + parity tests to prevent drift recurrence.

