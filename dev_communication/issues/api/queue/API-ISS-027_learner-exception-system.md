# API-ISS-027: Learner Exception & Override System

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-100, API-ISS-025
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

Staff and admins need the ability to grant per-learner exceptions that override standard course rules. All exceptions must be audited. This supports scenarios like: giving a struggling learner extra quiz attempts, extending enrollment access for medical leave, excusing a learner from a specific lesson, or manually overriding a grade.

---

## Requirements

1. **Exception model** with audit trail (reason, grantedBy, timestamp)
2. **Exception types**: extra_attempts, extended_access, module_unlock, grade_override, excuse_content
3. **CRUD endpoints** for managing exceptions per enrollment
4. **Integration with existing systems**: Extra attempts must integrate with maxAttempts enforcement (API-ISS-025), extended access with enrollment expiry
5. **Permission**: `enrollment:exceptions:manage` or equivalent

---

## Technical Specification

### New Model — LearnerException

```typescript
type ExceptionType = 
  | 'extra_attempts'     // Override maxAttempts for a specific exercise
  | 'extended_access'    // Extend enrollment validity/expiry
  | 'module_unlock'      // Manually unlock a locked module
  | 'grade_override'     // Manually set assessment grade
  | 'excuse_content';    // Mark content as not required

interface ILearnerException extends Document {
  enrollmentId: ObjectId;
  learnerId: ObjectId;
  type: ExceptionType;
  reason: string;                    // Required — audit trail
  grantedBy: ObjectId;              // Staff/admin who granted
  grantedAt: Date;
  expiresAt: Date | null;           // Some exceptions may be temporary
  isActive: boolean;
  
  // Type-specific data
  metadata: {
    // extra_attempts
    exerciseId?: ObjectId;
    additionalAttempts?: number;     // Added on top of maxAttempts
    
    // extended_access  
    newExpiryDate?: Date;
    previousExpiryDate?: Date;
    
    // module_unlock
    moduleId?: ObjectId;
    
    // grade_override
    exerciseId?: ObjectId;
    attemptId?: ObjectId;
    previousGrade?: number;
    newGrade?: number;
    
    // excuse_content
    contentId?: ObjectId;
    contentType?: 'lesson' | 'exercise' | 'module';
  };
  
  revokedAt: Date | null;
  revokedBy: ObjectId | null;
  revokeReason: string | null;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/enrollments/:enrollmentId/exceptions` | List all exceptions for enrollment |
| POST | `/api/v2/enrollments/:enrollmentId/exceptions` | Grant a new exception |
| GET | `/api/v2/exceptions/:exceptionId` | Get exception detail |
| PUT | `/api/v2/exceptions/:exceptionId/revoke` | Revoke an exception |

### Integration Points

- **Extra attempts**: When checking maxAttempts in exam-attempt creation, also check for active `extra_attempts` exceptions and add `additionalAttempts` to the limit
- **Extended access**: When checking enrollment expiry, use `newExpiryDate` from active exception if present
- **Module unlock**: When checking module prerequisites, bypass if active `module_unlock` exception exists
- **Grade override**: Update the official grade on the attempt/enrollment
- **Excuse content**: When calculating course completion %, exclude excused content items

---

## Tests Required

1. [ ] Create exception with valid data succeeds
2. [ ] Reason field is required (reject if empty)
3. [ ] Extra attempts exception allows more attempts beyond maxAttempts
4. [ ] Extended access exception updates effective expiry
5. [ ] Module unlock exception bypasses prerequisite check
6. [ ] Grade override updates official grade
7. [ ] Excuse content changes completion calculation
8. [ ] Revoked exception no longer applies
9. [ ] Non-authorized users cannot create exceptions
10. [ ] Exception audit trail is complete and accurate

---

## Acceptance Criteria

- [ ] All 5 exception types functional
- [ ] Audit trail complete (reason, grantedBy, timestamp)
- [ ] Exceptions integrate with their respective systems
- [ ] Revocation works correctly
- [ ] Permission enforced
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
