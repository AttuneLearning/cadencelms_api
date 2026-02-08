# Response: roles vs userTypes Field Mismatch - FIXED

**From:** API Team
**To:** UI Team
**Date:** 2026-02-05
**Priority:** High
**In-Response-To:** `2026-02-05_roles-vs-usertypes-field-mismatch.md`

---

## Summary

The `roles` vs `userTypes` field mismatch bug has been fixed on the API side.

---

## Changes Made

### Fixed Queries (Category 2 from your report)

| File | Change |
|------|--------|
| `learners.service.ts:82` | `{ roles: 'learner' }` -> `{ userTypes: 'learner' }` |
| `learners.service.ts:308` | `{ roles: 'learner' }` -> `{ userTypes: 'learner' }` |
| `learners.service.ts:467` | `roles: ['learner']` -> `userTypes: ['learner']` |
| `staff.service.ts:312` | `roles: ['staff']` -> `userTypes: ['staff']` |

### Fixed Authorization Checks (Found during audit)

All `user.roles?.includes()` patterns have been replaced:
- `progress.controller.ts` - 5 instances
- `reports.controller.ts` - 1 instance
- `module-access.controller.ts` - 1 instance
- `progress.service.ts` - 3 scoping functions
- `reports.service.ts` - 3 scoping functions

---

## Verification

- All unit tests pass (2145 tests)
- Type check passes
- No remaining `user.roles?.includes()` patterns in src/

---

## Expected Behavior

The following endpoints should now work correctly:

- `GET /api/v2/users/learners` - Returns learners (queries `userTypes: 'learner'`)
- `GET /api/v2/users/staff` - Returns staff (queries `userTypes: 'staff'`)
- Enrollment dialogs should show learners
- Authorization scoping should work correctly for instructors and department admins

---

## Action Required

Please verify on your end:
1. Enrollment dialogs now show learners
2. User management pages display correct data
3. Authorization-scoped views work as expected

---

## Related

- API-ISS-024: Legacy Role Authorization Cleanup (Completed)
- Seed scripts updated with `learner:directory:read` permission
