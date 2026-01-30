# UI-ISS-031: Create Report Templates Pages

## Status: PENDING
## Priority: Medium
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-030 (depends on), UI-ISS-032 (blocks)

---

## Overview

Create pages for browsing, viewing, and managing report templates, including system templates and user-created templates.

---

## Requirements

1. Report Templates List Page with grid/list view toggle
2. Categories filter and search by name/description
3. Tabs: All, System, My Templates, Shared with Me
4. Card display: name, description, category, usage count
5. Actions: use, edit (own), duplicate, delete (own)
6. Report Template Detail Page with template summary and definition preview

---

## Technical Specification

### Pages to Create

| Page | Path | Description |
|------|------|-------------|
| Report Templates List | `src/pages/admin/reports/templates/ReportTemplatesPage.tsx` | Grid/list view of templates |
| Report Template Detail | `src/pages/admin/reports/templates/ReportTemplateDetailPage.tsx` | Template details and actions |

### Components to Create

- `TemplateCard.tsx` - Card component for grid view
- `TemplateListItem.tsx` - Row component for list view
- `TemplateCategoryFilter.tsx` - Category filter
- `TemplateDefinitionPreview.tsx` - Shows dimensions/measures
- `TemplateShareDialog.tsx` - Sharing settings dialog
- `TemplateVersionHistory.tsx` - Version list

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/reports/templates/ReportTemplatesPage.tsx` | Create | List page |
| `src/pages/admin/reports/templates/ReportTemplateDetailPage.tsx` | Create | Detail page |

### Approach

Build list page with filtering and search, then detail page with preview and actions.

---

## Tests Required

1. [ ] Templates list with grid/list toggle
2. [ ] Category filtering works
3. [ ] Search works
4. [ ] Tab filtering (System, My, Shared)

---

## Acceptance Criteria

- [ ] Templates list with grid/list toggle
- [ ] Category filtering works
- [ ] Search works
- [ ] Tab filtering (System, My, Shared)
- [ ] "Use Template" navigates to builder with template loaded
- [ ] Edit works for own templates
- [ ] Duplicate creates new template
- [ ] Delete works for own templates
- [ ] Detail page shows all template info
- [ ] Version history displayed (if available)
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Are system templates read-only?**
   Yes, system templates are read-only

---

## Implementation Notes

- Consider lazy loading template details
- Categories from API lookup values

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
