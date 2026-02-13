# CadenceLMS API - Claude Code Instructions

## MANDATORY: Before Any Implementation

**STOP.** Every issue follows this end-to-end workflow. Do NOT skip steps.

### Phase 1: Intake
1. **Check comms:** `/comms` for inbox messages and blockers
2. **Create issues:** Turn comms messages into tracked issue files (`/comms issue`)
3. **Read the checklist:** `dev_communication/guidance/FEATURE_DEVELOPMENT_CHECKLIST.md`
4. **Define endpoint contracts:** If the work involves new or changed API endpoints, define the contracts first and send to the UI team (`/comms send`). Getting cross-team agreement on contracts early prevents rework.
5. **Check relevant ADRs:** Run `/adr` or read `dev_communication/shared/architecture/decisions/`

### Phase 2: Implementation
6. **Implement Feature/Fix** (per ADR-DEV-001)
7. **Write Tests for Implementation** ← DO NOT SKIP
8. **Run Related Tests:** `npm test [path]`
9. **Verify:** `npx tsc --noEmit`
10. **When spawning agents:** Include testing requirements. Agents must create tests and verify they pass.

### Phase 3: QA Gate
11. **Run completion gate checks** (see Completion Gate below)
12. **Review against** `.claude/team-configs/code-reviewer-config.json` criteria

### Phase 4: Completion
13. **Create session file:** `ai_team_config/memory_store/sessions/{date}-{issue-slug}.md`
14. **Update issue file** with commit hash and status COMPLETE
15. **Commit completion changes** (include issue/phase in commit message)
16. **Push immediately** after each completed issue or completed phase milestone
17. **Move issue** to `completed/` folder (`/comms move`)

### Phase 5: Comms Response
18. **Send response to originating team** (`/comms send`) confirming what was fixed/built, what changed, and any action required on their side (e.g., `npm run reset:mock`)
19. **This step is NOT optional.** Every inbound comms message that triggers work MUST get a response.

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

### Agent Team Configuration

When spawning agent teams, read role definitions and review criteria from:
- `.claude/team-configs/agent-team-roles.json` — API team role definitions, spawn prompts, presets
- `.claude/team-configs/code-reviewer-config.json` — API code review gate criteria

These are local overrides of the shared `.claude-workflow/team-configs/` defaults (which are frontend-focused).

### Completion Gate (Blocking)

No issue can be marked complete until ALL pass:
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run test:unit` — all tests pass
- [ ] New functionality has corresponding tests
- [ ] Session file created: `ai_team_config/memory_store/sessions/{date}-{issue-slug}.md`
- [ ] Issue file updated with commit hash and status COMPLETE
- [ ] Completion commit has been pushed to remote

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
- **Memory vault:** `ai_team_config/memory_store/` — patterns, entities, context, sessions
- **Inter-team inbox:** `dev_communication/messaging/ui-to-api/`
- **Inter-team outbox:** `dev_communication/messaging/api-to-ui/`
