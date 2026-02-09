# API-ISS-026: Certificate PDF Generation Endpoint

## Status: PENDING
## Priority: High
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-097, API-ISS-017 (COMPLETED), API-ISS-018 (COMPLETED)
## Message: ui-to-api/2026-02-08_api-requirements-learner-experience-features.md

---

## Overview

The certificate issuance and verification system is complete (API-ISS-017/018). The UI has certificate pages with placeholder download actions. An endpoint is needed to generate or serve certificate PDFs so learners can actually download their certificates.

---

## Requirements

1. **PDF generation endpoint**: `GET /api/v2/certificates/:issuanceId/pdf`
2. **Returns**: Either a PDF binary (Content-Type: application/pdf) or a JSON response with a pre-signed URL to a stored PDF
3. **PDF content**: Learner name, course/program name, completion date, grade/score, verification code (text + QR), signatory name/title, certificate template branding
4. **Certificate template rendering**: Use the template from the associated CertificateDefinition
5. **Caching**: Generated PDFs should be stored (S3 or filesystem) and served from cache on subsequent requests
6. **Access control**: Only the certificate holder or admin can access the PDF

---

## Technical Specification

### Endpoint

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/certificates/:issuanceId/pdf` | Generate/retrieve certificate PDF |

### Response Options

**Option A — Direct PDF:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="certificate-VERIF123.pdf"
[binary PDF data]
```

**Option B — Pre-signed URL:**
```json
{
  "status": "success",
  "data": {
    "pdfUrl": "https://s3.../certificate-VERIF123.pdf?signature=...",
    "expiresAt": "2026-02-08T11:00:00Z"
  }
}
```

### Implementation Approach

1. Use a PDF generation library (e.g., Puppeteer for HTML→PDF, or PDFKit for programmatic generation)
2. Render the certificate template HTML with variable substitution
3. Generate QR code for verification URL
4. Store generated PDF in S3/storage
5. Return cached PDF on subsequent requests
6. Invalidate cache if certificate is revoked or upgraded

---

## Tests Required

1. [ ] PDF generates successfully for valid issuance
2. [ ] PDF contains correct learner name, course, date, grade
3. [ ] QR code/verification code is present and valid
4. [ ] Access denied for non-holder, non-admin users
5. [ ] Revoked certificates return appropriate error
6. [ ] Cached PDF is served on repeat requests

---

## Acceptance Criteria

- [ ] Endpoint returns a downloadable PDF or URL
- [ ] PDF renders certificate template with correct data
- [ ] Access control enforced
- [ ] Tests pass

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
