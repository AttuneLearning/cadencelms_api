# UI-UI-ISS-031: Create Report Templates Pages

**Priority:** Medium  
**Phase:** 2 - Core Pages  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 10  
**Depends On:** UI-ISS-030  
**Blocks:** UI-ISS-032

---

## Summary

Create pages for browsing, viewing, and managing report templates, including system templates and user-created templates.

---

## Requirements

### Pages to Create

#### 1. Report Templates List Page
**File:** `src/pages/admin/reports/templates/ReportTemplatesPage.tsx`

- Grid/List view toggle
- Categories filter
- Search by name/description
- Tabs: All, System, My Templates, Shared with Me
- Card display: name, description, category, usage count
- Actions: use, edit (own), duplicate, delete (own)

#### 2. Report Template Detail Page
**File:** `src/pages/admin/reports/templates/ReportTemplateDetailPage.tsx`

- Template summary
- Definition preview (dimensions, measures, slicers)
- Default filters
- Version history (if versioned)
- Usage statistics
- Sharing settings
- "Generate Report" button
- "Edit" button (if owner)
- "Duplicate" button

### Components to Create

- `TemplateCard.tsx` - Card component for grid view
- `TemplateListItem.tsx` - Row component for list view
- `TemplateCategoryFilter.tsx` - Category filter
- `TemplateDefinitionPreview.tsx` - Shows dimensions/measures
- `TemplateShareDialog.tsx` - Sharing settings dialog
- `TemplateVersionHistory.tsx` - Version list

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

---

## Notes

- System templates are read-only
- Consider lazy loading template details
- Categories from API lookup values
