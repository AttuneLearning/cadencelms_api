# UI-UI-ISS-035: Report Export Options

**Priority:** Medium  
**Phase:** 3 - Custom Report Builder  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 6  
**Depends On:** UI-ISS-034

---

## Summary

Create the export options panel for the Report Builder, allowing users to select output format, configure format-specific options, and trigger report generation.

---

## Requirements

### Export Options Panel
**File:** `src/features/report-builder/ui/ExportOptions.tsx`

#### Output Formats

| Format | Options |
|--------|---------|
| **PDF** | Page size, orientation, include charts, header/footer |
| **Excel** | Sheet name, include formulas, freeze header row |
| **CSV** | Delimiter, include headers, encoding |
| **JSON** | Pretty print, include metadata |

#### Components

1. **Format Selector**
   - Radio buttons or tabs for format selection
   - Icon for each format
   - Description of each format

2. **Format-Specific Options**
   - PDF Options panel
   - Excel Options panel
   - CSV Options panel
   - JSON Options panel

3. **Generation Options**
   - Priority selection (low, normal, high, urgent)
   - Schedule for later (optional)
   - Notification preferences

4. **Action Buttons**
   - "Generate Report" - creates job immediately
   - "Schedule Report" - opens schedule dialog
   - "Save & Generate" - saves template then generates

### Format Option Interfaces

```typescript
interface PdfOptions {
  pageSize: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  includeCharts: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  headerText?: string;
  footerText?: string;
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
  lineEnding: 'lf' | 'crlf';
}

interface JsonOptions {
  prettyPrint: boolean;
  includeMetadata: boolean;
  dateFormat: 'iso' | 'unix' | 'readable';
}
```

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

---

## Notes

- Default format: PDF
- Store user's preferred format in preferences
- Options should be included in job creation request
