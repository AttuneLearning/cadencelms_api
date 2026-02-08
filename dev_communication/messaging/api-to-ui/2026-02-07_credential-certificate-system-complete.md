# Credential Groups & Certificate System Complete - Response

**Date:** 2026-02-07
**From:** API Team
**To:** UI Team
**Priority:** High
**Related Issues:** API-ISS-017 (completed), API-ISS-018 (completed)

---

## Status

Complete

## Summary

Phase 3 (Credential & Certificate System) is fully implemented and tested. Both API-ISS-017 (Credential Groups & Certificate Definitions) and API-ISS-018 (Certificate Issuance & Verification) are complete with 338 unit tests passing across models, services, and validators.

---

## Implementation Details

### Credential Groups (API-ISS-017)

#### Models
| File | Description |
|------|--------|
| `src/models/certificate/CredentialGroup.model.ts` | Credential group schema (name, code, type, department-scoped) |
| `src/models/certificate/CertificateDefinition.model.ts` | Versioned certificate definitions (draft/active/deprecated lifecycle) |
| `src/models/certificate/CertificateRequirement.model.ts` | Requirements within definitions (course version links, elective groups) |

#### Services
| File | Description |
|------|--------|
| `src/services/certificate/credentialGroup.service.ts` | CRUD + list definitions per group |
| `src/services/certificate/certificateDefinition.service.ts` | CRUD + activate/deprecate + auto-versioning on course publish |

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/credential-groups` | List credential groups |
| POST | `/api/v2/credential-groups` | Create credential group |
| GET | `/api/v2/credential-groups/:id` | Get credential group |
| PATCH | `/api/v2/credential-groups/:id` | Update credential group |
| DELETE | `/api/v2/credential-groups/:id` | Delete credential group |
| GET | `/api/v2/credential-groups/:id/definitions` | List definitions in group |
| GET | `/api/v2/certificate-definitions` | List definitions |
| POST | `/api/v2/certificate-definitions` | Create definition |
| GET | `/api/v2/certificate-definitions/:id` | Get definition |
| PATCH | `/api/v2/certificate-definitions/:id` | Update definition |
| POST | `/api/v2/certificate-definitions/:id/activate` | Activate definition |
| POST | `/api/v2/certificate-definitions/:id/deprecate` | Deprecate definition |

### Certificate Issuance & Verification (API-ISS-018)

#### Models
| File | Description |
|------|--------|
| `src/models/certificate/CertificateIssuance.model.ts` | Issued certificates with verification codes, upgrade tracking, revocation |

#### Services
| File | Description |
|------|--------|
| `src/services/certificate/certificateIssuance.service.ts` | Manual + auto issuance, revocation |
| `src/services/certificate/certificateVerification.service.ts` | Public verification by code |
| `src/services/certificate/certificateUpgrade.service.ts` | Upgrade eligibility + execution |

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/certificate-issuances` | List issuances (admin) |
| POST | `/api/v2/certificate-issuances` | Manual issuance |
| GET | `/api/v2/certificate-issuances/:id` | Get issuance details |
| POST | `/api/v2/certificate-issuances/:id/revoke` | Revoke certificate |
| GET | `/api/v2/certificates/verify/:code` | Public verification (no auth) |
| GET | `/api/v2/learners/:id/certificates` | Learner's certificates |
| GET | `/api/v2/learners/:id/upgrade-eligibility` | Check upgrade options |
| POST | `/api/v2/certificate-issuances/:id/upgrade` | Initiate upgrade |
| GET | `/api/v2/certificate-issuances/:id/upgrade-status` | Check upgrade progress |

### Validators
| File | Description |
|------|--------|
| `src/validators/credentialGroup.validator.ts` | Credential group request validation |
| `src/validators/certificateDefinition.validator.ts` | Certificate definition request validation |
| `src/validators/certificateIssuance.validator.ts` | Certificate issuance request validation |

### Commits

| Hash | Description |
|------|-------------|
| `5eb129e` | feat: add course versioning, certificates, notifications, access policies, and comprehensive unit tests |

---

## Key Design Decisions

1. **Verification codes**: 12-character URL-safe codes using `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars I, O, 0, 1)
2. **Auto-versioning**: When a course version is published, certificate definitions referencing the old version are auto-versioned with `isCompatible: true`
3. **Upgrade flow**: Checks credential group compatibility, verifies all requirements met, links old/new issuances
4. **PDF generation**: Deferred (pdfUrl is null) — separate issue for PDF service
5. **Revoked certificates**: Remain visible in learner's list, marked as revoked with reason

---

## Next Steps

- [ ] UI team: Build credential group management UI
- [ ] UI team: Build certificate definition management UI
- [ ] UI team: Build certificate issuance views (admin + learner)
- [ ] UI team: Integrate public verification page
- [ ] UI team: Build upgrade eligibility/flow UI

---

## Integration Notes

- The public verification endpoint (`GET /api/v2/certificates/verify/:code`) requires **no authentication** — it's meant for external verification
- Certificate auto-issuance is triggered by event bus (`module.completed.global`, `enrollment.completed`) — no UI action needed
- Credential group `type` accepts: `certificate`, `diploma`, `degree`, `badge`
- Certificate definition lifecycle: `draft` -> `active` -> `deprecated` (via dedicated endpoints, not PATCH)

---

*Move to `archive/` when thread is complete*
