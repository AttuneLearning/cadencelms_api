# UI-UI-ISS-037: Notifications Integration

**Priority:** Low  
**Phase:** 4 - Scheduling & Polish  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 6  
**Depends On:** UI-ISS-036

---

## Summary

Integrate report notifications with the existing notification system, allowing users to receive alerts when reports are ready, failed, or scheduled.

---

## Requirements

### Notification Types

| Notification | Trigger | Content |
|--------------|---------|---------|
| Report Ready | Job completes successfully | Report name, download link |
| Report Failed | Job fails | Report name, error summary, retry link |
| Scheduled Report Ready | Scheduled job completes | Schedule name, report, download link |
| Schedule Failed | Scheduled job fails consecutively | Schedule name, failure count, action needed |

### Integration Points

#### 1. Notification Preferences
**File:** Update `src/features/settings/ui/NotificationSettings.tsx`

Add report notification preferences:
- Report completion notifications (on/off)
- Report failure notifications (on/off)
- Schedule alerts (on/off)
- Notification channels (in-app, email)

#### 2. In-App Notifications
**File:** Update notification dropdown/panel

- Report ready notifications with download button
- Failed report notifications with retry button
- Link to report detail page

#### 3. Job Creation Flow
**File:** Update `src/features/report-builder/`

- Add notification options to export panel
- Default to user preferences
- Allow override per report

### Notification Configuration

```typescript
interface ReportNotificationConfig {
  onComplete: {
    enabled: boolean;
    channels: NotificationChannel[];
    recipients?: string[]; // additional recipients
  };
  onFailure: {
    enabled: boolean;
    channels: NotificationChannel[];
    recipients?: string[];
  };
}
```

### Email Templates (Backend Reference)

- `report-ready.html` - Report completed email
- `report-failed.html` - Report failed email
- `schedule-failed.html` - Schedule consecutive failures

---

## Acceptance Criteria

- [ ] Notification preferences include report options
- [ ] In-app notifications appear when reports complete
- [ ] Notifications link to report detail
- [ ] Download button works in notification
- [ ] Retry button works for failed reports
- [ ] Email notifications sent (if enabled)
- [ ] Per-report notification override works

---

## Notes

- Use existing notification infrastructure
- Consider toast notifications for immediate feedback
- Handle notification permissions/settings
