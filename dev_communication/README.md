# Dev Communication Hub

Centralized communication system for coordinating development across teams.

**Location:** `cadencelms_api/dev_communication/`
**Access:** Other projects symlink this directory for shared access

## Structure

```
dev_communication/
├── backend/                 # Backend team workspace
│   ├── definition.yaml      # Team definition (identity, owns, stack)
│   ├── status.md            # Current focus and blockers
│   ├── inbox/               # Messages TO backend team
│   └── issues/              # Backend issue tracking
│       ├── queue/           # Ready to work
│       ├── active/          # In progress
│       └── completed/       # Done
│
├── frontend/                # Frontend team workspace
│   ├── definition.yaml      # Team definition
│   ├── status.md            # Current focus and blockers
│   ├── inbox/               # Messages TO frontend team
│   └── issues/              # Frontend issue tracking
│       ├── queue/
│       ├── active/
│       └── completed/
│
├── shared/                  # Cross-team resources
│   ├── registry.yaml        # Active teams in this project
│   ├── dependencies.md      # Cross-team blockers
│   ├── architecture/        # ADRs, suggestions, gaps
│   ├── guidance/            # Development guidelines
│   ├── specs/               # Feature specifications
│   ├── plans/               # Planning documents
│   └── contracts/           # API contracts (symlink)
│
├── templates/               # Templates for messages, issues, teams
├── archive/                 # Completed message threads
├── index.md                 # Issue tracking dashboard
├── PROCESS_GUIDE.md         # Complete workflow documentation
└── README.md                # This file
```

## Quick Start

### Sending a Message

1. Use template from `templates/message-request.md`
2. Save to recipient team's inbox: `{team}/inbox/`
3. Name format: `YYYY-MM-DD_{subject_slug}.md`

### Creating an Issue

1. Use template from `templates/issue-template.md`
2. Save to **your own** team's queue: `{team}/issues/queue/`
3. Name format: `{TEAM}-ISS-{NNN}_{brief_description}.md`
4. **Never create issues in another team's queue** — send a message instead

### Issue Lifecycle

```
queue/ → active/ → completed/
```

Move the file between folders as status changes.

## Communication Protocol

- **Messages** cross team boundaries — send to the recipient's `inbox/`
- **Issues** stay local — only a team creates issues in its own queue
- When you receive a message requesting work, **triage it** and decide whether to create a local issue

See `.claude-workflow/teams/protocol.yaml` for the full protocol.

## Symlink Setup (Non-API Projects)

```bash
# From your project root
ln -s ../cadencelms_api/dev_communication ./dev_communication
```

Then add to `.claude/settings.json`:
```json
{
  "permissions": {
    "additionalDirectories": [
      "~/github/cadencelms_api/dev_communication"
    ]
  }
}
```

## Skills

| Skill | Purpose |
|-------|---------|
| `/comms` | Check inbox, send messages, manage issues |
| `/adr` | Manage architecture decisions |
| `/context` | Load relevant ADRs and patterns |
