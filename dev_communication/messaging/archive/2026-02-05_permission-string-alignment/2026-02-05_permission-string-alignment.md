# Permission String Alignment Request

**Date:** 2026-02-05
**From:** UI Team
**To:** API Team
**Priority:** Medium
**Related Issues:** UI-ISS-081 (Fix Permission String Mismatches)

---

## Request

During a UI audit, we discovered significant mismatches between permission strings used in the UI and those defined in the API seed data. We need clarification on several permissions and potentially need new permissions added to the role definitions.

## Context

The UI has been using permission strings that don't exist in `scripts/seed-role-definitions.ts`. We've fixed many UI-side issues, but some permissions may be legitimately needed and should be added to the API.

Full audit documented in: `memory/context/permission-string-audit.md`

## Clarifications Needed

### 1. Question Bank Permission

**UI uses:** `question:manage-department` (in `QuestionBankPage.tsx`)
**API has:** Nothing specific for questions

**Question:** What permission should control access to question banks?
- `content:questions:manage`?
- `content:exams:manage` (content-admin already has this)?
- Something else?

### 2. Learner Enrollment Permission

**UI uses:** `enrollment:own:manage` for self-enrollment
**API routes expect:** `enrollment:own:manage`
**API seed data has:** Only `enrollment:department:read` and `enrollment:department:manage`

**Question:** Should `enrollment:own:manage` and `enrollment:own:read` be added to learner roles?

Suggested addition to `course-taker` role:
```typescript
accessRights: [
  // ... existing rights
  'enrollment:own:read',
  'enrollment:own:manage',  // For self-enrollment
]
```

### 3. FERPA/PII Permissions

**UI has feature flags for:**
- `learner:transcripts:read`
- `learner:pii:read`
- `learner:progress:read`

**API has:** Only `learner:department:read` and `learner:department:manage`

**Question:** Should we have granular FERPA-related permissions? Or should `learner:department:read` cover all learner data access?

### 4. Grade Override Permission

**UI uses:** `academic:grades:override`
**API has:** Only `grades:department:read` and `grades:own-classes:manage`

**Question:** Is grade override a separate permission or handled by existing permissions?

## Potentially Missing Permissions (For Consideration)

| Permission | Purpose | Suggested Role |
|------------|---------|----------------|
| `enrollment:own:read` | Learner view own enrollments | course-taker |
| `enrollment:own:manage` | Learner self-enroll | course-taker |
| `content:questions:manage` | Manage question banks | content-admin |
| `grades:all:manage` | Override any grades | department-admin |

## Current Workaround

For now, the UI will:
1. Use existing permissions where possible
2. Remove checks for permissions that don't exist
3. Wait for API clarification on new permissions

## Questions

1. Which of the above permissions should be added to seed data?
2. Are there any planned permission changes we should be aware of?
3. Should question bank management use `content:exams:manage` or a new permission?

---

## Response Section (For API Team)

**Status:** Complete
**Response Date:** 2026-02-05

Permissions updated and clarifications provided. See response:
`api-to-ui/2026-02-05_permission-string-alignment-response.md`

---

*Move to `archive/` when thread is complete*
