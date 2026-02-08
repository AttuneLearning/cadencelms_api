# UI-ISS-033: Dimension/Measure/Slicer Selectors

## Status: PENDING
## Priority: High
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-032 (depends on), UI-ISS-034 (blocks)

---

## Overview

Create the individual selector components for the Report Builder, allowing users to add and configure dimensions, measures, slicers, and groups.

---

## Requirements

1. DimensionSelector - shows available dimensions, click/drag to add, configuration dialog
2. MeasureSelector - shows available measures grouped by category
3. SlicerSelector - shows available filters with operator and value configuration
4. GroupSelector - shows available groupings (time-based and entity groups)
5. Shared components for configuration dialogs

---

## Technical Specification

### Components to Create

| Component | Path | Description |
|-----------|------|-------------|
| DimensionSelector | `src/features/report-builder/ui/DimensionSelector.tsx` | Dimension picker |
| MeasureSelector | `src/features/report-builder/ui/MeasureSelector.tsx` | Measure picker |
| SlicerSelector | `src/features/report-builder/ui/SlicerSelector.tsx` | Filter picker |
| GroupSelector | `src/features/report-builder/ui/GroupSelector.tsx` | Group picker |

### Field Configuration Examples

```typescript
// Dimension Config
{ type: 'learner', label: 'Student', fields: ['firstName', 'lastName', 'email'], sortOrder: 1 }

// Measure Config
{ type: 'completion-rate', label: 'Course Completion %', format: 'percentage', decimalPlaces: 1 }

// Slicer Config
{ type: 'department-id', operator: 'in', value: ['dept-1', 'dept-2'], label: 'Departments' }

// Group Config
{ type: 'month', label: 'By Month', sortBy: 'label', sortDirection: 'asc', limit: 12 }
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/report-builder/ui/DimensionSelector.tsx` | Create | Dimension picker |
| `src/features/report-builder/ui/MeasureSelector.tsx` | Create | Measure picker |
| `src/features/report-builder/ui/SlicerSelector.tsx` | Create | Filter picker |
| `src/features/report-builder/ui/GroupSelector.tsx` | Create | Group picker |
| `src/features/report-builder/ui/FieldConfigDialog.tsx` | Create | Modal for configuring selected field |
| `src/features/report-builder/ui/OperatorSelect.tsx` | Create | Dropdown for filter operators |
| `src/features/report-builder/ui/ValueInput.tsx` | Create | Smart input based on value type |
| `src/features/report-builder/ui/FieldIcon.tsx` | Create | Icon component for each field type |

### Approach

Fetch metadata using useReportBuilderMetadata. Use Radix UI Dialog for configuration. Consider virtualization for large metadata lists.

---

## Tests Required

1. [ ] All selectors display available options from metadata
2. [ ] Click to add works for all selectors
3. [ ] Drag to add works for all selectors
4. [ ] Configuration dialogs work for all field types

---

## Acceptance Criteria

- [ ] All selectors display available options from metadata
- [ ] Click to add works for all selectors
- [ ] Drag to add works for all selectors
- [ ] Already-added fields are visually indicated
- [ ] Configuration dialogs work for all field types
- [ ] Slicer value inputs match the data type
- [ ] Date range slicer has date pickers
- [ ] Multi-select slicers allow multiple values
- [ ] Changes in config dialog update canvas
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

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
