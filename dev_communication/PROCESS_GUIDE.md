# Dev Communication Process Guide

A complete guide to inter-team communication, issue tracking, and architecture decision management.

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Issue Management](#issue-management)
4. [Cross-Team Messaging](#cross-team-messaging)
5. [Architecture Decisions](#architecture-decisions)
6. [Supervisor Feedback Loop](#supervisor-feedback-loop)
7. [Complete Workflow Example](#complete-workflow-example)
8. [Quick Reference](#quick-reference)

---

## Overview

The dev communication system connects three workflows:

```
Issues → Messages → Architecture Suggestions → ADRs
```

**Core principle:** Messages cross team boundaries. Issues stay local. Each team triages its own inbound messages and creates its own issues.

---

## Directory Structure

```
dev_communication/
├── backend/                     # Backend team workspace
│   ├── definition.yaml          # Team identity, responsibilities, stack
│   ├── status.md                # Current focus and blockers
│   ├── inbox/                   # Messages TO backend team
│   └── issues/                  # Backend issue tracking
│       ├── queue/               # Ready to work
│       ├── active/              # In progress
│       └── completed/           # Done
│
├── frontend/                    # Frontend team workspace
│   ├── definition.yaml
│   ├── status.md
│   ├── inbox/
│   └── issues/{queue,active,completed}/
│
├── shared/                      # Cross-team resources
│   ├── registry.yaml            # Active teams in this project
│   ├── dependencies.md          # Cross-team blockers
│   ├── supervisor-protocol.md   # Supervisor agent protocol
│   ├── architecture/            # ADRs, suggestions, gaps
│   ├── guidance/                # Development guidelines
│   ├── specs/                   # Feature specifications
│   ├── plans/                   # Planning documents
│   └── contracts/               # API contracts
│
├── templates/                   # Message, issue, team templates
├── archive/                     # Completed message threads
├── index.md                     # Issue tracking dashboard
└── PROCESS_GUIDE.md             # This document
```

---

## Issue Management

Issues track discrete work items for each team.

### Issue Lifecycle

```
queue/          →        active/         →       completed/
   │                        │                        │
   │ Create                 │ Start work             │ Finish work
   ▼                        ▼                        ▼
┌──────────┐          ┌──────────┐           ┌──────────┐
│ Waiting  │    →     │ In Work  │     →     │   Done   │
└──────────┘          └──────────┘           └──────────┘
```

### Creating an Issue

Use `/comms issue` or manually create a file:

**Location:** `{team}/issues/queue/`

**Filename:** `{TEAM}-ISS-{NNN}_{brief_description}.md`

**Important:** Only create issues in **your own** team's queue. To request work from another team, send a message to their inbox.

### Moving Issues

| Action | File Move |
|--------|-----------|
| Start work | `queue/` → `active/` |
| Complete | `active/` → `completed/` |

---

## Cross-Team Messaging

Messages enable async communication between teams.

### Message Flow

```
Frontend Team                              Backend Team
─────────────                              ────────────
                 backend/inbox/
Sends ─────────────────────────────────► Receives + triages

                 frontend/inbox/
Receives ◄───────────────────────────── Sends
```

### When to Send Messages

| Scenario | Action |
|----------|--------|
| Need work from other team | Send request → They triage and create issue |
| Completed cross-team work | Send notification |
| Question about their code/API | Send inquiry |
| Found bug in their code | Send bug report with evidence |

### Sending a Message

**Location:** `{recipient_team}/inbox/`

**Filename:** `YYYY-MM-DD_{subject_slug}.md`

**Template:** `templates/message-request.md`

### Processing Incoming Messages

When you receive a message:

1. **Request** → Triage and create a local issue if accepted
2. **Bug report** → Verify and create a local issue if confirmed
3. **Response** → Update the related issue
4. **Info** → Acknowledge and archive

Archive processed messages to `archive/`.

---

## Architecture Decisions

### The Pipeline

```
Trigger           →    Suggestion    →    Review    →    ADR
(work completed)       (draft idea)      (approve)      (formal record)
```

### Creating a Suggestion

Use `/adr suggest [topic]` or manually create:

**Location:** `shared/architecture/suggestions/`

### Formal ADRs

**Location:** `shared/architecture/decisions/`

**Format:** `ADR-{DOMAIN}-{NNN}-{TITLE}.md`

---

## Supervisor Feedback Loop

### Session Protocol

**On Session Start:**
1. `/comms` - Check inbox and pending issues
2. `/adr` - Check architecture status

**During Work:**
- Move issues through lifecycle
- Send messages for cross-team requests

**On Session End:**
1. Update team status file
2. New pattern? → `/adr suggest`
3. Affects other team? → `/comms send`
4. Ensure all messages are processed

---

## Complete Workflow Example

**Scenario:** Frontend needs a new API endpoint.

### Step 1: Frontend Sends Request

Saves to `backend/inbox/2026-01-27_batch_enrollment_endpoint.md`

### Step 2: Backend Triages

Backend agent runs `/comms`, sees the request, creates a local issue:
`backend/issues/queue/API-ISS-015_batch_enrollment.md`

### Step 3: Backend Completes Work

```bash
/comms move API-ISS-015 completed
/comms send   # Notify frontend
```

Saves notification to `frontend/inbox/2026-01-27_batch_endpoint_complete.md`

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `/comms` | Check inbox and pending issues |
| `/comms send` | Send message to other team |
| `/comms issue` | Create new issue |
| `/comms status` | Update team status |
| `/comms move ISS-XXX {stage}` | Move issue (active/completed) |
| `/adr` | Show architecture status |
| `/adr suggest [topic]` | Create architecture suggestion |

### Priority Levels

| Priority | Response Time | Use When |
|----------|---------------|----------|
| Critical | Immediate | Blocking production/other team |
| High | Same session | Important, time-sensitive |
| Medium | Next session | Normal priority |
| Low | When convenient | Nice to have |

---

*Last updated: 2026-02-09*
