# UI-ISS-052: Implement Certificate Configuration for Programs

## Status: PENDING
## Priority: Medium
## Created: 2026-01-20
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-051 (depends on)

---

## Overview

Department administrators cannot configure certificates for programs. When learners complete a program, there is no way to automatically generate and issue certificates.

---

## Requirements

1. Enable/disable certificate generation for a program
2. Configure certificate details (title, signatory, validity)
3. Select certificate templates
4. Configure auto-issue behavior

---

## Technical Specification

### Certificate Configuration Form

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | toggle | Yes | Enable/disable certificate for this program |
| templateId | select | No | Certificate template to use |
| title | text | No | Override default certificate title |
| signatoryName | text | No | Name displayed as signatory |
| signatoryTitle | text | No | Title of signatory (e.g., "Dean") |
| validityPeriod | number | No | Months until expiry (blank = never) |
| autoIssue | toggle | No | Automatically issue on completion |

### UI Layout

```
+--------------------------------------------------+
| Certificate Settings                             |
+--------------------------------------------------+
| [x] Enable Certificate                           |
|                                                  |
| Template: [Select template...       v]           |
|                                                  |
| Certificate Title:                               |
| [Program Completion Certificate    ]             |
|                                                  |
| Signatory Name:                                  |
| [Dr. Jane Smith                    ]             |
|                                                  |
| Signatory Title:                                 |
| [Department Director               ]             |
|                                                  |
| Validity Period (months):                        |
| [24                ] (blank = no expiry)         |
|                                                  |
| [x] Auto-issue on program completion             |
|                                                  |
|                    [Cancel] [Save]               |
+--------------------------------------------------+
```

### Form Validation (Zod)

```typescript
const certificateConfigSchema = z.object({
  enabled: z.boolean(),
  templateId: z.string().optional(),
  title: z.string().max(200).optional(),
  signatoryName: z.string().max(100).optional(),
  signatoryTitle: z.string().max(100).optional(),
  validityPeriod: z.number().positive().optional().nullable(),
  autoIssue: z.boolean().optional(),
}).refine(
  (data) => !data.signatoryTitle || data.signatoryName,
  { message: 'Signatory name required when title is provided' }
);
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/programs/ui/CertificateConfigForm.tsx` | Create | Config form |
| `src/features/programs/ui/CertificatePreview.tsx` | Create | Preview (optional) |
| `src/features/programs/ui/__tests__/CertificateConfigForm.test.tsx` | Create | Tests |

### Approach

Verify API endpoints with API team: `GET /api/v2/certificate-templates`, `PUT /api/v2/programs/:id/certificate`

---

## Tests Required

1. [ ] Certificate config accessible from program edit
2. [ ] Enable toggle shows/hides config fields
3. [ ] Template dropdown lists available templates
4. [ ] All fields save correctly

---

## Acceptance Criteria

- [ ] Certificate config accessible from program edit
- [ ] Enable toggle shows/hides config fields
- [ ] Template dropdown lists available templates
- [ ] All fields save correctly
- [ ] Validation errors displayed appropriately
- [ ] Config persists on program save
- [ ] Preview shows certificate with current settings (optional)
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Are certificate template API endpoints available?**
   Verify with API team

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

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
