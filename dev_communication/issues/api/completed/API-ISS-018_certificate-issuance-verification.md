# API-ISS-018: Certificate Issuance & Verification

## Status: COMPLETED
## Priority: High
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-017 (depends on)
## Phase: 3 - Credential & Certificate System

---

## Overview

Implement certificate issuance records, verification system, and upgrade pathways. This completes the credential system by enabling certificates to be issued to learners who meet requirements, verified externally, and upgraded to newer definitions.

---

## Requirements

1. Create `CertificateIssuance` model for issued certificates
2. Implement auto-issue on requirement completion
3. Implement manual issuance by admins
4. Generate unique verification codes
5. Create public verification endpoint
6. Implement certificate upgrade flow
7. Support certificate revocation

---

## Technical Specification

### New Model

#### CertificateIssuance

```typescript
interface ICompletedRequirement {
  courseVersionId: ObjectId;
  courseTitle: string;                   // Snapshot at completion
  completedAt: Date;
  finalScore: number | null;
  enrollmentId: ObjectId;
}

interface ICertificateIssuance extends Document {
  certificateDefinitionId: ObjectId;
  credentialGroupId: ObjectId;           // Denormalized for queries
  learnerId: ObjectId;
  completedRequirements: ICompletedRequirement[];
  issuedAt: Date;
  issuedBy: ObjectId | null;             // null if auto-issued
  verificationCode: string;              // Unique, URL-safe
  pdfUrl: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  // Upgrade tracking
  upgradedToIssuanceId: ObjectId | null;
  upgradedFromIssuanceId: ObjectId | null;
  metadata: Record<string, unknown> | null;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/certificate-issuances` | List issuances (admin) |
| POST | `/api/v2/certificate-issuances` | Manual issuance |
| GET | `/api/v2/certificate-issuances/{id}` | Get issuance details |
| POST | `/api/v2/certificate-issuances/{id}/revoke` | Revoke certificate |
| GET | `/api/v2/certificates/verify/{code}` | Public verification |
| GET | `/api/v2/learners/{id}/certificates` | Learner's certificates |
| GET | `/api/v2/learners/{id}/upgrade-eligibility` | Check upgrade options |
| POST | `/api/v2/certificate-issuances/{id}/upgrade` | Initiate upgrade |
| GET | `/api/v2/certificate-issuances/{id}/upgrade-status` | Check upgrade progress |

### GET /api/v2/certificates/verify/{code}

Public endpoint (no auth required) for external verification.

**Response (valid):**
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "certificateTitle": "AWS Solutions Architect 2026",
    "credentialName": "AWS Solutions Architect",
    "credentialType": "certificate",
    "badgeImageUrl": "https://...",
    "learnerName": "John Doe",
    "issuedAt": "2026-01-15T...",
    "expiresAt": null,
    "verificationCode": "ABC123XYZ",
    "completedCourses": [
      { "title": "AWS Fundamentals", "completedAt": "2026-01-10" },
      { "title": "Cloud Architecture", "completedAt": "2026-01-14" }
    ]
  }
}
```

**Response (invalid/revoked):**
```json
{
  "status": "success",
  "data": {
    "valid": false,
    "reason": "revoked",
    "revokedAt": "2026-02-01T...",
    "revokedReason": "Academic integrity violation"
  }
}
```

### POST /api/v2/certificate-issuances/{id}/upgrade

Upgrade a certificate to a newer definition.

**Request:**
```json
{
  "targetDefinitionId": "..."
}
```

**Business Logic:**
1. Verify target definition is in same CredentialGroup
2. Verify target definition is active
3. Check what additional requirements learner needs
4. If all met: create new issuance, link to old one
5. If not met: return upgrade requirements

**Response (eligible):**
```json
{
  "status": "success",
  "data": {
    "upgraded": true,
    "newIssuanceId": "...",
    "newDefinitionVersion": 3,
    "previousIssuanceId": "..."
  }
}
```

**Response (not eligible):**
```json
{
  "status": "success",
  "data": {
    "upgraded": false,
    "missingRequirements": [
      {
        "courseVersionId": "...",
        "courseTitle": "Advanced Cloud Security",
        "reason": "not_completed"
      }
    ],
    "message": "Complete the above courses to upgrade"
  }
}
```

### Auto-Issue Logic

When module completion is recorded (API-ISS-016):

```typescript
async function checkCertificateEligibility(learnerId: string) {
  // Get all active certificate definitions
  const definitions = await CertificateDefinition.find({
    status: 'active',
    autoIssue: true
  });

  for (const def of definitions) {
    // Check if learner already has this certificate
    const existing = await CertificateIssuance.findOne({
      learnerId,
      credentialGroupId: def.credentialGroupId,
      revokedAt: null
    });
    if (existing) continue;

    // Check if all requirements met
    const requirements = await CertificateRequirement.find({
      certificateDefinitionId: def._id
    });

    const completions = await ModuleCompletion.find({ learnerId });
    const enrollments = await Enrollment.find({ learnerId, status: 'completed' });

    const allMet = await checkRequirementsMet(requirements, completions, enrollments);

    if (allMet) {
      await issueCertificate(learnerId, def._id, 'auto');
    }
  }
}
```

### Verification Code Generation

```typescript
function generateVerificationCode(): string {
  // 12 character URL-safe code: ABC123XYZ789
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/certificate/CertificateIssuance.model.ts` | Issuance schema |
| `src/services/certificateIssuance.service.ts` | Issuance logic |
| `src/services/certificateVerification.service.ts` | Verification logic |
| `src/services/certificateUpgrade.service.ts` | Upgrade logic |
| `src/controllers/certificateIssuance.controller.ts` | Route handlers |
| `src/routes/v2/certificate.routes.ts` | Route definitions |

### Event Listeners

```typescript
// Listen for module completion
eventBus.on('module.completed.global', async (event) => {
  await checkCertificateEligibility(event.learnerId);
});

// Listen for enrollment completion
eventBus.on('enrollment.completed', async (event) => {
  await checkCertificateEligibility(event.learnerId);
});
```

---

## Tests Required

1. [ ] Manual certificate issuance
2. [ ] Auto-issuance on requirement completion
3. [ ] Verification code generation uniqueness
4. [ ] Public verification endpoint (valid certificate)
5. [ ] Public verification endpoint (revoked certificate)
6. [ ] Public verification endpoint (invalid code)
7. [ ] Certificate revocation
8. [ ] Upgrade eligibility check
9. [ ] Successful upgrade flow
10. [ ] Upgrade with missing requirements
11. [ ] Cannot upgrade to different credential group
12. [ ] Learner certificates list

---

## Acceptance Criteria

- [ ] CertificateIssuance model created
- [ ] Manual and auto-issuance working
- [ ] Unique verification codes generated
- [ ] Public verification endpoint working
- [ ] Revocation working with reason tracking
- [ ] Upgrade flow complete with eligibility check
- [ ] Upgrade linking (upgradedTo/From) working
- [ ] Events emitted for notifications
- [ ] Tests pass
- [ ] Contract file created

---

## Questions / Clarifications

1. **Should revoked certificates show in learner's list?**
   Yes, but clearly marked as revoked. They're historical record.

2. **Can an upgraded certificate be revoked?**
   Yes. Both old and new remain in system, revocation only affects one.

3. **PDF generation?**
   Out of scope for this issue. pdfUrl will be null initially. Separate issue for PDF generation service.

---

## Implementation Notes

CertificateIssuance model, services (issuance, verification, upgrade), controller, routes, and validators all implemented. Verification code generation uses URL-safe characters. Upgrade flow checks credential group compatibility. PDF generation deferred per spec.

---

## Completion

**Completed Date:** 2026-02-07
**Commits:**
| Hash | Description |
|------|-------------|
| 5eb129e | feat: add course versioning, certificates, notifications, access policies, and comprehensive unit tests |

**Verification:**
- [x] All acceptance criteria met
- [x] Tests passing (338 tests across models, services, validators)
- [x] Phase 3 complete notification sent
