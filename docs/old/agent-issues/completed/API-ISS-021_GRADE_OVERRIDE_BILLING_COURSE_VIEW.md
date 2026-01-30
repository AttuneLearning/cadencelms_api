# API-ISS-021: Grade Override & Billing Course View Capabilities

**Date:** 2026-01-14
**Priority:** High
**Type:** Feature
**Status:** 📋 Planning
**Requested By:** UI Team (ISS-021)
**Estimated Timeline:** 12-16 hours (parallelized to 6-8 hours)
**Risk Level:** 🟡 Medium (new audit log system, permission changes)

---

## Executive Summary

Implement two new role capabilities requested by UI team:
1. **Grade Override** - Allow dept-admin to correct student grades with mandatory audit logging
2. **Course View for Billing** - Grant billing-admin full course view access for revenue correlation

**Breaking Change:** Yes - adding new permission `grades:override` to permission system
**Database Impact:** New `GradeChangeLog` collection required
**API Impact:** 1 new endpoint, 1 permission update

---

## Request Details

### 1. Grade Override for dept-admin

**New Capability:** `grades:override`

**Use Cases:**
- Grade disputes/appeals (student contests a grade, dept-admin reviews and corrects)
- Grading errors (instructor made calculation/input error)
- Administrative adjustments (policy changes, late work acceptance)
- Academic integrity cases (plagiarism investigation results)

**Security Requirements:**
- ✅ **Mandatory audit logging** - Every change MUST be logged
- ✅ **Reason required** - Non-empty explanation for all overrides
- ✅ **Immutable audit trail** - Logs cannot be edited or deleted
- ✅ **Department scope** - Admin must have dept-admin role in course's department
- ✅ **Authorization check** - Verify `grades:override` capability before allowing

**Current State:**
- ❌ No grade override capability exists
- ❌ No grade change audit log exists
- ✅ Grade fields exist in ClassEnrollment model (gradeLetter, gradePercentage, gradePoints)
- ✅ Permission system exists (permissions.service.ts)

---

### 2. Course View for billing-admin

**Capability Update:** Add `courses:read` to billing-admin role

**Current State:**
```typescript
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

**Required State:**
```typescript
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'courses:read',        // NEW - full course view access
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

**Use Cases:**
- Correlating revenue reports with specific courses
- Understanding course pricing in billing context
- Cross-referencing financial data with course catalog
- Generating enrollment vs. revenue analysis

**Restrictions (NO CHANGE):**
- ❌ billing-admin CANNOT edit courses (`courses:write`)
- ❌ billing-admin CANNOT access modules or content
- ❌ billing-admin CANNOT publish/unpublish courses

---

## Technical Implementation

### Part 1: Grade Override System

#### 1.1 New GradeChangeLog Model

**File:** `src/models/audit/GradeChangeLog.model.ts` (NEW)

```typescript
export interface IGradeChangeLog extends Document {
  // Identifiers
  enrollmentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;

  // Grade change details
  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all';
  previousGradeLetter?: string;
  newGradeLetter?: string;
  previousGradePercentage?: number;
  newGradePercentage?: number;
  previousGradePoints?: number;
  newGradePoints?: number;

  // Audit information
  changedBy: mongoose.Types.ObjectId;     // User ID of dept-admin
  changedByRole: string;                  // Should be 'dept-admin'
  changedAt: Date;                        // Timestamp of change
  reason: string;                         // Required explanation
  changeType: 'override';                 // Type of change

  // Context
  departmentId: mongoose.Types.ObjectId;  // Department context
  termId?: mongoose.Types.ObjectId;       // Academic term

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ enrollmentId: 1, changedAt: -1 }` - Get all changes for an enrollment
- `{ learnerId: 1, changedAt: -1 }` - Get all grade changes for a learner
- `{ changedBy: 1, changedAt: -1 }` - Get all changes made by an admin
- `{ classId: 1, changedAt: -1 }` - Get all changes in a class
- `{ departmentId: 1, changedAt: -1 }` - Get all changes in a department

**Validation:**
- `reason` - required, min length 10 characters, max 1000
- `changedBy` - required, must be valid User ObjectId
- `enrollmentId` - required, must reference existing ClassEnrollment
- At least one grade field must be changed (letter, percentage, or points)

---

#### 1.2 New Grade Override Endpoint

**Endpoint:** `PUT /api/v1/enrollments/:enrollmentId/grades/override`

**Request Body:**
```typescript
interface GradeOverrideRequest {
  gradeLetter?: string;           // Optional: new letter grade
  gradePercentage?: number;       // Optional: new percentage (0-100)
  gradePoints?: number;           // Optional: new points (0-4.0)
  reason: string;                 // Required: explanation (10-1000 chars)
  previousGradeLetter?: string;   // Optional: for validation
  previousGradePercentage?: number; // Optional: for validation
  previousGradePoints?: number;   // Optional: for validation
}
```

**Response:**
```typescript
interface GradeOverrideResponse {
  success: boolean;
  data: {
    enrollmentId: string;
    gradeChanges: {
      gradeLetter?: { previous: string; new: string };
      gradePercentage?: { previous: number; new: number };
      gradePoints?: { previous: number; new: number };
    };
    overrideBy: string;           // User ID
    overrideByName: string;       // Full name of admin
    overrideAt: string;           // ISO timestamp
    reason: string;
    changeLogId: string;          // Reference to audit log entry
  };
}
```

**Authorization:**
- ✅ User must be authenticated
- ✅ User must have `grades:override` permission
- ✅ User must have dept-admin role in the course's department
- ✅ Enrollment must exist and be in valid state

**Validation:**
- Reason: required, 10-1000 characters
- At least one grade field must be provided
- gradePercentage: 0-100 (if provided)
- gradePoints: 0-4.0 (if provided)
- gradeLetter: valid letter grade (A, A-, B+, B, etc.)

**Error Responses:**
| Status | Condition | Message |
|--------|-----------|---------|
| 401 | Not authenticated | "Authentication required" |
| 403 | Missing `grades:override` | "Permission denied: grades:override capability required" |
| 403 | Not dept-admin in department | "Permission denied: Must be department admin for this course's department" |
| 404 | Enrollment not found | "Enrollment not found" |
| 422 | Reason missing/too short | "Reason is required and must be at least 10 characters" |
| 422 | No grade fields provided | "At least one grade field must be provided" |
| 422 | Invalid grade value | "Grade value out of valid range" |

**Business Logic:**
1. Load enrollment with populate for class → course → department
2. Verify user has dept-admin role in that department
3. Verify user has `grades:override` permission
4. Validate grade values (range, format)
5. Create GradeChangeLog entry (immutable)
6. Update ClassEnrollment with new grade values
7. Return response with change details

---

#### 1.3 Grade Override Service

**File:** `src/services/grades/grade-override.service.ts` (NEW)

**Key Functions:**
```typescript
class GradeOverrideService {
  /**
   * Override grade for an enrollment with audit logging
   */
  async overrideGrade(
    enrollmentId: string,
    overrideData: GradeOverrideRequest,
    adminUserId: string
  ): Promise<GradeOverrideResponse>;

  /**
   * Get grade change history for an enrollment
   */
  async getGradeChangeHistory(
    enrollmentId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<IGradeChangeLog[]>;

  /**
   * Get all grade overrides made by an admin
   */
  async getAdminGradeOverrides(
    adminUserId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<IGradeChangeLog[]>;

  /**
   * Verify admin has permission to override grade
   */
  async verifyOverridePermission(
    userId: string,
    enrollmentId: string
  ): Promise<{ allowed: boolean; reason?: string }>;
}
```

---

### Part 2: Billing Course View

#### 2.1 Update BUILT_IN_ROLES

**File:** `src/services/auth/permissions.service.ts` (MODIFIED)

**Change:**
```typescript
// BEFORE:
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}

// AFTER:
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'courses:read',        // ← NEW: Full course view access
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

**Impact:**
- ✅ billing-admin can now access `GET /api/v1/courses`
- ✅ billing-admin can now access `GET /api/v1/courses/:id`
- ❌ billing-admin CANNOT access `PUT /api/v1/courses/:id` (requires `courses:write`)
- ❌ billing-admin CANNOT access module/content endpoints

---

#### 2.2 Update Course Routes/Controllers (if needed)

**File:** `src/routes/courses.routes.ts` (MAY NEED UPDATE)

**Check if permission middleware is already in place:**
```typescript
// If already using permission middleware:
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);

// ✅ No change needed - billing-admin will automatically gain access

// If NOT using permission middleware, ADD IT:
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);
```

---

## Database Changes

### New Collections

#### GradeChangeLog Collection

**Purpose:** Immutable audit trail for all grade overrides
**Estimated Size:** ~100 bytes per record
**Growth Rate:** Depends on grade disputes (estimate: 50-200 records/term)

**Indexes:**
```javascript
db.gradechangelogs.createIndex({ enrollmentId: 1, changedAt: -1 });
db.gradechangelogs.createIndex({ learnerId: 1, changedAt: -1 });
db.gradechangelogs.createIndex({ changedBy: 1, changedAt: -1 });
db.gradechangelogs.createIndex({ classId: 1, changedAt: -1 });
db.gradechangelogs.createIndex({ departmentId: 1, changedAt: -1 });
```

---

## API Contract Changes

### New Contract File Required

**File:** `contracts/api/grade-override.contract.ts` (NEW)

**Endpoints Documented:**
- `PUT /api/v1/enrollments/:enrollmentId/grades/override`
- `GET /api/v1/enrollments/:enrollmentId/grades/history` (optional: get change history)

### Updated Contract Files

**File:** `contracts/api/courses.contract.ts` (UPDATE)

**Change:**
```typescript
/**
 * GET /api/v1/courses
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin ← UPDATED
 */

/**
 * GET /api/v1/courses/:id
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin ← UPDATED
 */
```

---

## Files to Create

**New Files (8):**
1. `src/models/audit/GradeChangeLog.model.ts` - Grade change audit model
2. `src/services/grades/grade-override.service.ts` - Grade override business logic
3. `src/controllers/grades/grade-override.controller.ts` - Grade override HTTP handlers
4. `src/routes/grade-override.routes.ts` - Grade override endpoint routes
5. `src/validators/grade-override.validator.ts` - Request validation
6. `contracts/api/grade-override.contract.ts` - API contract documentation
7. `tests/integration/grades/grade-override.test.ts` - Integration tests
8. `tests/unit/services/grade-override.service.test.ts` - Unit tests

**Modified Files (3):**
1. `src/services/auth/permissions.service.ts` - Add courses:read to billing-admin
2. `src/routes/courses.routes.ts` - Verify/add authorization middleware (if needed)
3. `contracts/api/courses.contract.ts` - Update authorization docs

---

## Testing Requirements

### Grade Override Tests

**Unit Tests (grade-override.service.test.ts):**
- [ ] overrideGrade() creates audit log entry
- [ ] overrideGrade() updates enrollment grades
- [ ] overrideGrade() validates grade ranges
- [ ] overrideGrade() requires reason (min 10 chars)
- [ ] overrideGrade() prevents unauthorized access
- [ ] getGradeChangeHistory() returns all changes for enrollment
- [ ] getAdminGradeOverrides() returns all changes by admin
- [ ] verifyOverridePermission() checks dept-admin + permission

**Integration Tests (grade-override.test.ts):**
- [ ] PUT /grades/override requires authentication
- [ ] PUT /grades/override requires grades:override permission
- [ ] PUT /grades/override requires dept-admin role in correct department
- [ ] PUT /grades/override creates immutable audit log
- [ ] PUT /grades/override updates enrollment correctly
- [ ] PUT /grades/override validates reason length
- [ ] PUT /grades/override validates grade ranges
- [ ] PUT /grades/override returns 404 for non-existent enrollment
- [ ] GET /grades/history returns all changes for enrollment

**Expected Test Count:** 25-30 tests

---

### Billing Course View Tests

**Integration Tests (courses.test.ts - UPDATE EXISTING):**
- [ ] billing-admin can GET /api/v1/courses
- [ ] billing-admin can GET /api/v1/courses/:id
- [ ] billing-admin CANNOT PUT /api/v1/courses/:id
- [ ] billing-admin CANNOT access module endpoints

**Expected Test Count:** 4 tests (add to existing suite)

---

## Acceptance Criteria

### Grade Override Feature

- [ ] dept-admin can override grades via API
- [ ] All grade overrides create immutable audit log entries
- [ ] Reason field is mandatory (10-1000 chars)
- [ ] Authorization checks dept-admin role + grades:override permission
- [ ] Authorization validates dept-admin is in course's department
- [ ] Grade values are validated (percentage: 0-100, points: 0-4.0)
- [ ] API returns detailed change summary
- [ ] Grade change history can be retrieved
- [ ] All tests passing (25-30 new tests)
- [ ] API contract documentation complete

---

### Billing Course View Feature

- [ ] billing-admin role includes courses:read permission
- [ ] billing-admin can access GET /api/v1/courses
- [ ] billing-admin can access GET /api/v1/courses/:id
- [ ] billing-admin CANNOT access courses:write endpoints
- [ ] All tests passing (4 new tests)
- [ ] API contract documentation updated

---

## Security Considerations

### Grade Override Security

**Threat: Unauthorized Grade Changes**
- ✅ Mitigated by: grades:override permission check + dept-admin role validation
- ✅ Mitigated by: Department scope validation (admin must be in course's department)

**Threat: Audit Log Tampering**
- ✅ Mitigated by: Immutable audit log (no update/delete operations)
- ✅ Mitigated by: Separate collection with restricted access
- ⚠️  Consider: Blockchain or cryptographic signing for high-security environments

**Threat: Replay Attacks**
- ✅ Mitigated by: Timestamp validation, idempotency not required (each change is unique)

**Threat: Bulk Grade Changes**
- ⚠️  Current design: Single enrollment per request (safe)
- ⏳ Future consideration: Rate limiting for bulk operations

---

### Billing Course View Security

**Threat: Unauthorized Content Access**
- ✅ Mitigated by: billing-admin only gets courses:read, NOT content:read
- ✅ Mitigated by: Module/content endpoints still protected

**Threat: Privilege Escalation**
- ✅ Mitigated by: Permission system prevents adding courses:write
- ✅ Mitigated by: Role definitions are immutable at runtime

---

## Dependencies

### Internal Dependencies

- ✅ Permission system (permissions.service.ts) - EXISTS
- ✅ ClassEnrollment model - EXISTS
- ✅ Role-based authorization middleware - EXISTS
- ❌ GradeChangeLog model - NEEDS CREATION
- ❌ Grade override service - NEEDS CREATION

---

### External Dependencies

None - all functionality can be implemented with existing stack (MongoDB, Express, TypeScript)

---

## Migration Plan

### Phase 1: Development Environment

**No data migration required** - both features are purely additive

**Steps:**
1. Create GradeChangeLog model (empty collection)
2. Add grades:override permission to seed data
3. Update billing-admin role in seed data
4. Deploy code changes
5. Run integration tests

---

### Phase 2: Staging Environment

**Steps:**
1. Deploy code changes
2. Create GradeChangeLog collection
3. Update billing-admin permissions via admin UI or migration script
4. Test grade override workflow
5. Test billing-admin course access
6. Verify audit logging works correctly

---

### Phase 3: Production Environment

**Steps:**
1. **Pre-deployment:**
   - Backup database
   - Create GradeChangeLog collection
   - Verify permission system is working

2. **Deployment:**
   - Deploy API changes (zero downtime)
   - Run permission migration to update billing-admin role

3. **Post-deployment:**
   - Verify billing-admin can access courses
   - Verify grade override endpoint is protected (403 without permission)
   - Monitor audit logs for any errors
   - Notify dept-admin users of new capability

4. **Rollback Plan:**
   - Remove grades:override permission from dept-admin
   - Remove courses:read from billing-admin
   - No data cleanup needed (audit logs can remain)

---

## Questions for UI Team

1. **Grade Override UI Location:**
   - Where should the grade override UI be located? (student roster, gradebook, separate admin panel)

2. **Grade Change History Display:**
   - Should UI show grade change history to learners, or only to admins?

3. **Confirmation Flow:**
   - Does UI want a confirmation modal before submitting grade override?

4. **Validation Feedback:**
   - How should UI display validation errors (reason too short, invalid grade range)?

5. **Billing Course List:**
   - Should course list for billing-admin show any special columns (e.g., enrollment count, revenue)?

---

## Implementation Timeline

### Parallel Track Approach (6-8 hours total)

**Track 1: Grade Override Foundation (6 hours)**
- Hour 1-2: Create GradeChangeLog model + migrations
- Hour 3-4: Create grade-override.service.ts with business logic
- Hour 5-6: Create controller, routes, validators

**Track 2: Grade Override Testing (4 hours - overlaps Track 1)**
- Hour 3-4: Write unit tests (can start after service skeleton exists)
- Hour 5-6: Write integration tests

**Track 3: Billing Permission Update (2 hours - independent)**
- Hour 1: Update permissions.service.ts
- Hour 2: Add tests, update contracts

**Track 4: Documentation (2 hours - overlaps all tracks)**
- Hour 5-6: Complete API contracts
- Hour 7-8: Update ISSUE_QUEUE.md, create completion message

**Total Elapsed Time:** 6-8 hours (parallelized from 14-16 hours sequential)

---

## Status Tracking

**Current Status:** 📋 Planning Complete, Awaiting Approval

**Next Steps:**
1. ✅ Review this implementation plan
2. ⏳ Answer UI team questions (if any)
3. ⏳ Get approval for breaking changes
4. ⏳ Begin implementation (Track 1 + Track 3 in parallel)

**Blocked By:**
- None - ready to begin implementation

---

## Related Documents

- [ISS-021 UI Issue](../../ui/issue_queue/ISS-021.md)
- [UI Team Request Message](../messages/2026-01-14_160000_ui_request_ISS-021.md)
- [COURSE_ROLE_FUNCTION_MATRIX.md](../../ui/specs/COURSE_ROLE_FUNCTION_MATRIX.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN_ISS-021.md) (see separate file)
- [Contract Changes](./CONTRACT_CHANGES_ISS-021.md) (see separate file)
- [Phased Plan](./PHASED_PLAN_ISS-021.md) (see separate file)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Author:** API Agent
**Reviewed By:** Pending
