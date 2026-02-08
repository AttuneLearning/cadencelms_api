# UI-ISS-034: Report Preview Component

## Status: PENDING
## Priority: Medium
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-033 (depends on), UI-ISS-035 (blocks)

---

## Overview

Create a report preview component that shows a sample of the report output before generating the full report.

---

## Requirements

1. Preview Dialog - modal that opens when "Preview" is clicked
2. Data Table - columns based on selected dimensions and measures, sample rows (10-25)
3. Preview Limitations Notice - shows row count and total estimate
4. Actions - Generate Full Report, Close, Download Sample (CSV)

---

## Technical Specification

### Preview API Call

```
POST /api/v2/report-jobs/preview
{
  definition: ReportDefinition,
  dateRange: DateRange,
  filters: ReportFilter[],
  limit: 25
}
```

### Response

```json
{
  "columns": [
    { "key": "learnerName", "label": "Learner", "type": "string" },
    { "key": "completionRate", "label": "Completion Rate", "type": "percentage" }
  ],
  "rows": [...],
  "totalCount": 1523,
  "previewCount": 25
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/report-builder/ui/ReportPreview.tsx` | Create | Main preview dialog |
| `src/features/report-builder/ui/PreviewTable.tsx` | Create | Data table for preview |
| `src/features/report-builder/ui/PreviewSummary.tsx` | Create | Shows totals/aggregates |
| `src/features/report-builder/ui/PreviewActions.tsx` | Create | Action buttons |

### Approach

Consider caching preview results. Preview should be fast (<2s). If no preview endpoint, show config summary instead.

---

## Tests Required

1. [ ] Preview dialog opens from builder
2. [ ] Loading state while fetching preview
3. [ ] Table displays with correct columns
4. [ ] Values are formatted correctly

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
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

1. **What if preview endpoint doesn't exist?**
   Show config summary instead

---

## Implementation Notes

- Invalid configuration -> Show validation errors
- API failure -> Show error message with retry
- Timeout -> Show timeout message

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
