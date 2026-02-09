# API-ISS-020: Notification System

## Status: COMPLETE
## Priority: Medium
## Created: 2026-02-04
## Updated: 2026-02-04
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-001, ADR-VERS-001, API-ISS-017, API-ISS-018, API-ISS-019 (depends on)
## Phase: 4 - Access Policies, Notifications & Upgrades

---

## Overview

Implement the notification system for learner alerts about course version updates, certificate availability, access expiration, and certificate upgrades. Uses internal events with database-backed queue for reliable delivery.

---

## Requirements

1. Create `Notification` model for learner notifications
2. Create `NotificationTemplate` model for customizable templates
3. Implement notification triggers for key events
4. Support in-app, email, and push channels
5. Implement read/dismiss tracking
6. Background job for scheduled notifications (expiry warnings)

---

## Technical Specification

### New Models

#### Notification

```typescript
type NotificationType =
  | 'course_version_available'
  | 'certificate_version_available'
  | 'certificate_upgrade_available'
  | 'access_expiring_soon'
  | 'access_expired'
  | 'certificate_earned'
  | 'certificate_upgraded'
  | 'badge_earned';

interface INotification extends Document {
  learnerId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedCourseVersionId: ObjectId | null;
  relatedCertificateDefinitionId: ObjectId | null;
  relatedProgramEnrollmentId: ObjectId | null;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  readAt: Date | null;
  isDismissed: boolean;
  dismissedAt: Date | null;
  sentAt: Date;
  emailSentAt: Date | null;
  pushSentAt: Date | null;
  expiresAt: Date | null;
}
```

#### NotificationTemplate

```typescript
interface INotificationTemplate extends Document {
  type: NotificationType;
  departmentId: ObjectId | null;         // null = system default
  titleTemplate: string;                  // Supports {{variables}}
  messageTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  sendInApp: boolean;
  sendEmail: boolean;
  sendPush: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/learners/{id}/notifications` | Get learner notifications |
| PATCH | `/api/v2/notifications/{id}` | Mark read/dismissed |
| POST | `/api/v2/notifications/{id}/dismiss` | Dismiss notification |
| GET | `/api/v2/notification-templates` | List templates (admin) |
| GET | `/api/v2/notification-templates/{type}` | Get template |
| PUT | `/api/v2/notification-templates/{type}` | Update template |

### GET /api/v2/learners/{id}/notifications

**Query Parameters:**
- `unreadOnly`: boolean (default: false)
- `type`: NotificationType (optional filter)
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response:**
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "...",
        "type": "course_version_available",
        "title": "New Course Version Available",
        "message": "Python Fundamentals has been updated to v2 with new content.",
        "actionUrl": "/courses/cs101/versions/2",
        "actionLabel": "View New Version",
        "isRead": false,
        "sentAt": "2026-02-04T...",
        "relatedCourseVersionId": "..."
      }
    ],
    "unreadCount": 3,
    "total": 15
  }
}
```

### Notification Triggers

```typescript
// Event Listeners

// 1. Course version published
eventBus.on('course.version.published', async (event) => {
  const { newVersionId, previousVersionId } = event;

  // Find all learners enrolled in previous version
  const enrollments = await Enrollment.find({
    courseVersionId: previousVersionId,
    status: { $in: ['active', 'completed'] }
  });

  for (const enrollment of enrollments) {
    await createNotification({
      learnerId: enrollment.learnerId,
      type: 'course_version_available',
      relatedCourseVersionId: newVersionId,
      templateData: {
        courseName: '...',
        newVersion: 2
      }
    });
  }
});

// 2. Certificate definition created (auto-versioned)
eventBus.on('certificate.definition.created', async (event) => {
  // Notify learners with previous definition
});

// 3. Certificate earned
eventBus.on('certificate.issued', async (event) => {
  await createNotification({
    learnerId: event.learnerId,
    type: 'certificate_earned',
    relatedCertificateDefinitionId: event.definitionId
  });
});

// 4. Access expiring (scheduled job)
// See background job section
```

### Template Variables

```typescript
const TEMPLATE_VARIABLES = {
  course_version_available: [
    '{{courseName}}',
    '{{courseCode}}',
    '{{newVersion}}',
    '{{previousVersion}}',
    '{{learnerName}}'
  ],
  certificate_earned: [
    '{{certificateTitle}}',
    '{{credentialName}}',
    '{{learnerName}}',
    '{{issuedDate}}'
  ],
  access_expiring_soon: [
    '{{courseName}}',
    '{{daysRemaining}}',
    '{{expiresAt}}',
    '{{learnerName}}'
  ]
  // ... etc
};
```

### Default Templates

```typescript
const defaultTemplates = [
  {
    type: 'course_version_available',
    titleTemplate: 'New Version of {{courseName}} Available',
    messageTemplate: '{{courseName}} has been updated to version {{newVersion}}. You can access the new content during your access window.',
    emailSubjectTemplate: 'New Course Version: {{courseName}}',
    emailBodyTemplate: '...',
    sendInApp: true,
    sendEmail: true,
    sendPush: false
  },
  {
    type: 'access_expiring_soon',
    titleTemplate: 'Course Access Expiring Soon',
    messageTemplate: 'Your access to {{courseName}} expires in {{daysRemaining}} days.',
    emailSubjectTemplate: 'Access Expiring: {{courseName}}',
    emailBodyTemplate: '...',
    sendInApp: true,
    sendEmail: true,
    sendPush: false
  }
  // ... etc
];
```

### Background Job: Expiry Notifications

```typescript
// Run daily via cron or job scheduler
async function sendExpiryNotifications() {
  const policies = await DepartmentAccessPolicy.find({
    notifyBeforeAccessExpiry: true
  });

  for (const policy of policies) {
    for (const daysOut of policy.expiryNotificationDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysOut);

      // Find enrollments expiring on target date
      const enrollments = await Enrollment.find({
        departmentId: policy.departmentId,
        accessExpiresAt: {
          $gte: startOfDay(targetDate),
          $lt: endOfDay(targetDate)
        },
        status: 'active'
      });

      for (const enrollment of enrollments) {
        // Check if notification already sent for this expiry
        const existing = await Notification.findOne({
          learnerId: enrollment.learnerId,
          type: 'access_expiring_soon',
          relatedProgramEnrollmentId: enrollment._id,
          'templateData.daysRemaining': daysOut
        });

        if (!existing) {
          await createNotification({
            learnerId: enrollment.learnerId,
            type: 'access_expiring_soon',
            relatedProgramEnrollmentId: enrollment._id,
            templateData: {
              daysRemaining: daysOut,
              expiresAt: enrollment.accessExpiresAt
            }
          });
        }
      }
    }
  }
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/models/notification/Notification.model.ts` | Notification schema |
| `src/models/notification/NotificationTemplate.model.ts` | Template schema |
| `src/services/notification.service.ts` | Notification creation/sending |
| `src/services/notificationTemplate.service.ts` | Template rendering |
| `src/controllers/notification.controller.ts` | Route handlers |
| `src/routes/v2/notification.routes.ts` | Route definitions |
| `src/events/listeners/notificationListeners.ts` | Event listeners |
| `src/jobs/expiryNotifications.job.ts` | Scheduled job |

### Event Integration

Connect to existing events from previous issues:

```typescript
// src/events/listeners/notificationListeners.ts
import { eventBus } from '@/events';

eventBus.on('course.version.published', handleCourseVersionPublished);
eventBus.on('certificate.definition.created', handleCertificateDefinitionCreated);
eventBus.on('certificate.issued', handleCertificateIssued);
eventBus.on('module.completed.global', handleModuleCompleted);
```

---

## Tests Required

1. [ ] Create notification from event
2. [ ] Template variable substitution
3. [ ] Get learner notifications (all)
4. [ ] Get learner notifications (unread only)
5. [ ] Mark notification as read
6. [ ] Dismiss notification
7. [ ] Department-specific templates override defaults
8. [ ] Email sending triggered (mock)
9. [ ] Expiry notification job finds correct enrollments
10. [ ] Duplicate expiry notifications prevented

---

## Acceptance Criteria

- [ ] Notification model created
- [ ] NotificationTemplate model created
- [ ] All notification types have default templates
- [ ] Event listeners trigger notifications
- [ ] Template rendering with variables works
- [ ] Learner notification endpoints working
- [ ] Read/dismiss tracking working
- [ ] Expiry notification job implemented
- [ ] Admin can customize templates per department
- [ ] Tests pass

---

## Questions / Clarifications

1. **Email/Push actually sent?**
   For MVP, create the notification records and mark email/push as "pending". Actual sending integration (SendGrid, FCM) is a separate issue.

2. **Notification expiration?**
   Notifications expire after 90 days by default. Expired notifications are hidden from API but kept for audit.

3. **Learner preferences?**
   Out of scope for this issue. All learners get all notifications. Preferences can be added in future issue.

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
- [ ] Phase 4 complete notification sent to UI team
