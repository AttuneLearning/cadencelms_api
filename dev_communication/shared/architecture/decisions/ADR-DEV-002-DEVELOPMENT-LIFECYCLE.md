# ADR-DEV-002: Development Lifecycle Enforcement

**Status:** Accepted
**Date:** 2026-02-05
**Domain:** Development Process

## Context

Development tasks frequently skip critical steps (testing, type checking, pattern compliance) because:
1. ADRs are consulted at session start but not during execution
2. No workflow enforcement exists - guidelines are optional
3. Issue completion is marked before verification steps
4. "Lazy TDD" philosophy is easily abused without checkpoints

This leads to technical debt accumulation and regression bugs.

## Decision

### Mandatory Development Lifecycle

All development work MUST follow this lifecycle. The `/develop` skill enforces this automatically.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CONTEXT PHASE                                                   │
│     ├── Check /comms for relevant messages                          │
│     ├── Load relevant context from /memory (patterns, entities)     │
│     ├── Identify ADRs applicable to change type                     │
│     └── Review issue requirements                                   │
│                                                                     │
│  2. IMPLEMENTATION PHASE                                            │
│     ├── Follow patterns from /memory                                │
│     ├── Follow conventions from applicable ADRs                     │
│     ├── Create/modify code                                          │
│     └── Update types as needed                                      │
│                                                                     │
│  3. VERIFICATION PHASE (MANDATORY - CANNOT SKIP)                    │
│     ├── Run: tsc --noEmit (must pass, 0 errors)                     │
│     ├── Run: unit tests for changed code                            │
│     ├── Run: integration tests for feature                          │
│     ├── Fix any regressions before proceeding                       │
│     └── All tests must pass                                         │
│                                                                     │
│  4. DOCUMENTATION PHASE                                             │
│     ├── Update /memory if new pattern discovered                    │
│     ├── Create /adr suggestion if architectural decision made       │
│     ├── Send /comms if cross-team impact                            │
│     └── Update issue with implementation notes                      │
│                                                                     │
│  5. COMPLETION PHASE                                                │
│     ├── Verify all acceptance criteria met                          │
│     ├── Move issue to completed                                     │
│     └── Store session summary for compaction recovery               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ADR Consultation by Change Type

| Change Type | Required ADRs to Check |
|-------------|------------------------|
| New API endpoint | ADR-API-001, ADR-DEV-001 |
| New UI component | ADR-UI-001, ADR-DEV-001 |
| New feature | ADR-DEV-001, domain-specific ADRs |
| Bug fix | ADR-DEV-001 (regression test) |
| Auth changes | ADR-AUTH-001, ADR-SEC-001 |
| Database changes | ADR-DATA-001 |

### Test Requirements (from ADR-DEV-001)

| Change Type | Required Tests |
|-------------|----------------|
| Bug fix | Regression test proving fix |
| New endpoint | Integration test |
| New UI component | Unit test for rendering |
| New feature | Integration + happy path |
| Refactor | Existing tests must pass |

### Verification Commands

**UI Team:**
```bash
# Type check (MUST pass)
npx tsc --noEmit

# Unit tests for specific file
npx vitest run path/to/file.test.tsx

# All tests
npx vitest run
```

**API Team:**
```bash
# Type check (MUST pass)
npx tsc --noEmit

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration
```

### Session State Preservation

Before context compaction, store in `/ai_team_config/memory_store/sessions/`:
- Current issue being worked
- Implementation progress
- Test results
- Pending items

Template: `ai_team_config/memory_store/templates/session-template.md`

### Enforcement Mechanism

The `/develop` skill MUST be used for all development work. It:
1. Reads issues from queue
2. Executes the lifecycle for each issue
3. Blocks completion until verification passes
4. Cannot be bypassed

## Consequences

**Positive:**
- Consistent quality across all changes
- No forgotten tests or type errors
- Patterns are consistently applied
- Session state preserved for recovery

**Negative:**
- Slower initial velocity (verification overhead)
- Requires discipline to use `/develop` skill
- May feel rigid for small changes

**Mitigation:**
- Small changes (typos, comments) can use "quick" mode
- Verification runs in parallel where possible

## Alternatives Considered

1. **Manual checklists in issues** - Rejected: too easy to skip
2. **Pre-commit hooks only** - Rejected: catches too late, no ADR enforcement
3. **Separate review phase** - Rejected: delays feedback loop

## Links

- [[ADR-DEV-001-TESTING-STRATEGY]]
- [[../decision-log]]
- Skill: `/develop`
- Team config: `ai_team_config/memory_store/prompts/team-configs/development-lifecycle.md`
