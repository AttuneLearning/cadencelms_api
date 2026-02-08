# ADR-VERS-001: Course Versioning System

**Status:** Approved
**Date:** 2026-02-02
**Approved:** 2026-02-04
**Domain:** Learning / Content Management

## Context

CadenceLMS needs a versioning system for courses to support:

1. **Course evolution**: Courses need to be updated over time with new content, corrected materials, or improved learning paths
2. **Certificate integrity**: When a learner earns a certificate, it must be tied to the specific course content they completed
3. **Compliance tracking**: Regulatory requirements often mandate knowing exactly what content a learner completed and when
4. **Shared modules**: Modules should be reusable across courses without duplication
5. **Learning unit stability**: Changes to learning units must be managed carefully since they may be referenced across multiple modules and courses

### Current State

- Courses have `status: 'draft' | 'published' | 'archived'` but no versioning
- Certificates track `courseId` but not course version
- Modules are tied to specific courses (not shared)
- Learning units exist within modules with no cross-reference tracking
- No mechanism to lock course content after publication

### Constraints

- Must support compliance/audit requirements for tracking "version at completion"
- Must allow backwards-compatible certificate updates (same credential, updated courses)
- Must support rare "breaking" certificate changes (new credential entirely)
- Must warn users when learning unit changes affect multiple contexts
- Must track module completion globally (complete once, applies everywhere)

## Decision

### 1. Three-Tier Versioning Architecture

**Courses version, modules are shared, learning units are referenced.**

```
CanonicalCourse (identity)
    └── CourseVersion (v1, v2, v3...)
            └── CourseVersionModule (join)
                    └── Module (shared, not versioned)
                            └── ModuleLearningUnitReference
                                    └── LearningUnit (versioned independently)
```

### 2. Canonical Course + Course Versions

- `CanonicalCourse`: Represents the course "concept" - stable identity across versions
- `CourseVersion`: Immutable snapshot of course structure at a point in time
- When editing a published course, a new draft version is created
- Publishing a new version locks the previous version

### 3. Shared Modules

- Modules exist independently and can be shared across courses
- `CourseVersionModule` links modules to specific course versions with ordering
- Module completion is tracked globally - completing a module in one course completes it for all courses containing that module

### 4. Learning Unit Reference System

- Learning units are version-aware
- Changes to learning units create new units (not in-place edits)
- When a shared unit is edited, users are warned and can choose:
  - "Edit for all": Change propagates everywhere
  - "Create variant": New unit only for current context
- Old units are marked `deprecated` with pointer to replacement

### 5. Certificate Credential Groups

- `CredentialGroup`: Groups compatible certificates that earn the same badge/credential
- `CertificateDefinition`: Versioned requirements pointing to specific course versions
- Auto-versioning: When a required course publishes new version, certificate definition auto-updates
- `isCompatible: true`: Different certificate versions still earn the same credential
- Breaking changes (rare): Create new CredentialGroup for truly different credential

### 6. Completion Tracking

- `CertificateIssuance`: Records exactly what was completed (course versions, scores, dates)
- `verificationCode`: Unique code for external verification
- Enrollments track `courseVersionId` at enrollment time
- Progress snapshots captured at completion for audit

## Consequences

### Positive

- **Audit compliance**: Full traceability of what content each learner completed
- **Safe updates**: Can improve courses without invalidating existing certificates
- **Content reuse**: Modules can be shared across courses efficiently
- **Credential integrity**: Clear distinction between compatible updates and breaking changes
- **Learner confidence**: Certificates remain valid as courses evolve

### Negative

- **Complexity**: More entities and relationships to manage
- **Storage**: Version history increases database size
- **UI complexity**: Users must understand version concepts
- **API changes**: Significant new endpoints required
- **Migration effort**: Existing data must be converted to versioned structure

### Neutral

- Module sharing changes the mental model for course authors
- Auto-versioning of certificates requires clear notification system
- Learning unit edit warnings may slow down rapid content changes (intentionally)

## Alternatives Considered

### 1. Simple Course Cloning (No Formal Versioning)

Duplicate entire course on each update.

**Rejected**: No lineage tracking, certificates wouldn't know about relationships between course copies, no shared module benefit.

### 2. Full Content Duplication (Deep Clone)

Each version duplicates all modules and learning units.

**Rejected**: Massive storage overhead, no module sharing benefit, harder to maintain consistency.

### 3. Git-Style Diff Versioning

Store only changes between versions.

**Rejected**: Complex to implement, hard to query historical states, overkill for this use case.

### 4. No Module Sharing

Keep modules tied to individual courses.

**Rejected**: Contradicts user requirement for modules to be completed once and count everywhere.

## Implementation Notes

### Data Model Additions

```typescript
// New tables
- CanonicalCourse
- CourseVersion
- CourseVersionModule
- CredentialGroup
- CertificateDefinition
- CertificateRequirement
- CertificateIssuance
- ModuleLearningUnitReference
- ModuleCompletion (global)

// Modified tables
- LearningUnit: Add status, replacedByUnitId
- Module: Remove courseId, add ownerDepartmentId
- Enrollment: Add courseVersionId, certificateDefinitionId
```

### Key API Endpoints

```
POST /courses/{id}/versions          - Create new version
POST /course-versions/{id}/publish   - Publish with auto-cert-versioning
GET  /learning-units/{id}/references - Check where unit is used
POST /credential-groups              - Create credential group
```

### Migration Path

1. Create CanonicalCourse for each existing course
2. Convert existing courses to CourseVersion v1
3. Create CredentialGroups from existing certificate patterns
4. Create CertificateDefinitions pointing to v1 courses
5. Update existing certificate records with definition references

## Links

- Detailed Design: [[../../specs/learning/COURSE_VERSIONING_DESIGN.md]]
- Related Issue: [[../../issues/ui/queue/UI-ISS-001-course-edit-button.md]]
- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE]] (content versioning)
  - [[ADR-DATA-001-DATA-ARCHITECTURE]] (data model patterns)
