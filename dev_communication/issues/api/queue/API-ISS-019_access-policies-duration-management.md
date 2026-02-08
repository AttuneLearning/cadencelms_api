# API-ISS-019: Access Policies & Duration Management

## Status: PENDING
## Priority: Medium
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-014, API-ISS-017 (depends on)
## Phase: 4 - Access Policies, Notifications & Upgrades

---

## Overview

Implement department-level access policies and program-level overrides that control how long learners can access course content, whether they can access new versions, and certificate upgrade windows.

---

## Requirements

1. Create `DepartmentAccessPolicy` model
2. Create `ProgramAccessOverride` model
3. Calculate access expiration on enrollment
4. Implement access extension request flow
5. Check version access eligibility
6. Update enrollment model with access tracking

---

## Technical Specification

### New Models

#### DepartmentAccessPolicy

```typescript
type AccessDuration =
  | { type: 'months'; value: number }
  | { type: 'years'; value: number }
  | { type: 'perpetual' }
  | { type: 'custom'; expiresAt: Date };

interface IDepartmentAccessPolicy extends Document {
  departmentId: ObjectId;
  defaultAccessDuration: AccessDuration;
  allowNewVersionAccess: boolean;
  newVersionAccessWindow: number;        // Days
  allowCertificateUpgrade: boolean;
  certificateUpgradeWindow: number;      // Days
  allowCourseRetakes: boolean;
  maxRetakesPerCourse: number | null;
  retakeCooldownDays: number;
  notifyOnNewCourseVersion: boolean;
  notifyOnNewCertificateVersion: boolean;
  notifyBeforeAccessExpiry: boolean;
  expiryNotificationDays: number[];      // e.g., [30, 7, 1]
  createdAt: Date;
  updatedAt: Date;
}
```

#### ProgramAccessOverride

```typescript
interface IProgramAccessOverride extends Document {
  programId: ObjectId;
  accessDuration?: AccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number;
  requireSequentialCompletion: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enrollment Model Updates

```typescript
// Add to IEnrollment
accessExpiresAt: Date | null;
accessExtendedAt: Date | null;
accessExtensionReason: string | null;
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/departments/{id}/access-policy` | Get department policy |
| PUT | `/api/v2/departments/{id}/access-policy` | Update department policy |
| GET | `/api/v2/programs/{id}/access-override` | Get program overrides |
| PUT | `/api/v2/programs/{id}/access-override` | Set program overrides |
| GET | `/api/v2/learners/{id}/version-access` | Check version access |
| POST | `/api/v2/enrollments/{id}/extend` | Request access extension |
| GET | `/api/v2/access-extension-requests` | List extension requests (admin) |
| PATCH | `/api/v2/access-extension-requests/{id}` | Review extension request |

### GET /api/v2/learners/{id}/version-access

Check what course versions a learner can access.

**Response:**
```json
{
  "status": "success",
  "data": {
    "learnerId": "...",
    "courseAccess": [
      {
        "canonicalCourseId": "...",
        "courseCode": "CS101",
        "enrolledVersionId": "...",
        "enrolledVersion": 1,
        "currentPublishedVersion": 2,
        "accessStatus": "active",
        "accessExpiresAt": "2027-01-15T...",
        "canAccessNewVersion": true,
        "newVersionAccessUntil": "2026-04-15T...",
        "newVersionReason": "Within 90-day window"
      }
    ]
  }
}
```

### Access Duration Calculation

```typescript
async function calculateAccessExpiration(
  programId: string,
  enrollmentDate: Date
): Promise<Date | null> {
  const program = await Program.findById(programId);
  const override = await ProgramAccessOverride.findOne({ programId });
  const policy = await DepartmentAccessPolicy.findOne({
    departmentId: program.departmentId
  });

  // Use override if exists, otherwise policy default
  const duration = override?.accessDuration ?? policy?.defaultAccessDuration;

  if (!duration || duration.type === 'perpetual') {
    return null; // No expiration
  }

  const expiresAt = new Date(enrollmentDate);
  switch (duration.type) {
    case 'months':
      expiresAt.setMonth(expiresAt.getMonth() + duration.value);
      break;
    case 'years':
      expiresAt.setFullYear(expiresAt.getFullYear() + duration.value);
      break;
    case 'custom':
      return duration.expiresAt;
  }

  return expiresAt;
}
```

### New Version Access Logic

```typescript
async function canAccessNewVersion(
  learnerId: string,
  newCourseVersionId: string
): Promise<{ allowed: boolean; reason: string; until?: Date }> {
  const newVersion = await CourseVersion.findById(newCourseVersionId);
  const enrollment = await Enrollment.findOne({
    learnerId,
    canonicalCourseId: newVersion.canonicalCourseId,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    return { allowed: false, reason: 'No enrollment in this course' };
  }

  if (enrollment.courseVersionId.equals(newCourseVersionId)) {
    return { allowed: true, reason: 'Enrolled in this version' };
  }

  // Check policy
  const policy = await getEffectivePolicy(enrollment.programId);

  if (!policy.allowNewVersionAccess) {
    return { allowed: false, reason: 'New version access not allowed' };
  }

  // Check if within window
  const windowEnd = new Date(newVersion.publishedAt);
  windowEnd.setDate(windowEnd.getDate() + policy.newVersionAccessWindow);

  if (new Date() <= windowEnd) {
    return {
      allowed: true,
      reason: `Within ${policy.newVersionAccessWindow}-day access window`,
      until: windowEnd
    };
  }

  return { allowed: false, reason: 'Access window expired' };
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/policy/DepartmentAccessPolicy.model.ts` | Policy schema |
| `src/models/policy/ProgramAccessOverride.model.ts` | Override schema |
| `src/models/policy/AccessExtensionRequest.model.ts` | Extension request schema |
| `src/services/accessPolicy.service.ts` | Policy logic |
| `src/services/accessExtension.service.ts` | Extension request logic |
| `src/controllers/accessPolicy.controller.ts` | Route handlers |
| `src/routes/v2/accessPolicy.routes.ts` | Route definitions |

### Files to Modify

| File | Change |
|------|--------|
| `src/models/enrollment/Enrollment.model.ts` | Add access tracking fields |
| `src/services/enrollment.service.ts` | Calculate access on enroll |

### Migration

```typescript
// Create default policy for each department
const departments = await Department.find({});
for (const dept of departments) {
  await DepartmentAccessPolicy.create({
    departmentId: dept._id,
    defaultAccessDuration: { type: 'months', value: 12 },
    allowNewVersionAccess: true,
    newVersionAccessWindow: 90,
    allowCertificateUpgrade: true,
    certificateUpgradeWindow: 180,
    allowCourseRetakes: true,
    maxRetakesPerCourse: 3,
    retakeCooldownDays: 7,
    notifyOnNewCourseVersion: true,
    notifyOnNewCertificateVersion: true,
    notifyBeforeAccessExpiry: true,
    expiryNotificationDays: [30, 7, 1]
  });
}
```

---

## Tests Required

1. [ ] Create/update department policy
2. [ ] Create/update program override
3. [ ] Access expiration calculated on enrollment
4. [ ] Override takes precedence over policy
5. [ ] Perpetual access has no expiration
6. [ ] New version access check within window
7. [ ] New version access denied after window
8. [ ] Extension request creation
9. [ ] Extension request approval/denial
10. [ ] Access extended correctly

---

## Acceptance Criteria

- [ ] DepartmentAccessPolicy model and CRUD
- [ ] ProgramAccessOverride model and CRUD
- [ ] Access expiration calculated automatically
- [ ] Policy hierarchy respected (override > policy)
- [ ] New version access checking works
- [ ] Extension request flow complete
- [ ] Enrollment model updated
- [ ] Migration creates default policies
- [ ] Tests pass

---

## Questions / Clarifications

1. **Who can approve extension requests?**
   Department admins or program managers.

2. **Can policies be changed retroactively?**
   Policy changes affect new enrollments. Existing enrollments keep their calculated expiration unless manually extended.

---

## Implementation Notes

*Add notes during implementation*

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
