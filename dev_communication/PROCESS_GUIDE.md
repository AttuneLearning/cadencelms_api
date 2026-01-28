# Dev Communication Process Guide

A complete guide to inter-team communication, issue tracking, and architecture decision management for CadenceLMS.

---

## Table of Contents

1. [Overview](#overview)
2. [Issue Management](#issue-management)
3. [Cross-Team Messaging](#cross-team-messaging)
4. [Architecture Decisions](#architecture-decisions)
5. [Supervisor Feedback Loop](#supervisor-feedback-loop)
6. [Complete Workflow Example](#complete-workflow-example)
7. [Quick Reference](#quick-reference)

---

## Overview

The dev communication system connects three workflows:

```
Issues → Messages → Architecture Suggestions → ADRs
```

**Purpose:**
- Track work across API and UI teams
- Enable async communication between teams
- Capture architecture decisions as they emerge
- Maintain a living architecture documentation

**Key Directories:**

| Directory | Purpose |
|-----------|---------|
| `dev_communication/issues/` | Issue tracking (queue → active → completed) |
| `dev_communication/messaging/` | Cross-team messages |
| `dev_communication/architecture/` | Suggestions and gaps |
| `dev_communication/coordination/` | Team status and dependencies |
| `dev_communication/architecture/` | Formal ADRs (Obsidian vault) |

---

## Issue Management

Issues track discrete work items for each team.

### Issue Lifecycle

```
queue/          →        active/         →       completed/
   │                        │                        │
   │ Create                 │ Start work             │ Finish work
   │                        │                        │
   ▼                        ▼                        ▼
┌──────────┐          ┌──────────┐           ┌──────────┐
│ Waiting  │    →     │ In Work  │     →     │   Done   │
└──────────┘          └──────────┘           └──────────┘
```

### Creating an Issue

Use `/comms issue` or manually create a file:

**Location:** `dev_communication/issues/{api|ui}/queue/`

**Filename:** `{TEAM}-ISS-{NNN}.md` (e.g., `API-ISS-001.md`)

**Template:**
```markdown
# {TEAM}-ISS-{NNN}: {Title}

**Priority:** Critical | High | Medium | Low
**Created:** YYYY-MM-DD
**From:** {team or user}

## Description

[What needs to be done]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Notes

[Additional context]
```

### Moving Issues

Move files between directories as work progresses:

| Action | Command | File Move |
|--------|---------|-----------|
| Start work | `/comms move ISS-XXX active` | `queue/` → `active/` |
| Complete | `/comms move ISS-XXX completed` | `active/` → `completed/` |

### Checking Issues

Run `/comms check` to see:
- Pending issues in your queue
- New messages in your inbox
- Issues you're currently working on

---

## Cross-Team Messaging

Messages enable async communication between API and UI teams.

### Message Flow

```
API Team                                    UI Team
────────                                    ───────
                  api-to-ui/
Outbox ─────────────────────────────────► Inbox

                  ui-to-api/
Inbox  ◄───────────────────────────────── Outbox
```

### When to Send Messages

| Scenario | Action |
|----------|--------|
| Need work from other team | Send request → They create issue |
| Completed cross-team work | Send notification |
| Question about their code/API | Send inquiry |
| Agreed on shared convention | Send + create arch suggestion |

### Sending a Message

Use `/comms send` or manually create a file:

**Location:** `dev_communication/messaging/{from}-to-{to}/`

**Filename:** `YYYY-MM-DD_{subject_slug}.md`

**Template:**
```markdown
# Message: {Subject}

**From:** {API|UI} Team
**To:** {UI|API} Team
**Date:** YYYY-MM-DD
**Priority:** Critical | High | Medium | Low
**Type:** Request | Response | Info

## Content

[Your message here]

## Action Required

- [ ] [What you need from them]

## Related

- Issue: {ISS-XXX}
- Previous message: {link}
```

### Processing Messages

When you receive a message:

1. **Request** → Create an issue in your queue
2. **Response** → Update the related issue
3. **Info** → Acknowledge and archive

Archive processed messages to `messaging/archive/`.

---

## Architecture Decisions

Architecture decisions are captured through a suggestion → review → ADR pipeline.

### The Pipeline

```
Trigger           →    Suggestion    →    Review    →    ADR
(work completed)       (draft idea)      (approve)      (formal record)
```

### When to Create Suggestions

Create a suggestion (`/adr suggest`) when:

| Trigger | Example |
|---------|---------|
| New pattern established | "We're using this caching approach everywhere" |
| Significant design decision | "Chose MongoDB aggregation over app-level joins" |
| Cross-team convention | "API and UI agreed on this error format" |
| Bug fix reveals design flaw | "This bug happened because we had no standard for X" |
| Code review finds pattern | "I see this pattern in 5 places but no ADR" |

**Do NOT create suggestions for:**
- Minor implementation details
- One-off solutions unlikely to repeat
- Already documented decisions
- Personal preferences without team consensus

### Creating a Suggestion

Use `/adr suggest [topic]` or manually create:

**Location:** `dev_communication/architecture/suggestions/`

**Filename:** `YYYY-MM-DD_{team}_{topic_slug}.md`

**Template:**
```markdown
# Architecture Suggestion: {Topic}

**Date:** YYYY-MM-DD
**From:** {API|UI} Team
**Priority:** High | Medium | Low
**Status:** Pending Review

## Context

[What prompted this suggestion? What problem does it solve?]

## Proposed Decision

[What should we document as an architecture decision?]

## Impact

- **Teams affected:** API / UI / Both
- **Files/modules affected:** [list]
- **Related existing ADRs:** [list]

## Notes

[Additional context, alternatives considered, etc.]
```

### Reviewing Suggestions

Suggestions are reviewed by human leads or supervisor agents:

| Decision | Action |
|----------|--------|
| **Accept** | `/adr create [suggestion-file]` → Creates formal ADR |
| **Reject** | Archive with reason |
| **Defer** | Add to `gaps/index.md` for later |

### Formal ADRs

Accepted suggestions become ADRs:

**Location:** `dev_communication/architecture/decisions/`

**Format:** `ADR-{DOMAIN}-{NNN}-{TITLE}.md`

ADRs are automatically added to:
- `decision-log.md` - Chronological list
- `index.md` - Organized by domain

### Tracking Gaps

Known gaps (areas needing ADRs) are tracked in:

**Location:** `dev_communication/architecture/gaps/index.md`

Gaps are prioritized: Critical → High → Medium → Low

Use `/adr gaps` to view current gaps and recommendations.

---

## Supervisor Feedback Loop

The supervisor feedback loop ensures architecture decisions are captured systematically.

### Supervisor Role

Supervisors (human or Opus 4.5 agents) are responsible for:

1. **Quality gate** - Reviewing code before completion
2. **Architecture guardian** - Ensuring decisions are documented
3. **Coordination** - Managing cross-team dependencies
4. **Feedback loop** - Capturing learnings as suggestions

### Session Protocol

**On Session Start:**
1. `/comms check` - Check inbox and pending issues
2. `/adr` - Check architecture status
3. `/adr poll` - Scan for architecture concerns in messages/issues

**During Work:**
- Update team status when focus changes
- Move issues through lifecycle
- Send messages for cross-team requests

**On Session End:**
1. Update team status file
2. For significant work completed, ask:
   - Did this establish a new pattern? → `/adr suggest`
   - Did this resolve a design issue? → `/adr suggest`
   - Does this affect the other team? → `/comms send`
3. Ensure all messages are processed

### Polling for Architecture Concerns

`/adr poll` scans messages and issues for keywords:
- "architecture", "pattern", "design"
- "convention", "standard", "approach"
- "we decided", "going forward", "from now on"
- "technical debt", "refactor", "redesign"

Matches are flagged for potential suggestions.

---

## Complete Workflow Example

**Scenario:** UI team needs a new API endpoint, which leads to an architecture decision.

### Step 1: UI Sends Request

```bash
/comms send
```

Creates: `messaging/ui-to-api/2026-01-27_batch_enrollment_endpoint.md`

```markdown
# Message: Request Batch Enrollment Endpoint

**From:** UI Team
**To:** API Team
**Priority:** High
**Type:** Request

## Content

We need a batch enrollment endpoint to enroll multiple learners at once.
Current approach of individual calls is causing performance issues.

## Action Required

- [ ] Create POST /api/v2/enrollments/batch endpoint
- [ ] Support up to 100 enrollments per request
```

### Step 2: API Creates Issue

API agent runs `/comms check`, sees the request, creates issue:

```bash
/comms issue
```

Creates: `issues/api/queue/API-ISS-015.md`

### Step 3: API Works on Issue

```bash
/comms move API-ISS-015 active
```

API agent implements the endpoint, discovers need for a new validation pattern.

### Step 4: API Completes and Suggests Architecture

```bash
/comms move API-ISS-015 completed
/adr suggest "Batch operation validation pattern"
/comms send  # Notify UI of completion
```

Creates:
- `architecture/suggestions/2026-01-27_api_batch_validation.md`
- `messaging/api-to-ui/2026-01-27_batch_endpoint_complete.md`

### Step 5: Supervisor Reviews

Supervisor runs `/adr`, sees pending suggestion, reviews and accepts:

```bash
/adr create 2026-01-27_api_batch_validation.md
```

Creates: `dev_communication/architecture/decisions/ADR-API-004-BATCH-VALIDATION-PATTERN.md`

Updates:
- `decision-log.md`
- `index.md`
- Archives original suggestion

### Step 6: Teams Reference ADR

Both teams can now reference ADR-API-004 for consistent batch validation.

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `/comms` | Check inbox and pending issues |
| `/comms check` | Same as above |
| `/comms send` | Send message to other team |
| `/comms issue` | Create new issue |
| `/comms status` | Update team status |
| `/comms move ISS-XXX {stage}` | Move issue (active/completed) |
| `/comms archive MSG-XXX` | Archive processed message |
| `/adr` | Show architecture status |
| `/adr check` | Full traversal and gap analysis |
| `/adr check security` | Deep dive on security |
| `/adr check adaptive` | Deep dive on adaptive learning |
| `/adr gaps` | View known gaps |
| `/adr suggest [topic]` | Create architecture suggestion |
| `/adr poll` | Scan messages/issues for concerns |
| `/adr create [file]` | Create ADR from suggestion |
| `/adr review ADR-XXX` | Review existing ADR |

### File Locations

```
dev_communication/
├── issues/
│   ├── api/
│   │   ├── queue/         # Pending API issues
│   │   ├── active/        # In-progress API issues
│   │   └── completed/     # Done API issues
│   └── ui/
│       ├── queue/         # Pending UI issues
│       ├── active/        # In-progress UI issues
│       └── completed/     # Done UI issues
├── messaging/
│   ├── api-to-ui/         # Messages from API to UI
│   ├── ui-to-api/         # Messages from UI to API
│   ├── archive/           # Processed messages
│   └── templates/         # Message templates
├── architecture/
│   ├── suggestions/       # Pending architecture suggestions
│   ├── gaps/              # Known gaps tracker
│   └── index.md           # Architecture hub
├── coordination/
│   ├── index.md           # Coordination hub
│   ├── api-team-status.md # API team current status
│   ├── ui-team-status.md  # UI team current status
│   ├── dependencies.md    # Cross-team blockers
│   └── supervisor-protocol.md
├── PROCESS_GUIDE.md       # This document
└── INSTALL_GUIDE.md       # Setup instructions

dev_communication/architecture/
├── index.md               # ADR vault index
├── decision-log.md        # All ADRs chronologically
├── decisions/             # Individual ADR files
└── templates/             # ADR template
```

### Priority Levels

| Priority | Response Time | Use When |
|----------|---------------|----------|
| Critical | Immediate | Blocking production/other team |
| High | Same session | Important, time-sensitive |
| Medium | Next session | Normal priority |
| Low | When convenient | Nice to have |

---

## Related Documentation

- [Supervisor Protocol](coordination/supervisor-protocol.md)
- [ADR Template](../dev_communication/architecture/templates/adr-template.md)
- [CLAUDE.md](../CLAUDE.md) - Auto-loaded instructions

---

*Last updated: 2026-01-27*
