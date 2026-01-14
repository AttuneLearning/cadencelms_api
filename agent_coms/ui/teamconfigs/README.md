# Team Configuration Archive

This directory stores Claude team configurations for the LMS UI project.

## Active Configuration

**Current Team Config:** `team-config-ISS-010-PROFILE-FORMS.json`
- **Purpose:** ISS-010 implementation - PersonExtended & Demographics profile forms
- **Version:** 1.0.0
- **Workflow:** Three-phase parallel development with specialized agents
- **Estimated Duration:** 9 hours (with parallelization) vs 21 hours (sequential)

### Active Team Structure (ISS-010 Focused)
- **infrastructure-specialist:** Foundation building (Phase 1) and integration (Phase 3)
- **staff-profile-specialist:** Staff extended + demographics sections (Phase 2, parallel)
- **learner-profile-specialist:** Learner extended + demographics sections (Phase 2, parallel)

### Team Phases
1. **Phase 1 (5 hrs):** Foundation - types, API hooks, shared components
2. **Phase 2 (6-7 hrs):** Parallel development - 31 total sections (14 staff + 17 learner)
3. **Phase 3 (2 hrs):** Integration, mobile responsive, accessibility polish

## Historical Configurations

### team-config-BUG-IMPLEMENTATION-GENERAL.json
- **Purpose:** General bug resolution and feature implementation from issue queue
- **Status:** Available for general development work
- **Version:** 1.0.0
- **Agents:** issue-coordinator, bug-hunter, feature-builder, integration-coordinator, qa-validator
- **Workflow:** Issue-driven development with TDD practices
- **Key Features:**
  - Priority-based issue assignment (P0-P3)
  - API coordination via message threads
  - Test-driven development (RED-GREEN-REFACTOR)
  - Minimum 70% test coverage requirement
  - Regression testing before completion

### team-config-BUG-IMPLEMENTATION.json
- **Purpose:** Original general bug/implementation team (duplicate, pre-rename)
- **Status:** Superseded by team-config-BUG-IMPLEMENTATION-GENERAL.json
- **Note:** Kept for backwards compatibility

### team-config-ROLE-SYSTEM-V2.json
- **Purpose:** Role System V2 Implementation (5-agent parallel team)
- **Status:** Completed
- **Version:** 2.0.0
- **Agents:** auth-agent, nav-agent, ui-agent, entity-agent, qa-agent
- **Key Deliverables:** 
  - V2 auth types (UserType, DepartmentMembership, AccessRights)
  - Navigation with department scoping
  - Permission-aware UI components
  - Route guards and protected routing

### team-config-UI-AUTHORIZATION.json
- **Purpose:** UI Authorization Implementation - Phases 1 & 2 (Security + Core Components)
- **Status:** Completed
- **Version:** 3.0.0
- **Focus Areas:**
  - Phase 1: Critical Security (admin token memory storage, XSS vulnerability fixes)
  - Phase 2: Core Components (PermissionGate, AdminEscalationModal, session management)
- **Key Deliverables:**
  - Memory-only admin token storage
  - Permission-based component rendering
  - Admin session timer with auto-timeout
  - Protected routing with granular permission checks

### team-config-ROLE-SYSTEM-V2-OLD.json
- **Purpose:** Original Role System V2 configuration (archived/superseded)
- **Status:** Archived
- **Version:** 2.0.0
- **Note:** Earlier version of role system implementation, kept for reference

## Configuration Usage

### Loading a Team Config in Claude Desktop

1. Open Claude Desktop settings
2. Navigate to team configuration
3. Select the appropriate config file from this directory
4. Claude will load the agent roles, responsibilities, and coordination rules

### When to Use Each Config

**team-config-ISS-010-PROFILE-FORMS.json** (Active)
- Use for: ISS-010 profile forms implementation only
- Best for: Implementing the 31 profile sections (staff + learner extended + demographics)
- Working Directory: STRICTLY enforced to `/home/adam/github/cadencelms_ui`
- Coordination: Three-phase workflow with Phase 1 → Phase 2 (parallel) → Phase 3
- Duration: 9 hours with parallelization (vs 21 hours sequential)

**team-config-BUG-IMPLEMENTATION-GENERAL.json** (Available)
- Use for: General bug fixes, feature implementations, issue queue work
- Best for: Ongoing development and maintenance after ISS-010
- Coordination: Uses ISSUE_QUEUE.md and message threads
- TDD workflow with minimum 70% test coverage

**team-config-ROLE-SYSTEM-V2.json** (Archive)
- Use for: Reference on role system architecture
- Contains: Detailed V2 auth implementation patterns
- Useful when: Understanding permission system design

**team-config-UI-AUTHORIZATION.json** (Archive)
- Use for: Reference on security implementations
- Contains: Admin token handling, permission gates, session management
- Useful when: Working on auth-related features or security fixes

## Coordination System

**ISS-010 Team Config** uses:
1. **Issue Specification:** `api/agent_coms/ui/specs/ISS-010_PERSON_EXTENDED_FORMS.md`
   - Detailed field specifications for all 31 sections
   - Validation rules, UI components, accessibility requirements

2. **Phase Transitions:** Documented in MESSAGE_LOG.md
   - Phase 1 Complete notification triggers Phase 2 start
   - Phase 2 Complete notification triggers Phase 3

3. **API Coordination:** `api/agent_coms/messages/`
   - Create threads if endpoints missing
   - Follow COORDINATION_STANDARD.md templates

**General bug/implementation team** integrates with:

1. **Issue Queue:** `api/agent_coms/ui/ISSUE_QUEUE.md`
   - Human-provided issues with ISS-XXX identifiers
   - Priority-based workflow (P0-P3)

## File Structure

```
api/agent_coms/ui/teamconfigs/
├── README.md (this file)
├── settings.json (Claude settings)
├── team-config-ISS-010-PROFILE-FORMS.json (ACTIVE - ISS-010 focused)
├── team-config-BUG-IMPLEMENTATION-GENERAL.json (available for general work)
├── team-config-BUG-IMPLEMENTATION.json (superseded, kept for compatibility)
├── team-config-UI-AUTHORIZATION.json (archive)
├── team-config-ROLE-SYSTEM-V2.json (archive)
└── team-config-ROLE-SYSTEM-V2-OLD.json (archive)
```

## Version History

- **v1.0.0** (2026-01-13 - ACTIVE) - ISS-010 Profile Forms team with 3-phase parallel workflow
- **v1.0.0** (2026-01-12 - Available) - General Bug/Implementation team config with issue queue workflow
- **v3.0.0** (Archive) - UI Authorization phases 1 & 2
- **v2.0.0** (Archive) - Role System V2 parallel team implementation

## Notes

- Original configs remain in `.claude/` directory for backwards compatibility
- Team configs are copied to this directory for version control and documentation
- Each config represents a different development phase or workflow pattern
- Agents are specialized by priority and work type in the active config

### ISS-010 Team Config Special Notes

- **Working Directory Enforcement:** STRICTLY enforced to `/home/adam/github/cadencelms_ui`
  - All file operations MUST be within this directory
  - No access to parent directories or sibling projects
  - Prevents accidental modifications to wrong codebase

- **Focused Scope:** This team is ONLY for ISS-010 implementation
  - Will not work on other issues in the queue
  - Single-purpose team for maximum efficiency

- **Parallelization Strategy:**
  - Phase 1: Sequential (foundation must be complete first)
  - Phase 2: Maximum parallelization (2 agents work simultaneously)
  - Phase 3: Sequential (integration requires Phase 2 completion)

- **Estimated Completion:** 9 hours with parallelization vs 21 hours sequential
  - 2.3x efficiency gain through strategic parallel work
