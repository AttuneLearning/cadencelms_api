# Team Configuration Archive

This directory stores Claude team configurations for the LMS UI project.

## Active Configuration

**Current Team Config:** `team-config-BUG-IMPLEMENTATION.json`
- **Purpose:** Bug resolution and feature implementation from issue queue
- **Version:** 1.0.0
- **Workflow:** Issue-driven development with agent coordination

### Active Team Structure
- **bug-hunter:** P0-P1 bug fixes and critical issues
- **feature-builder:** P2-P3 feature implementation and UI enhancements  
- **integration-coordinator:** API integration and backend coordination
- **qa-validator:** Testing, quality assurance, validation

## Historical Configurations

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

**team-config-BUG-IMPLEMENTATION.json** (Current)
- Use for: Bug fixes, feature implementations, issue queue work
- Best for: Ongoing development and maintenance
- Coordination: Uses ISSUE_QUEUE.md and message threads

**team-config-ROLE-SYSTEM-V2.json** (Archive)
- Use for: Reference on role system architecture
- Contains: Detailed V2 auth implementation patterns
- Useful when: Understanding permission system design

**team-config-UI-AUTHORIZATION.json** (Archive)  
- Use for: Reference on security implementations
- Contains: Admin token handling, permission gates, session management
- Useful when: Working on auth-related features or security fixes

## Coordination System

The bug/implementation team config integrates with:

1. **Issue Queue:** `api/agent_coms/ui/ISSUE_QUEUE.md`
   - Human-provided issues with ISS-XXX identifiers
   - Priority-based workflow (P0-P3)
   
2. **Message Threads:** `api/agent_coms/messages/`
   - UI ↔ API coordination via markdown threads
   - Follow COORDINATION_STANDARD.md templates
   - Track active threads in ACTIVE_THREADS.md

3. **Message Log:** `api/agent_coms/ui/MESSAGE_LOG.md`
   - Agent change log for message folder
   - Rollback notes for all message operations

## File Structure

```
api/agent_coms/ui/teamconfigs/
├── README.md (this file)
├── settings.json (Claude settings)
├── team-config-BUG-IMPLEMENTATION.json (active)
├── team-config-ROLE-SYSTEM-V2.json (archive)
├── team-config-UI-AUTHORIZATION.json (archive)
└── team-config-ROLE-SYSTEM-V2-OLD.json (archive)
```

## Version History

- **v1.0.0** (Current) - Bug/Implementation team config with issue queue workflow
- **v3.0.0** (Archive) - UI Authorization phases 1 & 2
- **v2.0.0** (Archive) - Role System V2 parallel team implementation

## Notes

- Original configs remain in `.claude/` directory for backwards compatibility
- Team configs are copied to this directory for version control and documentation
- Each config represents a different development phase or workflow pattern
- Agents are specialized by priority and work type in the active config
