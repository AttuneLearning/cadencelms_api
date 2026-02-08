# Roles vs UserTypes Field Mismatch

**From:** UI Team
**To:** API Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Bug Report

---

## Summary

Multiple API services query the User model with `{ roles: 'learner' }` or `{ roles: 'staff' }`, but the database uses `userTypes` field instead.

---

## Evidence

Database user structure:
```json
{
  "_id": "697c18c23e9e6d1cc22e07ad",
  "email": "alex.learner@lms.edu",
  "userTypes": ["learner"],  // <-- actual field
  "defaultDashboard": "learner"
}
```

API queries:
```typescript
// learners.service.ts:82
const userQuery: any = { roles: 'learner' };  // <-- wrong field
```

---

## Affected Files

| File | Line | Current | Should Be |
|------|------|---------|-----------|
| `learners.service.ts` | 82 | `{ roles: 'learner' }` | `{ userTypes: 'learner' }` |
| `learners.service.ts` | 308 | `{ roles: 'learner' }` | `{ userTypes: 'learner' }` |
| `learners.service.ts` | 467 | `roles: ['learner']` | `userTypes: ['learner']` |
| `staff.service.ts` | 312 | `roles: ['staff']` | `userTypes: ['staff']` |

---

## Impact

- `/api/v2/users/learners` returns empty array even with learners in database
- Enrollment dialogs show "No learners found"
- Any user listing/filtering by type is broken

---

## Response Section (For API Team)

**Status:** Acknowledged
**Response Date:** 2026-02-05

Thank you for this detailed report. This has been integrated into **API-ISS-024: Legacy Role Authorization Cleanup** which tracks all lingering references to the old role-based system.

We found additional issues beyond what you reported:
- 23 instances of `user.roles?.includes()` in controllers/services
- Legacy `authorize()` middleware in `authenticate.ts`

**Fix in progress.** Will update when complete.

See: `issues/api/queue/API-ISS-024_legacy-role-authorization-cleanup.md`

---

*Move to `archive/` when resolved*
