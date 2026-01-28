# Memory Vault Management

You are managing the extended memory vault at `./memory/`.

## Available Actions

Based on the user's request, perform one of these actions:

### 1. Search Memory
If the user wants to find something:
- Search across `memory/` using Grep for keywords
- Check relevant index files (`memory/entities/index.md`, etc.)
- Return relevant memory files with summaries

### 2. Add Entity
If the user wants to remember a concept/component:
- Use template: `memory/templates/entity-template.md`
- Create file: `memory/entities/[slug].md`
- Update: `memory/entities/index.md`
- Update: `memory/memory-log.md`

### 3. Add Pattern
If the user wants to document a pattern:
- Use template: `memory/templates/pattern-template.md`
- Create file: `memory/patterns/[slug].md`
- Update: `memory/patterns/index.md`
- Update: `memory/memory-log.md`

### 4. Add Session Summary
If the user wants to record a session:
- Use template: `memory/templates/session-template.md`
- Create file: `memory/sessions/YYYY-MM-DD-[slug].md`
- Update: `memory/sessions/index.md`
- Update: `memory/memory-log.md`

### 5. Add Context
If the user wants to add background knowledge:
- Use template: `memory/templates/context-template.md`
- Create file: `memory/context/[slug].md`
- Update: `memory/context/index.md`
- Update: `memory/memory-log.md`

### 6. Show Status
If the user wants to see memory status:
- Read `memory/memory-log.md`
- Count files in each category
- Show recent additions

## Wikilink Format

Always use Obsidian wikilink syntax for cross-references:
```markdown
[[../memory-log]]
[[entities/entity-name]]
[[patterns/pattern-name]]
```

## Memory Log Entry Format

When adding to `memory/memory-log.md`:
```markdown
| YYYY-MM-DD | type | Title | #tags | [[folder/filename]] |
```

## Guidelines

- Keep entries concise but complete
- Use consistent naming (lowercase, hyphens)
- Always update index files and memory-log
- Add relevant tags for discoverability
- Link related memories with wikilinks
