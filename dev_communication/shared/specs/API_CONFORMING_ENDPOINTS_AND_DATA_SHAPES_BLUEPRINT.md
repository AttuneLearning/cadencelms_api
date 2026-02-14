# API Conforming Endpoints and Data Shapes Blueprint

**Date:** 2026-02-13
**Status:** Proposed
**Owner:** API Team
**Related ADRs:** ADR-API-001, ADR-API-003, ADR-API-004, ADR-DATA-001, ADR-DEV-003

---

## 1. Scope and Intent

This document defines the proposed canonical API shape for the full backend surface:

1. Prefixless route policy for the active version.
2. Consistent endpoint grammar across all domains.
3. One shared response envelope standard.
4. One shared data-shape registry reused by all endpoints.

This is a target-state blueprint. It is intentionally ideal-first and does not preserve compatibility pathways.

---

## 2. Global API Conventions

### 2.1 Path and Naming Rules

1. No `/api` or `/api/vN` prefix on active default routes.
2. Plural noun resource names.
3. Kebab-case for multi-word resources.
4. Max resource nesting depth: 2.
5. Prefer resource/state modeling over verb endpoints.

### 2.2 Method Rules

1. `GET` list/read.
2. `POST` create.
3. `PATCH` partial update and state transitions.
4. `DELETE` remove/disable.

### 2.3 Query Rules

List endpoints share:

- `limit` (default 20, max 100)
- `cursor` (opaque)
- `sort` (field and direction)
- domain filters (`status`, `departmentId`, etc.)

### 2.4 Canonical Envelope

Success:

```json
{
  "status": "success",
  "data": {},
  "meta": {
    "requestId": "req_123",
    "pagination": {
      "cursor": "abc",
      "nextCursor": "def",
      "limit": 20
    }
  }
}
```

Error:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## 3. Shared Data Shapes (Canonical)

```ts
// Core primitives
export type Id = string;
export type ISODateTime = string;

export interface CursorPageMeta {
  cursor?: string;
  nextCursor?: string;
  limit: number;
  total?: number;
}

export interface ResponseMeta {
  requestId: string;
  pagination?: CursorPageMeta;
}

export interface ApiSuccess<T> {
  status: 'success';
  data: T;
  meta: ResponseMeta;
}

export interface ApiError {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: ResponseMeta;
}

export interface AuditFields {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  createdBy?: Id;
  updatedBy?: Id;
}

export interface SoftDeleteFields {
  isActive: boolean;
  deletedAt?: ISODateTime;
  deletedBy?: Id;
}

// Identity and authorization
export interface User extends AuditFields, SoftDeleteFields {
  id: Id;
  email: string;
  roleType: 'staff' | 'learner' | 'admin';
  personId?: Id;
}

export interface StaffProfile extends AuditFields, SoftDeleteFields {
  id: Id;
  userId: Id;
  departmentMemberships: DepartmentMembership[];
}

export interface LearnerProfile extends AuditFields, SoftDeleteFields {
  id: Id;
  userId: Id;
  learnerNumber?: string;
  departmentMemberships: DepartmentMembership[];
}

export interface DepartmentMembership {
  departmentId: Id;
  roles: string[];
  joinedAt: ISODateTime;
  isActive: boolean;
}

export interface RoleDefinition extends AuditFields, SoftDeleteFields {
  id: Id;
  name: string;
  userType: string;
  accessRights: string[];
}

export interface PermissionDefinition extends AuditFields, SoftDeleteFields {
  id: Id;
  code: string;
  description?: string;
}

// Organization and curriculum
export interface Department extends AuditFields, SoftDeleteFields {
  id: Id;
  name: string;
  code?: string;
  parentDepartmentId?: Id;
}

export interface Program extends AuditFields, SoftDeleteFields {
  id: Id;
  departmentId: Id;
  title: string;
  status: 'draft' | 'published' | 'archived';
  certificateDefinitionId?: Id;
}

export interface ProgramLevel extends AuditFields, SoftDeleteFields {
  id: Id;
  programId: Id;
  name: string;
  sequence: number;
}

export interface Course extends AuditFields, SoftDeleteFields {
  id: Id;
  departmentId: Id;
  programId?: Id;
  title: string;
  code?: string;
  status: 'draft' | 'published' | 'archived';
}

export interface CourseVersion extends AuditFields, SoftDeleteFields {
  id: Id;
  courseId: Id;
  version: number;
  status: 'draft' | 'published' | 'locked' | 'deprecated';
}

export interface Module extends AuditFields, SoftDeleteFields {
  id: Id;
  courseId?: Id;
  versionId?: Id;
  title: string;
  sequence: number;
}

export interface LearningUnit extends AuditFields, SoftDeleteFields {
  id: Id;
  moduleId: Id;
  type: 'lesson' | 'activity' | 'assessment' | 'scorm';
  title: string;
  sequence: number;
}

// Assessment
export interface Question extends AuditFields, SoftDeleteFields {
  id: Id;
  departmentId: Id;
  questionType: string;
  prompt: string;
  points: number;
  options?: string[];
  acceptedAnswers?: string[];
  rubric?: string;
}

export interface QuestionBank extends AuditFields, SoftDeleteFields {
  id: Id;
  departmentId: Id;
  title: string;
  description?: string;
}

export interface Assessment extends AuditFields, SoftDeleteFields {
  id: Id;
  learningUnitId?: Id;
  title: string;
  style: string;
  status: 'draft' | 'published' | 'archived';
  passingScore: number;
}

export interface AssessmentAttemptQuestion {
  questionId: Id;
  response?: unknown;
  pointsPossible: number;
  pointsEarned?: number;
  isCorrect?: boolean;
  gradedAt?: ISODateTime;
  feedback?: string;

  // projected grading support
  projectedScore?: number;
  projectedCorrect?: boolean;
  projectedConfidence?: number;
  projectedMethod?: string;
  projectedReason?: string;
  requiresInstructorReview?: boolean;
  projectedAt?: ISODateTime;
  reviewedAt?: ISODateTime;
}

export interface AssessmentAttempt extends AuditFields, SoftDeleteFields {
  id: Id;
  assessmentId: Id;
  learnerId: Id;
  enrollmentId: Id;
  learningUnitId?: Id;
  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'abandoned';
  timing: {
    startedAt: ISODateTime;
    lastActivityAt: ISODateTime;
    submittedAt?: ISODateTime;
    timeSpentSeconds: number;
  };
  scoring: {
    rawScore?: number;
    percentageScore?: number;
    passed?: boolean;
    gradingComplete: boolean;
    requiresManualGrading: boolean;
    overallFeedback?: string;
  };
  questions: AssessmentAttemptQuestion[];
}

// Learning execution and progress
export interface Enrollment extends AuditFields, SoftDeleteFields {
  id: Id;
  learnerId: Id;
  classId: Id;
  courseId: Id;
  status: 'pending' | 'active' | 'completed' | 'withdrawn';
}

export interface LearnerException extends AuditFields, SoftDeleteFields {
  id: Id;
  enrollmentId: Id;
  learnerId: Id;
  type: string;
  reason?: string;
  expiresAt?: ISODateTime;
}

export interface ModuleCompletion extends AuditFields, SoftDeleteFields {
  id: Id;
  learnerId: Id;
  moduleId: Id;
  enrollmentId: Id;
  completedAt: ISODateTime;
}

export interface ModuleAccessRecord extends AuditFields, SoftDeleteFields {
  id: Id;
  learnerId: Id;
  moduleId: Id;
  enrollmentId: Id;
  accessedAt: ISODateTime;
}

export interface LearningEvent extends AuditFields {
  id: Id;
  learnerId: Id;
  enrollmentId?: Id;
  eventType: string;
  eventAt: ISODateTime;
  payload?: Record<string, unknown>;
}

// Content
export interface ContentItem extends AuditFields, SoftDeleteFields {
  id: Id;
  departmentId: Id;
  type: 'scorm' | 'document' | 'video' | 'audio' | 'link' | 'other';
  title: string;
  description?: string;
}

export interface MediaAttachment extends AuditFields, SoftDeleteFields {
  id: Id;
  type: string;
  storageKey: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface Exercise extends AuditFields, SoftDeleteFields {
  id: Id;
  learningUnitId?: Id;
  title: string;
  type: 'matching' | 'quiz' | 'practice';
}

// Collaboration and communication
export interface DiscussionThread extends AuditFields, SoftDeleteFields {
  id: Id;
  courseId: Id;
  title: string;
  body: string;
  authorId: Id;
  pinned?: boolean;
  locked?: boolean;
}

export interface DiscussionReply extends AuditFields, SoftDeleteFields {
  id: Id;
  threadId: Id;
  body: string;
  authorId: Id;
  parentReplyId?: Id;
}

export interface Assignment extends AuditFields, SoftDeleteFields {
  id: Id;
  learningUnitId?: Id;
  courseId?: Id;
  title: string;
  description?: string;
  dueAt?: ISODateTime;
  maxPoints?: number;
}

export interface Submission extends AuditFields, SoftDeleteFields {
  id: Id;
  assignmentId: Id;
  learnerId: Id;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  submittedAt?: ISODateTime;
  score?: number;
  feedback?: string;
}

export interface Message extends AuditFields, SoftDeleteFields {
  id: Id;
  senderId: Id;
  recipientId: Id;
  subject?: string;
  body: string;
  readAt?: ISODateTime;
  archivedAt?: ISODateTime;
}

export interface Notification extends AuditFields, SoftDeleteFields {
  id: Id;
  userId: Id;
  type: string;
  title: string;
  body?: string;
  readAt?: ISODateTime;
}

// Reporting
export interface ReportTemplate extends AuditFields, SoftDeleteFields {
  id: Id;
  name: string;
  reportType: string;
  definition: Record<string, unknown>;
}

export interface ReportSchedule extends AuditFields, SoftDeleteFields {
  id: Id;
  templateId: Id;
  cron: string;
  isPaused: boolean;
  nextRunAt?: ISODateTime;
}

export interface ReportJob extends AuditFields {
  id: Id;
  templateId: Id;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requestedBy: Id;
  outputUrl?: string;
}

// Credentials and certificates
export interface CredentialGroup extends AuditFields, SoftDeleteFields {
  id: Id;
  name: string;
  code?: string;
  description?: string;
}

export interface CertificateDefinition extends AuditFields, SoftDeleteFields {
  id: Id;
  credentialGroupId: Id;
  version: number;
  status: 'draft' | 'active' | 'deprecated';
  requirements: Array<Record<string, unknown>>;
}

export interface CertificateIssuance extends AuditFields {
  id: Id;
  learnerId: Id;
  credentialGroupId: Id;
  certificateDefinitionId: Id;
  verificationCode: string;
  issuedAt: ISODateTime;
  revokedAt?: ISODateTime;
}
```

---

## 4. Canonical Endpoint Catalog (Proposed)

All routes shown without `/api` or `/api/vN` prefix.

### 4.1 Auth and Session

**Primary shapes:** `User`

- `POST /auth/sessions` (create session / login)
- `DELETE /auth/sessions/current` (logout current)
- `POST /auth/sessions/refresh` (refresh token)
- `GET /auth/me` (current user)
- `PATCH /auth/me` (self profile fields)
- `PATCH /auth/me/password` (change password)
- `POST /auth/password-resets` (request reset)
- `PATCH /auth/password-resets/:token` (apply reset)
- `PATCH /auth/context` (switch department/admin context)

### 4.2 Users, Staff, Learners

**Primary shapes:** `User`, `StaffProfile`, `LearnerProfile`

- `GET /users`
- `POST /users`
- `GET /users/:userId`
- `PATCH /users/:userId`
- `DELETE /users/:userId`
- `GET /users/:userId/staff-profile`
- `PUT /users/:userId/staff-profile`
- `GET /users/:userId/learner-profile`
- `PUT /users/:userId/learner-profile`
- `GET /users/me/notifications`
- `PATCH /users/me/notifications/:notificationId`
- `PATCH /users/me/notification-preferences`

### 4.3 Roles, Permissions, Access Rights

**Primary shapes:** `RoleDefinition`, `PermissionDefinition`

- `GET /role-definitions`
- `POST /role-definitions`
- `GET /role-definitions/:roleId`
- `PATCH /role-definitions/:roleId`
- `DELETE /role-definitions/:roleId`
- `GET /permission-definitions`
- `GET /access-right-definitions`
- `POST /role-memberships`
- `PATCH /role-memberships/:membershipId`
- `DELETE /role-memberships/:membershipId`

### 4.4 Departments and Organization

**Primary shapes:** `Department`, `Program`, `ProgramLevel`, `Class`

- `GET /departments`
- `POST /departments`
- `GET /departments/:departmentId`
- `PATCH /departments/:departmentId`
- `DELETE /departments/:departmentId`
- `GET /departments/:departmentId/access-policy`
- `PATCH /departments/:departmentId/access-policy`

- `GET /programs`
- `POST /programs`
- `GET /programs/:programId`
- `PATCH /programs/:programId`
- `DELETE /programs/:programId`

- `GET /program-levels`
- `POST /program-levels`
- `GET /program-levels/:programLevelId`
- `PATCH /program-levels/:programLevelId`
- `DELETE /program-levels/:programLevelId`

- `GET /classes`
- `POST /classes`
- `GET /classes/:classId`
- `PATCH /classes/:classId`
- `DELETE /classes/:classId`

### 4.5 Courses, Versions, Modules, Learning Units

**Primary shapes:** `Course`, `CourseVersion`, `Module`, `LearningUnit`

- `GET /courses`
- `POST /courses`
- `GET /courses/:courseId`
- `PATCH /courses/:courseId`
- `DELETE /courses/:courseId`

- `GET /courses/:courseId/versions`
- `POST /courses/:courseId/versions`
- `GET /course-versions/:versionId`
- `PATCH /course-versions/:versionId`

- `GET /courses/:courseId/modules`
- `POST /courses/:courseId/modules`
- `GET /modules/:moduleId`
- `PATCH /modules/:moduleId`
- `DELETE /modules/:moduleId`

- `GET /modules/:moduleId/learning-units`
- `POST /modules/:moduleId/learning-units`
- `GET /learning-units/:learningUnitId`
- `PATCH /learning-units/:learningUnitId`
- `DELETE /learning-units/:learningUnitId`

### 4.6 Questioning and Assessment Authoring

**Primary shapes:** `Question`, `QuestionBank`, `Assessment`

- `GET /question-banks`
- `POST /question-banks`
- `GET /question-banks/:questionBankId`
- `PATCH /question-banks/:questionBankId`
- `DELETE /question-banks/:questionBankId`

- `GET /questions`
- `POST /questions`
- `GET /questions/:questionId`
- `PATCH /questions/:questionId`
- `DELETE /questions/:questionId`

- `GET /learning-units/:learningUnitId/question-links`
- `POST /learning-units/:learningUnitId/question-links`
- `PATCH /learning-units/:learningUnitId/question-links/:linkId`
- `DELETE /learning-units/:learningUnitId/question-links/:linkId`

- `GET /assessments`
- `POST /assessments`
- `GET /assessments/:assessmentId`
- `PATCH /assessments/:assessmentId`
- `DELETE /assessments/:assessmentId`

### 4.7 Assessment Attempts and Grading

**Primary shapes:** `AssessmentAttempt`, `AssessmentAttemptQuestion`

- `GET /assessments/:assessmentId/attempts`
- `POST /assessments/:assessmentId/attempts` (start attempt)
- `GET /assessment-attempts/:attemptId`
- `PATCH /assessment-attempts/:attemptId` (save responses)
- `POST /assessment-attempts/:attemptId/submissions` (submit attempt)
- `PUT /assessment-attempts/:attemptId/question-grades` (batch grade)
- `PATCH /assessment-attempts/:attemptId` (staff updates `overallFeedback`, `notifyLearner`, state fields)

### 4.8 Enrollment and Learner Exception

**Primary shapes:** `Enrollment`, `LearnerException`

- `GET /enrollments`
- `POST /enrollments`
- `GET /enrollments/:enrollmentId`
- `PATCH /enrollments/:enrollmentId`
- `DELETE /enrollments/:enrollmentId`

- `GET /enrollments/:enrollmentId/exceptions`
- `POST /enrollments/:enrollmentId/exceptions`
- `GET /learner-exceptions/:exceptionId`
- `PATCH /learner-exceptions/:exceptionId`
- `DELETE /learner-exceptions/:exceptionId`

### 4.9 Content and Media

**Primary shapes:** `ContentItem`, `MediaAttachment`

- `GET /content-items`
- `POST /content-items`
- `GET /content-items/:contentItemId`
- `PATCH /content-items/:contentItemId`
- `DELETE /content-items/:contentItemId`

- `GET /media-attachments`
- `POST /media-attachments` (create upload intent)
- `PATCH /media-attachments/:mediaAttachmentId` (confirm/metadata)
- `DELETE /media-attachments/:mediaAttachmentId`

### 4.10 Exercises and Matching

**Primary shapes:** `Exercise`

- `GET /exercises`
- `POST /exercises`
- `GET /exercises/:exerciseId`
- `PATCH /exercises/:exerciseId`
- `DELETE /exercises/:exerciseId`

- `GET /exercises/:exerciseId/questions`
- `PUT /exercises/:exerciseId/questions` (full ordered set)

- `GET /matching-sessions/:sessionId`
- `POST /matching-attempts`
- `GET /matching-attempts/:attemptId`

### 4.11 Flashcards and Retention

**Primary shapes:** `Question`, `AssessmentAttempt`, remediation state objects

- `GET /courses/:courseId/flashcard-config`
- `PATCH /courses/:courseId/flashcard-config`
- `GET /courses/:courseId/flashcard-sessions/current`
- `POST /courses/:courseId/flashcard-reviews`
- `GET /courses/:courseId/flashcard-progress`
- `DELETE /courses/:courseId/flashcard-progress`

- `GET /courses/:courseId/retention-checks`
- `GET /retention-checks/:retentionCheckId`
- `POST /retention-checks/:retentionCheckId/submissions`
- `GET /remediation-cases`
- `PATCH /remediation-cases/:remediationCaseId`

### 4.12 Progress, Knowledge, and Module Completion

**Primary shapes:** `ModuleCompletion`, `ModuleAccessRecord`

- `GET /module-completions`
- `POST /module-completions`
- `GET /module-completions/:moduleCompletionId`

- `GET /module-access-records`
- `POST /module-access-records`
- `GET /module-access-records/:moduleAccessRecordId`

- `GET /knowledge-nodes`
- `POST /knowledge-nodes`
- `GET /knowledge-nodes/:knowledgeNodeId`
- `PATCH /knowledge-nodes/:knowledgeNodeId`
- `DELETE /knowledge-nodes/:knowledgeNodeId`

- `GET /learner-knowledge-progress`
- `POST /learner-knowledge-progress`
- `PATCH /learner-knowledge-progress/:progressId`

### 4.13 Learning Events

**Primary shapes:** `LearningEvent`

- `GET /learning-events`
- `POST /learning-events`
- `GET /learning-events/:learningEventId`

### 4.14 Discussions, Replies, Messages

**Primary shapes:** `DiscussionThread`, `DiscussionReply`, `Message`

- `GET /discussion-threads`
- `POST /discussion-threads`
- `GET /discussion-threads/:threadId`
- `PATCH /discussion-threads/:threadId`
- `DELETE /discussion-threads/:threadId`

- `GET /discussion-threads/:threadId/replies`
- `POST /discussion-threads/:threadId/replies`
- `PATCH /discussion-replies/:replyId`
- `DELETE /discussion-replies/:replyId`

- `GET /messages`
- `POST /messages`
- `GET /messages/:messageId`
- `PATCH /messages/:messageId`
- `DELETE /messages/:messageId`

### 4.15 Assignments and Submissions

**Primary shapes:** `Assignment`, `Submission`

- `GET /assignments`
- `POST /assignments`
- `GET /assignments/:assignmentId`
- `PATCH /assignments/:assignmentId`
- `DELETE /assignments/:assignmentId`

- `GET /assignments/:assignmentId/submissions`
- `POST /assignments/:assignmentId/submissions`
- `GET /submissions/:submissionId`
- `PATCH /submissions/:submissionId`

### 4.16 Reports and Analytics

**Primary shapes:** `ReportTemplate`, `ReportSchedule`, `ReportJob`

- `GET /report-templates`
- `POST /report-templates`
- `GET /report-templates/:reportTemplateId`
- `PATCH /report-templates/:reportTemplateId`
- `DELETE /report-templates/:reportTemplateId`

- `GET /report-schedules`
- `POST /report-schedules`
- `GET /report-schedules/:reportScheduleId`
- `PATCH /report-schedules/:reportScheduleId`
- `DELETE /report-schedules/:reportScheduleId`

- `GET /report-jobs`
- `POST /report-jobs`
- `GET /report-jobs/:reportJobId`
- `PATCH /report-jobs/:reportJobId`

- `GET /analytics/course-summaries`
- `GET /analytics/learner-summaries`

### 4.17 Credentials and Certificates

**Primary shapes:** `CredentialGroup`, `CertificateDefinition`, `CertificateIssuance`

- `GET /credential-groups`
- `POST /credential-groups`
- `GET /credential-groups/:credentialGroupId`
- `PATCH /credential-groups/:credentialGroupId`
- `DELETE /credential-groups/:credentialGroupId`

- `GET /certificate-definitions`
- `POST /certificate-definitions`
- `GET /certificate-definitions/:certificateDefinitionId`
- `PATCH /certificate-definitions/:certificateDefinitionId`
- `DELETE /certificate-definitions/:certificateDefinitionId`

- `GET /certificate-issuances`
- `POST /certificate-issuances`
- `GET /certificate-issuances/:certificateIssuanceId`
- `PATCH /certificate-issuances/:certificateIssuanceId`

- `GET /certificates/verification/:verificationCode` (public verification)

### 4.18 Settings, Audit, and System

**Primary shapes:** settings and audit DTOs

- `GET /settings`
- `PATCH /settings/:key`
- `POST /settings/bulk-updates`

- `GET /audit-logs`
- `GET /audit-logs/:auditLogId`

- `GET /system/health`
- `GET /system/status`
- `GET /system/metrics`

### 4.19 Admin Operations

- `GET /admin/users`
- `PATCH /admin/users/:userId`
- `GET /admin/role-memberships`
- `POST /admin/role-memberships`
- `DELETE /admin/role-memberships/:membershipId`

---

## 5. Endpoint and Shape Consistency Rules

1. Every endpoint must reference one primary shape from Section 3.
2. Every list endpoint must return list + `meta.pagination`.
3. Every endpoint family must have one contract file in `contracts/api/`.
4. Status transitions are fields on primary resources (`PATCH`) unless a dedicated transition resource is required.
5. No endpoint family may mix unrelated concerns under one base path.

---

## 6. Contract Packaging Plan

For implementation readiness, contracts should be reorganized into one file per endpoint family matching this blueprint naming, e.g.:

- `contracts/api/users.contract.ts`
- `contracts/api/courses.contract.ts`
- `contracts/api/assessment-attempts.contract.ts`
- `contracts/api/discussion-threads.contract.ts`
- `contracts/api/messages.contract.ts`

All contracts must emit generated artifacts in one pass after route and envelope normalization.

---

## 7. Migration Readiness Checklist

1. Approve this endpoint/shape blueprint.
2. Map each existing mounted family to a target family in this catalog.
3. Rewrite routes, tests, contracts, generated outputs in one no-compatibility cut.
4. Remove nonconforming endpoint families and dead route artifacts.
5. Run full integration and contract validation suites.

