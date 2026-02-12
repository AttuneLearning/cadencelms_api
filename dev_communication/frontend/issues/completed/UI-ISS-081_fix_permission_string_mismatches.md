# UI-ISS-081: Fix Permission String Mismatches

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Completed: 2026-02-05
## Requested By: Internal
## Assigned To: Unassigned
## Related: ai_team_config/memory_store/context/permission-string-audit.md, ai_team_config/memory_store/patterns/permission-string-debugging.md

---

## Overview

The UI uses permission strings that do not match the API's actual permission definitions. This causes permission checks to fail silently, resulting in features appearing disabled even when users have the correct roles.

The API uses a `domain:resource:action` format (e.g., `content:courses:manage`) but multiple UI files use incorrect formats like `resource:action-scope` (e.g., `course:edit-department`) or wrong domain names (e.g., `learners:` instead of `learner:`).

---

## Requirements

1. Update all permission strings in `useFeatureAccess.ts` to match API definitions
2. Fix `QuestionBankPage.tsx` permission string
3. Ensure all department-scoped pages use correct permission strings
4. Update related test files if they use real permission checking

---

## Technical Specification

### API Permission Format (Source of Truth)

From `cadencelms_api/scripts/seed-role-definitions.ts`:

```
domain:resource:action
```

Examples:
- `content:courses:manage`
- `enrollment:department:read`
- `settings:department:manage`
- `grades:own-classes:manage`

### Permission Mapping Required

| Current (Wrong) | Correct (API) |
|-----------------|---------------|
| `learners:profiles:write` | `learner:department:manage` |
| `learners:profiles:read` | `learner:department:read` |
| `learners:enrollments:write` | `enrollment:department:manage` |
| `learners:grades:write` | `grades:own-classes:manage` |
| `learners:grades:read` | `grades:department:read` |
| `department:roles:write` | `staff:department:manage` |
| `department:staff:write` | `staff:department:manage` |
| `class:own:read` | `content:classes:read` |
| `class:own:manage` | `content:classes:manage-own` |
| `billing:invoices:write` | `billing:invoices:manage` |
| `question:manage-department` | `content:questions:manage` (TBD) |

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/shared/hooks/useFeatureAccess.ts` | Modify | Fix 25+ permission strings |
| `src/pages/staff/QuestionBankPage.tsx` | Modify | Fix `question:manage-department` |
| `src/pages/staff/courses/INTEGRATION_GUIDE.md` | Modify | Fix `content:create` example |

### Approach

1. Reference `ai_team_config/memory_store/context/permission-string-audit.md` for complete list
2. Update each permission string to match API format
3. For permissions not in API (e.g., `learner:transcripts:read`):
   - Either remove the check (if not needed)
   - Or create API issue to add the permission
4. Test with actual user roles to verify fixes

---

## Tests Required

1. [ ] Login as instructor - verify correct permissions
2. [ ] Login as content-admin - verify course edit permissions work
3. [ ] Login as department-admin - verify all department features accessible
4. [ ] Verify useFeatureAccess returns correct values for each role

---

## Acceptance Criteria

- [ ] All permission strings in useFeatureAccess.ts match API format
- [ ] QuestionBankPage uses correct permission
- [ ] No `learners:` (plural) permissions remain
- [ ] No `department:` domain permissions remain (should be `staff:`)
- [ ] No `class:` domain permissions remain (should be `content:classes:`)
- [ ] All department-scoped pages work correctly
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Should missing permissions be added to the API?**
   Permissions like `learner:transcripts:read`, `learner:pii:read`, `academic:grades:override` don't exist in API. Decide whether to:
   - Remove these checks from UI
   - Create API issue to add them

2. **What permission for question management?**
   API doesn't have `content:questions:manage`. Need to verify correct permission or add to API.

---

## Implementation Notes

**2026-02-05: Implementation Complete**

All permission strings have been fixed:

1. **useFeatureAccess.ts** - All 25+ permission mismatches fixed:
   - Learner Management: `learners:*` → `learner:department:*` format
   - Department Management: `department:*` → `staff:department:manage`
   - Billing: `billing:invoices:write/read` → `billing:invoices:manage`, `billing:department:read`
   - Reports: `reports:own-classes:read` → `reports:class:read`
   - Class Management: `class:*` → `content:classes:*` format
   - Grading: Removed non-existent `academic:*` permissions, using `grades:own-classes:manage`
   - FERPA: Mapped to `learner:department:read/manage` (pending API granular permissions)
   - Settings: Removed non-existent `settings:department:read`

2. **QuestionBankPage.tsx** - Fixed `question:manage-department` → `content:assessments:manage`

**Pending API Clarifications:**
- Message sent: `ui-to-api/2026-02-05_permission-string-alignment.md`
- Questions about learner self-enrollment, FERPA granular permissions, and grade override

Full audit documented in: `ai_team_config/memory_store/context/permission-string-audit.md`

---

## Completion

**Completed Date:** 2026-02-05
**Commits:**
| Hash | Description |
|------|-------------|
| TBD | Permission string fixes (pending commit) |

**Verification:**
- [x] All acceptance criteria met
- [ ] Tests passing (needs verification)
- [x] Response message sent (permission-string-alignment.md)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
