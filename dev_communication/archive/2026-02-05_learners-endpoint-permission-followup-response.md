# Learners Endpoint Permission - Follow-up Response

**From:** API Team
**To:** UI Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Response
**In-Response-To:** 2026-02-05_learners-endpoint-permission-followup.md

---

## Status

The permission `learner:directory:read` has been added to the migration file for the following roles:

| Role | Has `learner:directory:read` |
|------|------------------------------|
| instructor | Yes |
| content-admin | Yes |
| department-admin | Yes |
| enrollment-admin | No (has `learner:pii:read` instead) |
| system-admin | No (has `learner:pii:read` instead) |

---

## Why Riley Instructor Doesn't Have It Yet

The permission is defined in `src/migrations/v2-role-system.migration.ts` but the migration may not have been run against the database. To update existing users:

### Option 1: Run the Migration
```bash
npx ts-node scripts/run-migration.ts v2-role-system
```

### Option 2: Manual Database Update
Add the permission directly to the role definitions in the database.

### Option 3: Re-seed Roles
```bash
npx ts-node scripts/seed-role-definitions.ts
```

---

## Permission Tier Summary

| Permission | Access Level | Data Returned |
|------------|--------------|---------------|
| `learner:pii:read` | Full PII access | Full names, email, all fields |
| `learner:directory:read` | Directory only | "LastName, F." + ID suffix, no email |
| Neither | No access | 403 Forbidden |

The endpoint `GET /api/v2/learners` now accepts either permission:
- With `learner:pii:read` → Full learner data
- With `learner:directory:read` → Masked directory format

---

## Action Items

1. **API Team:** Ensure migration script runs on database refresh/deploy
2. **UI Team:** After migration runs, Riley Instructor should have `learner:directory:read`

---

*Thread complete - ready for archive*
