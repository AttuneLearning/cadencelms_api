# UI-UI-ISS-032: Custom Report Builder UI

**Priority:** High  
**Phase:** 3 - Custom Report Builder  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 16  
**Depends On:** UI-ISS-030, UI-ISS-031  
**Blocks:** UI-ISS-033, UI-ISS-034, UI-ISS-035

---

## Summary

Create the main Custom Report Builder page with a drag-and-drop interface for building custom reports by selecting dimensions, measures, slicers, and groups.

---

## Requirements

### Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Report Builder                              [Preview] [Save]│
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  Field       │   Report Canvas                               │
│  Palette     │   ┌─────────────────────────────────────────┐ │
│              │   │ Dimensions (Rows)                       │ │
│  Dimensions  │   │ [Learner] [Course] [+]                  │ │
│  ├─ Learner  │   ├─────────────────────────────────────────┤ │
│  ├─ Course   │   │ Measures (Values)                       │ │
│  ├─ Class    │   │ [Completion Rate] [Avg Score] [+]       │ │
│  └─ ...      │   ├─────────────────────────────────────────┤ │
│              │   │ Slicers (Filters)                       │ │
│  Measures    │   │ [Date Range: Last 30 days] [+]          │ │
│  ├─ Count    │   ├─────────────────────────────────────────┤ │
│  ├─ Average  │   │ Groups (Breakdown)                      │ │
│  └─ ...      │   │ [By Month] [+]                          │ │
│              │   └─────────────────────────────────────────┘ │
│  Slicers     │                                               │
│  ├─ Date     ├───────────────────────────────────────────────┤
│  └─ ...      │  Properties Panel                             │
│              │  ┌───────────────────────────────────────────┐│
│  Groups      │  │ Report Name: _______________              ││
│  ├─ By Day   │  │ Output Format: [PDF v]                   ││
│  └─ ...      │  │ Date Range: [Last 30 days v] - [Custom]  ││
│              │  └───────────────────────────────────────────┘│
└──────────────┴───────────────────────────────────────────────┘
```

### Page Features

**File:** `src/pages/admin/reports/builder/CustomReportBuilderPage.tsx`

1. **Field Palette (Left Panel)**
   - Collapsible sections: Dimensions, Measures, Slicers, Groups
   - Draggable items with icons
   - Search/filter within palette
   - Tooltips with descriptions

2. **Report Canvas (Center)**
   - Drop zones for each category
   - Visual representation of selected fields
   - Drag to reorder
   - Remove button on each field
   - Click to configure field options

3. **Properties Panel (Right/Bottom)**
   - Report name and description
   - Output format selection
   - Date range picker
   - Priority selection
   - Visibility settings

4. **Actions (Header)**
   - Preview button → opens preview dialog
   - Save as Template button
   - Generate Report button
   - Load Template button

### State Management

Use a custom hook `useReportBuilder`:

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

function useReportBuilder(templateId?: string) {
  // State management
  // Load template if provided
  // Add/remove/reorder fields
  // Validate configuration
  // Submit to API
}
```

### Template Loading

- If URL has `?template=<id>`, load template and populate builder
- Allow modifying loaded template before generating

---

## Components to Create

- `CustomReportBuilderPage.tsx` - Main page
- `FieldPalette.tsx` - Left panel with draggable fields
- `ReportCanvas.tsx` - Center drop zone area
- `PropertiesPanel.tsx` - Right/bottom configuration panel
- `FieldChip.tsx` - Visual chip for selected field
- `DropZone.tsx` - Droppable area component

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

---

## Notes

- Use @dnd-kit for drag and drop
- Fetch metadata from useReportBuilderMetadata hook
- Consider keyboard accessibility for field selection
- Mobile: stack panels vertically
