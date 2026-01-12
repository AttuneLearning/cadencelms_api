# Route to Authorization Mapping

**Version:** 2.0.0
**Date:** 2026-01-11
**Status:** Approved
**Purpose:** Define which access rights and roles are required for each API endpoint

---

## Table of Contents

1. [Overview](#overview)
2. [Authorization Patterns](#authorization-patterns)
3. [Key Decisions & Business Rules](#key-decisions--business-rules)
4. [Content Domain Routes](#content-domain-routes)
5. [Courses Domain Routes](#courses-domain-routes)
6. [Academic Domain Routes](#academic-domain-routes)
7. [Enrollment Domain Routes](#enrollment-domain-routes)
8. [User Management Routes](#user-management-routes)
9. [Analytics & Reporting Routes](#analytics--reporting-routes)
10. [System Administration Routes](#system-administration-routes)
11. [Access Rights Summary by Role](#access-rights-summary-by-role)
12. [Implementation Checklist](#implementation-checklist)

---

## Overview

This document maps each API endpoint to:
1. **Required Access Right(s)** - Fine-grained permissions following `domain:resource:action` pattern
2. **Roles with Access** - Which roles have the required access right(s)
3. **Middleware to Apply** - Which authorization middleware should protect the endpoint
4. **Service Layer Notes** - Additional scoping, filtering, or data masking requirements

### Key Principles

- **Multiple Roles per Route**: One route can be accessed by multiple roles
- **Access Rights Drive Authorization**: Roles grant access rights, access rights protect routes
- **Layered Security**: `authenticate` + `requireAccessRight()` + optional `requireEscalation()`
- **Department Scoping**: Many rights are department-scoped (enforced in service layer)
- **Creator-based Editing**: Draft content editable by creator + department-admin only
- **Data Masking**: Instructors and department-admins see last initials only (FirstName L.)

---

## Authorization Patterns

### Standard Pattern

```typescript
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';

router.use(authenticate); // All routes require authentication

router.get('/',
  requireAccessRight('domain:resource:read'),
  controller.list
);

router.post('/',
  requireAccessRight('domain:resource:manage'),
  controller.create
);
```

### Admin-Only Pattern

```typescript
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';

router.delete('/:id',
  requireEscalation,
  requireAdminRole(['system-admin', 'department-admin']),
  requireAccessRight('domain:resource:manage'),
  controller.delete
);
```

### Multiple Access Rights (OR Logic)

```typescript
// User needs ANY of these rights
router.get('/:id',
  requireAccessRight(['domain:resource:read', 'domain:own:read']),
  controller.get
);
```

---

## Key Decisions & Business Rules

### 1. Course Visibility & Editing

**Draft Courses:**
- **Visible to**: All department members + course creator
- **Editable by**: Course creator + department-admins ONLY
- **Usable in classes**: NO (cannot add to roster until published)

**Published Courses:**
- **Visible to**: All department members + learners (across all departments)
- **Editable by**: Department-admins ONLY
- **Usable in classes**: YES (instructors can use in classes)

**Archived Courses:**
- **Visible to**: Department members only (not learners)
- **Editable by**: Department-admins ONLY
- **Usable in classes**: NO (cannot use in new classes)

### 2. Learner Access Scope

- **Learners are NOT department-limited**
- Learners can see published courses across ALL departments
- Learners can browse and enroll in courses from any department
- Learners can self-enroll if department setting `allowSelfEnrollment=true`

### 3. Department Hierarchy Scoping

- **Top-level department members:** See ALL staff/data in top-level department + all subdepartments
- **Subdepartment-only members:** See ONLY staff/data in their specific subdepartment
- **System-admin:** See everything across all departments

### 4. Instructor Scoping

- **Class roster:** Instructors see ONLY learners enrolled in their classes
- **Progress/grades:** Instructors see ONLY progress in classes they teach
- **Transcripts:** Instructors CANNOT view transcripts (admin-only)
- **Course building:** Instructors can see all department courses/modules/questions (including drafts) for building

### 5. Data Masking (FERPA Protection)

**Last Name Masking:**
- **Instructors:** See "FirstName L." format only
- **Department-admin:** See "FirstName L." format only
- **Enrollment-admin:** See full last names

**Applied to:**
- Class enrollment lists (Route 48)
- Learner lists (Route 74)
- Progress reports
- Grade rosters

### 6. Self-Enrollment Control

**Department Setting:** `allowSelfEnrollment` (default: false)
- **false**: Only department/enrollment admins can enroll learners
- **true**: Learners can self-enroll in courses/programs using `enrollment:own:manage`
- **Controlled by:** Department-admin via `/api/v2/settings` endpoint

### 7. Audit Log Access

- **Strictly admin-only** - instructors cannot view audit logs even for their own content
- Requires escalation for all audit operations
- Department-scoped for non-system-admins

### 8. Settings Access

- **Read:** Instructors can VIEW department settings (read-only)
- **Write:** Only department-admin and system-admin can modify settings
- **Public settings:** All authenticated users can read
- **Private settings:** Require `system:department-settings:manage` to view

---

## Content Domain Routes

### Content Routes (`/api/v2/content`)

**Route File:** `src/routes/content.routes.ts`

#### SCORM Package Routes

| Endpoint | Method | Access Right | Roles | Middleware | Notes |
|----------|--------|-------------|-------|------------|-------|
| `/scorm` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | List all SCORM packages |
| `/scorm` | POST | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Upload SCORM package |
| `/scorm/:id` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | Get SCORM details |
| `/scorm/:id` | PUT | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Update SCORM metadata |
| `/scorm/:id` | DELETE | `content:courses:manage` | department-admin | `requireAccessRight()` + `requireEscalation` | Delete SCORM (admin only) |
| `/scorm/:id/launch` | POST | `content:lessons:read` | course-taker, instructor, content-admin | `requireAccessRight()` | Launch SCORM player |
| `/scorm/:id/publish` | POST | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Publish SCORM |
| `/scorm/:id/unpublish` | POST | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Unpublish SCORM |

#### Media Library Routes

| Endpoint | Method | Access Right | Roles | Middleware | Notes |
|----------|--------|-------------|-------|------------|-------|
| `/media` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | List media files |
| `/media` | POST | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Upload media file |
| `/media/:id` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | Get media details |
| `/media/:id` | PUT | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Update media metadata |
| `/media/:id` | DELETE | `content:courses:manage` | content-admin, department-admin | `requireAccessRight()` | Delete media file |

#### Content Overview Routes

| Endpoint | Method | Access Right | Roles | Middleware | Notes |
|----------|--------|-------------|-------|------------|-------|
| `/` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | List all content items |
| `/:id` | GET | `content:courses:read` | course-taker, auditor, instructor, content-admin, department-admin | `requireAccessRight()` | Get content item details |

---

## Courses Domain Routes

### Courses Routes (`/api/v2/courses`)

**Route File:** `src/routes/courses.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Department members see all (including drafts). Learners see published courses across ALL departments. |
| `/` | POST | `content:lessons:manage` | instructor, content-admin, department-admin | `requireAccessRight()` | Creates draft course (editable by creator only) |
| `/:id` | GET | `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Department members see all statuses. Learners see published only. |
| `/:id` | PUT | `content:lessons:manage` | instructor (drafts, own), department-admin (all) | `requireAccessRight()` | Service layer: creator-only for drafts, admin-only for published |
| `/:id` | PATCH | `content:lessons:manage` | instructor (drafts, own), department-admin (all) | `requireAccessRight()` | Service layer: creator-only for drafts, admin-only for published |
| `/:id` | DELETE | `content:courses:manage` | department-admin | `requireAccessRight()` + `requireEscalation` | Admin-only, requires escalation |
| `/:id/export` | GET | `content:courses:read` | instructor, content-admin, department-admin | `requireAccessRight()` | Export course package |
| `/:id/publish` | POST | `content:courses:manage` | department-admin | `requireAccessRight()` | Admin-only, makes course available to learners |
| `/:id/unpublish` | POST | `content:courses:manage` | department-admin | `requireAccessRight()` | Admin-only, reverts to draft |
| `/:id/archive` | POST | `content:courses:manage` | department-admin | `requireAccessRight()` | Admin-only, removes from active use |
| `/:id/unarchive` | POST | `content:courses:manage` | department-admin | `requireAccessRight()` | Admin-only, restores from archive |
| `/:id/duplicate` | POST | `content:lessons:manage` | instructor, content-admin, department-admin | `requireAccessRight()` | Creates copy as draft (owned by requester) |
| `/:id/department` | PATCH | `content:courses:manage` + `system:department-settings:manage` | department-admin, system-admin | `requireAccessRight()` + `requireEscalation` | Move course to different department |
| `/:id/program` | PATCH | `content:lessons:manage` | instructor (drafts, own), department-admin (all) | `requireAccessRight()` | Assign/change course program |

### Course Segments (Modules) Routes (`/api/v2/courses/:courseId/modules`)

**Route File:** `src/routes/course-segments.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/:courseId/modules` | GET | `content:lessons:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Department members see all. Learners see published only. |
| `/:courseId/modules` | POST | `content:lessons:manage` | instructor, content-admin, department-admin | `requireAccessRight()` | Create module (owned by creator) |
| `/:courseId/modules/:moduleId` | GET | `content:lessons:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Department members see all. Learners see published only. |
| `/:courseId/modules/:moduleId` | PUT | `content:lessons:manage` | instructor (unpublished, own), department-admin (all) | `requireAccessRight()` | Service layer: creator-only for unpublished |
| `/:courseId/modules/:moduleId` | DELETE | `content:lessons:manage` | instructor (unpublished, own), department-admin (all) | `requireAccessRight()` | Service layer: creator-only for unpublished |
| `/:courseId/modules/reorder` | PATCH | `content:lessons:manage` | instructor (unpublished, own), department-admin (all) | `requireAccessRight()` | Service layer: creator-only for unpublished |

### Questions Routes (`/api/v2/questions`)

**Route File:** `src/routes/questions.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `content:assessments:manage`, `content:lessons:read` | instructor, content-admin, department-admin | `requireAccessRight()` | Department-scoped question bank |
| `/` | POST | `content:assessments:manage` | instructor, content-admin, department-admin | `requireAccessRight()` | Create question (owned by creator) |
| `/bulk` | POST | `content:assessments:manage` | content-admin, department-admin | `requireAccessRight()` | Bulk import questions |
| `/:id` | GET | `content:assessments:manage`, `content:lessons:read` | instructor, content-admin, department-admin | `requireAccessRight()` | View question details |
| `/:id` | PUT | `content:assessments:manage` | instructor (unused, own), content-admin, department-admin | `requireAccessRight()` | Service layer: Cannot edit questions in use |
| `/:id` | DELETE | `content:assessments:manage` | instructor (unused, own), department-admin (unused) | `requireAccessRight()` | Service layer: Cannot delete questions in use |

---

## Academic Domain Routes

### Classes Routes (`/api/v2/classes`)

**Route File:** `src/routes/classes.routes.ts`

#### Class Management

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `content:courses:read` | instructor, content-admin, department-admin, enrollment-admin | `requireAccessRight()` | Instructors see own classes only |
| `/` | POST | `content:courses:manage` | department-admin, enrollment-admin | `requireAccessRight()` | Create class instance |
| `/:id` | GET | `content:courses:read`, `enrollment:own:read` | instructor (own), enrolled learners, department-admin | `requireAccessRight()` | Instructors see own classes, learners see enrolled classes |
| `/:id` | PUT | `content:courses:manage` | department-admin | `requireAccessRight()` | Update class information |
| `/:id` | DELETE | `content:courses:manage` | department-admin, system-admin | `requireAccessRight()` + `requireAdminRole()` | Delete class (admin-only) |

#### Enrollment Management

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/:id/enrollments` | GET | `enrollment:department:read` | instructor (own classes), department-admin, enrollment-admin | `requireAccessRight()` | **Mask last names to "FirstName L." for instructors** |
| `/:id/enrollments` | POST | `enrollment:department:manage` | instructor (own classes), department-admin, enrollment-admin | `requireAccessRight()` | Bulk enroll learners in class |
| `/:id/enrollments/:enrollmentId` | DELETE | `enrollment:department:manage` | instructor (own classes), department-admin, enrollment-admin | `requireAccessRight()` | Drop learner from class |

#### Roster & Analytics

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/:id/roster` | GET | `enrollment:department:read` | instructor (own classes), department-admin | `requireAccessRight()` | Class roster with progress. **Mask last names.** |
| `/:id/progress` | GET | `reports:own-classes:read`, `reports:department:read` | instructor (own classes), department-admin | `requireAccessRight()` | Class-wide progress analytics |

### Programs Routes (`/api/v2/programs`)

**Route File:** `src/routes/programs.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `content:programs:manage`, `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Department-scoped for staff, all published for learners |
| `/` | POST | `content:programs:manage` | content-admin, department-admin | `requireAccessRight()` | Create program |
| `/:id` | GET | `content:programs:manage`, `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Get program details |
| `/:id` | PUT | `content:programs:manage` | content-admin, department-admin | `requireAccessRight()` | Update program |
| `/:id` | DELETE | `content:programs:manage` | content-admin, department-admin | `requireAccessRight()` + `requireEscalation` | Delete program |
| `/:id/levels` | GET | `content:programs:manage`, `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Get program levels |
| `/:id/levels` | POST | `content:programs:manage` | content-admin, department-admin | `requireAccessRight()` | Create program level |
| `/:id/courses` | GET | `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Get program courses |
| `/:id/enrollments` | GET | `enrollment:department:read` | instructor, department-admin, enrollment-admin | `requireAccessRight()` | Get program enrollments |
| `/:id/department` | PATCH | `content:programs:manage` + `system:department-settings:manage` | department-admin, system-admin | `requireAccessRight()` + `requireEscalation` | Move program to different department |

### Departments Routes (`/api/v2/departments`)

**Route File:** `src/routes/departments.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | None | All authenticated | None | Public - all users see org structure |
| `/` | POST | `system:department-settings:manage` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Create department (system-admin only) |
| `/:id` | GET | None | All authenticated | None | Public - view department details |
| `/:id` | PUT | `system:department-settings:manage` | department-admin (own), system-admin (all) | `requireAccessRight()` + `requireEscalation` | Update department |
| `/:id` | DELETE | `system:department-settings:manage` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Delete department (system-admin only) |
| `/:id/hierarchy` | GET | None | All authenticated | None | Public - view department tree |
| `/:id/programs` | GET | `content:programs:manage`, `content:courses:read` | instructor, content-admin, department-admin, course-taker, auditor | `requireAccessRight()` | Get department programs |
| `/:id/staff` | GET | `staff:department:read` | instructor, department-admin, system-admin | `requireAccessRight()` | **Hierarchical scoping:** Top-level members see all subdepartments |
| `/:id/stats` | GET | `reports:department:read` | department-admin, system-admin | `requireAccessRight()` | Department statistics |

---

## Enrollment Domain Routes

### Enrollments Routes (`/api/v2/enrollments`)

**Route File:** `src/routes/enrollments.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `enrollment:department:read`, `enrollment:own:read` | instructor, department-admin, enrollment-admin, course-taker, auditor | `requireAccessRight()` | Staff see department enrollments, learners see own |
| `/program` | POST | `enrollment:own:manage`, `enrollment:department:manage` | course-taker (conditional), department-admin, enrollment-admin | `requireAccessRight()` | **Check `allowSelfEnrollment` setting** |
| `/course` | POST | `enrollment:own:manage`, `enrollment:department:manage` | course-taker (conditional), department-admin, enrollment-admin | `requireAccessRight()` | **Check `allowSelfEnrollment` setting** |
| `/class` | POST | `enrollment:own:manage`, `enrollment:department:manage` | course-taker (conditional), department-admin, enrollment-admin | `requireAccessRight()` | **Check `allowSelfEnrollment` setting** |
| `/program/:programId` | GET | `enrollment:department:read` | instructor, department-admin, enrollment-admin | `requireAccessRight()` | List program enrollments |
| `/course/:courseId` | GET | `enrollment:department:read` | instructor, department-admin, enrollment-admin | `requireAccessRight()` | List course enrollments |
| `/class/:classId` | GET | `enrollment:department:read` | instructor, department-admin, enrollment-admin | `requireAccessRight()` | List class enrollments |
| `/:id` | GET | `enrollment:department:read`, `enrollment:own:read` | instructor, department-admin, enrollment-admin, enrolled learner | `requireAccessRight()` | Get enrollment details |
| `/:id/status` | PATCH | `enrollment:department:manage` | instructor, department-admin, enrollment-admin | `requireAccessRight()` | Update enrollment status |
| `/:id` | DELETE | `enrollment:own:manage`, `enrollment:department:manage` | enrolled learner (own), instructor, department-admin, enrollment-admin | `requireAccessRight()` | Withdraw from enrollment |

---

## User Management Routes

### Staff Routes (`/api/v2/users/staff`)

**Route File:** `src/routes/staff.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `staff:department:read` | instructor, department-admin, system-admin | `requireAccessRight()` | **Hierarchical scoping:** Top-level see all subdepartments |
| `/` | POST | `staff:department:manage` | department-admin, system-admin | `requireAccessRight()` + `requireEscalation` | Create staff user |
| `/:id` | GET | `staff:department:read` | instructor, department-admin, system-admin | `requireAccessRight()` | Get staff details |
| `/:id` | PUT | `staff:department:manage` | department-admin (own dept), system-admin (all) | `requireAccessRight()` + `requireEscalation` | Update staff information |
| `/:id` | DELETE | `staff:department:manage` | department-admin (own dept), system-admin (all) | `requireAccessRight()` + `requireEscalation` + `requireAdminRole()` | Delete staff (soft delete) |
| `/:id/departments` | PATCH | `staff:department:manage` | department-admin, system-admin | `requireAccessRight()` + `requireEscalation` | Update department assignments |

### Learners Routes (`/api/v2/users/learners`)

**Route File:** `src/routes/learners.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `learner:pii:read` | instructor (enrolled only), department-admin, enrollment-admin | `requireAccessRight()` | **Mask last names to "FirstName L." for instructors & dept-admin** |
| `/` | POST | `learner:pii:read` | department-admin, enrollment-admin | `requireAccessRight()` + `requireEscalation` | Create learner account (FERPA-sensitive) |
| `/:id` | GET | `learner:pii:read` | instructor (enrolled only), department-admin, enrollment-admin | `requireAccessRight()` | **Mask last names.** FERPA-sensitive. |
| `/:id` | PUT | `learner:pii:read` | department-admin, enrollment-admin | `requireAccessRight()` + `requireEscalation` | Update learner information (FERPA) |
| `/:id` | DELETE | `learner:pii:read` | department-admin, enrollment-admin, system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole()` | Delete learner (FERPA) |

### Users Routes (`/api/v2/users`)

**Route File:** `src/routes/users.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `staff:department:read`, `learner:pii:read` | instructor, department-admin, enrollment-admin, system-admin | `requireAccessRight()` | List all users (staff + learners). **Mask learner names.** |
| `/:id` | GET | `staff:department:read`, `learner:pii:read` | instructor, department-admin, enrollment-admin, system-admin | `requireAccessRight()` | Get user details |

---

## Analytics & Reporting Routes

### Progress Routes (`/api/v2/progress`)

**Route File:** `src/routes/progress.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/reports/summary` | GET | `reports:department:read`, `reports:own-classes:read` | instructor (own classes), department-admin, system-admin | `requireAccessRight()` | Progress summary report |
| `/reports/detailed` | GET | `reports:department:read`, `reports:own-classes:read` | instructor (own classes), department-admin, system-admin | `requireAccessRight()` | Detailed progress with module breakdown |
| `/update` | POST | `grades:own-classes:manage`, `grades:department:read` | instructor (own classes), department-admin | `requireAccessRight()` | Manually update learner progress |
| `/learner/:learnerId/program/:programId` | GET | `learner:grades:read`, `grades:own:read` | learner (own), instructor (enrolled, own classes only), department-admin | `requireAccessRight()` | Learner program progress |
| `/learner/:learnerId` | GET | `learner:grades:read`, `grades:own:read` | learner (own), instructor (enrolled, own classes only), department-admin | `requireAccessRight()` | **Instructors: Filter to show ONLY their classes** |
| `/program/:programId` | GET | `grades:own:read`, `reports:department:read` | learner (enrolled), department-admin | `requireAccessRight()` | Program progress overview |
| `/course/:courseId` | GET | `grades:own:read`, `reports:own-classes:read` | learner (enrolled), instructor (own classes), department-admin | `requireAccessRight()` | Course progress details |
| `/class/:classId` | GET | `grades:own:read`, `reports:own-classes:read` | learner (enrolled), instructor (own classes), department-admin | `requireAccessRight()` | Class progress with attendance |

### Reports Routes (`/api/v2/reports`)

**Route File:** `src/routes/reports.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/completion` | GET | `reports:department:read`, `reports:enrollment:read` | instructor (scoped), department-admin, enrollment-admin | `requireAccessRight()` | Completion report with filtering |
| `/performance` | GET | `reports:department:read` | instructor (scoped), department-admin | `requireAccessRight()` | Performance report with scores |
| `/transcript/:learnerId` | GET | `learner:transcripts:read`, `grades:own:read` | learner (own), department-admin (dept courses only), enrollment-admin (full) | `requireAccessRight()` | **Dept-admin: Filter to show only their dept courses** |
| `/transcript/:learnerId/generate` | POST | `learner:transcripts:read` | enrollment-admin, system-admin | `requireAccessRight()` + `requireEscalation` | Generate PDF transcript (admin-only) |
| `/course/:courseId` | GET | `reports:own-classes:read`, `reports:department:read`, `reports:content:read` | instructor (own classes), content-admin, department-admin | `requireAccessRight()` | Course-level report |
| `/program/:programId` | GET | `reports:department:read`, `reports:enrollment:read` | department-admin, enrollment-admin | `requireAccessRight()` | Program-level report |
| `/department/:departmentId` | GET | `reports:department:read` | department-admin (own dept), system-admin (all) | `requireAccessRight()` | Department-level report |
| `/export` | GET | `reports:department:read`, `reports:own-classes:read` | instructor (scoped), department-admin, system-admin | `requireAccessRight()` | Export report data (CSV/XLSX/PDF) |

---

## System Administration Routes

### Settings Routes (`/api/v2/settings`)

**Route File:** `src/routes/settings.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | None (public), `system:department-settings:manage` (private) | All authenticated (public), instructor/department-admin/system-admin (private, read-only) | Optional `requireAccessRight()` | **Instructors can read settings but not write** |
| `/categories/:category` | GET | None (public), `system:department-settings:manage` (private) | All authenticated (public), instructor/department-admin/system-admin (private, read-only) | Optional `requireAccessRight()` | Get settings by category |
| `/:key` | GET | None (public), `system:department-settings:manage` (private) | All authenticated (public), instructor/department-admin/system-admin (private, read-only) | Optional `requireAccessRight()` | Get specific setting |
| `/:key` | PUT | `system:department-settings:manage` | department-admin (dept settings), system-admin (all) | `requireAccessRight()` + `requireEscalation` | Update setting (write requires admin) |
| `/bulk` | POST | `system:department-settings:manage` | department-admin (dept settings), system-admin (all) | `requireAccessRight()` + `requireEscalation` | Update multiple settings |
| `/reset` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Reset settings to defaults (system-admin only) |

### Audit Logs Routes (`/api/v2/audit-logs`)

**Route File:** `src/routes/audit-logs.routes.ts`

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/` | GET | `audit:logs:read` | system-admin | `requireAccessRight()` + `requireEscalation` | List audit logs (highly sensitive) |
| `/:id` | GET | `audit:logs:read` | system-admin | `requireAccessRight()` + `requireEscalation` | Get specific audit log |
| `/export` | GET | `audit:logs:export` | system-admin | `requireAccessRight()` + `requireEscalation` | Export audit logs |
| `/user/:userId` | GET | `audit:logs:read` | system-admin | `requireAccessRight()` + `requireEscalation` | Get user activity audit trail |
| `/entity/:entityType/:entityId` | GET | Domain-specific audit rights | content-admin (content), enrollment-admin (enrollment), financial-admin (billing), system-admin (all) | `requireAccessRight()` + `requireEscalation` | **Admin-only - instructors cannot view even for own content** |

### Admin Role Management Routes (`/api/v2/admin`)

**Route File:** `src/routes/admin.routes.ts` (NEW)
**Contract:** `contracts/api/admin-roles.contract.ts`

#### User Role Assignment

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/users/:userId/roles` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | List user's role assignments |
| `/users/:userId/roles` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Assign role to user in department |
| `/users/:userId/roles/:membershipId` | PUT | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Update role membership |
| `/users/:userId/roles/:membershipId` | DELETE | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Remove role from user |
| `/users/:userId/role-history` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | View role assignment history |
| `/users/search` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Search users for role assignment |

#### Global Admin Management

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/global-admins` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | List all global admins |
| `/global-admins` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Create/promote global admin |
| `/global-admins/:userId` | DELETE | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | **Cannot remove last system-admin** |
| `/global-admins/:userId/roles` | PUT | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Update global admin roles |

#### Role Definition Management

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/role-definitions` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | List all role definitions |
| `/role-definitions/:roleName` | GET | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Get role details with user count |
| `/role-definitions/:roleName/access-rights` | PUT | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Replace role's access rights |
| `/role-definitions/:roleName/access-rights` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Add access right to role |
| `/role-definitions/:roleName/access-rights/:rightId` | DELETE | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Remove access right from role |

#### Bulk Operations

| Endpoint | Method | Access Right | Roles | Middleware | Service Layer Notes |
|----------|--------|-------------|-------|------------|-------------------|
| `/users/bulk/assign-roles` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Bulk assign roles to multiple users |
| `/users/bulk/remove-roles` | POST | `system:*` | system-admin | `requireAccessRight()` + `requireEscalation` + `requireAdminRole(['system-admin'])` | Bulk remove roles from multiple users |

**Notes:**
- ALL admin role management endpoints require system-admin role
- ALL endpoints require escalation (admin token)
- Access right: `system:*` (system-admin wildcard)
- Service layer must prevent removing last system-admin
- Role history logged in audit trail
- Validate role compatibility with user type (staff vs learner)

---

## Access Rights Summary by Role

### System Admin
- `system:*` (all system rights - wildcard)
- `audit:*` (all audit rights - wildcard)
- `staff:*` (all staff rights - wildcard)
- `learner:*` (all learner rights - wildcard)
- `reports:*` (all report rights - wildcard)

### Department Admin
- `content:courses:read`
- `content:courses:manage`
- `content:lessons:manage`
- `content:programs:manage`
- `content:assessments:manage`
- `enrollment:department:read`
- `enrollment:department:manage`
- `staff:department:read`
- `staff:department:manage`
- `learner:pii:read` (with last initial masking)
- `learner:grades:read` (with last initial masking)
- `learner:contact:read`
- `grades:department:read`
- `reports:department:read`
- `system:department-settings:manage`

### Enrollment Admin
- `enrollment:*` (all enrollment rights - wildcard)
- `learner:pii:read` (full names visible)
- `learner:transcripts:read`
- `learner:emergency:read`
- `reports:enrollment:read`
- `grades:*` (all grade rights - wildcard)
- `audit:enrollment:read`

### Content Admin (Course Admin)
- `content:*` (all content rights - wildcard)
- `reports:content:read`
- `audit:content:read`

### Instructor
- `content:courses:read` (all department courses including drafts)
- `content:lessons:read`
- `content:lessons:manage` (create and manage own courses/modules)
- `content:assessments:manage` (create and manage own questions/assessments)
- `content:discussions:moderate` (for own classes)
- `enrollment:department:read` (scoped to own classes, with last initial masking)
- `enrollment:department:manage` (scoped to own classes)
- `learner:grades:read` (scoped to enrolled learners, with last initial masking)
- `learner:contact:read` (scoped to enrolled learners)
- `grades:own-classes:read`
- `grades:own-classes:manage`
- `reports:own-classes:read`
- `staff:department:read` (view department roster)

### Course Taker
- `content:courses:read` (published courses across all departments)
- `content:lessons:read` (enrolled courses only)
- `enrollment:own:read`
- `enrollment:own:manage` (conditional on `allowSelfEnrollment` setting)
- `grades:own:read`

### Auditor
- `content:courses:read` (enrolled courses only)
- `content:lessons:read` (enrolled courses only)
- `enrollment:own:read`
- `grades:own:read`

### Financial Admin
- `billing:*` (all billing rights - wildcard)
- `reports:billing:read`
- `reports:financial:read`
- `system:payment-gateway:manage`
- `audit:billing:read`

### Theme Admin
- `system:themes:manage`
- `system:branding:manage`
- `system:ui-settings:manage`
- `content:templates:manage`

---

## Implementation Checklist

When applying authorization to a route file:

### 1. Import Required Middleware
```typescript
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';
```

### 2. Keep Global Authentication
```typescript
router.use(authenticate); // All routes require authentication
```

### 3. Add Access Rights per Route
Apply `requireAccessRight()` to each endpoint according to this mapping document.

### 4. Add Escalation for Sensitive Operations
- All staff/learner PII operations
- All audit log access
- All settings write operations
- Department create/delete
- Transcript generation
- Destructive operations (hard deletes)

### 5. Add Admin Role Restrictions
- Department create/delete → `requireAdminRole(['system-admin'])`
- Staff/learner delete → `requireAdminRole(['system-admin', 'department-admin'])`
- Settings reset → `requireAdminRole(['system-admin'])`
- Hard deletes → `requireAdminRole()`

### 6. Implement Service Layer Scoping
- **Instructors:** Scope to own classes
- **Department-admin:** Scope to own department (with hierarchical subdepartment access)
- **Learners:** Scope to own data
- **Data Masking:** Apply "FirstName L." format for instructors and department-admins
- **Creator-based Editing:** Draft content editable by creator + department-admin only
- **Self-enrollment:** Check `allowSelfEnrollment` department setting

### 7. Test Each Endpoint
Test with:
- ✅ User with required right
- ❌ User without required right
- ✅ User with one of multiple required rights (OR logic)
- ✅ Admin with wildcard right
- ✅ Correct scoping applied (instructor sees only own classes, etc.)
- ✅ Data masking applied where required
- ✅ Creator-based editing enforced for drafts

### 8. Update Controller Documentation
Add access rights information to controller comments for each endpoint.

---

## Related Documents

- [Access Rights Documentation](../../docs/api/access-rights-v2.md)
- [Role System V2 Implementation Plan](../plans/Role_System_V2_Phased_Implementation.md)
- [Middleware Documentation](../../src/middlewares/README.md)
- [API Contracts](../../contracts/api/)
- [Department Settings Configuration](./Department_Settings.md)

---

**Last Updated:** 2026-01-11
**Approved By:** Product Owner
**Review Frequency:** After any route or access right changes
**Maintained By:** LMS Backend Team
