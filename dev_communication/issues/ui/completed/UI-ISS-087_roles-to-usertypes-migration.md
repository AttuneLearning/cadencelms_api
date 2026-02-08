# UI-ISS-087: Migrate roles Field References to userTypes

## Status: COMPLETE
## Priority: High
## Created: 2026-02-05
## Updated: 2026-02-05
## Requested By: Internal Audit
## Assigned To: Unassigned
## Related: UI-ISS-086

---

## Overview

Multiple UI components reference `user.roles` field which doesn't exist on the User model. The correct field is `userTypes`. This causes runtime errors and broken filtering logic.

---

## Affected Files

| File | Line | Current Code | Fix |
|------|------|--------------|-----|
| `EnrollStudentsDialog.tsx` | 77 | `user.roles.includes('learner')` | `user.userTypes?.includes('learner')` |
| `EnrollStudentsDialog.test.tsx` | 33 | `u.roles.includes('learner')` | `u.userTypes?.includes('learner')` |
| `UserProfileCard.tsx` | 93 | `user.roles.map(...)` | `user.userTypes?.map(...)` |
| `UserForm.tsx` | 92 | `roles: user.roles` | `userTypes: user.userTypes` |
| `userApi.test.ts` | 101, 121 | `u.roles?.includes(...)` | `u.userTypes?.includes(...)` |

---

## Acceptance Criteria

- [x] All `user.roles` references changed to `user.userTypes`
- [x] Type definitions updated if needed
- [x] Tests updated and passing (38 tests)
- [x] No TypeScript errors in modified files

---

## Technical Notes

The User model structure is:
```typescript
interface User {
  _id: string;
  email: string;
  userTypes: ('learner' | 'staff' | 'global-admin')[];
  // ... other fields
}
```

The `roles` field is for department-level roles (instructor, content-admin, etc.), not user types.

---

## Completion

**Completed Date:** 2026-02-05
**Commits:**
| Hash | Description |
|------|-------------|
| (pending) | fix: migrate user.roles to user.userTypes across UI |

**Files Modified:**
- `EnrollStudentsDialog.tsx` - line 77
- `EnrollStudentsDialog.test.tsx` - line 33
- `UserProfileCard.tsx` - line 93
- `UserForm.tsx` - line 92
- `UserFormDialog.tsx` - line 73-77 (added userTypes mapping)
- `userApi.test.ts` - lines 101, 121

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (38/38)
- [x] TypeScript clean in modified files

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
