# Dev Communication Hub

Centralized communication system for coordinating development between API and UI teams.

**Location:** `cadencelms_api/dev_communication/`
**Access:** UI team symlinks this directory for shared access

## Structure

```
dev_communication/
├── messaging/           # Inter-team messages
│   ├── api-to-ui/      # API team sends → UI team reads
│   ├── ui-to-api/      # UI team sends → API team reads
│   ├── archive/        # Completed message threads
│   └── templates/      # Message templates
│
├── issues/             # Development issue tracking
│   ├── api/            # API team issues
│   │   ├── queue/      # Ready to work
│   │   ├── active/     # In progress
│   │   └── completed/  # Done
│   ├── ui/             # UI team issues
│   │   ├── queue/
│   │   ├── active/
│   │   └── completed/
│   └── templates/      # Issue templates
│
└── coordination/       # Team coordination & status
    ├── api-team-status.md
    ├── ui-team-status.md
    └── dependencies.md
```

## Quick Start

### Sending a Message

1. Use template from `messaging/templates/`
2. Save to appropriate outbox:
   - API team → `messaging/api-to-ui/`
   - UI team → `messaging/ui-to-api/`
3. Name format: `YYYY-MM-DD_subject.md`

### Creating an Issue

1. Use template from `issues/templates/`
2. Save to your team's queue: `issues/{api|ui}/queue/`
3. Name format: `{TEAM}-ISS-{NNN}_{brief_description}.md`

### Issue Lifecycle

```
queue/ → active/ → completed/
```

Move the file between folders as status changes.

## For Supervisor Agents

Check `coordination/index.md` for:
- Current team priorities
- Cross-team dependencies
- Batch processing guidance

## Symlink Setup (UI Team)

```bash
# From cadencelms_ui project root
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
