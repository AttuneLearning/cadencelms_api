# API Test Infrastructure Fixes - 2026-01-12

## Summary

Fixed test infrastructure issues in `/home/adam/github/cadencelms_api` - **16/24 tests now passing** (up from 0/24).

## Issues Fixed

### 1. Staff Model Import Issue
**Problem:** Default import instead of named import
```typescript
// BEFORE (wrong)
import Staff from '@/models/auth/Staff.model';

// AFTER (correct)
import { Staff } from '@/models/auth/Staff.model';
```

**File:** `tests/integration/auth/department-switch.test.ts:22`

---

### 2. AccessRight Validation Errors
**Problem:** Missing required fields `resource` and `action`

```typescript
// BEFORE (wrong)
{ name: 'content:courses:read', domain: 'content', description: 'Read courses' }

// AFTER (correct)
{ name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses' }
```

**Files:** `tests/integration/auth/department-switch.test.ts:127-136`

---

### 3. Staff.create() Missing _id Field
**Problem:** Using `userId` instead of `_id` (Staff model uses shared _id with User)

```typescript
// BEFORE (wrong)
await Staff.create({
  userId: staffUser._id,
  firstName: 'Test',
  lastName: 'Staff',
  departmentMemberships: [...]
});

// AFTER (correct)
await Staff.create({
  _id: staffUser._id,  // Changed userId to _id
  firstName: 'Test',
  lastName: 'Staff',
  departmentMemberships: [...]
});
```

**Files:**
- `tests/integration/auth/department-switch.test.ts:155`
- `tests/integration/auth/department-switch.test.ts:588`

---

### 4. Missing `joinedAt` Field in Department Memberships
**Problem:** joinedAt field is required by schema but was missing in test data

```typescript
// BEFORE (wrong)
{
  departmentId: testDepartment1._id,
  roles: ['instructor', 'content-admin'],
  isPrimary: true,
  isActive: true
}

// AFTER (correct)
{
  departmentId: testDepartment1._id,
  roles: ['instructor', 'content-admin'],
  isPrimary: true,
  isActive: true,
  joinedAt: new Date()  // Added
}
```

---

### 5. JWT Token Missing Required Fields
**Problem:** JWT tokens were missing `roles` array and `type: 'access'` fields required by `verifyAccessToken()`

```typescript
// BEFORE (wrong)
jwt.sign(
  { userId: staffUser._id.toString(), email: staffUser.email },
  process.env.JWT_ACCESS_SECRET || 'test-secret',
  { expiresIn: '1h' }
)

// AFTER (correct)
jwt.sign(
  {
    userId: staffUser._id.toString(),
    email: staffUser.email,
    roles: ['staff'],       // Added
    type: 'access'          // Added
  },
  process.env.JWT_ACCESS_SECRET || 'test-secret',
  { expiresIn: '1h' }
)
```

**JWT Payload Requirements (from `src/utils/jwt.ts`):**
```typescript
export interface JWTAccessPayload {
  userId: string;
  email: string;
  roles: string[];
  type: 'access';
  iat: number;
  exp: number;
}
```

**Files:**
- `tests/integration/auth/department-switch.test.ts:177-186`
- `tests/integration/auth/department-switch.test.ts:594-603`

---

## Test Results

### Before Fixes
- **0 passing** ❌
- **24 failing** ❌
- All failures were infrastructure issues

### After Fixes
- **16 passing** ✅
- **8 failing** ⚠️
- Remaining failures are business logic issues, not infrastructure

---

## Remaining Test Failures (Business Logic)

The remaining 8 failures are actual test expectation mismatches or potential bugs:

1. **isDirectMember logic test** - Test expects `false` but gets `true` (may be correct behavior)
2. **Inactive department handling** - Test expects 403, gets 404 (routing/logic issue)
3. **Other logic-based failures** - Need requirements clarification

These are NOT infrastructure problems - they indicate either:
- Wrong test expectations that need updating
- Actual bugs in the codebase that tests correctly identified

---

## Files Modified

1. `tests/integration/auth/department-switch.test.ts`
   - Fixed Staff import (line 22)
   - Fixed AccessRight seeds (lines 127-136)
   - Fixed Staff.create calls (lines 155, 588)
   - Added joinedAt fields to department memberships
   - Fixed JWT tokens to include roles and type fields (lines 177-186, 594-603)

---

## Next Steps

1. ✅ Test infrastructure fixes complete
2. ⏳ Analyze remaining 8 test failures to determine if they're bugs or wrong expectations
3. ⏳ Implement ISS-005 (Master Department visibility) in cadencelms_api
4. ⏳ Implement ISS-001 (IPerson type & password change) in cadencelms_api

---

## Lessons Learned

1. **Consistent Imports:** Always use named imports for Mongoose models
2. **Schema Requirements:** Test fixtures must match current schema validation
3. **JWT Tokens:** Always include all required fields (`userId`, `email`, `roles`, `type`)
4. **Shared IDs:** Staff and Learner models share `_id` with User model, not `userId`
5. **Test Data:** Keep test fixtures synchronized with model schemas

---

## Impact

- Test suite is now runnable and reliable
- Can confidently add new tests
- Infrastructure is stable for TDD development
- Ready to implement ISS-005 and ISS-001 features
