# UI-UI-ISS-030: Create Report Jobs Pages

**Priority:** High  
**Phase:** 2 - Core Pages  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 12  
**Depends On:** UI-ISS-029  
**Blocks:** UI-ISS-032

---

## Summary

Create pages for listing and viewing report jobs, including filtering, status tracking, and actions like download, cancel, and retry.

---

## Requirements

### Pages to Create

#### 1. Report Jobs List Page
**File:** `src/pages/admin/reports/jobs/ReportJobsListPage.tsx`

- Paginated table of all report jobs
- Filters: state, report type, date range, created by
- Sortable columns: name, type, state, created, completed
- Bulk actions: delete selected
- Row actions: view, download, cancel, retry, delete
- Status badges with colors

#### 2. Report Job Detail Page
**File:** `src/pages/admin/reports/jobs/ReportJobDetailPage.tsx`

- Job summary header with status
- Job configuration details
- Execution metrics (if available)
- Download button (when ready)
- Cancel/Retry actions (based on state)
- Error details (if failed)
- "Save as Template" option
- Related schedule (if from schedule)

### Components to Create

- `ReportJobsTable.tsx` - Main table component
- `ReportJobFilters.tsx` - Filter controls
- `ReportJobStatusBadge.tsx` - Status indicator
- `ReportJobActions.tsx` - Action dropdown/buttons
- `ReportJobMetrics.tsx` - Execution metrics display

### State Machine Visualization

```
pending → queued → processing → rendering → uploading → ready → downloaded
                                    ↓                      ↓
                                  failed                expired
                                    ↑
                        (retry) ←──┘
```

---

## Acceptance Criteria

- [ ] Jobs list page with pagination
- [ ] All filters work correctly
- [ ] Sorting works on all columns
- [ ] Status badges reflect correct state
- [ ] Download works for ready jobs
- [ ] Cancel works for pending/queued/processing jobs
- [ ] Retry works for failed jobs
- [ ] Detail page shows all job information
- [ ] Real-time status polling on detail page
- [ ] "Save as Template" creates template from job

---

## Notes

- Use polling for in-progress jobs (2s interval)
- Download should trigger browser download
- Consider optimistic UI for cancel/retry
