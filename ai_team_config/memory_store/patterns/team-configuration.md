# Pattern: Team Configuration

**Category:** Development Process
**Created:** 2026-02-04
**Tags:** #pattern #team #workflow

## Problem

Complex features require coordination between API and UI teams, with clear communication, issue tracking, and architecture decisions. How do we manage this consistently?

## Solution

Use the dev_communication system with skills to manage inter-team workflow.

### Directory Structure

```
dev_communication/
├── messaging/
│   ├── api-to-ui/      # API outbox (messages to UI)
│   ├── ui-to-api/      # UI outbox (messages to API)
│   └── archive/        # Completed threads
├── issues/
│   ├── api/{queue,active,completed}/
│   ├── ui/{queue,active,completed}/
│   └── templates/
├── architecture/
│   ├── decisions/      # ADRs
│   ├── suggestions/    # Pending architectural ideas
│   └── gaps/          # Known gaps in documentation
├── coordination/
│   ├── api-team-status.md
│   ├── ui-team-status.md
│   └── dependencies.md
└── specs/              # Feature specifications
```

### Available Skills

| Skill | Purpose |
|-------|---------|
| `/comms` | Check inbox, send messages, manage issues |
| `/adr` | Review/create architecture decisions |
| `/recall` | Load relevant memory context |
| `/context` | Load targeted ADRs and patterns |
| `/reflect` | Capture learnings after implementation |
| `/refine` | Review patterns, promote to ADRs |

### Workflow

1. **Start Session:**
   ```
   /recall          # Load memory context
   /comms check     # Check inbox and pending issues
   /adr             # Review architecture decisions
   ```

2. **During Development:**
   - Move issue to active: `/comms move API-ISS-xxx`
   - Follow ADR-DEV-001: Implement → Test → Verify types

3. **After Completing Work:**
   ```
   /reflect         # Capture learnings
   /adr suggest     # If new pattern discovered
   /comms send      # Notify other team if needed
   /comms move      # Move issue to completed
   ```

### Issue Lifecycle

```
queue/ → active/ → completed/
```

Each issue file contains:
- Status, Priority, Phase
- Requirements and acceptance criteria
- Implementation notes
- Test requirements

### Message Types

- **Request:** Asking other team for work
- **Response:** Answering a request
- **Notification:** FYI about completed work
- **Question:** Clarification needed

## When to Use

- Cross-team feature development
- Architecture decisions affecting both teams
- Coordinated releases
- Complex multi-phase features

## When NOT to Use

- Simple bug fixes
- Internal refactoring
- Documentation-only changes

## Examples in Codebase

- `dev_communication/issues/api/queue/API-ISS-014_course-versioning-core.md`
- `dev_communication/messaging/ui-to-api/2026-02-04_course-versioning-response.md`
- `dev_communication/shared/architecture/decisions/ADR-DEV-001-TESTING-STRATEGY.md`

## Related Patterns

- [[integration-test-setup]]
- [[department-scoping]]

## Links

- Memory log: [[../memory-log]]
- Prompts: [[../prompts/prompt-registry]]
