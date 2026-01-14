# UI Team → API Team: Contract Update Notification - ISS-021

**Date:** 2026-01-14 17:00  
**From:** UI Team  
**To:** API Team  
**Type:** Contract Update (Breaking Changes OK)  
**Priority:** High  
**Issue:** ISS-021 - Role Permission Updates

---

## Summary

Contracts have been updated for ISS-021. Please implement to match these contracts.

**Updated Files:**
1. `api/contracts/api/enrollments.contract.ts` - NEW endpoints added
2. `api/contracts/api/roles.contract.ts` - Staff roles and access rights updated

---

## Contract Changes

### 1. New Endpoint: Grade Override

**File:** `enrollments.contract.ts`

```
PUT /api/v2/enrollments/:enrollmentId/grade/override
```

| Field | Details |
|-------|---------|
| Required Access Right | `grades:override` |
| Request Body | `{ newScore, reason (required, min 10 chars), recalculateLetter? }` |
| Response | Previous grade, new grade, override audit info with changeLogId |
| Audit | MANDATORY - create immutable GradeChangeLog entry |

**Key Requirements:**
- `reason` field is REQUIRED (min 10 characters) - reject without it
- All overrides must be logged with: previous value, new value, who, when, why
- Return `changeLogId` reference in response
- Only dept-admin role should have `grades:override` access right

### 2. New Endpoint: Grade History

**File:** `enrollments.contract.ts`

```
GET /api/v2/enrollments/:enrollmentId/grade/history
```

Returns audit trail of all grade changes for an enrollment.

---

### 3. Roles Contract Updates

**File:** `roles.contract.ts`

**Changes to StaffRoles:**

1. **Added `enrollment-admin`** to staff roles (was only in GlobalAdmin before)

2. **Added `defaultAccessRights` mapping** - defines standard access rights per role

3. **dept-admin now includes:**
   - `grades:override` (NEW) - can override student grades

4. **billing-admin now includes:**
   - `content:courses:read` (NEW) - can view courses for revenue reports

5. **Documentation clarification:** Roles are ADDITIVE, not hierarchical
   - dept-admin does NOT inherit content-admin
   - Capabilities are deduplicated when user has multiple roles

---

## New Access Rights to Add

| Access Right | Description | Assigned To |
|--------------|-------------|-------------|
| `grades:override` | Override/edit student grades (requires audit log) | dept-admin |

---

## Breaking Changes

These are **BREAKING CHANGES** (approved per project policy):

1. **New access right:** `grades:override` - add to access rights collection
2. **Updated role definitions:** dept-admin and billing-admin capabilities expanded
3. **New endpoints:** Grade override and history (won't break existing code)

---

## Implementation Notes

### GradeChangeLog Schema (Suggested)

```typescript
interface GradeChangeLog {
  _id: ObjectId;
  enrollmentId: ObjectId;
  learnerId: ObjectId;
  courseId: ObjectId;
  departmentId: ObjectId;
  
  changeType: 'initial' | 'override';
  
  previousScore: number | null;
  previousLetter: string | null;
  newScore: number;
  newLetter: string;
  
  reason: string;           // Required for overrides
  
  changedBy: ObjectId;      // User who made the change
  changedAt: Date;
  
  // Immutable - no updatedAt, no soft delete
}
```

### Migration Notes

- Add `grades:override` to access rights collection
- Update dept-admin role definition to include `grades:override`
- Update billing-admin role definition to include `content:courses:read`
- Optionally seed enrollment-admin as staff role (was global-admin only before)

---

## Timeline

UI team can begin implementation immediately against these contracts.

Please confirm when:
- [ ] Endpoints are deployed to dev
- [ ] Access rights are seeded
- [ ] Role definitions are updated

---

**Reference:** 
- [ISS-021.md](../ui/issue_queue/ISS-021.md)
- [COURSE_ROLE_FUNCTION_MATRIX.md](../ui/specs/COURSE_ROLE_FUNCTION_MATRIX.md) ✅ APPROVED
