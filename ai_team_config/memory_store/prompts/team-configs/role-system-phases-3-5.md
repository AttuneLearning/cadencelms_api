# Team Config: Role System V2 Phases 3-5

**ID:** P-TEAM-003
**Type:** team-config
**Version:** 1.0
**Created:** 2026-01-18
**Status:** Complete
**Tags:** #prompt #team-config #role-system #authentication

## Team

| Field | Value |
|-------|-------|
| Name | LMS Backend Team - Role System V2 Phases 3-5 Completion |
| Description | Agent team for completing and testing Role System V2 Phases 3-5 |
| Reference | `devdocs/plans/Role_System_V2_Phased_Implementation.md` |

## Purpose

Complete and test Role System V2 authentication services, controllers, routes, and authorization middleware.

## Current State (at creation)

| Phase | Status |
|-------|--------|
| Phase 1 | Complete - Models and schemas exist |
| Phase 2 | Complete - Seed scripts exist |
| Phase 3 | Code exists, needs integration and testing |
| Phase 4 | Code exists, needs integration and testing |
| Phase 5 | Code exists, needs integration and testing |

## Agents

### Agent Phase 3: Integration Specialist

**Role:** Verify and fix Phase 3 authentication services integration

**Tasks:**
- P3-1: Verify and test AccessRightsService
- P3-2: Verify and test RoleService
- P3-3: Fix AuthService login V2 integration
- P3-4: Verify and test EscalationService
- P3-5: Verify and test DepartmentSwitchService

**Files to Verify:**
- `src/services/auth/access-rights.service.ts`
- `src/services/auth/role.service.ts`
- `src/services/auth/auth.service.ts`
- `src/services/auth/escalation.service.ts`
- `src/services/auth/department-switch.service.ts`

### Agent Phase 4: Integration Specialist

**Role:** Verify and fix Phase 4 controllers and routes

**Tasks:**
- P4-1: Verify and test auth.controller.ts
- P4-2: Verify and test roles.controller.ts
- P4-3: Verify and test access-rights.controller.ts
- P4-4: Fix auth routes integration
- P4-5: Fix roles routes integration
- P4-6: Fix access-rights routes integration

**Dependencies:** Blocked by Phase 3

### Agent Phase 5: Integration Specialist

**Role:** Verify and fix Phase 5 middleware and authorization

**Tasks:**
- P5-1: Verify and test require-department-membership.ts
- P5-2: Verify and test require-department-role.ts
- P5-3: Verify and test require-escalation.ts
- P5-4: Verify and test require-admin-role.ts
- P5-5: Verify and test require-access-right.ts
- P5-6: Fix isAuthenticated.ts V2 integration

**Dependencies:** Blocked by Phase 4

### Agent E2E: Integration Specialist

**Role:** Create end-to-end tests and final integration verification

**Tasks:**
- E2E-1: Fix and run role-system-e2e.test.ts
- E2E-2: Create E2E test for complete auth flow
- E2E-3: Create E2E test for role cascading
- E2E-4: Verify all phase gates met
- E2E-5: Create comprehensive implementation reports

**Dependencies:** Blocked by all phase agents

## Phase Gates

### Phase 3: Authentication Services Complete
- AccessRightsService fully functional
- RoleService fully functional
- AuthService returns V2 format
- EscalationService works correctly
- DepartmentSwitchService works correctly
- All unit tests passing, 85%+ coverage

### Phase 4: Controllers & Routes Complete
- Auth controller V2 methods work
- Roles controller fully functional
- Access-rights controller fully functional
- All routes properly integrated
- API matches contracts, 85%+ coverage

### Phase 5: Middleware & Authorization Complete
- All authorization middleware work
- Role cascading verified
- Department membership checks work
- Escalation requirements enforced
- Access right checks functional, 85%+ coverage

### Integration Complete
- All E2E tests passing
- Complete user flows verified
- No blocking issues
- Implementation reports created
- 90%+ overall coverage

## Known Issues (at creation)

- login-v2.test.ts: All 19 tests failing
- AccessRight validation errors: missing required fields
- Model import issues in tests
- Integration between services needs verification

## Known Fixes

- Add `type: 'access'` to JWT tokens
- Use named exports for Staff/Learner
- Use default export for GlobalAdmin
- Add resource/action to AccessRight seed data
- Use `_id` instead of `userId` in model creation

## Links

- Prompt registry: [[../prompt-registry]]
- Team configs index: [[index]]
- Original: `.claude/team-config-role-system-phases-3-5.json`
