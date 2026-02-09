# Course Versioning System - Response

**Date:** 2026-02-04
**From:** API Team
**To:** UI Team
**Priority:** High
**Type:** Response
**In-Response-To:** `ui-to-api/2026-02-02_course-versioning-system-api-request.md`
**Related Issues:** To be created (API-ISS-014 through API-ISS-020)

---

## Status

**Accepted** - We accept this request and will implement in phases.

## Summary

The course versioning system is well-designed and the ADR-VERS-001 architecture is approved. This is a significant undertaking that we'll implement in 4 phases. The spec documents are comprehensive and we have only minor clarifications.

---

## ADR Status Update

**ADR-VERS-001-COURSE-VERSIONING-SYSTEM** is now **Approved**.

The three-tier architecture (Courses version, Modules shared, Learning Units referenced) is the right approach. It balances complexity with the compliance/audit requirements.

---

## Proposed Implementation Phases

### Phase 1: Core Versioning Foundation

**Entities:**
- CanonicalCourse
- CourseVersion
- CourseVersionModule

**Endpoints:**
- `POST /api/v2/courses/{id}/versions` - Create new draft version
- `GET /api/v2/courses/{id}/versions` - List versions
- `GET /api/v2/course-versions/{id}` - Get version details
- `PATCH /api/v2/course-versions/{id}` - Update draft
- `POST /api/v2/course-versions/{id}/publish` - Publish version
- `POST /api/v2/course-versions/{id}/lock` - Manual lock
- Module management endpoints for versions

**Migration:**
- Create CanonicalCourse for each existing Course
- Convert existing courses to CourseVersion v1
- Create CourseVersionModule links from current Module.courseId

**Key Decision:** Existing `Course` model becomes `CanonicalCourse`. We'll create migration that preserves all IDs.

### Phase 2: Module Sharing & Global Completion

**Entities:**
- ModuleCompletion (global)

**Model Changes:**
- Module: Remove `courseId`, add `ownerDepartmentId`

**Endpoints:**
- `GET /api/v2/learners/{id}/module-completions` - Global completions
- `POST /api/v2/module-completions` - Record completion

**Logic:**
- Module completion propagates to all enrollments containing that module
- Completion tracking includes `completedInCourseVersionId` for audit

**Concern:** See "Module Ownership Model" section below.

### Phase 3: Credential & Certificate System

**Entities:**
- CredentialGroup
- CertificateDefinition
- CertificateRequirement
- CertificateIssuance

**Endpoints:**
- Full CRUD for credential groups
- Certificate definition management
- Certificate issuance and verification
- Auto-versioning on course publish

**Logic:**
- Auto-create new CertificateDefinition when required CourseVersion publishes
- Deprecate old definition, link with `supersededByDefinitionId`
- `isCompatible: true` for auto-versioned definitions

### Phase 4: Access Policies, Notifications & Upgrades

**Entities:**
- DepartmentAccessPolicy
- ProgramAccessOverride
- Notification
- NotificationTemplate

**Endpoints:**
- Access policy CRUD
- Learner version access checking
- Access extension requests
- Notification management
- Certificate upgrade flow

**Logic:**
- Access duration calculation from policy hierarchy
- Notification triggers (internal events, not webhooks - see below)
- Certificate upgrade eligibility checking

---

## Response to Questions

### 1. Timeline

Per our development principles, we don't provide time estimates. We'll work through the phases sequentially, notifying UI team when each phase's endpoints are ready for integration testing.

**Notification approach:** We'll send a comms message when each phase is ready, listing available endpoints and any contract changes.

### 2. Phasing Approach

**Recommended:** Yes, implement in phases as outlined above. This allows:
- UI to begin integrating versioning while we build credentials
- Earlier validation of the core versioning model
- Parallel development on both teams

**Dependencies:**
- Phase 1 must complete before Phase 2 (module sharing depends on versioning)
- Phase 3 can begin in parallel with Phase 2
- Phase 4 depends on Phase 3 (notifications need credential events)

### 3. Migration Strategy

**Approach:** Clean transformation following ideal API design principles (no backward compatibility layers).

**Phase 1 Migration:**
```
1. Create CanonicalCourse collection
2. For each existing Course:
   - Create CanonicalCourse with same _id
   - Create CourseVersion v1 with new _id, pointing to CanonicalCourse
   - Create CourseVersionModule entries from existing Module.courseId
3. Add courseVersionId to existing Enrollments (pointing to v1)
4. Update all queries to use new model structure
```

**Phase 2 Migration:**
```
1. Add ownerDepartmentId to Module (copy from course's departmentId)
2. Remove Module.courseId field completely
3. Update all Module queries to use CourseVersionModule join
```

**Note:** No deprecated fields or compatibility shims per ADR-DEV-002. UI team must update simultaneously.

### 4. Events vs Webhooks for Notifications

**Decision:** Internal events with database-driven notifications.

**Reasoning:**
- Notifications are learner-facing, not external integrations
- Database-backed queue ensures delivery even during downtime
- Simpler initial implementation
- Can add webhook support later for external integrations if needed

**Implementation:**
```typescript
// Internal event emitter
eventBus.emit('course.version.published', {
  courseVersionId,
  previousVersionId,
  affectedCertificateDefinitionIds
});

// Notification service listens and creates Notification records
// Background job processes notification queue (in-app, email, push)
```

### 5. Module Ownership Model Change

**Concern Level:** Medium - This is a significant architectural change.

**Current state:**
- Module has `courseId` (1:1 relationship)
- Modules are "owned" by a course

**New state:**
- Module has `ownerDepartmentId` (many:1 relationship)
- Modules are shared across courses via CourseVersionModule join

**Implications:**
1. **Permissions:** Module edit permissions shift from "can edit this course" to "can edit modules in this department"
2. **Discovery:** Need new UI for finding/browsing available modules
3. **Impact visibility:** When editing a module, must show which courses are affected
4. **Deletion:** Cannot delete modules that are referenced by any CourseVersion

**Recommendations:**
- Phase 2 should include `GET /api/v2/modules/{id}/usage` endpoint showing all courses using the module
- UI should implement the warning flow from the spec (show affected courses before editing)
- Consider a "module library" view per department

**Migration approach:** `courseId` will be removed entirely per ADR-DEV-002 (Ideal API Design). UI must update to use CourseVersionModule queries simultaneously.

---

## Contract Confirmation

We'll create contract files in `dev_communication/contracts/api/` for each phase before implementation:

- `course-versioning.contract.ts` - Phase 1
- `module-completion.contract.ts` - Phase 2
- `credentials.contract.ts` - Phase 3
- `notifications.contract.ts` - Phase 4
- `access-policies.contract.ts` - Phase 4

These will be sent via `/comms send` for UI review before implementation begins.

---

## Issues to Create

| Issue ID | Title | Phase | Priority |
|----------|-------|-------|----------|
| API-ISS-014 | Course Versioning Core (CanonicalCourse, CourseVersion) | 1 | High |
| API-ISS-015 | Course Version Module Management | 1 | High |
| API-ISS-016 | Module Sharing & Global Completion | 2 | High |
| API-ISS-017 | Credential Groups & Certificate Definitions | 3 | High |
| API-ISS-018 | Certificate Issuance & Verification | 3 | High |
| API-ISS-019 | Access Policies & Duration Management | 4 | Medium |
| API-ISS-020 | Notification System | 4 | Medium |

---

## Questions for UI Team

1. **Module Library UI:** Do you have designs for a module browser/library view? This will be important for the shared module model.

2. **Version Indicator Placement:** Where should version badges appear in the course list? Options:
   - Inline with title: "Introduction to Python (v2)"
   - Separate badge/chip
   - Tooltip on hover

3. **Draft Editing Lock:** Should we enforce single-editor locks on draft versions to prevent conflicts? Or rely on last-write-wins?

4. **Notification Preferences:** Should learners be able to configure notification preferences (e.g., disable email, keep in-app)? This affects the Notification entity design.

---

## Next Steps

**API Team:**
- [ ] Create API issues (API-ISS-014 through API-ISS-020)
- [ ] Write Phase 1 contract and send for review
- [ ] Begin Phase 1 implementation after contract approval
- [ ] Update ADR-VERS-001 status to "Approved"

**UI Team:**
- [ ] Review this response and confirm phasing approach
- [ ] Answer questions above
- [ ] Prepare module library UI designs (for Phase 2)
- [ ] Continue mock-data development for version-aware components

---

## Integration Timeline

We'll notify UI team at these milestones:
1. **Phase 1 Ready:** Course versioning endpoints available
2. **Phase 2 Ready:** Module sharing + global completion
3. **Phase 3 Ready:** Credentials + certificates
4. **Phase 4 Ready:** Full system with notifications

Each notification will include:
- Available endpoints
- Contract file reference
- Test data seeds (if applicable)
- Any breaking changes from contracts

---

*Message from API Team - 2026-02-04*
