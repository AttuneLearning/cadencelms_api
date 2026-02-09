# UI-ISS-121: Document Viewer Content Renderer

## Status: PENDING
## Priority: Medium
## Created: 2026-02-08
## Updated: 2026-02-08
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-094

---

## Overview

The document content type renderer is a **placeholder stub** that displays only "Document ID: {id}" in a dashed border box. While the course player shell provides a generic "Mark Complete" button via `PlayerControls`, the document viewer itself has no actual document rendering (no PDF viewer, no embedded document display). Learners encountering document-type learning units see an empty stub instead of content.

---

## Requirements

1. Implement a functional document viewer that renders PDF, DOCX, or other supported document formats
2. Support inline viewing (embedded PDF viewer) where possible
3. Provide a download fallback for unsupported formats
4. Ensure the "Mark Complete" button from `PlayerControls` works correctly with document content
5. Consider auto-marking complete after document has been viewed/scrolled

---

## Technical Specification

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| Document content renderer component | Modify | Replace stub with actual document rendering |
| Player controls | Verify | Ensure "Mark Complete" works for document type |

### Current State
```tsx
// Placeholder — dashed border with "Document ID: ..." text
// No actual document rendering
```

### Approach

Option A: Use `<iframe>` for PDF rendering (simplest, works for most browsers)
Option B: Use a React PDF library (react-pdf, @react-pdf-viewer/core) for richer control
Option C: Use Google Docs Viewer embed for DOCX/PPT support

Recommended: Start with `<iframe>` for PDFs + download link fallback.

---

## Acceptance Criteria

- [ ] Document content is rendered inline when format supports it (PDF at minimum)
- [ ] Download link available for all document types
- [ ] "Mark Complete" button works for document learning units
- [ ] Loading state while document loads
- [ ] Error state if document fails to load
- [ ] Stub placeholder is fully replaced

---

## Implementation Notes

*This requires knowing the document URL/path from the API response. Check the learning unit content model to understand what fields are available for document-type content. The player shell already handles navigation and completion — this issue focuses on the content rendering within the player.*

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
