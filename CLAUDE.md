# CadenceLMS API - Claude Code Instructions

## Development Principles

**Read:** `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md`

**Key Rule:** Unless otherwise specified, always design for the ideal API/route structure. No backward compatibility layers, deprecated fields, or legacy fallbacks unless explicitly requested.

---

## Project Overview

CadenceLMS is a Learning Management System API built with Node.js, Express, TypeScript, and MongoDB.

## Dev Communication

**Location:** `./dev_communication/`
**Skill:** `/comms`

Inter-team communication hub for API ↔ UI coordination:
- **Messages:** `messaging/api-to-ui/` (outbox), `messaging/ui-to-api/` (inbox)
- **Issues:** `issues/api/{queue,active,completed}/`
- **Status:** `coordination/api-team-status.md`

Use `/comms` skill for:
- `/comms` or `/comms check` - Check inbox and pending issues
- `/comms send` - Send message to UI team
- `/comms issue` - Create new issue
- `/comms status` - Update team status
- `/comms move` - Move issue through lifecycle

After completing cross-team work, consider notifying UI team via `/comms send`.

---

## Architecture Decisions

**Location:** `dev_communication/architecture/` (shared via symlink between projects)
**Skill:** `/adr`

Architecture Decision Records (ADRs) document significant technical decisions.

Use `/adr` skill for:
- `/adr` - Show status (ADRs, gaps, suggestions)
- `/adr check` - Full traversal and gap analysis
- `/adr gaps` - View known gaps
- `/adr suggest` - Create suggestion for review
- `/adr poll` - Scan messages/issues for architecture concerns
- `/adr create` - Create new ADR
- `/adr review` - Review/update existing ADR

### Supervisor Feedback Loop

After completing significant work, consider:
1. Did this establish a new pattern? → `/adr suggest`
2. Did this resolve a design issue? → `/adr suggest`
3. Does this affect the other team? → `/comms send` + `/adr suggest`

See `dev_communication/coordination/supervisor-protocol.md` for full protocol.

---

## Memory Vault

**Location:** `./memory/`

This project has an Obsidian-compatible extended memory vault. Use it to:

1. **Reference context** - Check `memory/context/` for project background
2. **Look up entities** - Check `memory/entities/` for system/component documentation
3. **Follow patterns** - Check `memory/patterns/` for established conventions
4. **Review history** - Check `memory/sessions/` for past session decisions
5. **Use prompts** - Check `memory/prompts/` for tracked prompts and team configs

### On Session Start

Before starting work, consider reading relevant memory files:
- `memory/context/project-overview.md` - Project fundamentals
- `memory/context/tech-stack.md` - Technologies used
- `memory/patterns/` - Established patterns to follow
- `memory/prompts/prompt-registry.md` - Available prompts and team configs

### During Work

When you discover something important or make a significant decision:
- Add new entities to `memory/entities/`
- Document new patterns in `memory/patterns/`
- Note discoveries in session files

### On Session End

For significant sessions, create a session summary:
- Use template: `memory/templates/session-template.md`
- Save to: `memory/sessions/YYYY-MM-DD-brief-title.md`
- Update: `memory/memory-log.md`

## Development Standards

### Contract First (CF1)
**All development is contract-first.** Unless explicitly specified otherwise:
- Define the API contract/interface before implementation
- Both UI and API teams develop against agreed contracts
- No implementation begins without a documented contract
- Post contracts to `dev_communication/messaging/` for cross-team agreement

### Ideal Design First (I1)
**Always design for ideal structure.** See Development Principles section above.
- No backward compatibility unless explicitly requested
- No technical debt shortcuts or deprecated field shims
- Update callers rather than adding compatibility layers
- Key ADRs: DEV-002 (ideal design), API-001 (endpoints), DATA-001 (models), AUTH-001 (permissions)

### Naming Conventions (N1)
**Use specific, non-colliding names:**
- Check for existing names before creating new components/files
- Staff vs Admin pages may share concepts - use specific prefixes
- Examples:
  - `DepartmentProgramsPage` not `DepartmentManagementPage`
  - `LearnerCoursesWidget` not `CoursesWidget`
  - `AdminUserService` not `UserService` (if both exist)
- Search codebase before naming: `grep -r "ComponentName" src/`

### Golden Rule
**Never invent API values.** Always verify endpoint paths, field names, and permission strings exist before using them. When uncertain, ask or check contracts.

---

## Code Conventions

### Path Aliases
Use `@/` for imports from `src/`:
```typescript
import { User } from '@/models/User.model';
import { ApiError } from '@/utils/ApiError';
```

### API Endpoints
- Version: `/api/v2/`
- Department-scoped: `/api/v2/departments/:departmentId/[resource]`
- See `memory/patterns/department-scoping.md`

### Testing
- Integration tests: `tests/integration/`
- Use `describeIfMongo` helper for MongoDB-dependent tests
- Run: `npx jest tests/integration/[path]`

### Models
- Location: `src/models/`
- Soft delete: Use `isDeleted` or `isActive` fields
- Timestamps: Include `createdAt`, `updatedAt`

### Services
- Location: `src/services/`
- Business logic lives here, not in controllers
- Department-scoped methods take `departmentId` as first param

## Agent Communication

Inter-agent messages: `agent_coms/messages/`
- Format: `YYYY-MM-DD_[from]_[subject].md`
- API team prefix: `api_`
- UI team prefix: `ui_`

## Key Directories

```
src/
  controllers/     # Route handlers (thin)
  services/        # Business logic
  models/          # Mongoose schemas
  routes/          # Express routes
  middlewares/     # Auth, validation
  validators/      # Request validation (Joi)
  utils/           # Shared utilities

tests/
  integration/     # API integration tests
  unit/            # Unit tests

scripts/           # CLI scripts, migrations, seeds

memory/            # Extended memory vault (Obsidian)

dev_communication/ # Shared inter-team hub (symlinked in UI project)
  issues/          # Issue tracking
  messaging/       # Cross-team messages
  architecture/    # ADRs, suggestions, gaps
  coordination/    # Team status, dependencies

agent_coms/        # Legacy inter-agent communication
  messages/        # Messages between agents
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server

# Testing
npm test                 # Run all tests
npx jest [path]          # Run specific tests

# Build
npm run build            # TypeScript compilation

# Scripts
npx ts-node scripts/[script].ts
```
