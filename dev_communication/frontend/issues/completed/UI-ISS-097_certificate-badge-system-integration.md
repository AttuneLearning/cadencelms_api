# UI-ISS-097: Certificate & Badge System — Full Integration

## Status: PENDING
## Priority: High
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: API-ISS-017, API-ISS-018, UI-ISS-095, Phase 9 Track D
## Category: Critical Gap - Learner Experience

---

## Overview

Certificates should be available for both **courses** and **programs**. Significant certificate infrastructure already exists across the codebase, but it needs to be wired end-to-end. This issue tracks bringing the full certificate and badge system to production readiness.

### Existing Infrastructure

**API Side (implemented):**
- `PUT /api/v2/programs/:id/certificate` — certificate config per program (API-ISS-002/003)
- `GET /api/v2/certificate-templates` — list templates (API-ISS-004)
- API-ISS-017 (COMPLETED 2026-02-07): Credential Groups & Certificate Definitions (versioned)
- API-ISS-018 (COMPLETED 2026-02-07): Certificate Issuance & Verification

**UI Side (partially implemented):**
- `src/entities/certificate/` — certificate entity with API, keys, types
- `src/entities/certificate-template/` — certificate template entity
- `src/features/credential-management/` — CredentialGroupCard, CertificateDefinitionList, CertificateUpgradeDialog
- `src/pages/learner/certificates/CertificatesPage.tsx` — lists completed enrollments
- `src/pages/learner/certificates/CertificateViewPage.tsx` — view with placeholder download/verify actions
- `src/pages/public/CertificateVerificationPage.tsx` — public verification page
- `dev_communication/contracts/api/certificate-templates.contract.ts` — API contract

**Specs/Plans:**
- Phase 9 Track D: Certificate System (HIGH PRIORITY)
- DEPARTMENT_PROGRAM_MANAGEMENT_SPEC: Certificate settings per program
- ADMIN_FEATURES_SPECIFICATION §8.6: Certificate Management admin features
- IMPLEMENTATION_PLAN §8.5: Certificate System

---

## Requirements

### Course-Level Certificates
1. Courses (not just programs) can have certificate settings enabled
2. When a course with certificates is completed, a certificate is auto-issued
3. Certificate appears on learner's certificate page

### Program-Level Certificates
4. Programs can have certificate settings (already in API)
5. When all courses in a program are completed, program certificate is auto-issued
6. Program certificates are distinct from individual course certificates

### Certificate PDF Generation
7. Replace placeholder toast with actual PDF generation/download
8. Either client-side PDF rendering or API-generated PDF URL
9. PDF includes: learner name, course/program name, date, grade, verification code, signatory

### Certificate Verification
10. Wire public verification page to actual API endpoint (currently placeholder)
11. Verification by code or certificate ID
12. Display verification status (valid/expired/revoked)

### Badge System
13. CredentialGroups with type `badge` should display as badges (distinct from certificates)
14. Badge display on learner profile and progress pages
15. Badge image/color rendering from CredentialGroup entity

### Certificate Upgrade Flow
16. Wire CertificateUpgradeDialog to API (API-ISS-018 dependency)
17. Notify learners when a certificate upgrade is available

---

## Technical Specification

### Dependencies

- **API-ISS-017** (COMPLETED): Credential Groups & Certificate Definitions — implemented and tested (commit 5eb129e)
- **API-ISS-018** (COMPLETED): Certificate Issuance & Verification — implemented and tested (commit 5eb129e)

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/learner/certificates/CertificatesPage.tsx` | Modify | Wire to real certificate issuance API, show course AND program certs |
| `src/pages/learner/certificates/CertificateViewPage.tsx` | Modify | Replace placeholder actions with real download/verify |
| `src/pages/public/CertificateVerificationPage.tsx` | Modify | Wire to real verification API |
| `src/features/certificate-download/` | Create | PDF generation feature (client-side or API URL) |
| `src/entities/certificate/api/certificateApi.ts` | Modify | Add issuance, verification endpoints |
| Course settings form (staff) | Modify | Add certificate enable/template settings |
| Learner profile page | Modify | Display earned badges |

### Approach

1. ~~Wait for API-ISS-017 and API-ISS-018 to complete~~ DONE — see `api-to-ui/2026-02-07_credential-certificate-system-complete.md`
2. Update certificate entity to support the CertificateIssuance model
3. Wire CertificatesPage to list actual issued certificates (both course and program)
4. Implement PDF download (either via `pdfUrl` from API or client-side generation with jsPDF/html2canvas)
5. Wire public verification page to real API
6. Add badge display alongside certificates
7. Integrate certificate auto-issue into course completion flow (UI-ISS-095)

---

## Tests Required

1. [ ] Course certificates appear after course completion
2. [ ] Program certificates appear after program completion
3. [ ] Certificate PDF downloads successfully
4. [ ] Certificate verification returns correct status
5. [ ] Badges display correctly (distinct from certificates)
6. [ ] Certificate upgrade flow works
7. [ ] Revoked certificates show correct status
8. [ ] Expired certificates are handled
9. [ ] Certificate list shows both course and program certificates

---

## Acceptance Criteria

- [ ] Certificates are available for both courses and programs
- [ ] Certificate PDF can be downloaded (not just a placeholder toast)
- [ ] Public verification page works with real API
- [ ] Badges are displayed distinctly from certificates
- [ ] Auto-issue on completion works for both courses and programs
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Client-side or server-side PDF generation?**
   Server-side (API returns `pdfUrl`) is preferred for consistency. Need to confirm API team approach.

2. **Are API-ISS-017 and API-ISS-018 in progress?**
   Both are COMPLETED as of 2026-02-07. Full integration can proceed. See `api-to-ui/2026-02-07_credential-certificate-system-complete.md` for all endpoints and integration notes.

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
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
