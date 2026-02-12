# Message: Course Versioning System API Request

**Date:** 2026-02-02
**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Request
**Related Issues:** UI-ISS-001
**Reference Specs:**
- `dev_communication/specs/learning/COURSE_VERSIONING_DESIGN.md`
- `dev_communication/specs/learning/COURSE_VERSIONING_TYPES.md`
- `dev_communication/specs/learning/LEARNER_ACCESS_AND_NOTIFICATIONS.md`
- `dev_communication/shared/architecture/decisions/ADR-VERS-001-COURSE-VERSIONING-SYSTEM.md`

---

## Summary

We need to implement a comprehensive course versioning system that enables:
1. Course evolution without breaking existing certificates
2. Certificate/credential compatibility groups
3. Learner access duration policies
4. Notification system for version updates
5. Certificate upgrade pathways

This is a major feature requiring new tables, entities, and endpoints.

---

## New Entities Required

### 1. CanonicalCourse

Represents the stable identity of a course across all versions.

```typescript
interface CanonicalCourse {
  id: string;
  code: string;                          // Stable course code
  departmentId: string;
  programId: string | null;
  currentPublishedVersionId: string | null;
  latestDraftVersionId: string | null;
  totalVersions: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. CourseVersion

Immutable snapshot of a course at a point in time.

```typescript
interface CourseVersion {
  id: string;
  canonicalCourseId: string;
  version: number;                       // 1, 2, 3...
  title: string;
  description: string;
  credits: number;
  duration: number;
  settings: CourseSettings;
  instructorIds: string[];
  status: 'draft' | 'published' | 'archived';
  isLocked: boolean;
  isLatest: boolean;
  parentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  lockedReason: 'superseded' | 'archived' | 'manual' | null;
  changeNotes: string | null;
  statsAtLock: { moduleCount: number; learningUnitCount: number; enrollmentCount: number; } | null;
}
```

### 3. CourseVersionModule (Join Table)

Links modules to specific course versions.

```typescript
interface CourseVersionModule {
  id: string;
  courseVersionId: string;
  moduleId: string;
  order: number;
  isRequired: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  createdAt: string;
}
```

### 4. CredentialGroup

Groups compatible certificates that earn the same badge/credential.

```typescript
interface CredentialGroup {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'certificate' | 'diploma' | 'degree' | 'badge';
  badgeImageUrl: string | null;
  badgeColor: string | null;
  departmentId: string;
  programId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5. CertificateDefinition

Versioned requirements for earning a credential.

```typescript
interface CertificateDefinition {
  id: string;
  credentialGroupId: string;
  version: number;
  parentDefinitionId: string | null;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'deprecated';
  isCompatible: boolean;
  compatibilityBreakReason: string | null;
  deprecatedAt: string | null;
  deprecatedReason: string | null;
  supersededByDefinitionId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  expiresAfterMonths: number | null;
  autoIssue: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6. CertificateRequirement

Requirements within a certificate definition.

```typescript
interface CertificateRequirement {
  id: string;
  certificateDefinitionId: string;
  courseVersionId: string;               // Points to specific version
  isRequired: boolean;
  minimumScore: number | null;
  order: number;
  electiveGroupId: string | null;
  electiveGroupName: string | null;
  electiveMinCount: number | null;
}
```

### 7. CertificateIssuance

Record of a certificate issued to a learner.

```typescript
interface CertificateIssuance {
  id: string;
  certificateDefinitionId: string;
  credentialGroupId: string;
  learnerId: string;
  completedRequirements: CompletedRequirement[];
  issuedAt: string;
  issuedBy: string | null;
  verificationCode: string;
  pdfUrl: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  // Upgrade tracking
  upgradedToIssuanceId: string | null;
  upgradedFromIssuanceId: string | null;
  metadata: Record<string, unknown> | null;
}
```

### 8. DepartmentAccessPolicy

Department-level access policy configuration.

```typescript
interface DepartmentAccessPolicy {
  id: string;
  departmentId: string;
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
  expiryNotificationDays: number[];
  createdAt: string;
  updatedAt: string;
}

type AccessDuration =
  | { type: 'months'; value: number }
  | { type: 'years'; value: number }
  | { type: 'perpetual' }
  | { type: 'custom'; expiresAt: string };
```

### 9. ProgramAccessOverride

Program-level overrides for access policies.

```typescript
interface ProgramAccessOverride {
  id: string;
  programId: string;
  accessDuration?: AccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number;
  requireSequentialCompletion: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 10. Notification

Learner notification entity.

```typescript
interface Notification {
  id: string;
  learnerId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedCourseVersionId: string | null;
  relatedCertificateDefinitionId: string | null;
  relatedProgramEnrollmentId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
  sentAt: string;
  emailSentAt: string | null;
  pushSentAt: string | null;
  expiresAt: string | null;
}

type NotificationType =
  | 'course_version_available'
  | 'certificate_version_available'
  | 'certificate_upgrade_available'
  | 'access_expiring_soon'
  | 'access_expired'
  | 'certificate_earned'
  | 'certificate_upgraded'
  | 'badge_earned';
```

### 11. NotificationTemplate

Customizable notification templates.

```typescript
interface NotificationTemplate {
  id: string;
  type: NotificationType;
  departmentId: string | null;
  titleTemplate: string;
  messageTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  sendInApp: boolean;
  sendEmail: boolean;
  sendPush: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Modified Entities

### Module (Remove courseId, Add ownerDepartmentId)

Modules become shared across courses. Remove `courseId`, add `ownerDepartmentId`.

### LearningUnit (Add Versioning Fields)

```typescript
// Add these fields to existing LearningUnit:
status: 'draft' | 'published' | 'deprecated';
replacedByUnitId: string | null;
replacesUnitId: string | null;
publishedAt: string | null;
deprecatedAt: string | null;
```

### Enrollment (Add Version Tracking)

```typescript
// Add these fields to existing Enrollment:
canonicalCourseId: string;
courseVersionId: string;
certificateDefinitionId: string | null;
completionSnapshot: EnrollmentCompletionSnapshot | null;
```

### ProgramEnrollment (Add Access Tracking)

```typescript
// Add these fields:
certificateDefinitionId: string;
accessExpiresAt: string;
accessExtendedAt: string | null;
accessExtensionReason: string | null;
hasUpgradedCertificate: boolean;
upgradedFromDefinitionId: string | null;
upgradedAt: string | null;
certificateIssuanceId: string | null;
```

---

## API Endpoints Required

### Course Versioning

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/courses/{id}/versions` | Create new draft version from published |
| GET | `/api/v2/courses/{id}/versions` | List all versions of a course |
| GET | `/api/v2/course-versions/{id}` | Get specific version details |
| PATCH | `/api/v2/course-versions/{id}` | Update draft version |
| POST | `/api/v2/course-versions/{id}/publish` | Publish (locks previous, auto-versions certs) |
| POST | `/api/v2/course-versions/{id}/lock` | Manually lock a version |
| GET | `/api/v2/course-versions/{id}/modules` | Get modules for version |
| POST | `/api/v2/course-versions/{id}/modules` | Add module to version |
| DELETE | `/api/v2/course-versions/{id}/modules/{moduleId}` | Remove module from version |
| PATCH | `/api/v2/course-versions/{id}/modules/reorder` | Reorder modules |

### Credential Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/credential-groups` | List credential groups |
| POST | `/api/v2/credential-groups` | Create credential group |
| GET | `/api/v2/credential-groups/{id}` | Get credential group |
| PATCH | `/api/v2/credential-groups/{id}` | Update credential group |
| DELETE | `/api/v2/credential-groups/{id}` | Delete credential group |
| GET | `/api/v2/credential-groups/{id}/definitions` | List definitions in group |

### Certificate Definitions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/certificate-definitions` | List definitions |
| POST | `/api/v2/certificate-definitions` | Create definition |
| GET | `/api/v2/certificate-definitions/{id}` | Get definition |
| PATCH | `/api/v2/certificate-definitions/{id}` | Update definition |
| POST | `/api/v2/certificate-definitions/{id}/activate` | Activate definition |
| POST | `/api/v2/certificate-definitions/{id}/deprecate` | Deprecate definition |

### Certificate Issuances

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/certificate-issuances` | List issuances |
| POST | `/api/v2/certificate-issuances` | Issue certificate manually |
| GET | `/api/v2/certificate-issuances/{id}` | Get issuance |
| POST | `/api/v2/certificate-issuances/{id}/revoke` | Revoke certificate |
| GET | `/api/v2/certificates/verify/{code}` | Verify certificate by code |

### Learner Certificate Upgrades

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/learners/{id}/upgrade-eligibility` | Check upgrade eligibility |
| POST | `/api/v2/certificate-issuances/{id}/upgrade` | Initiate upgrade |
| GET | `/api/v2/certificate-issuances/{id}/upgrade-status` | Check upgrade progress |

### Access Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/departments/{id}/access-policy` | Get department policy |
| PUT | `/api/v2/departments/{id}/access-policy` | Update department policy |
| GET | `/api/v2/programs/{id}/access-override` | Get program overrides |
| PUT | `/api/v2/programs/{id}/access-override` | Set program overrides |

### Learner Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/learners/{id}/version-access` | Check what versions learner can access |
| POST | `/api/v2/program-enrollments/{id}/extend` | Request access extension |
| GET | `/api/v2/access-extension-requests` | List extension requests (admin) |
| PATCH | `/api/v2/access-extension-requests/{id}` | Review extension request |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/learners/{id}/notifications` | Get learner notifications |
| PATCH | `/api/v2/notifications/{id}` | Mark read/dismissed |
| GET | `/api/v2/notification-templates` | List templates |
| PUT | `/api/v2/notification-templates/{type}` | Update template |

### Learning Unit Versioning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/learning-units/{id}/references` | Get modules/courses using this unit |
| POST | `/api/v2/learning-units/{id}/create-variant` | Create variant for specific context |
| POST | `/api/v2/learning-units/{id}/publish` | Publish and deprecate old version |

### Module Completion (Global)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/learners/{id}/module-completions` | Get global module completions |
| POST | `/api/v2/module-completions` | Record module completion |

---

## Business Logic Requirements

### 1. Auto-Versioning on Course Publish

When a course version is published:
1. Lock the previous published version (`isLocked: true`, `lockedReason: 'superseded'`)
2. Find all CertificateDefinitions requiring the old version
3. For each affected definition:
   - Create new CertificateDefinition (version + 1)
   - Copy requirements, replace old course version with new
   - Mark old definition as deprecated
   - Send notifications to affected learners

### 2. Access Duration Calculation

When learner enrolls in a program:
1. Get DepartmentAccessPolicy for program's department
2. Check for ProgramAccessOverride
3. Calculate `accessExpiresAt` based on policy
4. Store in ProgramEnrollment

### 3. Notification Triggers

Automatically send notifications when:
- Course version published (to learners with previous version)
- Certificate definition created (to learners with previous definition)
- Access expiring (at configured intervals: 30, 7, 1 days)
- Certificate earned
- Certificate upgraded

### 4. Module Completion Propagation

When a module is completed:
1. Record in ModuleCompletion (global)
2. Update progress for ALL enrollments containing that module
3. Check if any certificate requirements are now met

---

## Migration Requirements

### Phase 1: Data Model
1. Create new tables
2. Add versioning fields to existing tables
3. Create CanonicalCourse for each existing Course
4. Convert existing courses to CourseVersion v1

### Phase 2: Certificates
1. Create CredentialGroup for each unique certificate pattern
2. Create CertificateDefinition from existing templates
3. Link existing issuances to definitions

### Phase 3: Access Policies
1. Create default DepartmentAccessPolicy for each department
2. Set reasonable defaults (12 months access, 90-day version window)

---

## Questions for API Team

1. **Timeline:** Can you provide a rough estimate for this work?
2. **Phasing:** Should we implement in phases (versioning first, then notifications)?
3. **Migration:** What's your preferred approach for data migration?
4. **Events:** Should we use webhooks or internal events for notification triggers?
5. **Module sharing:** Any concerns about the module ownership model change?

---

## Response Requested

Please confirm receipt and provide:
- Acceptance of the request
- Any clarifications needed
- Suggested phasing approach
- Rough timeline estimate

---

*Message from UI Team - 2026-02-02*
