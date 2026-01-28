# Team Config: Authorization Implementation

**ID:** P-TEAM-004
**Type:** team-config
**Version:** 1.0
**Created:** 2026-01-20
**Status:** Complete
**Tags:** #prompt #team-config #authorization #middleware #parallel

## Team

| Field | Value |
|-------|-------|
| Name | LMS Backend Team - Authorization Implementation |
| Description | Parallel team for implementing Role System V2 authorization middleware across all route files |
| Agents | 5 parallel specialists |
| Efficiency | 3-4.5x faster than sequential |

## Purpose

Apply authorization middleware to all route files using parallel agent execution. Create shared utilities for data masking and department hierarchy.

## Timeline

| Phase | Duration | Mode |
|-------|----------|------|
| Phase 1: Route Middleware | 2 hours | Parallel |
| Phase 2: Service Layer | 1-2 hours | Parallel |
| Phase 3: Integration & Testing | 1 hour | Sequential |
| Phase 4: Documentation | 30 min | Parallel |
| **Total** | **2-4 hours** | (vs 12-18 hours sequential) |

## Agents

### Agent 1: Content & Courses Specialist

**Domain:** Content and Course Management (41 routes)

**Files:**
- `content.routes.ts` (15 routes)
- `courses.routes.ts` (14 routes)
- `course-segments.routes.ts` (6 routes)
- `questions.routes.ts` (6 routes)

**Service Work:**
- Course visibility rules (draft/published/archived)
- Creator-based editing logic
- Department scoping

### Agent 2: Academic & Enrollment Specialist

**Domain:** Academic Programs and Enrollment (39 routes)

**Files:**
- `classes.routes.ts` (10 routes)
- `programs.routes.ts` (10 routes)
- `departments.routes.ts` (9 routes)
- `enrollments.routes.ts` (10 routes)

**Service Work:**
- Self-enrollment setting check
- Class roster data masking (FirstName L.)
- Instructor class scoping

### Agent 3: User Management & Utilities Specialist

**Domain:** Staff/Learner Management + Shared Utilities (13 routes)
**Priority:** HIGH - Other agents depend on utilities

**Files:**
- `staff.routes.ts` (6 routes)
- `learners.routes.ts` (5 routes)
- `users.routes.ts` (2 routes)

**Creates:**
- `src/utils/dataMasking.ts`
- `src/utils/departmentHierarchy.ts`

### Agent 4: Analytics & Reporting Specialist

**Domain:** Progress Tracking and Reporting (16 routes)

**Files:**
- `progress.routes.ts` (8 routes)
- `reports.routes.ts` (8 routes)

**Service Work:**
- Instructor class filtering for progress
- Department-scoped transcript filtering

### Agent 5: System & Infrastructure Specialist

**Domain:** System Admin + Integration Testing (31 routes)
**Priority:** CRITICAL - Coordinates testing

**Files:**
- `settings.routes.ts` (6 routes)
- `audit-logs.routes.ts` (5 routes)
- `admin.routes.ts` (20 routes - NEW)

**Creates:**
- Admin role management routes
- Integration test suite
- Test helpers

## Shared Utilities

### Data Masking (Agent 3 creates)

```typescript
// src/utils/dataMasking.ts
maskLastName(user: IUser, viewer: IUser): IUser
maskUserList(users: IUser[], viewer: IUser): IUser[]
```

Used by: Agents 2, 4

### Department Hierarchy (Agent 3 creates)

```typescript
// src/utils/departmentHierarchy.ts
getDepartmentAndSubdepartments(deptId: string): Promise<string[]>
isTopLevelDepartmentMember(userId: string, deptId: string): Promise<boolean>
```

Used by: Agents 1, 2, 4

## Key Business Rules

1. Draft courses visible to all department members, editable by creator + department-admin only
2. Learners NOT department-limited, can see published courses across all departments
3. Department hierarchy: Top-level members see all subdepartments
4. Data masking: FirstName L. for instructors and department-admin (except enrollment-admin)
5. Self-enrollment: Controlled by department setting `allowSelfEnrollment`
6. Instructor scoping: Only see their own classes/enrolled learners
7. Creator-based editing: Draft content editable by creator + department-admin
8. Audit logs: Admin-only, requires escalation

## Middleware Pattern

```typescript
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';

// Standard route
requireAccessRight('domain:resource:action')

// Admin-only route
requireEscalation + requireAdminRole() + requireAccessRight()

// Multiple rights (OR logic)
requireAccessRight(['right1', 'right2'])
```

## Sync Points

| Sync | When | Purpose | Lead |
|------|------|---------|------|
| Sync 1 | After Phase 1 | Review middleware patterns | All |
| Sync 2 | After Phase 2 | Confirm utilities ready | Agent 3 |
| Sync 3 | After Phase 3 | Share test results | Agent 5 |

## Success Criteria

### Phase 1
- All 25 route files have middleware applied
- All endpoints have `requireAccessRight()` per mapping
- All sensitive endpoints have `requireEscalation`

### Phase 2
- Data masking utility created and integrated
- Department hierarchy utility created
- All business rules implemented in services

### Phase 3
- 85%+ test coverage for authorization
- All integration tests passing
- E2E scenarios validated

## Links

- Prompt registry: [[../prompt-registry]]
- Team configs index: [[index]]
- Original: `.claude/team-config-authorization-implementation.json`
