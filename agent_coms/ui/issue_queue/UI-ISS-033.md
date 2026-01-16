# UI-UI-ISS-033: Dimension/Measure/Slicer Selectors

**Priority:** High  
**Phase:** 3 - Custom Report Builder  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 12  
**Depends On:** UI-ISS-032  
**Blocks:** UI-ISS-034

---

## Summary

Create the individual selector components for the Report Builder, allowing users to add and configure dimensions, measures, slicers, and groups.

---

## Requirements

### Components to Create

#### 1. DimensionSelector
**File:** `src/features/report-builder/ui/DimensionSelector.tsx`

- Shows available dimensions from metadata
- Displays icon, name, description for each
- Click to add to canvas
- Drag to canvas
- Shows which dimensions are already added (disabled)
- Configuration dialog:
  - Select fields to include
  - Set display label
  - Set sort order

#### 2. MeasureSelector
**File:** `src/features/report-builder/ui/MeasureSelector.tsx`

- Shows available measures from metadata
- Groups by category (counts, rates, averages, etc.)
- Click to add
- Configuration dialog:
  - Target field (if applicable)
  - Display label
  - Number format
  - Decimal places

#### 3. SlicerSelector
**File:** `src/features/report-builder/ui/SlicerSelector.tsx`

- Shows available slicers/filters
- Add filter with operator and value
- Configuration dialog:
  - Operator selection (equals, contains, between, etc.)
  - Value input (varies by type)
  - Date picker for date slicers
  - Multi-select for ID slicers

#### 4. GroupSelector
**File:** `src/features/report-builder/ui/GroupSelector.tsx`

- Shows available groupings
- Time-based groups: day, week, month, quarter, year
- Entity groups: department, course, instructor
- Configuration dialog:
  - Sort by (label or value)
  - Sort direction
  - Limit (top N)

### Shared Components

- `FieldConfigDialog.tsx` - Modal for configuring selected field
- `OperatorSelect.tsx` - Dropdown for filter operators
- `ValueInput.tsx` - Smart input based on value type
- `FieldIcon.tsx` - Icon component for each field type

---

## Field Configuration Examples

### Dimension Config
```typescript
{
  type: 'learner',
  label: 'Student',  // custom label
  fields: ['firstName', 'lastName', 'email'],  // selected fields
  sortOrder: 1
}
```

### Measure Config
```typescript
{
  type: 'completion-rate',
  label: 'Course Completion %',
  format: 'percentage',
  decimalPlaces: 1
}
```

### Slicer Config
```typescript
{
  type: 'department-id',
  operator: 'in',
  value: ['dept-1', 'dept-2'],
  label: 'Departments'
}
```

### Group Config
```typescript
{
  type: 'month',
  label: 'By Month',
  sortBy: 'label',
  sortDirection: 'asc',
  limit: 12
}
```

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

---

## Notes

- Fetch metadata using useReportBuilderMetadata
- Use Radix UI Dialog for configuration
- Consider virtualization for large metadata lists
