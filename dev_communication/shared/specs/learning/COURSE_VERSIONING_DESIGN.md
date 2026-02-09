# Course Versioning System Design

**Status:** Draft - Pending Approval
**Date:** 2026-02-02
**Related Issue:** UI-ISS-001

---

## Overview

This document describes the comprehensive versioning system for courses, certificates, and related entities in CadenceLMS. The system enables course evolution while maintaining historical accuracy for compliance, certifications, and learner progress tracking.

---

## Core Principles

1. **Courses version, modules are shared, learning units are referenced**
2. **Certificates lock to specific course versions**
3. **Compatible certificates share credential eligibility**
4. **Learning unit changes create new units, not in-place modifications**
5. **Module completion is global** - completing a module in one course completes it everywhere
6. **Version at completion is always tracked** for audit/compliance

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VERSIONING HIERARCHY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ CredentialGroup  │  ← Groups compatible certificates/diplomas        │
│  │ (Badge/Cert)     │                                                   │
│  └────────┬─────────┘                                                   │
│           │ 1:many                                                      │
│           ▼                                                             │
│  ┌──────────────────┐      ┌──────────────────┐                        │
│  │ Certificate      │─────▶│ CourseVersion    │                        │
│  │ (versioned)      │ many │ Requirements     │                        │
│  └──────────────────┘      └────────┬─────────┘                        │
│                                     │                                   │
│                                     ▼                                   │
│  ┌──────────────────┐      ┌──────────────────┐                        │
│  │ CanonicalCourse  │◀─────│ CourseVersion    │                        │
│  │ (identity)       │ 1:many│ (v1, v2, v3...) │                        │
│  └──────────────────┘      └────────┬─────────┘                        │
│                                     │                                   │
│                      ┌──────────────┼──────────────┐                   │
│                      ▼              ▼              ▼                    │
│             ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│             │   Module    │ │   Module    │ │   Module    │            │
│             │  (shared)   │ │  (shared)   │ │  (shared)   │            │
│             └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
│                    │               │               │                    │
│             ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐            │
│             │ LearningUnit│ │ LearningUnit│ │ LearningUnit│            │
│             │ References  │ │ References  │ │ References  │            │
│             └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Course Versioning

### CanonicalCourse (Identity)

The canonical course represents the "concept" of a course across all versions.

```typescript
interface CanonicalCourse {
  id: string;                    // Permanent identifier
  code: string;                  // e.g., "CS101" - stable across versions
  departmentId: string;
  programId: string | null;

  // Versioning metadata
  currentPublishedVersionId: string | null;  // Latest published version
  latestDraftVersionId: string | null;       // Latest draft (if any)

  createdBy: string;
  createdAt: string;
}
```

### CourseVersion

Each version represents a complete, immutable snapshot of course structure.

```typescript
interface CourseVersion {
  id: string;
  canonicalCourseId: string;     // Links to CanonicalCourse
  version: number;               // 1, 2, 3...

  // Version-specific metadata (can differ per version)
  title: string;
  description: string;
  credits: number;
  duration: number;
  settings: CourseSettings;
  instructorIds: string[];

  // Lifecycle
  status: 'draft' | 'published' | 'archived';
  isLocked: boolean;             // True when superseded or archived

  // Lineage
  parentVersionId: string | null;  // null for v1

  // Audit
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  lockedReason: 'superseded' | 'archived' | 'manual' | null;

  // Change tracking
  changeNotes: string | null;

  // Stats snapshot at lock time (for historical record)
  statsAtLock: {
    moduleCount: number;
    learningUnitCount: number;
    enrollmentCount: number;
  } | null;
}
```

### CourseVersionModule (Join Table)

Links modules to specific course versions with version-specific ordering and settings.

```typescript
interface CourseVersionModule {
  id: string;
  courseVersionId: string;
  moduleId: string;
  order: number;                 // Position in this version

  // Version-specific overrides (optional)
  isRequired: boolean;
  availableFrom: string | null;
  availableUntil: string | null;

  createdAt: string;
}
```

---

## 2. Module Design (Shared Across Courses)

Modules are **not versioned**. They exist independently and can be shared across multiple courses and course versions.

```typescript
interface Module {
  id: string;

  // Content
  title: string;
  description: string | null;
  objectives: string[];
  estimatedDuration: number;

  // Behavior
  completionCriteria: ModuleCompletionCriteria;
  presentationRules: ModulePresentationRules;

  // Ownership (for permissions, not exclusivity)
  ownerDepartmentId: string;
  createdBy: string;

  // Metadata
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Module Completion Tracking

When a learner completes a module, it counts as complete for ALL courses that include that module.

```typescript
interface ModuleCompletion {
  id: string;
  learnerId: string;
  moduleId: string;

  // Track where completion happened
  completedInCourseVersionId: string;
  completedInEnrollmentId: string;

  // Completion details
  completedAt: string;
  score: number | null;

  // This completion applies to all courses containing this module
  isGlobalCompletion: boolean;  // Always true
}
```

---

## 3. Learning Unit Design (Version-Aware References)

Learning units belong to modules but are **referenced** by course versions. Changes create new units rather than modifying existing ones.

### LearningUnit

```typescript
interface LearningUnit {
  id: string;
  moduleId: string;

  // Content
  title: string;
  description: string | null;
  type: LearningUnitType;
  contentId: string | null;      // Reference to content (SCORM, video, etc.)
  content?: unknown | null;
  category: LearningUnitCategory | null;

  // Behavior
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;
  sequence: number;              // Order within module
  settings: LearningUnitSettings;
  estimatedDuration: number | null;

  // Availability
  availableFrom: string | null;
  availableUntil: string | null;
  isActive: boolean;

  // Lifecycle - for version tracking
  status: 'draft' | 'published' | 'deprecated';
  replacedByUnitId: string | null;  // Points to newer version if deprecated

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
```

### ModuleLearningUnitReference

Links learning units to modules for specific course versions.

```typescript
interface ModuleLearningUnitReference {
  id: string;
  moduleId: string;
  learningUnitId: string;
  courseVersionId: string;       // Which course version uses this reference

  // Override sequence for this course version (if different from default)
  sequenceOverride: number | null;

  createdAt: string;
}
```

### Learning Unit Change Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEARNING UNIT CHANGE WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User clicks "Edit" on Learning Unit                                    │
│                    │                                                     │
│                    ▼                                                     │
│  ┌─────────────────────────────────────────┐                            │
│  │ Check: Is this unit referenced by       │                            │
│  │ multiple modules or course versions?    │                            │
│  └───────────────────┬─────────────────────┘                            │
│                      │                                                   │
│          ┌───────────┴───────────┐                                      │
│          │                       │                                       │
│          ▼ YES                   ▼ NO                                   │
│  ┌───────────────────┐   ┌───────────────────┐                         │
│  │ Show Warning:     │   │ Allow direct edit │                         │
│  │ "This unit is     │   │ (still creates    │                         │
│  │ used in X modules │   │ new version on    │                         │
│  │ and Y courses.    │   │ publish)          │                         │
│  │ Changes will      │   │                   │                         │
│  │ affect all."      │   └───────────────────┘                         │
│  └─────────┬─────────┘                                                  │
│            │                                                             │
│            ▼                                                             │
│  ┌───────────────────────────────────────┐                              │
│  │ Options:                              │                              │
│  │ 1. "Edit for all" → Edit in place    │                              │
│  │ 2. "Create variant" → New unit,      │                              │
│  │    only link to current context      │                              │
│  │ 3. Cancel                            │                              │
│  └───────────────────────────────────────┘                              │
│                                                                          │
│  On Save (if "Edit for all"):                                           │
│  1. Create new LearningUnit with status: 'draft'                        │
│  2. On Publish:                                                         │
│     - Mark old unit: status: 'deprecated', replacedByUnitId: newId      │
│     - Mark new unit: status: 'published'                                │
│     - Update all references to point to new unit                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Certificate/Credential System

### CredentialGroup (Compatibility Layer)

Groups equivalent certificates that qualify for the same badge/credential.

```typescript
interface CredentialGroup {
  id: string;

  // Identity
  name: string;                  // e.g., "AWS Solutions Architect"
  code: string;                  // e.g., "AWS-SA"
  description: string;

  // Credential type
  type: 'certificate' | 'diploma' | 'degree' | 'badge';

  // Badge/credential display
  badgeImageUrl: string | null;
  badgeColor: string | null;

  // Ownership
  departmentId: string;
  programId: string | null;

  // Status
  isActive: boolean;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### CertificateDefinition (Versioned)

Defines requirements for earning a credential. Auto-versioned when course versions change.

```typescript
interface CertificateDefinition {
  id: string;
  credentialGroupId: string;     // Which credential this earns

  // Versioning
  version: number;
  parentDefinitionId: string | null;

  // Metadata
  title: string;                 // e.g., "AWS Solutions Architect 2026"
  description: string;

  // Requirements - locked to specific course versions
  requirements: CertificateRequirement[];

  // Lifecycle
  status: 'draft' | 'active' | 'deprecated';
  isCompatible: boolean;         // Can earn same credential as other versions

  // Compatibility note
  compatibilityBreakReason: string | null;  // Why this broke compatibility (rare)

  // Deprecation handling
  deprecatedAt: string | null;
  deprecatedReason: string | null;
  supersededByDefinitionId: string | null;

  // Validity
  validFrom: string | null;      // When this definition becomes active
  validUntil: string | null;     // When new enrollments stop

  // Settings
  expiresAfterMonths: number | null;  // Certificate expiration

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CertificateRequirement {
  id: string;
  certificateDefinitionId: string;

  // Points to specific course VERSION
  courseVersionId: string;

  // Requirement details
  isRequired: boolean;           // true = must complete, false = elective
  minimumScore: number | null;   // e.g., 70 for 70%
  order: number;                 // Display order

  // For elective groups
  electiveGroupId: string | null;  // e.g., "Choose 2 from this group"
  electiveMinCount: number | null;
}
```

### CertificateIssuance

Record of a specific certificate issued to a learner.

```typescript
interface CertificateIssuance {
  id: string;

  // What was earned
  certificateDefinitionId: string;
  credentialGroupId: string;     // Denormalized for queries

  // Who earned it
  learnerId: string;

  // Snapshot of completion (immutable record)
  completedRequirements: CompletedRequirement[];

  // Issuance details
  issuedAt: string;
  issuedBy: string | null;       // null if auto-issued

  // Verification
  verificationCode: string;      // Unique verification code
  pdfUrl: string | null;

  // Validity
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;

  // Metadata
  metadata: Record<string, any> | null;
}

interface CompletedRequirement {
  courseVersionId: string;
  courseTitle: string;           // Snapshot at time of completion
  completedAt: string;
  finalScore: number | null;
  enrollmentId: string;
}
```

---

## 5. Certificate Auto-Versioning Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CERTIFICATE AUTO-VERSION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Course-A v1 is PUBLISHED                                               │
│                    │                                                     │
│                    ▼                                                     │
│  Admin creates Course-A v2 (new draft from published)                   │
│                    │                                                     │
│                    ▼                                                     │
│  Admin PUBLISHES Course-A v2                                            │
│                    │                                                     │
│                    ▼                                                     │
│  System checks: "Is Course-A v1 required by any CertificateDefinition?" │
│                    │                                                     │
│          ┌────────┴─────────┐                                           │
│          │ YES              │ NO                                        │
│          ▼                  ▼                                           │
│  ┌───────────────────┐  ┌─────────────────┐                            │
│  │ For each affected │  │ No action       │                            │
│  │ CertificateDefn:  │  │ needed          │                            │
│  └─────────┬─────────┘  └─────────────────┘                            │
│            │                                                             │
│            ▼                                                             │
│  ┌─────────────────────────────────────────┐                            │
│  │ 1. Create new CertificateDefinition     │                            │
│  │    - version: parentVersion + 1         │                            │
│  │    - Copy all requirements              │                            │
│  │    - Replace Course-A v1 → Course-A v2  │                            │
│  │    - status: 'active'                   │                            │
│  │    - isCompatible: true (same group)    │                            │
│  │                                         │                            │
│  │ 2. Update old CertificateDefinition     │                            │
│  │    - status: 'deprecated'               │                            │
│  │    - supersededByDefinitionId: newId    │                            │
│  │    - Existing enrollments continue      │                            │
│  │                                         │                            │
│  │ 3. New enrollments use new definition   │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Compatibility System

### How Compatibility Works

All certificate definitions in the same CredentialGroup that have `isCompatible: true` qualify the learner for the same credential/badge.

```
CredentialGroup: "Certified Data Analyst"
│
├── CertificateDefinition v1 (2024) - isCompatible: true
│   └── Requires: Course-A v1, Course-B v1, Course-C v1
│
├── CertificateDefinition v2 (2025) - isCompatible: true
│   └── Requires: Course-A v2, Course-B v1, Course-C v2
│
├── CertificateDefinition v3 (2026) - isCompatible: true
│   └── Requires: Course-A v3, Course-B v2, Course-C v2
│
└── CertificateDefinition v4 (MAJOR) - isCompatible: false  ← NEW CREDENTIAL
    └── Requires: Course-D v1, Course-E v1  (completely different courses)
    └── Creates NEW CredentialGroup: "Certified Data Analyst Pro"
```

### Breaking Compatibility (Rare)

When a major curriculum change occurs:

1. Create a new `CredentialGroup` for the new credential
2. Set `isCompatible: false` on the new `CertificateDefinition`
3. Fill in `compatibilityBreakReason`
4. Old credential holders keep their original credential
5. New learners earn the new credential

---

## 7. Enrollment & Progress Tracking

### Enrollment

```typescript
interface Enrollment {
  id: string;
  learnerId: string;

  // What they're enrolled in
  canonicalCourseId: string;
  courseVersionId: string;       // Version at enrollment time

  // Certificate tracking (if applicable)
  certificateDefinitionId: string | null;

  // Progress
  status: 'active' | 'completed' | 'withdrawn' | 'expired';
  progress: number;              // 0-100

  // Dates
  enrolledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;

  // Completion snapshot
  completionSnapshot: {
    courseVersionId: string;
    finalScore: number | null;
    moduleCompletions: {
      moduleId: string;
      completedAt: string;
      score: number | null;
    }[];
  } | null;
}
```

### Version Upgrade Policy

Learners stay on their enrolled version unless:
1. Admin manually upgrades them
2. A policy forces upgrade (configurable per organization)
3. Their version becomes unavailable

```typescript
interface VersionUpgradePolicy {
  id: string;
  organizationId: string;

  // Policy options
  autoUpgradeOnNewVersion: boolean;
  preserveProgressOnUpgrade: boolean;
  allowLearnerChoice: boolean;

  // Notifications
  notifyOnNewVersion: boolean;
  upgradeGracePeriodDays: number;  // Days before forced upgrade
}
```

---

## 8. API Endpoints

### Course Versioning

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/courses/{id}/versions` | Create new draft version from published |
| GET | `/courses/{id}/versions` | List all versions of a course |
| GET | `/course-versions/{versionId}` | Get specific version details |
| PATCH | `/course-versions/{versionId}` | Update draft version |
| POST | `/course-versions/{versionId}/publish` | Publish a draft version |
| POST | `/course-versions/{versionId}/lock` | Manually lock a version |

### Certificate Definitions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credential-groups` | List credential groups |
| POST | `/credential-groups` | Create credential group |
| GET | `/credential-groups/{id}/definitions` | List certificate definitions |
| POST | `/certificate-definitions` | Create certificate definition |
| POST | `/certificate-definitions/{id}/activate` | Activate a definition |
| POST | `/certificate-definitions/{id}/deprecate` | Deprecate a definition |

### Learning Unit Changes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learning-units/{id}/references` | Get all modules/courses using this unit |
| POST | `/learning-units/{id}/create-variant` | Create a variant for specific context |
| POST | `/learning-units/{id}/publish` | Publish and replace old version |

---

## 9. UI Components Needed

### Manage Courses Page
- [ ] Edit button with permission check (author OR content-admin)
- [ ] Version indicator badge (v1, v2, etc.)
- [ ] "Create New Version" confirmation dialog for published courses
- [ ] Locked course indicator (lock icon)

### Course Editor
- [ ] Version selector dropdown
- [ ] "Editing v2 (draft)" indicator
- [ ] Publish action with auto-certificate-versioning notice
- [ ] Change notes field

### Learning Unit Editor
- [ ] "Used in X modules, Y courses" warning
- [ ] "Edit for all" vs "Create variant" choice
- [ ] Draft/Published status indicator

### Certificate Management
- [ ] Credential group management
- [ ] Certificate definition versioning UI
- [ ] Compatibility visualization
- [ ] Auto-version notification settings

---

## 10. Migration Strategy

### Phase 1: Data Model
1. Add versioning fields to existing course table
2. Create CourseVersion table
3. Migrate existing courses as "v1"

### Phase 2: Certificate System
1. Create CredentialGroup from existing certificates
2. Create CertificateDefinition from existing templates
3. Link to course versions

### Phase 3: UI Implementation
1. Add edit button with version awareness
2. Add version creation flow
3. Add learning unit change warnings

### Phase 4: Auto-Versioning
1. Implement certificate auto-versioning on course publish
2. Add notification system for version changes

---

## Resolved Questions

1. **Should learners be notified when a new course version is available?**
   - **RESOLVED: Yes.** Learners will be notified. Configurable per department.
   - See: `LEARNER_ACCESS_AND_NOTIFICATIONS.md`

2. **What happens to in-progress learners when a course version is deprecated?**
   - **RESOLVED:** Learners stay on their enrolled version until certificate completion.
   - They CAN access new versions "free" during department-configured window.
   - They CAN upgrade certificates during the upgrade window.
   - See: `LEARNER_ACCESS_AND_NOTIFICATIONS.md`

3. **Should there be a "version comparison" view for admins?**
   - **RESOLVED: No.** Admins can open two browser tabs to compare.
   - May revisit if user feedback indicates need.

4. **Rate limiting on version creation?**
   - **RESOLVED: Not implementing.** Will add later if it becomes a problem.

---

## Related Documents

- `LEARNER_ACCESS_AND_NOTIFICATIONS.md` - Access duration, notifications, upgrade policies
- `COURSE_VERSIONING_TYPES.md` - Complete TypeScript type definitions
- `ADR-VERS-001-COURSE-VERSIONING-SYSTEM.md` - Architecture decision record

---

## Next Steps

1. ~~Review and approve this design~~ (Pending final approval)
2. Coordinate with API team on endpoints (Message sent)
3. Create detailed implementation tickets
4. Begin Phase 1 implementation
