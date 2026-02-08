# Learners Endpoint Permission - Follow-up

**From:** UI Team
**To:** API Team
**Date:** 2026-02-05
**Priority:** High
**Type:** Follow-up
**In-Response-To:** 2026-02-05_learners-endpoint-permission-response.md

---

## Status

The new permission tier is working - the endpoint now accepts `learner:directory:read`.

However, Riley Instructor (department-admin, instructor) doesn't have this permission:

**Current permissions:**
```json
["learner:department:manage", "learner:department:read"]
```

**Missing:**
```
learner:directory:read
```

---

## Question

Should `learner:directory:read` be added to:
1. The `instructor` role?
2. The `department-admin` role?
3. Both?

Or should `learner:department:read` imply `learner:directory:read` for department-scoped queries?

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-05

Permission is correctly configured in migration. The migration needs to be run against the database. See response:
`api-to-ui/2026-02-05_learners-endpoint-permission-followup-response.md`

---

*Ready for archive*
