# UI-UI-ISS-029: Create Reports Dashboard Page

**Priority:** High  
**Phase:** 2 - Core Pages  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 8  
**Depends On:** UI-ISS-027  
**Blocks:** UI-ISS-030

---

## Summary

Create a comprehensive Reports Dashboard page that provides an overview of report activity, quick access to common reports, and navigation to report management features.

---

## Requirements

### Features

1. **Overview Cards**
   - Total reports generated (this period)
   - Reports pending/in-progress
   - Reports ready for download
   - Scheduled reports active

2. **Recent Activity**
   - List of recent report jobs with status
   - Quick actions (download, retry, cancel)

3. **Popular Templates**
   - Most-used report templates
   - Quick-run buttons

4. **Upcoming Scheduled Reports**
   - Next scheduled reports with times
   - Links to schedule management

5. **Quick Actions**
   - "New Custom Report" button
   - "Browse Templates" button
   - "View All Jobs" button

### Page Location

`src/pages/admin/reports/ReportsDashboard.tsx`

### Components to Create

- `ReportActivityChart.tsx` - Chart showing report generation over time
- `PopularTemplatesGrid.tsx` - Grid of popular templates
- `UpcomingSchedulesList.tsx` - List of upcoming scheduled reports
- `RecentJobsTable.tsx` - Table of recent jobs with actions

---

## Acceptance Criteria

- [ ] Dashboard loads with all sections
- [ ] Real-time job status updates (polling)
- [ ] Quick actions work correctly
- [ ] Responsive layout
- [ ] Empty states for each section
- [ ] Error handling for API failures

---

## Notes

- Use the hooks from UI-ISS-027
- Consider adding date range filter for activity
- Charts optional in initial implementation
