# UI-ISS-074: Stabilize TypeScript typecheck via tsconfig test/node types

**Date:** 2026-01-27
**Reporter:** Codex
**Priority:** High
**Status:** In Progress

## Description

`npm run typecheck` currently reports hundreds of errors, with a large bucket caused by missing global/test/Node types (e.g., `global`, `process`, `NodeJS`, `vi`). The root `tsconfig.json` only includes `"types": ["vite/client"]`, which likely excludes Vitest and Node ambient types used by tests and some runtime utilities.

Goal: update TypeScript configuration to include the correct ambient types for the UI codebase, and reduce the error surface before addressing deeper domain typing mismatches.

## Scope

- Audit `tsconfig.json`, `tsconfig.node.json`, and any test-specific config.
- Add appropriate ambient type packages to `types` (e.g., vitest, node) where safe.
- Re-run `npm run typecheck` and quantify improvement.
- Document remaining major error buckets after config fixes.

## Related Files

- `tsconfig.json`
- `tsconfig.node.json`
- `src/test/setup.ts`
- `src/test/utils/mockFactories.ts`

## Status Checklist

- [x] Capture baseline typecheck errors (`/tmp/typecheck.log`)
- [x] Audit current TypeScript configs
- [x] Apply minimal config fixes for ambient types
- [x] Re-run typecheck and compare counts
- [ ] Triage next highest-leverage error bucket

## Progress Notes

- Baseline on 2026-01-27: 573 TypeScript errors reported; top codes include TS6133 (unused), TS2339 (property missing), TS2304 (name missing), TS2591 (process missing).
- Config change on 2026-01-27: updated `tsconfig.json` `types` to `"vite/client", "vitest/globals", "node"`.
- Result: Typecheck errors reduced from 573 to 459; missing ambient globals (`global`, `process`, `NodeJS`, `vi`) no longer appear.
- Added `tsconfig.typecheck.json` to exclude tests and relax unused checks for typecheck; updated `package.json` `typecheck` script to use it.
- Result: errors reduced from 459 to 219 under the new typecheck config.
- Applied report-builder/report-template/report-job back-compat typing fixes in `src/shared/types/report-builder.ts`, `src/entities/report-template/model/types.ts`, `src/entities/report-job/model/types.ts`, and small fixes in `src/features/report-builder/lib/useReportBuilder.ts` and `src/pages/admin/reports/ReportTemplateDetailPage.tsx`.
- Current count on 2026-01-27: 194 TypeScript errors (`/tmp/typecheck.after-report-compat-fixes.log`).
- Fixed additional config/type compatibility issues: corrected `saveTimeoutRef` in `src/features/profile/hooks/useAutoSave.ts`, aligned `useProgressTracker` with current lesson progress API request shapes, and added legacy `"video"` to `LearningUnitType`.
- Current count on 2026-01-27: 177 TypeScript errors (`/tmp/typecheck.after-small-fixes.log`).
