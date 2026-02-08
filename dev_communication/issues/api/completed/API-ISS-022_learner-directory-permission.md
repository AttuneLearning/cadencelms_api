# API-ISS-022: Learner Directory Permission

**Status:** READY
**Priority:** High
**Created:** 2026-02-05
**Assignee:** API Team

---

## Summary

Add new `learner:directory:read` permission tier that returns masked learner data for enrollment workflows.

---

## Background

Department-admins need to list learners for enrollment but shouldn't require full PII access. Current endpoint requires `learner:pii:read` which is overly permissive.

Related: UI team message `2026-02-05_learners-endpoint-permission.md`

---

## Requirements

### 1. New Access Right

Add to access rights seed:

```typescript
{
  code: 'learner:directory:read',
  name: 'Read Learner Directory',
  description: 'View learner directory (masked names, no PII)',
  category: 'learner',
  scope: 'global'
}
```

### 2. Role Assignments

Grant `learner:directory:read` to:
- `department-admin`
- `instructor`
- `content-admin`

Keep `learner:pii:read` for:
- `enrollment-admin`
- `system-admin`

### 3. Route Authorization

Update `/api/v2/users/learners` route:

```typescript
// Accept either permission
router.get('/',
  authorize.anyOf(['learner:pii:read', 'learner:directory:read']),
  learnersController.listLearners
);
```

### 4. Data Masking Logic

In `LearnersService.listLearners`:

```typescript
// Determine permission level
const hasFullPii = await hasPermission(viewer, 'learner:pii:read');

// Build response based on permission
if (hasFullPii) {
  return fullLearnerResponse(learners);
} else {
  return maskedLearnerResponse(learners);
}
```

### 5. Masked Response Format

```typescript
interface MaskedLearner {
  id: string;
  displayName: string;      // "Smith, A."
  idSuffix: string;         // Last 4 of ObjectId: "9011"
  status: 'active' | 'suspended' | 'withdrawn' | 'completed';
  isProgramEnrollee: boolean;
  programCount: number;
  courseCount: number;
}
```

**No email, DOB, address, or full names at this level.**

---

## Implementation Steps

1. [ ] Add `learner:directory:read` to access rights seed
2. [ ] Update role definitions to include new permission
3. [ ] Update route authorization to accept either permission
4. [ ] Add permission check in service layer
5. [ ] Implement masked response builder
6. [ ] Write tests for both permission tiers
7. [ ] Verify existing `learner:pii:read` behavior unchanged

---

## Testing

```bash
# Test with department-admin (directory only)
GET /api/v2/users/learners
Authorization: Bearer <dept-admin-token>
# Should return masked data

# Test with enrollment-admin (full PII)
GET /api/v2/users/learners
Authorization: Bearer <enrollment-admin-token>
# Should return full data

# Test with no permission
GET /api/v2/users/learners
Authorization: Bearer <learner-token>
# Should return 403
```

---

## Acceptance Criteria

- [ ] `learner:directory:read` permission exists and is seeded
- [ ] Department-admins can list learners with masked data
- [ ] Enrollment-admins still see full PII
- [ ] No email/DOB/address exposed at directory level
- [ ] Tests pass for both permission tiers

---

## Related

- **Spec:** `dev_communication/specs/users/LEARNER_DIRECTORY_ENDPOINT.md`
- **Depends-On:** None
- **Blocks:** API-ISS-023 (Prioritized Learner List)
