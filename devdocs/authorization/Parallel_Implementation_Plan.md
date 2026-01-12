# Authorization Implementation - Parallel Team Plan

**Date:** 2026-01-11
**Team Size:** 5 agents working in parallel
**Estimated Duration:** 2-4 hours (parallel execution)
**Sequential Duration:** 12-18 hours (if done sequentially)

---

## Overview

This plan divides the authorization implementation work across 5 specialized agents who can work in parallel on independent route domains. Each agent is responsible for applying middleware to their assigned routes and implementing service layer changes.

**Total scope:** ~170 routes across 26 route files + admin role management system

---

## Team Structure

### Agent 1: Content & Courses Specialist
**Domain:** Content and Course Management
**Route Files:** 4 files, ~41 routes
**Estimated Time:** 2-3 hours

**Responsibilities:**
- Apply authorization middleware to content routes
- Apply authorization middleware to courses routes
- Implement course visibility rules (draft/published/archived)
- Implement creator-based editing logic
- Create course service scoping utilities

**Files to Modify:**
```
src/routes/
├── content.routes.ts          (15 routes)
├── courses.routes.ts          (14 routes)
├── course-segments.routes.ts  (6 routes)
└── questions.routes.ts        (6 routes)

src/services/
├── content/content.service.ts
├── academic/courses.service.ts
├── academic/course-segments.service.ts
└── content/questions.service.ts
```

**Key Implementations:**
- Draft course visibility (all department members)
- Creator-based editing (drafts editable by creator + department-admin)
- Published course editing (department-admin only)
- Department scoping for course/question lists

---

### Agent 2: Academic & Enrollment Specialist
**Domain:** Academic Programs and Enrollment Management
**Route Files:** 4 files, ~39 routes
**Estimated Time:** 2-3 hours

**Responsibilities:**
- Apply authorization middleware to classes, programs, departments, enrollments routes
- Implement self-enrollment setting check
- Implement class roster data masking (FirstName L.)
- Create enrollment service scoping utilities

**Files to Modify:**
```
src/routes/
├── classes.routes.ts         (10 routes)
├── programs.routes.ts        (10 routes)
├── departments.routes.ts     (9 routes)
└── enrollments.routes.ts     (10 routes)

src/services/
├── academic/classes.service.ts
├── academic/programs.service.ts
├── departments/departments.service.ts
└── enrollment/enrollments.service.ts
```

**Key Implementations:**
- Self-enrollment setting check (`allowSelfEnrollment`)
- Class roster data masking for instructors
- Instructor class scoping (own classes only)
- Department hierarchy scoping for programs

---

### Agent 3: User Management Specialist
**Domain:** Staff and Learner Management
**Route Files:** 3 files, ~13 routes
**Estimated Time:** 2-3 hours

**Responsibilities:**
- Apply authorization middleware to staff, learners, users routes
- Implement data masking utility (FirstName L.)
- Implement hierarchical department scoping utility
- FERPA compliance for all learner operations

**Files to Modify:**
```
src/routes/
├── staff.routes.ts           (6 routes)
├── learners.routes.ts        (5 routes)
└── users.routes.ts           (2 routes)

src/services/
├── users/staff.service.ts
├── users/learners.service.ts
└── users/users.service.ts

src/utils/
├── dataMasking.ts            (NEW - shared utility)
└── departmentHierarchy.ts    (NEW - shared utility)
```

**Key Implementations:**
- **Data Masking Utility:** `maskLastName()` function
- **Department Hierarchy Utility:** `getDepartmentAndSubdepartments()` function
- Hierarchical scoping (top-level members see all subdepartments)
- Instructor scoping (enrolled learners only)
- FERPA-compliant data access

---

### Agent 4: Analytics & Reporting Specialist
**Domain:** Progress Tracking and Reporting
**Route Files:** 2 files, ~16 routes
**Estimated Time:** 2-3 hours

**Responsibilities:**
- Apply authorization middleware to progress and reports routes
- Implement instructor class filtering for progress
- Implement department-scoped transcript filtering
- Create progress/reporting scoping utilities

**Files to Modify:**
```
src/routes/
├── progress.routes.ts        (8 routes)
└── reports.routes.ts         (8 routes)

src/services/
├── analytics/progress.service.ts
└── reporting/reports.service.ts
```

**Key Implementations:**
- Instructor progress filtering (own classes only)
- Department-admin transcript filtering (department courses only)
- Progress report scoping by role
- Data masking in reports

---

### Agent 5: System & Infrastructure Specialist
**Domain:** System Administration and Shared Infrastructure
**Route Files:** 3 files, ~31 routes + utilities
**Estimated Time:** 3-4 hours

**Responsibilities:**
- Apply authorization middleware to settings, audit logs, and admin routes
- **CREATE new admin role management routes** (system-admin only)
- Implement settings read-only access for instructors
- Ensure audit log escalation requirements
- **Implement role assignment management service**
- Create integration tests for all authorization

**Files to Modify:**
```
src/routes/
├── settings.routes.ts        (6 routes)
├── audit-logs.routes.ts      (5 routes)
└── admin.routes.ts           (20 routes - NEW)

src/controllers/
└── admin/admin.controller.ts (NEW)

src/services/
├── system/settings.service.ts
├── system/audit-logs.service.ts
└── admin/role-management.service.ts (NEW)

contracts/api/
└── admin-roles.contract.ts   (NEW - already created)

tests/integration/middleware/
├── authorization.test.ts     (EXPAND)
├── data-masking.test.ts      (NEW)
├── department-scoping.test.ts (NEW)
└── creator-editing.test.ts   (NEW)

tests/integration/admin/
└── role-management.test.ts   (NEW)
```

**Key Implementations:**
- Settings read-only for instructors
- Audit log escalation enforcement
- **Admin role assignment routes (system-admin only)**
- **Global admin management routes**
- **Role definition management routes**
- **Bulk role assignment operations**
- **User search for role assignment**
- Integration test suite for authorization
- Test helpers for common authorization patterns

---

## Parallel Execution Plan

### Phase 1: Route Middleware Application (Parallel - 2 hours)

All agents work simultaneously on their assigned route files.

**Agent 1:** Content & Courses routes
**Agent 2:** Academic & Enrollment routes
**Agent 3:** User Management routes
**Agent 4:** Analytics & Reporting routes
**Agent 5:** System Administration routes

**Deliverables:**
- All route files have authorization middleware applied
- All middleware imports added
- All endpoints protected with `requireAccessRight()`
- Sensitive endpoints protected with `requireEscalation`
- Admin-only endpoints protected with `requireAdminRole()`

---

### Phase 2: Service Layer Implementation (Parallel - 1-2 hours)

All agents work simultaneously on their service layer changes.

**Agent 1:** Course visibility, creator-based editing
**Agent 2:** Self-enrollment check, class roster masking
**Agent 3:** Data masking utility, department hierarchy utility
**Agent 4:** Progress filtering, transcript filtering
**Agent 5:** Settings access, audit log enforcement

**Deliverables:**
- All service layer scoping implemented
- Data masking applied where required
- Department hierarchy scoping working
- Creator-based editing enforced
- Self-enrollment setting checked

---

### Phase 3: Integration & Testing (Sequential - 1 hour)

**Agent 5 leads**, all agents support.

1. Run full integration test suite
2. Fix any authorization test failures
3. Verify E2E flows work correctly
4. Create test coverage report

**Deliverables:**
- All integration tests passing
- 85%+ authorization test coverage
- E2E test scenarios validated
- Test coverage report generated

---

### Phase 4: Documentation & Cleanup (Parallel - 30 min)

All agents update documentation for their domains.

**Deliverables:**
- Controller comments updated
- Service layer documentation updated
- API documentation reflects authorization
- Implementation notes documented

---

## Coordination Points

### Shared Dependencies

**Data Masking Utility** (Agent 3 creates, others use)
- Created by: Agent 3
- Used by: Agent 2, Agent 4
- Location: `src/utils/dataMasking.ts`

**Department Hierarchy Utility** (Agent 3 creates, others use)
- Created by: Agent 3
- Used by: Agent 1, Agent 2, Agent 4
- Location: `src/utils/departmentHierarchy.ts`

### Sync Points

**Sync Point 1:** After Phase 1 (Route Middleware)
- All agents commit route changes
- Quick review of middleware application patterns
- Ensure consistency across route files

**Sync Point 2:** After Phase 2 (Service Layer)
- Agent 3 confirms utilities are ready
- Other agents confirm utility integration
- Quick review of service layer changes

**Sync Point 3:** After Phase 3 (Testing)
- Agent 5 shares test results
- All agents review failures in their domain
- Coordinate fixes if needed

---

## Agent Handoff Protocol

### Agent 3 → Others (Utilities)

**When:** After Agent 3 completes utility creation (30-45 min into Phase 2)

**Agent 3 announces:**
```
✅ Data masking utility ready: src/utils/dataMasking.ts
   - maskLastName(user, viewer)
   - maskUserList(users, viewer)

✅ Department hierarchy utility ready: src/utils/departmentHierarchy.ts
   - getDepartmentAndSubdepartments(deptId)
   - isTopLevelDepartmentMember(userId, deptId)

Other agents can now import and use these utilities.
```

**Other agents respond:**
- Agent 2: "Integrating data masking into class roster service"
- Agent 4: "Integrating department hierarchy into progress service"

---

## Testing Strategy

### Agent-Specific Tests

**Agent 1:**
- Test course visibility (draft/published/archived)
- Test creator-based editing
- Test department scoping for courses

**Agent 2:**
- Test self-enrollment setting enforcement
- Test class roster data masking
- Test instructor class scoping

**Agent 3:**
- Test data masking utility
- Test department hierarchy utility
- Test FERPA compliance

**Agent 4:**
- Test instructor progress filtering
- Test department-admin transcript scoping
- Test report data masking

**Agent 5:**
- Test settings read-only for instructors
- Test audit log escalation
- Coordinate full integration test suite

### Shared Integration Tests

All agents contribute test cases to:
```
tests/integration/middleware/authorization.test.ts
```

Test format:
```typescript
describe('Authorization - [Domain Name]', () => {
  describe('[Endpoint Name]', () => {
    it('should allow access with correct role', async () => { ... });
    it('should deny access without required role', async () => { ... });
    it('should apply correct scoping', async () => { ... });
    it('should mask data when required', async () => { ... });
  });
});
```

---

## Success Criteria

### Phase 1 Complete
- [ ] All 25 route files have middleware applied
- [ ] All imports added correctly
- [ ] All endpoints have `requireAccessRight()` per mapping
- [ ] All sensitive endpoints have `requireEscalation`
- [ ] All admin-only endpoints have `requireAdminRole()`

### Phase 2 Complete
- [ ] Data masking utility created and integrated
- [ ] Department hierarchy utility created and integrated
- [ ] Course visibility rules implemented
- [ ] Creator-based editing implemented
- [ ] Self-enrollment setting check implemented
- [ ] Instructor class scoping implemented
- [ ] Department scoping implemented

### Phase 3 Complete
- [ ] 85%+ test coverage for authorization
- [ ] All integration tests passing
- [ ] E2E scenarios validated
- [ ] No 403 errors for authorized users
- [ ] Consistent 403 errors for unauthorized users

### Phase 4 Complete
- [ ] All controller comments updated
- [ ] Service layer documentation updated
- [ ] API documentation reflects authorization
- [ ] Implementation notes in devdocs/

---

## Risk Mitigation

### Risk: Utility not ready when others need it
**Mitigation:** Agent 3 creates utilities FIRST in Phase 2 (priority task)
**Fallback:** Other agents implement temporary inline logic, refactor later

### Risk: Test failures block progress
**Mitigation:** Agent 5 monitors tests continuously, identifies issues early
**Fallback:** Agents fix their own domain issues in parallel

### Risk: Inconsistent middleware application
**Mitigation:** Sync Point 1 review ensures consistency
**Fallback:** Agent 5 does final consistency pass

### Risk: Merge conflicts
**Mitigation:** Each agent works on separate files (no overlap)
**Fallback:** Sequential merge if conflicts occur

---

## Communication Protocol

### Status Updates

Each agent provides updates at:
- Phase start (what they're working on)
- Phase completion (what they've delivered)
- Blockers encountered (requesting help)

**Format:**
```
[Agent N] Phase 1 Start: Working on [route files]
[Agent N] Phase 1 Complete: ✅ X routes protected, Y endpoints with escalation
[Agent N] Blocker: Need utility Z from Agent 3
```

### Handoff Messages

**Format:**
```
[Agent 3] ✅ Utility Ready: src/utils/dataMasking.ts
  - Function: maskLastName(user, viewer)
  - Usage: import { maskLastName } from '@/utils/dataMasking';
  - Example: const masked = maskLastName(learner, instructor);
```

---

## Rollback Plan

If critical issues arise:

1. **Revert route middleware:** Each agent reverts their route changes
2. **Revert service layer:** Each agent reverts their service changes
3. **Revert utilities:** Agent 3 reverts utility additions
4. **Revert tests:** Agent 5 reverts test additions

All changes are isolated to agent-specific files, making rollback straightforward.

---

## Estimated Timeline

**Total Parallel Time:** 2-4 hours
**Total Sequential Time:** 12-18 hours
**Efficiency Gain:** 3-4.5x faster

### Breakdown
- Phase 1: 2 hours (parallel)
- Phase 2: 1-2 hours (parallel)
- Phase 3: 1 hour (sequential)
- Phase 4: 30 min (parallel)

---

## Next Steps

1. Review this plan with team
2. Assign agents to roles
3. Create team configuration file
4. Launch agents in parallel
5. Monitor progress at sync points
6. Coordinate testing and cleanup

---

## Related Documents

- [Route Authorization Mapping](./Route_Authorization_Mapping.md) - Complete reference for each agent
- [Implementation Summary](./Implementation_Summary.md) - Detailed code examples
- [Team Configuration](../../.claude/team-config-authorization-implementation.json) - Agent configurations

---

**Ready to execute?** Load the team configuration and launch all 5 agents in parallel!
