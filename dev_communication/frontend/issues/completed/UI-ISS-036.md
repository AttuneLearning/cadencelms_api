# UI-ISS-036: Report Schedules Pages

## Status: PENDING
## Priority: Medium
## Created: 2026-01-15
## Updated: 2026-01-28
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-031 (depends on)

---

## Overview

Create pages for managing scheduled reports, including listing, creating, editing, and monitoring scheduled report generation.

---

## Requirements

1. Report Schedules List Page with table of all scheduled reports
2. Report Schedule Detail/Edit Page with schedule summary and run history
3. Create Schedule Dialog/Page with template selection and schedule configuration
4. Delivery configuration for email recipients and storage

---

## Technical Specification

### Frequency Options

| Frequency | Additional Config |
|-----------|------------------|
| Once | Date and time |
| Daily | Time |
| Weekly | Day of week, time |
| Biweekly | Day of week, time |
| Monthly | Day of month, time |
| Quarterly | Month, day, time |
| Yearly | Month, day, time |

### Schedule Form Props

```typescript
interface ScheduleFormProps {
  schedule?: ReportSchedule;
  templateId?: string;
  onSubmit: (data: CreateReportScheduleRequest) => void;
  onCancel: () => void;
}
```

---

## Implementation

### Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/reports/schedules/ReportSchedulesPage.tsx` | Create | List page |
| `src/pages/admin/reports/schedules/ReportScheduleDetailPage.tsx` | Create | Detail page |
| `src/features/report-schedule/ui/ScheduleForm.tsx` | Create | Create/edit form |
| `src/features/report-schedule/ui/ScheduleCalendar.tsx` | Create | Visual calendar (optional) |
| `src/features/report-schedule/ui/DeliverySettings.tsx` | Create | Email/storage configuration |
| `src/features/report-schedule/ui/RunHistoryTable.tsx` | Create | History of jobs from schedule |
| `src/features/report-schedule/ui/ScheduleStatusBadge.tsx` | Create | Active/paused indicator |

### Approach

Use date-fns-tz for timezone handling. Consider showing next N scheduled runs. Run history should link to job details.

---

## Tests Required

1. [ ] Schedules list page with all columns
2. [ ] Filters work correctly
3. [ ] Pause/Resume toggles schedule state
4. [ ] "Run Now" creates job immediately

---

## Acceptance Criteria

- [ ] Schedules list page with all columns
- [ ] Filters work correctly
- [ ] Pause/Resume toggles schedule state
- [ ] "Run Now" creates job immediately
- [ ] Create schedule form validates input
- [ ] Edit schedule updates existing
- [ ] Detail page shows run history
- [ ] Timezone selector works correctly
- [ ] Email recipient picker works
- [ ] Tests pass
- [ ] Code reviewed

---

## Questions / Clarifications

*None at this time*

---

## Implementation Notes

- Handle consecutive failures indicator

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
