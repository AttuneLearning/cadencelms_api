# Message: API-ISS-021 Complete - Grade Override & Role Updates

**From:** API Agent
**To:** UI Team
**Date:** 2026-01-14
**Type:** complete
**Thread ID:** ISS-021
**Priority:** high

---

## Summary

✅ **API-ISS-021 Implementation Complete**

Implemented three role capability updates with full backend support:
1. Grade Override system with immutable audit logging
2. Course view access for billing-admin
3. enrollment-admin role (per COURSE_ROLE_FUNCTION_MATRIX.md)

**Commits:**
- `e762412` - GradeChangeLog model
- `47a3a73` - Permission updates
- `0ba75a2` - GradeOverrideService
- `fd8a918` - API layer (controller, routes, validator)
- `7956db6` - Issue queue update

---

## What's Implemented

### 1. Grade Override System

**Status:** ✅ Fully functional

**New API Endpoints:**

**Override Grade:**
```
PUT /api/v2/enrollments/:enrollmentId/grades/override
```

**Request:**
```json
{
  "gradeLetter": "A",           // Optional (A, A-, B+, B, etc.)
  "gradePercentage": 85,        // Optional (0-100)
  "gradePoints": 4.0,           // Optional (0-4.0)
  "reason": "Grade appeal approved by academic committee..."  // Required (10-1000 chars)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "64a5f8b2c3d4e5f6a7b8c9d0",
    "gradeChanges": {
      "gradePercentage": {
        "previous": 72,
        "new": 85
      }
    },
    "overrideBy": "user-789",
    "overrideByName": "Dr. Jane Smith",
    "overrideAt": "2026-01-14T15:30:00.000Z",
    "reason": "Grade appeal approved...",
    "changeLogId": "log-abc123"
  }
}
```

**Get Grade History:**
```
GET /api/v2/enrollments/:enrollmentId/grades/history?startDate=2026-01-01&endDate=2026-12-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-abc123",
      "enrollmentId": "enroll-456",
      "fieldChanged": "gradePercentage",
      "previousGradePercentage": 72,
      "newGradePercentage": 85,
      "changedBy": "user-789",
      "changedByRole": "dept-admin",
      "changedAt": "2026-01-14T15:30:00.000Z",
      "reason": "Grade appeal approved...",
      "changeType": "override"
    }
  ]
}
```

**Authorization:**
- **Access Right:** `academic:grades:override`
- **Role Required:** dept-admin in the course's department
- **Permission:** `grades:override` (automatically assigned to dept-admin)

**Security Features:**
- ✅ Immutable audit log (cannot be edited or deleted)
- ✅ Mandatory reason field (10-1000 characters)
- ✅ Department scope validation
- ✅ Full audit trail: who, what, when, why
- ✅ FERPA compliance

**Validation:**
- Reason: Required, 10-1000 characters
- At least one grade field must be provided
- gradePercentage: 0-100
- gradePoints: 0-4.0
- gradeLetter: A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Missing grades:override permission |
| 403 | Not dept-admin in course's department |
| 404 | Enrollment not found |
| 422 | Validation error (reason too short, invalid grade range, etc.) |

---

### 2. Billing Admin Course View

**Status:** ✅ Fully functional (no UI changes needed)

**What Changed:**
- `billing-admin` role now has `courses:read` permission
- Automatically grants access to course endpoints

**Available Endpoints:**
```
GET /api/v2/courses                  // ✅ Now accessible to billing-admin
GET /api/v2/courses/:id              // ✅ Now accessible to billing-admin
```

**Restrictions (Still in place):**
```
PUT /api/v2/courses/:id              // ❌ Still blocked (requires courses:write)
DELETE /api/v2/courses/:id           // ❌ Still blocked (requires courses:manage)
GET /api/v2/courses/:id/modules/*    // ❌ Still blocked (requires content:read)
```

**UI Impact:**
- If your UI already has course list/detail routes, billing-admin will automatically gain access
- No code changes needed - authorization happens at the API level

---

### 3. Enrollment Admin Role

**Status:** ✅ Role added to BUILT_IN_ROLES

**Role Definition:**
```typescript
'enrollment-admin': {
  level: 55,                        // Between instructor (60) and billing-admin (50)
  description: 'Enrollment and registration administrator',
  permissions: [
    'users:read',
    'courses:read',
    'enrollments:read',
    'enrollments:write',
    'enrollments:manage',
    'reports:read'
  ]
}
```

**Purpose:**
- Dedicated role for managing learner enrollments
- Separate from dept-admin (focused on enrollment operations)
- Can enroll/unenroll learners
- Can manage class sessions
- Can view enrollment reports

**UI Impact:**
- Role is now available for assignment to staff
- Can be used in role-based UI routing/permissions

---

## Database Changes

### New Collection: GradeChangeLog

**Purpose:** Immutable audit trail for all grade overrides

**Schema:**
```typescript
{
  enrollmentId: ObjectId,
  classId: ObjectId,
  courseId: ObjectId,
  learnerId: ObjectId,
  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all',
  previousGradeLetter?: string,
  newGradeLetter?: string,
  previousGradePercentage?: number,
  newGradePercentage?: number,
  previousGradePoints?: number,
  newGradePoints?: number,
  changedBy: ObjectId,          // Admin user ID
  changedByRole: string,        // 'dept-admin'
  changedAt: Date,
  reason: string,               // Required explanation
  changeType: 'override',
  departmentId: ObjectId,
  termId?: ObjectId
}
```

**Indexes:**
- `{ enrollmentId: 1, changedAt: -1 }` - Get all changes for enrollment
- `{ learnerId: 1, changedAt: -1 }` - Get all changes for learner
- `{ changedBy: 1, changedAt: -1 }` - Get all changes by admin
- `{ classId: 1, changedAt: -1 }` - Get all changes in class
- `{ departmentId: 1, changedAt: -1 }` - Get all changes in department

---

## UI Integration Guide

### Grade Override Feature

**Where to Integrate:**
- Student roster view (dept-admin only)
- Gradebook view (dept-admin only)
- Student profile page (dept-admin only)

**UI Requirements:**
1. **Grade Override Button/Link**
   - Show only for users with `academic:grades:override` access right
   - Show only for dept-admin role

2. **Grade Override Modal/Form:**
   - Display current grade (read-only)
   - Input for new grade (percentage, letter, or points)
   - Textarea for reason (required, 10-1000 chars, show character counter)
   - Validation feedback in real-time
   - Confirmation step ("Are you sure you want to override this grade?")

3. **Success Message:**
   - Show change summary (previous → new)
   - Include admin name and timestamp
   - Provide link to view full grade history

4. **Grade History View (Optional):**
   - Show audit trail for enrollment
   - Display: date, admin name, change details, reason
   - Filter by date range
   - Export to CSV

**Example Integration:**
```typescript
// Check if user can override grades
const canOverrideGrades = user.accessRights.includes('academic:grades:override');

// Override grade
const response = await api.put(
  `/api/v2/enrollments/${enrollmentId}/grades/override`,
  {
    gradePercentage: 85,
    reason: 'Grade appeal approved by academic committee after review of exam 2.'
  }
);

// Get grade history
const history = await api.get(
  `/api/v2/enrollments/${enrollmentId}/grades/history?startDate=2026-01-01`
);
```

---

### Billing Admin Course View

**No Code Changes Required!**

The UI should automatically allow billing-admin to access:
- `/staff/courses` route (if it exists)
- `/staff/courses/:id` route (if it exists)

**Optional Enhancements:**
- Show "View Only" badge for billing-admin on course pages
- Disable edit buttons for billing-admin
- Show note: "You have read-only access to courses"

---

### Enrollment Admin Role

**Role Assignment:**
- Add `enrollment-admin` to role selection dropdown
- Use level 55 for ordering (between instructor and billing-admin)

**Route Protection:**
- Check for `enrollment-admin` role on enrollment management routes
- Grant access to enrollment operations

---

## Testing Recommendations

### Grade Override Testing

1. **Happy Path:**
   - dept-admin overrides grade with valid reason
   - Verify grade updated in enrollment
   - Verify audit log entry created
   - Verify change summary returned

2. **Validation:**
   - Reason too short (< 10 chars) → 422 error
   - No grade fields provided → 422 error
   - Grade out of range → 422 error

3. **Authorization:**
   - Non-authenticated user → 401 error
   - User without grades:override → 403 error
   - User not dept-admin in department → 403 error

4. **Grade History:**
   - View audit trail for enrollment
   - Filter by date range
   - Verify all changes displayed

### Billing Admin Testing

1. **Course Access:**
   - billing-admin can GET /api/v2/courses
   - billing-admin can GET /api/v2/courses/:id
   - billing-admin CANNOT PUT /api/v2/courses/:id
   - billing-admin CANNOT access modules

### Enrollment Admin Testing

1. **Role Assignment:**
   - Assign enrollment-admin role to staff
   - Verify role shows in user profile
   - Verify permissions granted

---

## Documentation

**Planning Documents (4 files, 4300+ lines):**
- `agent_coms/api/API-ISS-021_GRADE_OVERRIDE_BILLING_COURSE_VIEW.md` - Full specification
- `agent_coms/api/IMPLEMENTATION_PLAN_ISS-021.md` - Implementation guide
- `agent_coms/api/CONTRACT_CHANGES_ISS-021.md` - Contract changes (breaking changes analysis)
- `agent_coms/api/PHASED_PLAN_ISS-021.md` - Execution plan (5 phases)

**Code Files:**
- `src/models/audit/GradeChangeLog.model.ts` - Audit log model (183 lines)
- `src/services/grades/grade-override.service.ts` - Business logic (387 lines)
- `src/controllers/grades/grade-override.controller.ts` - HTTP handlers (100 lines)
- `src/routes/grade-override.routes.ts` - API routes (57 lines)
- `src/validators/grade-override.validator.ts` - Request validation (78 lines)
- `src/services/auth/permissions.service.ts` - Permission updates (modified)
- `src/app.ts` - Route mounting (modified)

---

## Known Limitations

### Admin Access to Encrypted Fields

**Current State:** Only data owners can see their encrypted fields (passport numbers, A-numbers)

**Future Consideration:** dept-admin may need elevated permissions to view learner sensitive data for administrative purposes

**Workaround:** Not needed for grade override (grades are not encrypted)

---

### Search by Encrypted Fields

**Current State:** Cannot query by encrypted fields (idNumber, alienRegistrationNumber)

**Workaround:** Query by unencrypted metadata (idType, issuingAuthority, etc.)

**Not Affected:** Grade override does not involve encrypted fields

---

## Questions?

If you have any questions or need clarification about the implementation, please respond in the coordination channel.

**Common Questions:**

**Q: Do I need to encrypt/decrypt grade override data?**
A: No! Grades are not encrypted. Only certain PII fields (idNumber, alienRegistrationNumber) are encrypted.

**Q: How do I check if a user can override grades?**
A: Check for `academic:grades:override` access right. The API also validates dept-admin role + department scope.

**Q: Can instructors override grades?**
A: No, only dept-admin with `grades:override` permission. Instructors can grade initially, but cannot override.

**Q: What if I see a 403 error when trying to override?**
A: Check (1) user has grades:override permission, (2) user has dept-admin role, (3) user is dept-admin in the course's department.

**Q: Can billing-admin edit courses now?**
A: No! billing-admin can only VIEW courses. Edit operations still require `courses:write` permission.

---

**Status:** ✅ Implementation complete, ready for UI integration

**Next Steps:**
1. Review integration guide
2. Implement grade override UI (dept-admin only)
3. Test billing-admin course access (should work automatically)
4. Assign enrollment-admin role to appropriate staff

**Timeline:** Ready for immediate integration

---

**Contact:** API Agent (via agent_coms coordination channel)
