# UI-ISS-035: Report Export Options

## Status: PENDING
## Priority: Medium
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-034 (depends on)

---

## Overview

Create the export options panel for the Report Builder, allowing users to select output format, configure format-specific options, and trigger report generation.

---

## Requirements

1. Format Selector - radio buttons or tabs for PDF, Excel, CSV, JSON
2. Format-Specific Options panels for each format
3. Generation Options - priority selection, schedule for later, notification preferences
4. Action Buttons - Generate Report, Schedule Report, Save & Generate

---

## Technical Specification

### Output Formats

| Format | Options |
|--------|---------|
| PDF | Page size, orientation, include charts, header/footer |
| Excel | Sheet name, include formulas, freeze header row |
| CSV | Delimiter, include headers, encoding |
| JSON | Pretty print, include metadata |

### Format Option Interfaces

```typescript
interface PdfOptions {
  pageSize: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  includeCharts: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
}

interface ExcelOptions {
  sheetName: string;
  includeFormulas: boolean;
  freezeHeaderRow: boolean;
  autoColumnWidth: boolean;
}

interface CsvOptions {
  delimiter: ',' | ';' | '\t' | '|';
  includeHeaders: boolean;
  encoding: 'utf-8' | 'utf-16' | 'ascii';
}

interface JsonOptions {
  prettyPrint: boolean;
  includeMetadata: boolean;
  dateFormat: 'iso' | 'unix' | 'readable';
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/features/report-builder/ui/ExportOptions.tsx` | Create | Export options panel |

### Approach

Default format: PDF. Store user's preferred format in preferences. Options should be included in job creation request.

---

## Tests Required

1. [ ] All 4 output formats are selectable
2. [ ] Format-specific options appear when format is selected
3. [ ] Priority selection works
4. [ ] "Generate Report" creates job and navigates to detail

---

## Acceptance Criteria

- [ ] All 4 output formats are selectable
- [ ] Format-specific options appear when format is selected
- [ ] PDF options work correctly
- [ ] Excel options work correctly
- [ ] CSV options work correctly
- [ ] JSON options work correctly
- [ ] Priority selection works
- [ ] "Generate Report" creates job and navigates to detail
- [ ] Form validation prevents generation with invalid options
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
