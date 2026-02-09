# UI-ISS-107: Certificate PDF Download — P2 API Alignment

## Status: IN PROGRESS
## Priority: P2
## Created: 2026-02-08
## Related: API-ISS-026, UI-ISS-097

---

## Overview

Certificate pages exist with download buttons, but the PDF download flow is incomplete. Currently only opens cached `pdfUrl` if it exists, otherwise shows a placeholder toast. Need to add actual PDF generation trigger via the confirmed API endpoint.

## Requirements

### API Functions (credential entity)
1. Add `downloadCertificatePDF(issuanceId)` in `src/entities/credential/api/credentialApi.ts` calling `GET /api/v2/certificates/:issuanceId/pdf`
2. Add `useDownloadCertificatePDF()` mutation hook in `src/entities/credential/hooks/useCredentials.ts` that invalidates issuance query on success

### CertificateViewPage Download Flow
3. Update `handleDownload()` in `src/pages/learner/certificates/CertificateViewPage.tsx`:
   - If `pdfUrl` exists: open it directly
   - If `pdfUrl` is null: call mutation to trigger generation, show loading state, open URL on success
4. Add loading state on download button during generation

### CertificateVerificationPage
5. Verify download buttons work with real `pdfUrl` (already mostly correct)

### Tests
6. Update CertificateViewPage tests for new download flow
7. Test loading state during PDF generation

## Acceptance Criteria
- [ ] PDF generation triggered via API when pdfUrl not cached
- [ ] Loading state shown during generation
- [ ] Cached pdfUrl used when available (no redundant API call)
- [ ] TypeScript 0 errors, tests pass
