# Team Configurations

Multi-agent team configurations for complex implementations.

## Available Configs

| Config | Description | Status |
|--------|-------------|--------|
| [[development-lifecycle]] | Mandatory development workflow enforcement | Active |
| [[iss-011-encryption]] | PII encryption implementation | Active |
| [[lookup-values-migration]] | LookupValues collection migration | Complete |
| [[role-system-phases-3-5]] | Role System V2 phases 3-5 | Complete |
| [[authorization-implementation]] | Authorization middleware rollout | Complete |
| [[role-system-phases-6-8]] | Role System V2 phases 6-8 | Complete |

## Team Config Pattern

Configs define:
- **Team** - Name, version, description
- **Agents** - Specialized roles with tasks
- **Phases** - Implementation phases
- **Phase gates** - Completion criteria
- **Shared context** - Common knowledge across agents

## Structure

```json
{
  "team": { "name", "version", "description" },
  "agents": [{ "id", "role", "tasks", "dependencies" }],
  "phaseGates": { "phase1": { "criteria": [] } },
  "sharedContext": { /* shared knowledge */ }
}
```

## Links

- Prompts index: [[../index]]
- Prompt registry: [[../prompt-registry]]
