# UI-ISS-032: Custom Report Builder UI

## Status: PENDING
## Priority: High
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-030, UI-ISS-031 (depends on), UI-ISS-033, UI-ISS-034, UI-ISS-035 (blocks)

---

## Overview

Create the main Custom Report Builder page with a drag-and-drop interface for building custom reports by selecting dimensions, measures, slicers, and groups.

---

## Requirements

1. Field Palette (Left Panel) with collapsible sections for Dimensions, Measures, Slicers, Groups
2. Report Canvas (Center) with drop zones for each category
3. Properties Panel (Right/Bottom) for report name, output format, date range
4. Actions (Header) with Preview, Save as Template, Generate Report, Load Template buttons
5. Template loading via URL parameter `?template=<id>`

---

## Technical Specification

### Page Layout

```
+--------------------------------------------------------------+
|  Report Builder                              [Preview] [Save] |
+--------------+-----------------------------------------------+
|              |                                               |
|  Field       |   Report Canvas                               |
|  Palette     |   +-------------------------------------+     |
|              |   | Dimensions (Rows)                   |     |
|  Dimensions  |   | [Learner] [Course] [+]              |     |
|  Measures    |   | Measures (Values)                   |     |
|  Slicers     |   | [Completion Rate] [Avg Score] [+]   |     |
|  Groups      |   | Slicers (Filters)                   |     |
|              |   | Groups (Breakdown)                  |     |
|              |   +-------------------------------------+     |
+--------------+-----------------------------------------------+
```

### State Management

```typescript
interface ReportBuilderState {
  name: string;
  description: string;
  reportType: ReportType;
  dimensions: DimensionConfig[];
  measures: MeasureConfig[];
  slicers: SlicerConfig[];
  groups: GroupConfig[];
  dateRange: DateRange;
  outputFormat: ReportOutputFormat;
  visibility: ReportVisibility;
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/reports/builder/CustomReportBuilderPage.tsx` | Create | Main page |
| `src/features/report-builder/ui/FieldPalette.tsx` | Create | Left panel with draggable fields |
| `src/features/report-builder/ui/ReportCanvas.tsx` | Create | Center drop zone area |
| `src/features/report-builder/ui/PropertiesPanel.tsx` | Create | Configuration panel |
| `src/features/report-builder/ui/FieldChip.tsx` | Create | Visual chip for selected field |
| `src/features/report-builder/ui/DropZone.tsx` | Create | Droppable area component |

### Approach

Use @dnd-kit for drag and drop. Fetch metadata from useReportBuilderMetadata hook. Consider keyboard accessibility for field selection.

---

## Tests Required

1. [ ] Field palette shows all available dimensions/measures/slicers/groups
2. [ ] Drag and drop works correctly
3. [ ] Fields can be reordered within categories
4. [ ] Template loading populates builder

---

## Acceptance Criteria

- [ ] Field palette shows all available dimensions/measures/slicers/groups
- [ ] Drag and drop works correctly
- [ ] Fields can be reordered within categories
- [ ] Fields can be removed
- [ ] Field options can be configured (label, format, etc.)
- [ ] Template loading populates builder
- [ ] Validation prevents empty reports
- [ ] Generate creates job and navigates to job detail
- [ ] Save as Template creates new template
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **Which drag-and-drop library to use?**
   Use @dnd-kit

---

## Implementation Notes

- Mobile: stack panels vertically

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
