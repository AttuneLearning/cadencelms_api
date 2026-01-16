# UI-UI-ISS-034: Report Preview Component

**Priority:** Medium  
**Phase:** 3 - Custom Report Builder  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 8  
**Depends On:** UI-ISS-033  
**Blocks:** UI-ISS-035

---

## Summary

Create a report preview component that shows a sample of the report output before generating the full report.

---

## Requirements

### Preview Component
**File:** `src/features/report-builder/ui/ReportPreview.tsx`

#### Features

1. **Preview Dialog**
   - Modal that opens when "Preview" is clicked
   - Shows loading state while fetching
   - Displays sample data (limited rows)
   - Shows column headers based on dimensions/measures

2. **Data Table**
   - Columns based on selected dimensions and measures
   - Sample rows (10-25 rows)
   - Formatted values (percentages, dates, etc.)
   - Sort indicators if groups are applied

3. **Preview Limitations Notice**
   - "Showing first N rows of approximately X total"
   - "Generate full report for complete data"

4. **Actions**
   - "Generate Full Report" button
   - "Close" button
   - "Download Sample" (CSV only)

### Preview API Call

The preview should call a lightweight endpoint:
```
POST /api/v2/report-jobs/preview
{
  definition: ReportDefinition,
  dateRange: DateRange,
  filters: ReportFilter[],
  limit: 25
}
```

Returns:
```json
{
  columns: [
    { key: "learnerName", label: "Learner", type: "string" },
    { key: "completionRate", label: "Completion Rate", type: "percentage" }
  ],
  rows: [...],
  totalCount: 1523,
  previewCount: 25
}
```

### Components to Create

- `ReportPreview.tsx` - Main preview dialog
- `PreviewTable.tsx` - Data table for preview
- `PreviewSummary.tsx` - Shows totals/aggregates
- `PreviewActions.tsx` - Action buttons

---

## Acceptance Criteria

- [ ] Preview dialog opens from builder
- [ ] Loading state while fetching preview
- [ ] Table displays with correct columns
- [ ] Values are formatted correctly
- [ ] Total count is displayed
- [ ] "Generate Full Report" creates job
- [ ] Error handling for preview failures
- [ ] Preview is responsive

---

## Error Handling

- Invalid configuration → Show validation errors
- API failure → Show error message with retry
- Timeout → Show timeout message

---

## Notes

- Consider caching preview results
- Preview should be fast (<2s)
- If no preview endpoint, show config summary instead
