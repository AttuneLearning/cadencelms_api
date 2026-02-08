# API-ISS-017: Credential Groups & Certificate Definitions

## Status: PENDING
## Priority: High
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-014 (depends on)
## Phase: 3 - Credential & Certificate System

---

## Overview

Implement CredentialGroup (badge/credential compatibility grouping) and CertificateDefinition (versioned requirements) entities. This enables certificates to be locked to specific course versions while still earning the same underlying credential.

---

## Requirements

1. Create `CredentialGroup` model for grouping compatible certificates
2. Create `CertificateDefinition` model for versioned requirements
3. Create `CertificateRequirement` model for requirements within definitions
4. Implement auto-versioning when required course version changes
5. Support compatible vs. breaking certificate changes
6. Full CRUD endpoints for both entities

---

## Technical Specification

### New Models

#### CredentialGroup

```typescript
interface ICredentialGroup extends Document {
  name: string;                          // e.g., "AWS Solutions Architect"
  code: string;                          // e.g., "AWS-SA"
  description: string;
  type: 'certificate' | 'diploma' | 'degree' | 'badge';
  badgeImageUrl: string | null;
  badgeColor: string | null;
  departmentId: ObjectId;
  programId: ObjectId | null;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### CertificateDefinition

```typescript
interface ICertificateDefinition extends Document {
  credentialGroupId: ObjectId;
  version: number;
  parentDefinitionId: ObjectId | null;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'deprecated';
  isCompatible: boolean;                 // Same credential as other versions
  compatibilityBreakReason: string | null;
  deprecatedAt: Date | null;
  deprecatedReason: string | null;
  supersededByDefinitionId: ObjectId | null;
  validFrom: Date | null;
  validUntil: Date | null;
  expiresAfterMonths: number | null;
  autoIssue: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### CertificateRequirement

```typescript
interface ICertificateRequirement extends Document {
  certificateDefinitionId: ObjectId;
  courseVersionId: ObjectId;             // Points to specific version
  isRequired: boolean;
  minimumScore: number | null;
  order: number;
  electiveGroupId: string | null;
  electiveGroupName: string | null;
  electiveMinCount: number | null;
}
```

### Endpoints

#### Credential Groups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/credential-groups` | List credential groups |
| POST | `/api/v2/credential-groups` | Create credential group |
| GET | `/api/v2/credential-groups/{id}` | Get credential group |
| PATCH | `/api/v2/credential-groups/{id}` | Update credential group |
| DELETE | `/api/v2/credential-groups/{id}` | Delete credential group |
| GET | `/api/v2/credential-groups/{id}/definitions` | List definitions in group |

#### Certificate Definitions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/certificate-definitions` | List definitions |
| POST | `/api/v2/certificate-definitions` | Create definition |
| GET | `/api/v2/certificate-definitions/{id}` | Get definition |
| PATCH | `/api/v2/certificate-definitions/{id}` | Update definition |
| POST | `/api/v2/certificate-definitions/{id}/activate` | Activate definition |
| POST | `/api/v2/certificate-definitions/{id}/deprecate` | Deprecate definition |

### Auto-Versioning Logic

When a course version is published (event from API-ISS-014):

```typescript
async function handleCourseVersionPublished(event: {
  newVersionId: string;
  previousVersionId: string;
}) {
  // Find all certificate definitions requiring the old version
  const affectedRequirements = await CertificateRequirement.find({
    courseVersionId: event.previousVersionId
  });

  const affectedDefinitionIds = [...new Set(
    affectedRequirements.map(r => r.certificateDefinitionId)
  )];

  for (const definitionId of affectedDefinitionIds) {
    const oldDef = await CertificateDefinition.findById(definitionId);
    if (oldDef.status !== 'active') continue;

    // Create new definition
    const newDef = await CertificateDefinition.create({
      credentialGroupId: oldDef.credentialGroupId,
      version: oldDef.version + 1,
      parentDefinitionId: oldDef._id,
      title: oldDef.title,
      description: oldDef.description,
      status: 'active',
      isCompatible: true,  // Auto-versioned = compatible
      // ... copy other fields
    });

    // Copy requirements, replacing old course version with new
    const oldReqs = await CertificateRequirement.find({
      certificateDefinitionId: oldDef._id
    });

    for (const req of oldReqs) {
      await CertificateRequirement.create({
        ...req.toObject(),
        _id: undefined,
        certificateDefinitionId: newDef._id,
        courseVersionId: req.courseVersionId.equals(event.previousVersionId)
          ? event.newVersionId
          : req.courseVersionId
      });
    }

    // Deprecate old definition
    await CertificateDefinition.findByIdAndUpdate(oldDef._id, {
      status: 'deprecated',
      deprecatedAt: new Date(),
      deprecatedReason: 'Superseded by auto-versioning',
      supersededByDefinitionId: newDef._id
    });

    // Emit notification event
    eventBus.emit('certificate.definition.created', {
      newDefinitionId: newDef._id,
      previousDefinitionId: oldDef._id,
      reason: 'course_version_update'
    });
  }
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/certificate/CredentialGroup.model.ts` | Credential group schema |
| `src/models/certificate/CertificateDefinition.model.ts` | Definition schema |
| `src/models/certificate/CertificateRequirement.model.ts` | Requirement schema |
| `src/services/credentialGroup.service.ts` | Credential group logic |
| `src/services/certificateDefinition.service.ts` | Definition logic + auto-versioning |
| `src/controllers/credentialGroup.controller.ts` | Route handlers |
| `src/controllers/certificateDefinition.controller.ts` | Route handlers |
| `src/routes/v2/credential.routes.ts` | Route definitions |
| `src/validators/credential.validator.ts` | Request validation |

### Event Listener

```typescript
// src/events/listeners/certificateAutoVersioning.listener.ts
eventBus.on('course.version.published', handleCourseVersionPublished);
```

---

## Tests Required

1. [ ] CRUD operations for CredentialGroup
2. [ ] CRUD operations for CertificateDefinition
3. [ ] Add requirements to definition
4. [ ] Activate definition
5. [ ] Deprecate definition
6. [ ] Auto-versioning on course publish
7. [ ] Requirements correctly copied with version replacement
8. [ ] Old definition deprecated correctly
9. [ ] isCompatible set correctly on auto-version
10. [ ] Breaking compatibility creates new credential group

---

## Acceptance Criteria

- [ ] CredentialGroup model and CRUD complete
- [ ] CertificateDefinition model and CRUD complete
- [ ] CertificateRequirement model complete
- [ ] Auto-versioning triggered on course publish
- [ ] Old definitions deprecated with proper linking
- [ ] Notification event emitted
- [ ] Tests pass
- [ ] Contract file created

---

## Questions / Clarifications

1. **What triggers a breaking change (new credential)?**
   Manual action only. Admin must explicitly create new CredentialGroup and set `isCompatible: false` with reason.

2. **Can requirements be added to active definition?**
   No - must create new version. Active definitions are effectively locked.

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
- [ ] API-ISS-018 unblocked
