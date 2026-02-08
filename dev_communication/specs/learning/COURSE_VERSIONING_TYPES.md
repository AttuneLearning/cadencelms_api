# Course Versioning - Type Definitions

**Status:** Draft - Pending Approval
**Date:** 2026-02-02
**Related:** COURSE_VERSIONING_DESIGN.md, ADR-VERS-001

This document contains the complete TypeScript type definitions for the course versioning system.

---

## 1. Course Entities

### CanonicalCourse

```typescript
/**
 * CanonicalCourse - The stable identity of a course across all versions.
 * This is the "concept" of the course that persists as versions evolve.
 */
export interface CanonicalCourse {
  id: string;
  code: string;                          // Stable course code, e.g., "CS101"
  departmentId: string;
  programId: string | null;

  // Current state
  currentPublishedVersionId: string | null;
  latestDraftVersionId: string | null;
  totalVersions: number;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * CanonicalCourse list item for API responses
 */
export interface CanonicalCourseListItem {
  id: string;
  code: string;
  department: { id: string; name: string };
  program: { id: string; name: string } | null;
  currentPublishedVersion: {
    id: string;
    version: number;
    title: string;
  } | null;
  latestDraftVersion: {
    id: string;
    version: number;
    title: string;
  } | null;
  totalVersions: number;
  createdAt: string;
}
```

### CourseVersion

```typescript
/**
 * CourseVersion status lifecycle
 */
export type CourseVersionStatus = 'draft' | 'published' | 'archived';

/**
 * Reason a version was locked
 */
export type LockReason = 'superseded' | 'archived' | 'manual';

/**
 * CourseVersion - An immutable snapshot of a course at a point in time.
 */
export interface CourseVersion {
  id: string;
  canonicalCourseId: string;
  version: number;                       // 1, 2, 3...

  // Course metadata (version-specific)
  title: string;
  description: string;
  credits: number;
  duration: number;                      // in minutes
  settings: CourseSettings;
  instructorIds: string[];

  // Lifecycle
  status: CourseVersionStatus;
  isLocked: boolean;
  isLatest: boolean;                     // Is this the latest version?

  // Lineage
  parentVersionId: string | null;        // null for v1

  // Audit
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  lockedReason: LockReason | null;

  // Change tracking
  changeNotes: string | null;

  // Stats (snapshot at lock time for historical record)
  statsAtLock: CourseVersionStats | null;
}

export interface CourseVersionStats {
  moduleCount: number;
  learningUnitCount: number;
  enrollmentCount: number;
  completionCount: number;
}

/**
 * CourseVersion list item for API responses
 */
export interface CourseVersionListItem {
  id: string;
  canonicalCourseId: string;
  canonicalCourseCode: string;
  version: number;
  title: string;
  status: CourseVersionStatus;
  isLocked: boolean;
  isLatest: boolean;
  moduleCount: number;
  enrollmentCount: number;
  createdAt: string;
  publishedAt: string | null;
}

/**
 * Full CourseVersion detail including related data
 */
export interface CourseVersionDetail extends CourseVersion {
  canonicalCourse: {
    id: string;
    code: string;
    department: { id: string; name: string };
    program: { id: string; name: string } | null;
  };
  instructors: InstructorRef[];
  modules: CourseVersionModuleItem[];
  parentVersion: {
    id: string;
    version: number;
    title: string;
  } | null;
  statistics: {
    moduleCount: number;
    learningUnitCount: number;
    totalDuration: number;
    enrollmentCount: number;
    completionRate: number;
  };
}
```

### CourseVersionModule (Join Table)

```typescript
/**
 * Links a module to a specific course version with ordering and overrides.
 */
export interface CourseVersionModule {
  id: string;
  courseVersionId: string;
  moduleId: string;
  order: number;

  // Version-specific overrides
  isRequired: boolean;
  availableFrom: string | null;
  availableUntil: string | null;

  createdAt: string;
}

/**
 * CourseVersionModule with module details for display
 */
export interface CourseVersionModuleItem extends CourseVersionModule {
  module: {
    id: string;
    title: string;
    description: string | null;
    estimatedDuration: number;
    learningUnitCount: number;
    isPublished: boolean;
  };
}
```

---

## 2. Module Entities (Shared)

```typescript
/**
 * Module - A reusable container for learning units.
 * Modules are NOT versioned and can be shared across courses.
 */
export interface Module {
  id: string;

  // Content
  title: string;
  description: string | null;
  objectives: string[];
  estimatedDuration: number;             // in minutes

  // Behavior
  completionCriteria: ModuleCompletionCriteria;
  presentationRules: ModulePresentationRules;

  // Ownership (for permissions, not exclusivity)
  ownerDepartmentId: string;

  // State
  isPublished: boolean;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Module usage - where is this module used?
 */
export interface ModuleUsage {
  moduleId: string;
  usedInCourseVersions: {
    courseVersionId: string;
    canonicalCourseId: string;
    courseCode: string;
    courseTitle: string;
    version: number;
    status: CourseVersionStatus;
  }[];
  totalCourseVersions: number;
}

/**
 * Global module completion record.
 * When a learner completes a module, it counts for ALL courses containing it.
 */
export interface ModuleCompletion {
  id: string;
  learnerId: string;
  moduleId: string;

  // Where completion happened
  completedInCourseVersionId: string;
  completedInEnrollmentId: string;

  // Completion details
  completedAt: string;
  score: number | null;

  // Always true - completion is global
  isGlobalCompletion: boolean;
}
```

---

## 3. Learning Unit Entities (Version-Aware)

```typescript
/**
 * Learning unit lifecycle status
 */
export type LearningUnitStatus = 'draft' | 'published' | 'deprecated';

/**
 * LearningUnit - Extended with versioning support
 */
export interface LearningUnit {
  id: string;
  moduleId: string;

  // Content
  title: string;
  description: string | null;
  type: LearningUnitType;
  contentId: string | null;
  content?: unknown | null;
  category: LearningUnitCategory | null;

  // Behavior
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;
  sequence: number;
  settings: LearningUnitSettings;
  estimatedDuration: number | null;

  // Availability
  availableFrom: string | null;
  availableUntil: string | null;
  isActive: boolean;

  // Versioning
  status: LearningUnitStatus;
  replacedByUnitId: string | null;       // Points to newer version if deprecated
  replacesUnitId: string | null;         // Points to older version this replaces

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  deprecatedAt: string | null;
}

/**
 * Learning unit usage - where is this unit used?
 */
export interface LearningUnitUsage {
  learningUnitId: string;
  moduleId: string;
  moduleTitle: string;
  usedInCourseVersions: {
    courseVersionId: string;
    canonicalCourseId: string;
    courseCode: string;
    courseTitle: string;
    version: number;
  }[];
  totalModulesUsing: number;
  totalCourseVersionsUsing: number;
}

/**
 * Reference linking learning units to modules for specific course versions
 */
export interface ModuleLearningUnitReference {
  id: string;
  moduleId: string;
  learningUnitId: string;
  courseVersionId: string;

  // Override sequence for this course version
  sequenceOverride: number | null;

  createdAt: string;
}
```

---

## 4. Credential & Certificate Entities

### CredentialGroup

```typescript
/**
 * Credential type
 */
export type CredentialType = 'certificate' | 'diploma' | 'degree' | 'badge';

/**
 * CredentialGroup - Groups compatible certificates that earn the same credential.
 * All CertificateDefinitions in a group with isCompatible=true earn the same badge.
 */
export interface CredentialGroup {
  id: string;

  // Identity
  name: string;                          // e.g., "Certified Data Analyst"
  code: string;                          // e.g., "CDA"
  description: string;

  // Type
  type: CredentialType;

  // Badge display
  badgeImageUrl: string | null;
  badgeColor: string | null;

  // Ownership
  departmentId: string;
  programId: string | null;

  // State
  isActive: boolean;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * CredentialGroup list item
 */
export interface CredentialGroupListItem {
  id: string;
  name: string;
  code: string;
  type: CredentialType;
  department: { id: string; name: string };
  program: { id: string; name: string } | null;
  badgeImageUrl: string | null;
  activeDefinitionsCount: number;
  totalIssuances: number;
  isActive: boolean;
}
```

### CertificateDefinition

```typescript
/**
 * Certificate definition status
 */
export type CertificateDefinitionStatus = 'draft' | 'active' | 'deprecated';

/**
 * CertificateDefinition - Versioned requirements for earning a credential.
 */
export interface CertificateDefinition {
  id: string;
  credentialGroupId: string;

  // Versioning
  version: number;
  parentDefinitionId: string | null;

  // Metadata
  title: string;                         // e.g., "Certified Data Analyst 2026"
  description: string;

  // Requirements
  requirements: CertificateRequirement[];

  // Lifecycle
  status: CertificateDefinitionStatus;

  // Compatibility
  isCompatible: boolean;                 // Earns same credential as other versions
  compatibilityBreakReason: string | null;

  // Deprecation
  deprecatedAt: string | null;
  deprecatedReason: string | null;
  supersededByDefinitionId: string | null;

  // Validity period
  validFrom: string | null;
  validUntil: string | null;

  // Settings
  expiresAfterMonths: number | null;
  autoIssue: boolean;                    // Auto-issue when requirements met

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Requirement within a certificate definition
 */
export interface CertificateRequirement {
  id: string;
  certificateDefinitionId: string;

  // Points to specific course VERSION
  courseVersionId: string;

  // Requirement details
  isRequired: boolean;
  minimumScore: number | null;           // e.g., 70 for 70%
  order: number;

  // For elective groups
  electiveGroupId: string | null;
  electiveGroupName: string | null;      // e.g., "Choose 2 from Technology Electives"
  electiveMinCount: number | null;
}

/**
 * CertificateRequirement with course details for display
 */
export interface CertificateRequirementItem extends CertificateRequirement {
  courseVersion: {
    id: string;
    version: number;
    title: string;
    canonicalCourseId: string;
    canonicalCourseCode: string;
    status: CourseVersionStatus;
  };
}

/**
 * CertificateDefinition list item
 */
export interface CertificateDefinitionListItem {
  id: string;
  credentialGroupId: string;
  credentialGroupName: string;
  version: number;
  title: string;
  status: CertificateDefinitionStatus;
  isCompatible: boolean;
  requirementCount: number;
  totalIssuances: number;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
}
```

### CertificateIssuance

```typescript
/**
 * CertificateIssuance - Record of a certificate issued to a learner.
 * Immutable record of exactly what was completed.
 */
export interface CertificateIssuance {
  id: string;

  // What was earned
  certificateDefinitionId: string;
  credentialGroupId: string;             // Denormalized for queries

  // Who earned it
  learnerId: string;

  // Completion snapshot (immutable)
  completedRequirements: CompletedRequirement[];

  // Issuance
  issuedAt: string;
  issuedBy: string | null;               // null if auto-issued

  // Verification
  verificationCode: string;
  pdfUrl: string | null;

  // Validity
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;
}

/**
 * Snapshot of a completed requirement
 */
export interface CompletedRequirement {
  courseVersionId: string;
  courseTitle: string;                   // Snapshot at completion
  courseCode: string;
  version: number;
  completedAt: string;
  finalScore: number | null;
  enrollmentId: string;
}

/**
 * CertificateIssuance list item
 */
export interface CertificateIssuanceListItem {
  id: string;
  learner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  credentialGroup: {
    id: string;
    name: string;
    type: CredentialType;
    badgeImageUrl: string | null;
  };
  certificateDefinition: {
    id: string;
    version: number;
    title: string;
  };
  verificationCode: string;
  issuedAt: string;
  expiresAt: string | null;
  isRevoked: boolean;
}

/**
 * Certificate verification result
 */
export interface CertificateVerificationResult {
  valid: boolean;
  issuance: CertificateIssuance | null;
  learner: {
    firstName: string;
    lastName: string;
  } | null;
  credential: {
    name: string;
    type: CredentialType;
    badgeImageUrl: string | null;
  } | null;
  message: string;
}
```

---

## 5. Enrollment Types (Updated)

```typescript
/**
 * Enrollment with version tracking
 */
export interface Enrollment {
  id: string;
  learnerId: string;

  // Course tracking - both canonical and version
  canonicalCourseId: string;
  courseVersionId: string;               // Version at enrollment time

  // Certificate tracking
  certificateDefinitionId: string | null;

  // Progress
  status: 'active' | 'completed' | 'withdrawn' | 'expired';
  progress: number;                      // 0-100

  // Dates
  enrolledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;

  // Completion snapshot (set when completed)
  completionSnapshot: EnrollmentCompletionSnapshot | null;
}

/**
 * Snapshot of enrollment at completion time
 */
export interface EnrollmentCompletionSnapshot {
  courseVersionId: string;
  courseVersionTitle: string;
  courseVersionNumber: number;
  finalScore: number | null;
  moduleCompletions: {
    moduleId: string;
    moduleTitle: string;
    completedAt: string;
    score: number | null;
  }[];
  totalTimeSpentMinutes: number;
}
```

---

## 6. API Payload Types

### Course Version Operations

```typescript
/**
 * Create a new draft version from a published course
 */
export interface CreateCourseVersionPayload {
  changeNotes?: string;
}

export interface CreateCourseVersionResponse {
  courseVersion: CourseVersion;
  message: string;
}

/**
 * Update a draft course version
 */
export interface UpdateCourseVersionPayload {
  title?: string;
  description?: string;
  credits?: number;
  duration?: number;
  settings?: Partial<CourseSettings>;
  instructorIds?: string[];
  changeNotes?: string;
}

/**
 * Publish a course version
 */
export interface PublishCourseVersionPayload {
  publishNotes?: string;
}

export interface PublishCourseVersionResponse {
  courseVersion: CourseVersion;
  previousVersion: {
    id: string;
    version: number;
    isLocked: boolean;
  } | null;
  affectedCertificates: {
    id: string;
    title: string;
    newVersionCreated: boolean;
  }[];
  message: string;
}

/**
 * Lock a course version manually
 */
export interface LockCourseVersionPayload {
  reason: string;
}
```

### Learning Unit Operations

```typescript
/**
 * Create a variant of an existing learning unit
 */
export interface CreateLearningUnitVariantPayload {
  forCourseVersionId: string;            // Only link to this course version
  title?: string;                        // Optional new title
}

export interface CreateLearningUnitVariantResponse {
  learningUnit: LearningUnit;
  originalUnitId: string;
  message: string;
}

/**
 * Publish a learning unit (deprecates old version)
 */
export interface PublishLearningUnitPayload {
  deprecateOldVersion: boolean;          // Usually true
}

export interface PublishLearningUnitResponse {
  learningUnit: LearningUnit;
  deprecatedUnit: {
    id: string;
    title: string;
  } | null;
  affectedModules: number;
  affectedCourseVersions: number;
  message: string;
}
```

### Certificate Operations

```typescript
/**
 * Create a credential group
 */
export interface CreateCredentialGroupPayload {
  name: string;
  code: string;
  description?: string;
  type: CredentialType;
  departmentId: string;
  programId?: string;
  badgeImageUrl?: string;
  badgeColor?: string;
}

/**
 * Create a certificate definition
 */
export interface CreateCertificateDefinitionPayload {
  credentialGroupId: string;
  title: string;
  description?: string;
  requirements: CreateCertificateRequirementPayload[];
  validFrom?: string;
  validUntil?: string;
  expiresAfterMonths?: number;
  autoIssue?: boolean;
}

export interface CreateCertificateRequirementPayload {
  courseVersionId: string;
  isRequired: boolean;
  minimumScore?: number;
  order: number;
  electiveGroupId?: string;
  electiveGroupName?: string;
  electiveMinCount?: number;
}

/**
 * Deprecate a certificate definition
 */
export interface DeprecateCertificateDefinitionPayload {
  reason: string;
  supersededByDefinitionId?: string;
}

/**
 * Issue a certificate manually
 */
export interface IssueCertificatePayload {
  learnerId: string;
  certificateDefinitionId: string;
  metadata?: Record<string, unknown>;
}
```

---

## 7. Query Filter Types

```typescript
/**
 * Course version filters
 */
export interface CourseVersionFilters {
  canonicalCourseId?: string;
  status?: CourseVersionStatus;
  isLocked?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Certificate definition filters
 */
export interface CertificateDefinitionFilters {
  credentialGroupId?: string;
  status?: CertificateDefinitionStatus;
  isCompatible?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Certificate issuance filters
 */
export interface CertificateIssuanceFilters {
  learnerId?: string;
  credentialGroupId?: string;
  certificateDefinitionId?: string;
  isRevoked?: boolean;
  issuedAfter?: string;
  issuedBefore?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
```

---

## 8. Event Types (for notifications/webhooks)

```typescript
/**
 * Events emitted by the versioning system
 */
export type VersioningEvent =
  | CourseVersionPublishedEvent
  | CourseVersionLockedEvent
  | LearningUnitDeprecatedEvent
  | CertificateDefinitionCreatedEvent
  | CertificateIssuedEvent;

export interface CourseVersionPublishedEvent {
  type: 'course_version.published';
  payload: {
    courseVersionId: string;
    canonicalCourseId: string;
    version: number;
    previousVersionId: string | null;
    publishedBy: string;
    publishedAt: string;
  };
}

export interface CourseVersionLockedEvent {
  type: 'course_version.locked';
  payload: {
    courseVersionId: string;
    canonicalCourseId: string;
    version: number;
    reason: LockReason;
    lockedBy: string;
    lockedAt: string;
  };
}

export interface LearningUnitDeprecatedEvent {
  type: 'learning_unit.deprecated';
  payload: {
    learningUnitId: string;
    replacedByUnitId: string;
    affectedModuleIds: string[];
    affectedCourseVersionIds: string[];
  };
}

export interface CertificateDefinitionCreatedEvent {
  type: 'certificate_definition.created';
  payload: {
    definitionId: string;
    credentialGroupId: string;
    version: number;
    isAutoCreated: boolean;
    triggeredByCourseVersionId: string | null;
  };
}

export interface CertificateIssuedEvent {
  type: 'certificate.issued';
  payload: {
    issuanceId: string;
    learnerId: string;
    credentialGroupId: string;
    definitionId: string;
    verificationCode: string;
    isAutoIssued: boolean;
  };
}
```

---

## 9. Access Policy Types

```typescript
/**
 * Access duration configuration
 */
export type AccessDuration =
  | { type: 'months'; value: number }
  | { type: 'years'; value: number }
  | { type: 'perpetual' }
  | { type: 'custom'; expiresAt: string };

/**
 * Department-level access policy configuration
 */
export interface DepartmentAccessPolicy {
  id: string;
  departmentId: string;

  // Program access duration
  defaultAccessDuration: AccessDuration;

  // Version access
  allowNewVersionAccess: boolean;
  newVersionAccessWindow: number;        // Days after new version publishes

  // Upgrade policy
  allowCertificateUpgrade: boolean;
  certificateUpgradeWindow: number;      // Days to upgrade after new version

  // Retake policy
  allowCourseRetakes: boolean;
  maxRetakesPerCourse: number | null;    // null = unlimited
  retakeCooldownDays: number;

  // Notifications
  notifyOnNewCourseVersion: boolean;
  notifyOnNewCertificateVersion: boolean;
  notifyBeforeAccessExpiry: boolean;
  expiryNotificationDays: number[];      // e.g., [30, 7, 1]

  createdAt: string;
  updatedAt: string;
}

/**
 * Program-level access policy overrides
 */
export interface ProgramAccessOverride {
  id: string;
  programId: string;

  // Override any department policy field
  accessDuration?: AccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number;

  // Program-specific
  requireSequentialCompletion: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * Program enrollment with access tracking
 */
export interface ProgramEnrollment {
  id: string;
  learnerId: string;
  programId: string;

  // Certificate tracking
  certificateDefinitionId: string;

  // Access window
  enrolledAt: string;
  accessExpiresAt: string;
  accessExtendedAt: string | null;
  accessExtensionReason: string | null;

  // Status
  status: 'active' | 'completed' | 'expired' | 'withdrawn';

  // Progress
  coursesCompleted: number;
  coursesTotal: number;
  currentCertificateProgress: number;

  // Upgrade tracking
  hasUpgradedCertificate: boolean;
  upgradedFromDefinitionId: string | null;
  upgradedAt: string | null;

  // Completion
  certificateIssuanceId: string | null;
  completedAt: string | null;
}

/**
 * Access extension request
 */
export interface AccessExtensionRequest {
  id: string;
  learnerId: string;
  programEnrollmentId: string;

  requestedExtensionMonths: number;
  reason: string;

  status: 'pending' | 'approved' | 'denied';

  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;

  newExpiryDate: string | null;

  createdAt: string;
}

/**
 * Certificate upgrade eligibility check result
 */
export interface CertificateUpgradeEligibility {
  isEligible: boolean;
  reason: string | null;

  currentIssuance: {
    id: string;
    definitionId: string;
    version: number;
  };

  availableUpgrades: {
    definitionId: string;
    version: number;
    title: string;
    additionalRequirements: {
      courseVersionId: string;
      courseTitle: string;
      isNewCourse: boolean;
      isNewVersion: boolean;
    }[];
    upgradeDeadline: string | null;
  }[];

  blockers: {
    type: 'access_expired' | 'window_closed' | 'policy_disabled' | 'incompatible';
    message: string;
  }[];
}
```

---

## 10. Notification Types

```typescript
/**
 * Notification types
 */
export type NotificationType =
  | 'course_version_available'
  | 'certificate_version_available'
  | 'certificate_upgrade_available'
  | 'access_expiring_soon'
  | 'access_expired'
  | 'certificate_earned'
  | 'certificate_upgraded'
  | 'badge_earned';

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  learnerId: string;
  type: NotificationType;

  // Content
  title: string;
  message: string;

  // Related entities
  relatedCourseVersionId: string | null;
  relatedCertificateDefinitionId: string | null;
  relatedProgramEnrollmentId: string | null;

  // Actions
  actionUrl: string | null;
  actionLabel: string | null;

  // State
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;

  // Delivery
  sentAt: string;
  emailSentAt: string | null;
  pushSentAt: string | null;

  // Expiry
  expiresAt: string | null;
}

/**
 * Notification template for customization
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  departmentId: string | null;           // null = system default

  // Content templates (supports variables)
  titleTemplate: string;
  messageTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;

  // Channel settings
  sendInApp: boolean;
  sendEmail: boolean;
  sendPush: boolean;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification list item
 */
export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  sentAt: string;
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}
```

---

## 11. Access Policy Payloads

```typescript
/**
 * Update department access policy
 */
export interface UpdateDepartmentAccessPolicyPayload {
  defaultAccessDuration?: AccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number;
  allowCourseRetakes?: boolean;
  maxRetakesPerCourse?: number | null;
  retakeCooldownDays?: number;
  notifyOnNewCourseVersion?: boolean;
  notifyOnNewCertificateVersion?: boolean;
  notifyBeforeAccessExpiry?: boolean;
  expiryNotificationDays?: number[];
}

/**
 * Request access extension
 */
export interface RequestAccessExtensionPayload {
  requestedExtensionMonths: number;
  reason: string;
}

/**
 * Review access extension request
 */
export interface ReviewAccessExtensionPayload {
  decision: 'approved' | 'denied';
  reviewNotes?: string;
  newExpiryDate?: string;              // Required if approved
}

/**
 * Initiate certificate upgrade
 */
export interface InitiateCertificateUpgradePayload {
  targetDefinitionId: string;
}

/**
 * Update notification template
 */
export interface UpdateNotificationTemplatePayload {
  titleTemplate?: string;
  messageTemplate?: string;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  sendInApp?: boolean;
  sendEmail?: boolean;
  sendPush?: boolean;
  isActive?: boolean;
}
```
