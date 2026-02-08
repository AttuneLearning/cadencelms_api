# Learner Access Duration & Notification System

**Status:** Draft - Pending Approval
**Date:** 2026-02-02
**Related:** COURSE_VERSIONING_DESIGN.md, ADR-VERS-001

---

## Overview

This document defines:
1. Program access duration policies (how long learners can access courses)
2. Course version upgrade policies for learners
3. Notification system for course/certificate updates
4. Badge and certificate upgrade pathways

---

## 1. Program Access Duration

### The Problem

When a learner enrolls in a program, how long should they have access to:
- Take courses in the program?
- Retake courses for better scores?
- Access new course versions?
- Upgrade their certificates/badges?

### Recommended Tier Structure

| Tier | Duration | Use Case | Recommended Default |
|------|----------|----------|---------------------|
| **Standard** | 12 months | Professional certifications, short programs | Yes |
| **Extended** | 24 months | Degree-equivalent programs, complex certifications | |
| **Perpetual** | Unlimited | Compliance training, membership-based access | |
| **Custom** | Configurable | Special arrangements | |

### Recommendation: 12 Months Default

**Rationale:**
- Long enough for learners to complete most certification programs
- Short enough to encourage timely completion
- Industry standard for professional certifications
- Can be extended per-department or per-program as needed
- Renewal options available for learners who need more time

---

## 2. Department Access Configuration

### DepartmentAccessPolicy

```typescript
interface DepartmentAccessPolicy {
  id: string;
  departmentId: string;

  // Program access duration
  defaultAccessDuration: AccessDuration;

  // Version access
  allowNewVersionAccess: boolean;         // Can learners access new versions?
  newVersionAccessWindow: number;         // Days after new version publishes

  // Upgrade policy
  allowCertificateUpgrade: boolean;       // Can upgrade to newer cert version?
  certificateUpgradeWindow: number;       // Days to upgrade after new version

  // Retake policy
  allowCourseRetakes: boolean;
  maxRetakesPerCourse: number | null;     // null = unlimited
  retakeCooldownDays: number;             // Days between retakes

  // Notifications
  notifyOnNewCourseVersion: boolean;
  notifyOnNewCertificateVersion: boolean;
  notifyBeforeAccessExpiry: boolean;
  expiryNotificationDays: number[];       // e.g., [30, 7, 1]

  createdAt: string;
  updatedAt: string;
}

type AccessDuration =
  | { type: 'months'; value: number }     // e.g., { type: 'months', value: 12 }
  | { type: 'years'; value: number }
  | { type: 'perpetual' }
  | { type: 'custom'; expiresAt: string };
```

### Program-Level Overrides

Programs can override department defaults:

```typescript
interface ProgramAccessOverride {
  id: string;
  programId: string;

  // Override any department policy field
  accessDuration?: AccessDuration;
  allowNewVersionAccess?: boolean;
  newVersionAccessWindow?: number;
  allowCertificateUpgrade?: boolean;
  certificateUpgradeWindow?: number;

  // Program-specific
  requireSequentialCompletion: boolean;   // Must complete levels in order

  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Learner Version Policy

### Core Principle

**Learners stay on their enrolled version until they complete their certificate.**

This ensures:
- Consistent learning experience
- Certificate integrity (completed what they started)
- No disruption mid-course

### Version Access Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEARNER VERSION ACCESS RULES                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Learner enrolls in Certificate Definition v1                           │
│  (requires Course-A v1, Course-B v1)                                    │
│                                                                          │
│  While enrolled:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. MUST complete Course-A v1, Course-B v1 for Certificate v1    │   │
│  │ 2. CAN access Course-A v2 if:                                   │   │
│  │    - Department allows new version access                        │   │
│  │    - Within newVersionAccessWindow                               │   │
│  │    - Program registration still active                           │   │
│  │ 3. CAN upgrade to Certificate v2 if:                            │   │
│  │    - Department allows certificate upgrade                       │   │
│  │    - Within certificateUpgradeWindow                             │   │
│  │    - Completes new version requirements                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  After certificate earned:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ - Keep access to enrolled versions (read-only progress)         │   │
│  │ - Can take new versions if access window allows                  │   │
│  │ - Can earn upgraded certificate/badge if compatible              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ProgramEnrollment with Access Tracking

```typescript
interface ProgramEnrollment {
  id: string;
  learnerId: string;
  programId: string;

  // Certificate tracking
  certificateDefinitionId: string;        // Which cert version they're working toward

  // Access window
  enrolledAt: string;
  accessExpiresAt: string;                // Calculated from policy
  accessExtendedAt: string | null;        // If manually extended
  accessExtensionReason: string | null;

  // Status
  status: 'active' | 'completed' | 'expired' | 'withdrawn';

  // Progress
  coursesCompleted: number;
  coursesTotal: number;
  currentCertificateProgress: number;     // 0-100

  // Upgrade tracking
  hasUpgradedCertificate: boolean;
  upgradedFromDefinitionId: string | null;
  upgradedAt: string | null;

  // Completion
  certificateIssuanceId: string | null;
  completedAt: string | null;
}
```

---

## 4. Certificate/Badge Upgrade System

### Upgrade Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CERTIFICATE UPGRADE FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Learner has Certificate v1 (Course-A v1, Course-B v1)                  │
│                                                                          │
│  Certificate v2 released (Course-A v2, Course-B v1)                     │
│                    │                                                     │
│                    ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Notification sent: "New version available!"                      │   │
│  │                                                                   │   │
│  │ Options presented to learner:                                    │   │
│  │ 1. Keep current certificate (no action needed)                   │   │
│  │ 2. Upgrade to v2 by completing Course-A v2                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                    │                                                     │
│                    ▼ Learner chooses to upgrade                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ System checks:                                                    │   │
│  │ - Is upgrade window still open? (certificateUpgradeWindow)       │   │
│  │ - Is program access still active? (accessExpiresAt)              │   │
│  │ - Are versions compatible? (same CredentialGroup)                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                    │                                                     │
│                    ▼ All checks pass                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Learner completes Course-A v2                                    │   │
│  │                                                                   │   │
│  │ On completion:                                                    │   │
│  │ 1. New CertificateIssuance created for v2                        │   │
│  │ 2. Old issuance marked: upgradedToIssuanceId                     │   │
│  │ 3. Badge remains same (compatible versions)                       │   │
│  │ 4. Notification: "Certificate upgraded!"                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Upgrade Eligibility Check

```typescript
interface CertificateUpgradeEligibility {
  isEligible: boolean;
  reason: string | null;

  currentIssuance: {
    id: string;
    definitionId: string;
    version: number;
  };

  availableUpgrades: {
    definitionId: string;
    version: number;
    title: string;
    additionalRequirements: {
      courseVersionId: string;
      courseTitle: string;
      isNewCourse: boolean;        // true if not in current cert
      isNewVersion: boolean;       // true if same course, new version
    }[];
    upgradeDeadline: string | null;
  }[];

  // Why not eligible (if applicable)
  blockers: {
    type: 'access_expired' | 'window_closed' | 'policy_disabled' | 'incompatible';
    message: string;
  }[];
}
```

---

## 5. Notification System

### Notification Types

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

interface Notification {
  id: string;
  learnerId: string;
  type: NotificationType;

  // Content
  title: string;
  message: string;

  // Related entities
  relatedCourseVersionId: string | null;
  relatedCertificateDefinitionId: string | null;
  relatedProgramEnrollmentId: string | null;

  // Actions
  actionUrl: string | null;
  actionLabel: string | null;

  // State
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;

  // Delivery
  sentAt: string;
  emailSentAt: string | null;
  pushSentAt: string | null;

  // Expiry
  expiresAt: string | null;
}
```

### Notification Triggers

| Event | Notification Type | Recipients | Timing |
|-------|------------------|------------|--------|
| Course v2 published | `course_version_available` | Learners with v1 enrollment | Immediate |
| Certificate v2 created | `certificate_version_available` | Learners with v1 certificate | Immediate |
| Certificate upgrade possible | `certificate_upgrade_available` | Learners eligible to upgrade | Immediate |
| Access expiring | `access_expiring_soon` | Active enrollments | 30, 7, 1 days before |
| Access expired | `access_expired` | Expired enrollments | On expiry |
| Certificate earned | `certificate_earned` | Learner | On completion |
| Certificate upgraded | `certificate_upgraded` | Learner | On upgrade |

### Notification Templates

```typescript
interface NotificationTemplate {
  id: string;
  type: NotificationType;
  departmentId: string | null;           // null = system default

  // Content templates (supports variables)
  titleTemplate: string;
  messageTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;

  // Channel settings
  sendInApp: boolean;
  sendEmail: boolean;
  sendPush: boolean;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Example template variables:
// {{learnerName}}, {{courseTitle}}, {{courseVersion}},
// {{certificateTitle}}, {{expiryDate}}, {{daysRemaining}},
// {{upgradeDeadline}}, {{actionUrl}}
```

### Example Notifications

**Course Version Available:**
```
Title: "New version of {{courseTitle}} available!"
Message: "Version {{newVersion}} of {{courseTitle}} is now available.
You're currently enrolled in version {{currentVersion}}.
You can access the new version free until {{accessDeadline}}."
Action: "View New Version" → /courses/{{courseId}}/versions/{{newVersion}}
```

**Certificate Upgrade Available:**
```
Title: "Upgrade your {{certificateTitle}} certificate!"
Message: "A new version of your certificate is available.
Complete {{remainingCourses}} to upgrade.
Upgrade available until {{upgradeDeadline}}."
Action: "Start Upgrade" → /certificates/{{certificateId}}/upgrade
```

**Access Expiring:**
```
Title: "Your program access expires in {{daysRemaining}} days"
Message: "Your access to {{programName}} expires on {{expiryDate}}.
Complete your remaining courses or contact support to extend."
Action: "View Progress" → /programs/{{programId}}/progress
```

---

## 6. Access Extension Requests

Allow learners to request access extensions:

```typescript
interface AccessExtensionRequest {
  id: string;
  learnerId: string;
  programEnrollmentId: string;

  // Request details
  requestedExtensionMonths: number;
  reason: string;

  // Status
  status: 'pending' | 'approved' | 'denied';

  // Review
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;

  // If approved
  newExpiryDate: string | null;

  createdAt: string;
}
```

---

## 7. API Endpoints Needed

### Access Policy Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments/{id}/access-policy` | Get department access policy |
| PUT | `/departments/{id}/access-policy` | Update department access policy |
| GET | `/programs/{id}/access-override` | Get program-level overrides |
| PUT | `/programs/{id}/access-override` | Set program-level overrides |

### Learner Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learners/{id}/program-enrollments` | Get learner's program enrollments with access info |
| GET | `/learners/{id}/version-access` | Check what versions learner can access |
| POST | `/program-enrollments/{id}/extend` | Request access extension |

### Certificate Upgrades

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learners/{id}/upgrade-eligibility` | Check upgrade eligibility |
| POST | `/certificate-issuances/{id}/upgrade` | Initiate certificate upgrade |
| GET | `/certificate-issuances/{id}/upgrade-status` | Check upgrade progress |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learners/{id}/notifications` | Get learner notifications |
| PATCH | `/notifications/{id}` | Mark read/dismissed |
| GET | `/notification-templates` | List notification templates |
| PUT | `/notification-templates/{type}` | Update template |

---

## 8. UI Components Needed

### Learner Dashboard
- [ ] "New Version Available" banner on course cards
- [ ] Access expiry countdown/warning
- [ ] "Upgrade Certificate" call-to-action
- [ ] Notification bell with unread count

### Program Progress Page
- [ ] Access expiry date display
- [ ] "Request Extension" button
- [ ] Version status per course (current vs available)
- [ ] Upgrade pathway visualization

### Certificate Page
- [ ] Current version badge
- [ ] "Upgrade Available" indicator
- [ ] Upgrade requirements list
- [ ] Upgrade deadline countdown

### Admin Settings
- [ ] Department access policy configuration
- [ ] Program override settings
- [ ] Notification template editor
- [ ] Extension request queue

---

## 9. Default Configuration Recommendation

```typescript
const DEFAULT_DEPARTMENT_ACCESS_POLICY: DepartmentAccessPolicy = {
  // 12 months default access
  defaultAccessDuration: { type: 'months', value: 12 },

  // Allow new version access for 90 days after release
  allowNewVersionAccess: true,
  newVersionAccessWindow: 90,

  // Allow certificate upgrades for 180 days
  allowCertificateUpgrade: true,
  certificateUpgradeWindow: 180,

  // Allow retakes with 7-day cooldown
  allowCourseRetakes: true,
  maxRetakesPerCourse: 3,
  retakeCooldownDays: 7,

  // Notifications enabled
  notifyOnNewCourseVersion: true,
  notifyOnNewCertificateVersion: true,
  notifyBeforeAccessExpiry: true,
  expiryNotificationDays: [30, 7, 1],
};
```

---

## Resolved Questions

1. **Paid extensions**: Should access extensions be free or paid?
   - **RESOLVED:** Support both free and paid extensions. Integrate with commerce package.

2. **Grandfather existing learners**: What policy for learners enrolled before this system?
   - **RESOLVED:** Not needed. System is not yet live. Only update mock data to conform to new API.

3. **Bulk notifications**: Rate limiting for mass course updates?
   - **RESOLVED:** Not a concern with messaging inbox architecture.

4. **Notification preferences**: Let learners opt-out of certain notifications?
   - **RESOLVED:** Future enhancement. Not in initial implementation.

---

## Future Enhancements

- [ ] Notification preferences / opt-out settings for learners
- [ ] Paid access extension integration with commerce package
