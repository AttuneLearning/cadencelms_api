# CadenceLMS API - Claude Code Instructions

## MANDATORY: Before Any Implementation

**STOP.** Before implementing any feature, endpoint, or issue:

1. **Read the checklist:** `dev_communication/guidance/FEATURE_DEVELOPMENT_CHECKLIST.md`
2. **Check comms:** `/comms` for inbox messages and blockers
3. **Define endpoint contracts:** If the work involves new or changed API endpoints, define the contracts first and send to the UI team (`/comms send`). Getting cross-team agreement on contracts early prevents rework and is second in priority only to team configuration.
4. **Check relevant ADRs:** Run `/adr` or read `dev_communication/architecture/decisions/`
5. **Implementation workflow (per ADR-DEV-001):**
   ```
   1. Implement Feature/Fix
   2. Write Tests for Implementation  ← DO NOT SKIP
   3. Run Related Tests: npm test [path]
   4. Verify: npx tsc --noEmit
   ```
6. **When spawning agents:** Include testing requirements. Agents must create tests and verify they pass.

---

## Project Overview

CadenceLMS is a Learning Management System API built with Node.js, Express, TypeScript, and MongoDB.

## Development Principles

**Read:** `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md`

**Key Rule:** Always design for the ideal API/route structure. No backward compatibility layers, deprecated fields, or legacy fallbacks unless explicitly requested.

---

## Skills Reference

| Skill | Purpose |
|-------|---------|
| `/comms` | Inter-team communication (inbox, issues, messages) |
| `/adr` | Architecture decisions, gaps, suggestions |
| `/context` | Load relevant ADRs, patterns, and memory before work |
| `/memory` | Manage the extended memory vault |
| `/refine` | Review patterns, promote to ADRs |
| `/reflect` | Capture learnings after implementation |

---

## Development Standards

### Contract First (CF1)
**All development is contract-first.** Define API contracts before implementation. Post to `dev_communication/messaging/` for cross-team agreement.

### Ideal Design First (I1)
No backward compatibility unless explicitly requested. Update callers rather than adding compatibility layers. Key ADRs: DEV-002, API-001, DATA-001, AUTH-001.

### Naming Conventions (N1)
Use specific, non-colliding names. Search codebase before naming. Examples: `DepartmentProgramsPage` not `DepartmentManagementPage`.

### Golden Rule
**Never invent API values.** Verify endpoint paths, field names, and permission strings exist before using them.

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

### Models & Services
- Models: `src/models/` — use `isDeleted`/`isActive` for soft delete, always include timestamps
- Services: `src/services/` — business logic lives here, not controllers
- Department-scoped methods take `departmentId` as first param

### Testing
- Unit: `tests/unit/` | Integration: `tests/integration/`
- Use `describeIfMongo` for MongoDB-dependent tests
- Tests REQUIRED after every implementation (ADR-DEV-001)

## Quick Reference

```bash
npm run dev                # Start dev server
npm test                   # Run all tests
npx jest [path]            # Run specific tests
npx tsc --noEmit           # Type check (must pass before completing)
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

## File Paths

- **Dev communication:** `dev_communication/` — issues, messaging, architecture, coordination
- **Memory vault:** `memory/` — patterns, entities, context, sessions
- **Inter-team inbox:** `dev_communication/messaging/ui-to-api/`
- **Inter-team outbox:** `dev_communication/messaging/api-to-ui/`
