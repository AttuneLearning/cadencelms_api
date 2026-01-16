# UI-UI-ISS-036: Report Schedules Pages

**Priority:** Medium  
**Phase:** 4 - Scheduling & Polish  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 12  
**Depends On:** UI-ISS-031

---

## Summary

Create pages for managing scheduled reports, including listing, creating, editing, and monitoring scheduled report generation.

---

## Requirements

### Pages to Create

#### 1. Report Schedules List Page
**File:** `src/pages/admin/reports/schedules/ReportSchedulesPage.tsx`

- Table of all scheduled reports
- Columns: Name, Frequency, Next Run, Last Run, Status, Actions
- Filters: frequency, active/paused, report type
- Actions: view, edit, pause/resume, run now, delete
- Visual calendar view (optional)

#### 2. Report Schedule Detail/Edit Page
**File:** `src/pages/admin/reports/schedules/ReportScheduleDetailPage.tsx`

- Schedule summary
- Report configuration (template or custom)
- Schedule settings (frequency, time, timezone)
- Delivery settings (email recipients, storage)
- Run history (recent jobs from this schedule)
- Actions: pause/resume, run now, edit, delete

#### 3. Create Schedule Dialog/Page
**File:** `src/features/report-schedule/ui/CreateScheduleDialog.tsx`

- Template or custom report selection
- Schedule configuration:
  - Frequency (daily, weekly, monthly, etc.)
  - Day of week (for weekly)
  - Day of month (for monthly)
  - Time
  - Timezone
  - Start/end dates
- Delivery configuration:
  - Email recipients (user picker)
  - Email subject/body
  - Attach report vs link only
- Output format
- Save button

### Schedule Form Component
**File:** `src/features/report-schedule/ui/ScheduleForm.tsx`

```typescript
interface ScheduleFormProps {
  schedule?: ReportSchedule;
  templateId?: string;
  onSubmit: (data: CreateReportScheduleRequest) => void;
  onCancel: () => void;
}
```

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

---

## Components to Create

- `ReportSchedulesPage.tsx` - List page
- `ReportScheduleDetailPage.tsx` - Detail page
- `ScheduleForm.tsx` - Create/edit form
- `ScheduleCalendar.tsx` - Visual calendar (optional)
- `DeliverySettings.tsx` - Email/storage configuration
- `RunHistoryTable.tsx` - History of jobs from schedule
- `ScheduleStatusBadge.tsx` - Active/paused indicator

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

---

## Notes

- Use date-fns-tz for timezone handling
- Consider showing next N scheduled runs
- Run history should link to job details
- Handle consecutive failures indicator
