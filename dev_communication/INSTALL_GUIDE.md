# Dev Communication Installation Guide

Complete setup instructions for the CadenceLMS dev communication system.

---

## Quick Start (Automated)

Run the setup script from your project root:

```bash
# Copy the script to your project
curl -o scripts/setup-dev-communication.sh https://raw.githubusercontent.com/[repo]/scripts/setup-dev-communication.sh

# Or copy from an existing CadenceLMS project
cp /path/to/cadencelms_api/scripts/setup-dev-communication.sh ./scripts/

# Make executable and run
chmod +x scripts/setup-dev-communication.sh
./scripts/setup-dev-communication.sh
```

The script will:
1. Ask which team (API or UI)
2. Create all directories
3. Create skill files (`/comms`, `/adr`)
4. Create index files and templates
5. Update or create CLAUDE.md

---

## Manual Setup

If you prefer manual setup, follow the sections below.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Directory Structure](#directory-structure)
3. [Claude Code Skills](#claude-code-skills)
4. [CLAUDE.md Configuration](#claudemd-configuration)
5. [Memory Vault Setup](#memory-vault-setup)
6. [Architecture Vault Setup](#architecture-vault-setup)
7. [Obsidian Configuration](#obsidian-configuration)
8. [Verification](#verification)
9. [Team Onboarding](#team-onboarding)

---

## Prerequisites

- Claude Code CLI installed
- Git repository initialized
- Node.js project (for CadenceLMS API)

**Optional:**
- Obsidian (for visual vault navigation)

---

## Directory Structure

Create the following directory structure in your project root:

```bash
# Create dev_communication directories
mkdir -p dev_communication/issues/api/{queue,active,completed}
mkdir -p dev_communication/issues/ui/{queue,active,completed}
mkdir -p dev_communication/issues/templates
mkdir -p dev_communication/messaging/{api-to-ui,ui-to-api,archive,templates}
mkdir -p dev_communication/architecture/{suggestions,gaps}
mkdir -p dev_communication/coordination

# Create memory vault directories
mkdir -p memory/{context,entities,patterns,sessions,prompts,templates}
mkdir -p memory/prompts/{tasks,workflows,team-configs}
mkdir -p memory/.obsidian

# Create Claude commands directory
mkdir -p .claude/commands
```

---

## Claude Code Skills

Create the following skill files in `.claude/commands/`:

### 1. Communications Skill (`comms.md`)

**Location:** `.claude/commands/comms.md`

```markdown
---
name: comms
description: Manage inter-team communication and issue tracking
argument-hint: "[check|send|issue|status|move|archive]"
---

# Inter-Team Communication

Manage messages and issues between API and UI teams.

## Actions

### CHECK (default)
Check inbox for new messages and pending issues.

**Steps:**
1. Scan `dev_communication/messaging/ui-to-api/` for unread messages
2. Scan `dev_communication/issues/api/queue/` for pending issues
3. Report findings

### SEND
Send a message to the other team.

**Steps:**
1. Ask for: Subject, Priority, Type (Request/Response/Info), Content
2. Generate filename: `YYYY-MM-DD_{subject_slug}.md`
3. Create in `dev_communication/messaging/api-to-ui/`

### ISSUE
Create a new issue.

**Steps:**
1. Ask for: Title, Priority, Description, Acceptance Criteria
2. Generate ID: `{TEAM}-ISS-{NNN}`
3. Create in `dev_communication/issues/{team}/queue/`

### STATUS
Update team status file.

**Steps:**
1. Read current status from `dev_communication/coordination/api-team-status.md`
2. Ask for updates
3. Write updated status

### MOVE
Move issue to different stage.

**Trigger:** `/comms move ISS-XXX {active|completed}`

**Steps:**
1. Find issue file
2. Move to target directory
3. Update issue with timestamp

### ARCHIVE
Archive a processed message.

**Steps:**
1. Move message to `dev_communication/messaging/archive/`
2. Add archived date
```

### 2. Architecture Decision Skill (`adr.md`)

**Location:** `.claude/commands/adr.md`

See the full skill file in the repository. Key actions:
- `status` - Show ADR/gap/suggestion counts
- `check` - Full traversal and analysis
- `gaps` - View known gaps
- `suggest` - Create architecture suggestion
- `poll` - Scan messages/issues for concerns
- `create` - Create ADR from suggestion
- `review` - Review existing ADR

### 3. Memory Skills

**Location:** `.claude/commands/memory.md`

```markdown
---
name: memory
description: Interact with the extended memory vault
argument-hint: "[add|update|search|session]"
---

# Memory Vault Management

Manage the extended memory vault for context persistence.

## Actions

### ADD
Add a new memory entry.

### UPDATE
Update an existing entry.

### SEARCH
Search memory for relevant context.

### SESSION
Create a session summary.
```

**Location:** `.claude/commands/recall.md`

```markdown
---
name: recall
description: Quick recall of project context
argument-hint: "[context|patterns|entities]"
---

# Quick Context Recall

Quickly load relevant context from memory vault.
```

---

## CLAUDE.md Configuration

Create `CLAUDE.md` in your project root with these sections:

```markdown
# CadenceLMS API - Claude Code Instructions

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

---

## Architecture Decisions

**ADRs:** `dev_communication/architecture/decisions/`
**Hub:** `dev_communication/architecture/`
**Skill:** `/adr`

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

---

## Memory Vault

**Location:** `./memory/`

This project has an Obsidian-compatible extended memory vault.

### On Session Start

Before starting work, consider reading:
- `memory/context/project-overview.md`
- `memory/patterns/` - Established patterns

### During Work

Document discoveries in appropriate memory locations.

### On Session End

For significant sessions, create a session summary in `memory/sessions/`.
```

---

## Memory Vault Setup

### Core Files

Create these files in `memory/`:

**`memory/index.md`**
```markdown
# Memory Vault

Extended memory repository for CadenceLMS.

## Quick Links

- [[context/project-overview|Project Overview]]
- [[patterns/index|Patterns]]
- [[entities/index|Entities]]
- [[sessions/index|Sessions]]
- [[prompts/index|Prompts]]

## Recent Activity

- [[memory-log|Memory Log]]
```

**`memory/memory-log.md`**
```markdown
# Memory Log

Chronological log of memory updates.

| Date | Type | Entry | Notes |
|------|------|-------|-------|
| | | | |
```

### Obsidian Configuration

Create `.obsidian/` files for proper vault behavior:

**`memory/.obsidian/app.json`**
```json
{
  "alwaysUpdateLinks": true,
  "newLinkFormat": "relative",
  "useMarkdownLinks": false
}
```

**`memory/.obsidian/core-plugins.json`**
```json
{
  "file-explorer": true,
  "global-search": true,
  "graph": true,
  "backlink": true,
  "outgoing-link": true,
  "tag-pane": true,
  "page-preview": true,
  "daily-notes": false,
  "templates": true,
  "note-composer": true,
  "command-palette": true,
  "editor-status": true,
  "markdown-importer": false,
  "word-count": true,
  "open-with-default-app": true,
  "file-recovery": true
}
```

---

## Architecture Vault Setup

The architecture vault should already exist at `dev_communication/architecture/`.

### Required Structure

```
dev_communication/architecture/
├── index.md               # Main index
├── decision-log.md        # Chronological ADR list
├── decisions/             # Individual ADR files
│   ├── index.md
│   └── ADR-*.md
└── templates/
    └── adr-template.md
```

### ADR Template

**`dev_communication/architecture/templates/adr-template.md`**
```markdown
# ADR-XXXX: Title

**Status:** Proposed | Accepted | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Domain:** Platform | UI | Billing | Other

## Context

Describe the problem and constraints.

## Decision

State the decision clearly and succinctly.

## Consequences

List tradeoffs and downstream impacts.

## Alternatives Considered

- Alternative 1 (reason rejected)
- Alternative 2 (reason rejected)

## Links

- Decision log: [[../decision-log]]
- Related ADRs: [[../decisions/ADR-XXXX-RELATED]]
```

---

## Obsidian Configuration

To use Obsidian for visual navigation:

1. Open Obsidian
2. "Open folder as vault"
3. Select `memory/` or `dev_communication/architecture/`
4. Enable core plugins (backlinks, graph view)

### Recommended Plugins

- **Backlinks** - See what links to current note
- **Graph View** - Visualize connections
- **Templates** - Use ADR/issue templates
- **Tag Pane** - Filter by tags

---

## Verification

Run these checks to verify installation:

### 1. Check Directory Structure

```bash
# Should list all directories
ls -la dev_communication/
ls -la dev_communication/issues/api/
ls -la dev_communication/messaging/
ls -la memory/
ls -la .claude/commands/
```

### 2. Check Skills Load

In Claude Code:
```
/comms
/adr
```

Both should execute without errors.

### 3. Check CLAUDE.md Loads

Start a new Claude Code session - CLAUDE.md content should be auto-loaded.

### 4. Test Issue Creation

```
/comms issue
```

Should prompt for issue details and create file.

### 5. Test ADR Status

```
/adr
```

Should show ADR count, gaps count, suggestions count.

---

## Team Onboarding

### For New Team Members

1. **Read the Process Guide**
   - `dev_communication/PROCESS_GUIDE.md`

2. **Understand Your Team's Directories**
   - API: `issues/api/`, `messaging/api-to-ui/` (outbox), `messaging/ui-to-api/` (inbox)
   - UI: `issues/ui/`, `messaging/ui-to-api/` (outbox), `messaging/api-to-ui/` (inbox)

3. **Learn the Commands**
   - `/comms check` - Daily check for messages/issues
   - `/comms move` - Move issues through lifecycle
   - `/adr suggest` - When you make architecture decisions

4. **Read Existing ADRs**
   - `dev_communication/architecture/decision-log.md`

### For Supervisors/Leads

1. **Review Supervisor Protocol**
   - `dev_communication/coordination/supervisor-protocol.md`

2. **Regular Tasks**
   - `/adr poll` - Scan for architecture concerns
   - Review pending suggestions
   - `/adr create` - Convert suggestions to ADRs

3. **Update Gaps**
   - `dev_communication/architecture/gaps/index.md`

---

## Troubleshooting

### Skill Not Found

Ensure `.claude/commands/` contains the skill files with correct frontmatter:
```yaml
---
name: skillname
description: Description
---
```

### Messages Not Showing

Check you're looking at the correct inbox:
- API inbox: `messaging/ui-to-api/`
- UI inbox: `messaging/api-to-ui/`

### ADR Count Wrong

Run `/adr check` for full traversal and accurate counts.

### Obsidian Links Broken

Ensure `alwaysUpdateLinks: true` in `.obsidian/app.json`.

---

## File Templates

### Issue Template

Save to `dev_communication/issues/templates/issue-template.md`:

```markdown
# {TEAM}-ISS-{NNN}: {Title}

**Priority:** High | Medium | Low
**Created:** YYYY-MM-DD
**From:** {source}

## Description

[What needs to be done]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Notes

[Additional context]
```

### Message Template

Save to `dev_communication/messaging/templates/request.md`:

```markdown
# Message: {Subject}

**From:** {API|UI} Team
**To:** {UI|API} Team
**Date:** YYYY-MM-DD
**Priority:** High | Medium | Low
**Type:** Request

## Content

[Your message]

## Action Required

- [ ] [What you need]

## Related

- Issue: {ISS-XXX}
```

---

## Summary

After installation, you should have:

- [x] `dev_communication/` directory with issues, messaging, architecture, coordination
- [x] `memory/` vault with context, patterns, entities, sessions
- [x] `.claude/commands/` with comms.md and adr.md skills
- [x] `CLAUDE.md` with auto-loaded instructions
- [x] `dev_communication/architecture/` with ADR vault

The system is ready for use. Start with `/comms check` to see your inbox!

---

*Last updated: 2026-01-27*
