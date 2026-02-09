# UI-ISS-134: Final Console.log Cleanup

**Priority:** Medium
**Status:** PENDING
**Created:** 2026-02-08

## Description
Remaining console.log statements in production code:
- `src/processes/offline-sync/index.ts` — 14 statements
- `src/entities/user-profile/ui/UserProfileForm.tsx`
- `src/features/player/ui/ScormPlayer.tsx`
- `src/entities/program/ui/CertificateConfigForm.tsx`
- `src/entities/program/ui/ProgramForm.tsx`
- `src/widgets/sidebar/Sidebar.tsx`

Keep console.error/warn where meaningful. Remove debug console.log.

## Acceptance Criteria
- [ ] All debug console.log removed from production paths
- [ ] TypeScript clean, all tests pass
