# Course Versioning System - Implementation Complete

**Date:** 2026-02-04
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Implementation Complete
**Related Issues:** API-ISS-014 through API-ISS-021

---

## Status

**ALL PHASES COMPLETE** - The course versioning system and all related features are fully implemented and ready for integration.

---

## Summary

All API endpoints for the Course Versioning System are now available:

| Issue | Feature | Status |
|-------|---------|--------|
| API-ISS-014 | Core Versioning | Complete |
| API-ISS-015 | CourseVersionModule Management | Complete |
| API-ISS-016 | Module Sharing & Global Completion | Complete |
| API-ISS-017 | Credential Groups & Certificate Definitions | Complete |
| API-ISS-018 | Certificate Issuance & Verification | Complete |
| API-ISS-019 | Access Policies & Duration Management | Complete |
| API-ISS-020 | Notification System | Complete |
| API-ISS-021 | Module Edit Locking | Complete |

---

## API Contracts

### 1. Course Versioning (API-ISS-014, API-ISS-015)

#### Create Version
```
POST /api/v2/courses/:id/versions
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body:
{
  "changeNotes"?: string  // Optional notes describing intended changes
}

Response: 201
{
  "status": "success",
  "data": {
    "id": "string",
    "canonicalCourseId": "string",
    "version": number,
    "status": "draft" | "published" | "locked",
    "title": "string",
    "description"?: "string",
    "credits": number,
    "duration": number,
    "settings": CourseSettings,
    "instructorIds": ["string"],
    "changeNotes"?: "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

#### List Versions
```
GET /api/v2/courses/:id/versions
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": CourseVersion[]  // Sorted by version number descending
}
```

#### Get Version Details
```
GET /api/v2/course-versions/:id
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": CourseVersion
}
```

#### Update Draft
```
PATCH /api/v2/course-versions/:id
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body (all optional):
{
  "title"?: string,           // max 200 chars
  "description"?: string,     // max 2000 chars, null to clear
  "credits"?: number,         // 0-10
  "duration"?: number,        // minutes
  "settings"?: Partial<CourseSettings>,
  "instructorIds"?: ["string"],
  "changeNotes"?: string
}

Response: 200
```

#### Publish Version
```
POST /api/v2/course-versions/:id/publish
Authorization: Bearer <token>
Access Right: content:courses:manage

Response: 200
{
  "status": "success",
  "data": CourseVersion,  // status: "published"
  "message": "Course version published successfully"
}

Side Effects:
- Locks previous published version with reason "superseded"
- Emits "course.version.published" event
- May trigger certificate definition auto-versioning
- Notifies affected learners of new version availability
```

#### Lock Version
```
POST /api/v2/course-versions/:id/lock
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body:
{
  "reason"?: string  // Optional reason for locking
}

Response: 200
```

#### List Version Modules
```
GET /api/v2/course-versions/:id/modules
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": CourseVersionModule[]  // Sorted by order, with populated module details
}
```

#### Add Module to Version
```
POST /api/v2/course-versions/:id/modules
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body:
{
  "moduleId": "string",         // Required
  "order"?: number,             // Auto-calculated if not provided
  "isRequired"?: boolean,       // Default: true
  "availableFrom"?: "ISO date", // null for immediate
  "availableUntil"?: "ISO date" // null for no end
}

Response: 201

Constraints:
- Version must be in "draft" status
- Module must exist in same department
- Cannot add duplicate module
```

#### Reorder Modules
```
PATCH /api/v2/course-versions/:id/modules/reorder
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body:
{
  "moduleOrder": ["string"]  // All module IDs in desired order
}

Response: 200
```

#### Update Module Settings
```
PATCH /api/v2/course-versions/:id/modules/:moduleId
Authorization: Bearer <token>
Access Right: content:courses:manage

Request Body (all optional):
{
  "isRequired"?: boolean,
  "availableFrom"?: "ISO date" | null,
  "availableUntil"?: "ISO date" | null
}

Response: 200
```

#### Remove Module from Version
```
DELETE /api/v2/course-versions/:id/modules/:moduleId
Authorization: Bearer <token>
Access Right: content:courses:manage

Response: 204
```

---

### 2. Module Sharing & Global Completion (API-ISS-016)

#### Get Module Usage Stats
```
GET /api/v2/modules/:id/usage
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": {
    "moduleId": "string",
    "moduleTitle": "string",
    "totalCourseVersions": number,
    "courseVersions": [{
      "courseVersionId": "string",
      "courseTitle": "string",
      "version": number,
      "status": "string"
    }],
    "totalCompletions": number,
    "uniqueLearners": number
  }
}
```

#### Get Module Completion Stats
```
GET /api/v2/modules/:id/completion-stats
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": {
    "moduleId": "string",
    "totalCompletions": number,
    "completionsByVersion": [{
      "courseVersionId": "string",
      "courseTitle": "string",
      "completionCount": number
    }],
    "averageScore": number | null
  }
}
```

#### List Learner's Module Completions
```
GET /api/v2/learners/:id/module-completions
Authorization: Bearer <token>
Access Right: progress:read (or own data)

Query Parameters:
- page?: number (default: 1)
- limit?: number (default: 20, max: 100)
- moduleId?: string (filter by specific module)
- courseVersionId?: string (filter by course version)

Response: 200
{
  "status": "success",
  "data": {
    "completions": ModuleCompletion[],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number,
      "hasNext": boolean,
      "hasPrev": boolean
    }
  }
}
```

#### Check Module Completion
```
GET /api/v2/learners/:id/module-completions/:moduleId
Authorization: Bearer <token>
Access Right: progress:read (or own data)

Response: 200
{
  "status": "success",
  "data": {
    "isCompleted": boolean,
    "completion": ModuleCompletion | null
  }
}
```

#### Record Module Completion
```
POST /api/v2/module-completions
Authorization: Bearer <token>
Access Right: progress:write

Request Body:
{
  "learnerId": "string",
  "moduleId": "string",
  "courseVersionId": "string",
  "enrollmentId": "string",
  "score"?: number,      // 0-100
  "passedAt"?: "ISO date",
  "metadata"?: object
}

Response: 201
```

#### List Department-Owned Modules
```
GET /api/v2/departments/:id/modules
Authorization: Bearer <token>
Access Right: content:courses:read

Query Parameters:
- page?: number
- limit?: number
- isShared?: boolean
- search?: string

Response: 200
```

#### List Available Modules (for adding to versions)
```
GET /api/v2/departments/:id/modules/available
Authorization: Bearer <token>
Access Right: content:courses:read

Returns: Owned modules + modules shared from other departments
```

---

### 3. Credential Groups & Certificate Definitions (API-ISS-017)

#### Create Credential Group
```
POST /api/v2/credential-groups
Authorization: Bearer <token>
Access Right: content:certificates:manage

Request Body:
{
  "departmentId": "string",
  "name": "string",           // max 200 chars
  "code": "string",           // max 50 chars, unique within department
  "description"?: "string",
  "isActive"?: boolean        // default: true
}

Response: 201
```

#### List Credential Groups
```
GET /api/v2/credential-groups
Authorization: Bearer <token>
Access Right: content:certificates:read

Query Parameters:
- departmentId?: string
- isActive?: boolean
- page?: number
- limit?: number

Response: 200
```

#### Get Credential Group
```
GET /api/v2/credential-groups/:id
Authorization: Bearer <token>
Access Right: content:certificates:read

Response: 200 (includes definitions array)
```

#### Update Credential Group
```
PATCH /api/v2/credential-groups/:id
Authorization: Bearer <token>
Access Right: content:certificates:manage

Response: 200
```

#### Create Certificate Definition
```
POST /api/v2/certificate-definitions
Authorization: Bearer <token>
Access Right: content:certificates:manage

Request Body:
{
  "credentialGroupId": "string",
  "departmentId": "string",
  "title": "string",
  "description"?: "string",
  "templateId"?: "string",      // Certificate template reference
  "validityPeriod"?: {
    "value": number,
    "unit": "days" | "months" | "years"
  },
  "requirements": [{
    "type": "course_version" | "module" | "assessment",
    "entityId": "string",
    "minimumScore"?: number,
    "isRequired": boolean
  }],
  "metadata"?: object
}

Response: 201
```

#### List Certificate Definitions
```
GET /api/v2/certificate-definitions
Authorization: Bearer <token>
Access Right: content:certificates:read

Query Parameters:
- credentialGroupId?: string
- departmentId?: string
- status?: "active" | "deprecated" | "draft"
- page?: number
- limit?: number

Response: 200
```

#### Get Certificate Definition
```
GET /api/v2/certificate-definitions/:id
Authorization: Bearer <token>
Access Right: content:certificates:read

Response: 200
```

#### Update Certificate Definition (draft only)
```
PATCH /api/v2/certificate-definitions/:id
Authorization: Bearer <token>
Access Right: content:certificates:manage

Response: 200
```

#### Activate Certificate Definition
```
POST /api/v2/certificate-definitions/:id/activate
Authorization: Bearer <token>
Access Right: content:certificates:manage

Response: 200
```

#### Deprecate Certificate Definition
```
POST /api/v2/certificate-definitions/:id/deprecate
Authorization: Bearer <token>
Access Right: content:certificates:manage

Request Body:
{
  "supersededByDefinitionId"?: "string"
}

Response: 200
```

---

### 4. Certificate Issuance & Verification (API-ISS-018)

#### Issue Certificate
```
POST /api/v2/certificate-issuances
Authorization: Bearer <token>
Access Right: content:certificates:manage

Request Body:
{
  "learnerId": "string",
  "certificateDefinitionId": "string",
  "credentialGroupId": "string",
  "courseVersionId"?: "string",
  "enrollmentId"?: "string",
  "metadata"?: object
}

Response: 201
{
  "status": "success",
  "data": {
    "id": "string",
    "learnerId": "string",
    "certificateDefinitionId": "string",
    "credentialGroupId": "string",
    "verificationCode": "string",  // Unique verification code
    "status": "active",
    "issuedAt": "ISO date",
    "expiresAt"?: "ISO date",
    "isAutoIssued": boolean,
    "issuedBy"?: "string"
  }
}
```

#### List Certificate Issuances
```
GET /api/v2/certificate-issuances
Authorization: Bearer <token>
Access Right: content:certificates:read

Query Parameters:
- learnerId?: string
- credentialGroupId?: string
- certificateDefinitionId?: string
- status?: "active" | "expired" | "revoked" | "superseded"
- page?: number
- limit?: number

Response: 200
```

#### Get Certificate Issuance
```
GET /api/v2/certificate-issuances/:id
Authorization: Bearer <token>
Access Right: content:certificates:read

Response: 200
```

#### Revoke Certificate
```
POST /api/v2/certificate-issuances/:id/revoke
Authorization: Bearer <token>
Access Right: content:certificates:manage

Request Body:
{
  "reason": "string"
}

Response: 200
```

#### Verify Certificate (Public)
```
GET /api/v2/certificates/verify/:verificationCode
No Authentication Required

Response: 200
{
  "status": "success",
  "data": {
    "isValid": boolean,
    "certificate": {
      "learnerName": "string",
      "credentialName": "string",
      "certificateTitle": "string",
      "issuedAt": "ISO date",
      "expiresAt"?: "ISO date",
      "status": "string"
    } | null,
    "invalidReason"?: "not_found" | "expired" | "revoked"
  }
}
```

#### List Learner's Certificates
```
GET /api/v2/learners/:id/certificates
Authorization: Bearer <token>
Access Right: progress:read (or own data)

Response: 200
```

#### Check Upgrade Eligibility
```
GET /api/v2/learners/:id/certificates/:credentialGroupId/upgrade-eligibility
Authorization: Bearer <token>
Access Right: progress:read (or own data)

Response: 200
{
  "status": "success",
  "data": {
    "isEligible": boolean,
    "currentIssuance"?: CertificateIssuance,
    "availableUpgrade"?: CertificateDefinition,
    "missingRequirements": [{
      "type": "string",
      "entityId": "string",
      "description": "string"
    }]
  }
}
```

#### Upgrade Certificate
```
POST /api/v2/learners/:id/certificates/:credentialGroupId/upgrade
Authorization: Bearer <token>
Access Right: content:certificates:manage

Response: 201
{
  "status": "success",
  "data": {
    "oldIssuance": CertificateIssuance,  // status: "superseded"
    "newIssuance": CertificateIssuance   // status: "active"
  }
}
```

---

### 5. Access Policies & Extension Requests (API-ISS-019)

#### Create/Update Department Access Policy
```
PUT /api/v2/departments/:id/access-policy
Authorization: Bearer <token>
Access Right: admin:departments:manage

Request Body:
{
  "defaultAccessDuration": {
    "value": number,
    "unit": "days" | "months" | "years" | "perpetual"
  },
  "allowExtensions": boolean,
  "maxExtensions"?: number,
  "extensionDuration"?: {
    "value": number,
    "unit": "days" | "months" | "years"
  },
  "graceperiodDays"?: number
}

Response: 200
```

#### Get Department Access Policy
```
GET /api/v2/departments/:id/access-policy
Authorization: Bearer <token>
Access Right: admin:departments:read

Response: 200
```

#### Create Program Access Override
```
POST /api/v2/programs/:id/access-override
Authorization: Bearer <token>
Access Right: content:programs:manage

Request Body:
{
  "accessDuration"?: { value, unit },
  "allowExtensions"?: boolean,
  "maxExtensions"?: number,
  "extensionDuration"?: { value, unit }
}

Response: 201
```

#### Request Access Extension (Learner)
```
POST /api/v2/access-extension-requests
Authorization: Bearer <token>
Access Right: Any authenticated learner

Request Body:
{
  "enrollmentId": "string",
  "requestedExtension": {
    "value": number,
    "unit": "days" | "months" | "years"
  },
  "reason": "string"
}

Response: 201
```

#### List Extension Requests
```
GET /api/v2/access-extension-requests
Authorization: Bearer <token>
Access Right: admin:enrollments:read

Query Parameters:
- departmentId?: string
- learnerId?: string
- status?: "pending" | "approved" | "denied"
- page?: number
- limit?: number

Response: 200
```

#### Get Extension Request
```
GET /api/v2/access-extension-requests/:id
Authorization: Bearer <token>
Access Right: admin:enrollments:read (or own request)

Response: 200
```

#### Approve Extension Request
```
POST /api/v2/access-extension-requests/:id/approve
Authorization: Bearer <token>
Access Right: admin:enrollments:manage

Request Body:
{
  "grantedExtension"?: {  // Uses requested if not provided
    "value": number,
    "unit": "days" | "months" | "years" | "perpetual"
  },
  "reviewNotes"?: "string"
}

Response: 200

Side Effects:
- Updates enrollment accessExpiresAt
- Sends notification to learner
```

#### Deny Extension Request
```
POST /api/v2/access-extension-requests/:id/deny
Authorization: Bearer <token>
Access Right: admin:enrollments:manage

Request Body:
{
  "reviewNotes": "string"  // Required reason
}

Response: 200

Side Effects:
- Sends notification to learner
```

---

### 6. Notification System (API-ISS-020)

#### List Notifications
```
GET /api/v2/users/me/notifications
Authorization: Bearer <token>

Query Parameters:
- page?: number (default: 1)
- limit?: number (default: 20, max: 100)
- type?: NotificationType
- priority?: "low" | "normal" | "high" | "urgent"
- readStatus?: "read" | "unread" | "all" (default: "all")
- includeDismissed?: boolean (default: false)
- sort?: string (default: "-createdAt")

Response: 200
{
  "status": "success",
  "data": {
    "notifications": [{
      "id": "string",
      "type": NotificationType,
      "title": "string",
      "message": "string",
      "priority": "low" | "normal" | "high" | "urgent",
      "relatedEntity"?: {
        "type": "enrollment" | "course" | "courseVersion" | "certificate" | "certificateIssuance" | "extensionRequest",
        "id": "string"
      },
      "readAt": "ISO date" | null,
      "dismissedAt": "ISO date" | null,
      "createdAt": "ISO date",
      "metadata"?: object
    }],
    "pagination": { page, limit, total, totalPages, hasNext, hasPrev }
  }
}

NotificationType values:
- "access_expiring"
- "access_expired"
- "new_version_available"
- "certificate_upgrade_available"
- "certificate_issued"
- "certificate_expiring"
- "extension_approved"
- "extension_denied"
```

#### Get Unread Count
```
GET /api/v2/users/me/notifications/count
Authorization: Bearer <token>

Response: 200
{
  "status": "success",
  "data": { "count": number }
}
```

#### Get Single Notification
```
GET /api/v2/users/me/notifications/:id
Authorization: Bearer <token>

Response: 200
```

#### Mark as Read
```
PATCH /api/v2/users/me/notifications/:id/read
Authorization: Bearer <token>

Response: 200
{
  "status": "success",
  "data": { "id": "string", "isRead": true, "readAt": "ISO date" }
}
```

#### Mark All as Read
```
POST /api/v2/users/me/notifications/read-all
Authorization: Bearer <token>

Response: 200
{
  "status": "success",
  "data": { "modifiedCount": number }
}
```

#### Dismiss Notification
```
DELETE /api/v2/users/me/notifications/:id
Authorization: Bearer <token>

Response: 200
```

#### Get Notification Preferences
```
GET /api/v2/users/me/notification-preferences
Authorization: Bearer <token>

Response: 200
{
  "status": "success",
  "data": {
    "emailNotifications": boolean,
    "inAppNotifications": boolean,
    "preferences": {
      "access_expiring": boolean,
      "access_expired": boolean,
      "new_version_available": boolean,
      "certificate_upgrade_available": boolean,
      "certificate_issued": boolean,
      "certificate_expiring": boolean,
      "extension_approved": boolean,
      "extension_denied": boolean
    },
    "quietHours": {
      "enabled": boolean,
      "start": "HH:mm",
      "end": "HH:mm"
    }
  }
}
```

#### Update Notification Preferences
```
PUT /api/v2/users/me/notification-preferences
Authorization: Bearer <token>

Request Body (all optional):
{
  "emailNotifications"?: boolean,
  "inAppNotifications"?: boolean,
  "preferences"?: {
    [NotificationType]: boolean
  },
  "quietHours"?: {
    "enabled"?: boolean,
    "start"?: "HH:mm",
    "end"?: "HH:mm"
  }
}

Response: 200
```

---

### 7. Module Edit Locking (API-ISS-021)

#### Acquire Edit Lock
```
POST /api/v2/modules/:id/edit-lock
Authorization: Bearer <token>
Access Right: content:courses:manage

Response: 200
{
  "status": "success",
  "data": {
    "moduleId": "string",
    "lockedBy": "string",
    "lockedAt": "ISO date",
    "expiresAt": "ISO date",  // 15 minutes from now
    "isOwner": true
  }
}

Error 409 (Conflict):
{
  "status": "error",
  "message": "Module is currently being edited by another user",
  "data": {
    "lockedBy": "string",
    "lockedByName": "string",
    "expiresAt": "ISO date"
  }
}
```

#### Refresh Edit Lock (Heartbeat)
```
PATCH /api/v2/modules/:id/edit-lock
Authorization: Bearer <token>
Access Right: content:courses:manage

Response: 200
{
  "status": "success",
  "data": {
    "moduleId": "string",
    "expiresAt": "ISO date"  // Extended 15 minutes
  }
}
```

#### Release Edit Lock
```
DELETE /api/v2/modules/:id/edit-lock
Authorization: Bearer <token>
Access Right: content:courses:manage

Response: 200
```

#### Check Lock Status
```
GET /api/v2/modules/:id/edit-lock
Authorization: Bearer <token>
Access Right: content:courses:read

Response: 200
{
  "status": "success",
  "data": {
    "isLocked": boolean,
    "lock": {
      "lockedBy": "string",
      "lockedByName": "string",
      "lockedAt": "ISO date",
      "expiresAt": "ISO date",
      "isOwner": boolean
    } | null
  }
}
```

#### Force Release Lock (Admin)
```
DELETE /api/v2/modules/:id/edit-lock/force
Authorization: Bearer <token>
Access Right: admin:modules:manage

Response: 200
```

---

## Event Bus Events

The following events are emitted for cross-cutting concerns:

```typescript
EVENTS.COURSE_VERSION_PUBLISHED
Payload: { courseVersionId, canonicalCourseId, previousVersionId?, publishedBy }

EVENTS.CERTIFICATE_ISSUED
Payload: { issuanceId, certificateDefinitionId, credentialGroupId, learnerId, verificationCode, isAutoIssued }

EVENTS.CERTIFICATE_UPGRADED
Payload: { oldIssuanceId, newIssuanceId, learnerId, credentialGroupId, oldDefinitionId, newDefinitionId, upgradedBy }

EVENTS.EXTENSION_APPROVED
Payload: { requestId, enrollmentId, learnerId, grantedExtension, newExpirationDate }

EVENTS.EXTENSION_DENIED
Payload: { requestId, enrollmentId, learnerId, reason }
```

---

## Migration Notes

No migrations are required for UI - all new endpoints use new entity paths. However:

1. **Module Management:** Modules are now owned by departments via `ownerDepartmentId`. The old `courseId` field has been removed. Use `CourseVersionModule` join table to link modules to course versions.

2. **Course Structure:** Existing courses are now `CanonicalCourse` entities. Course versions are separate `CourseVersion` documents.

3. **Enrollments:** Consider adding `courseVersionId` to enrollment displays to show which version a learner is enrolled in.

---

## Integration Recommendations

1. **Notification Badge:** Poll `GET /api/v2/users/me/notifications/count` periodically for unread count.

2. **Module Edit:** Implement lock heartbeat (call PATCH every 60 seconds while editing).

3. **Certificate Verification:** Public verification page at `/certificates/verify/:code` can use the verify endpoint.

4. **Version Badge:** Show version number in course cards (e.g., "v2" badge).

---

## Questions from Previous Message

Based on the implementation, here are our recommendations:

1. **Module Library UI:** Implemented `GET /api/v2/departments/:id/modules/available` to list available modules for adding to course versions.

2. **Version Indicator:** The `version` field is a number - recommend showing as "v{number}" badge.

3. **Draft Editing Lock:** Implemented via API-ISS-021. Single-editor lock with 15-minute TTL and heartbeat.

4. **Notification Preferences:** Fully implemented with per-type toggles and quiet hours.

---

## Next Steps

**UI Team:**
- [ ] Review these contracts
- [ ] Begin integration with versioning endpoints
- [ ] Implement notification badge/dropdown
- [ ] Add module edit lock heartbeat
- [ ] Update course management to use versions

**API Team:**
- [x] All issues complete
- [ ] Available for integration support

---

*Message from API Team - 2026-02-04*
