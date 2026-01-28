#!/bin/bash

# Dev Communication System Setup Script
# Can be run from anywhere - automatically detects project root

set -e

# Determine script location and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Script is in dev_communication/initscripts/, so project root is two levels up
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Setting up Dev Communication System..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function to check if we should create a file
# Returns 0 (true) if we should create, 1 (false) if we should skip
should_create_file() {
    local filepath="$1"

    if [ -f "$filepath" ]; then
        if [ "$FORCE" = true ]; then
            echo -e "  ${YELLOW}↻${NC} Overwriting $filepath"
            return 0
        else
            echo -e "  ${YELLOW}⊘${NC} Skipped $filepath (exists, use --force to overwrite)"
            return 1
        fi
    else
        return 0
    fi
}

# Helper to echo success after file creation
file_created() {
    local filepath="$1"
    echo -e "  ${GREEN}✓${NC} Created $filepath"
}

# Check for --force flag
FORCE=false
for arg in "$@"; do
    if [[ "$arg" == "--force" || "$arg" == "-f" ]]; then
        FORCE=true
        echo -e "${YELLOW}Force mode: existing files will be overwritten${NC}"
        echo ""
    fi
done

# Determine team (API or UI)
read -p "Which team is this project for? (api/ui): " TEAM
TEAM=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')

if [[ "$TEAM" != "api" && "$TEAM" != "ui" ]]; then
    echo "Invalid team. Please enter 'api' or 'ui'"
    exit 1
fi

if [[ "$TEAM" == "api" ]]; then
    OTHER_TEAM="ui"
    INBOX="ui-to-api"
    OUTBOX="api-to-ui"
else
    OTHER_TEAM="api"
    INBOX="api-to-ui"
    OUTBOX="ui-to-api"
fi

echo ""
echo -e "${BLUE}Creating directory structure...${NC}"

# Check if dev_communication is a symlink (UI project case)
if [ -L "dev_communication" ]; then
    echo -e "  ${YELLOW}→${NC} dev_communication is a symlink - skipping shared directory creation"
    SKIP_SHARED=true
else
    SKIP_SHARED=false
    # Create dev_communication directories
    mkdir -p dev_communication/issues/api/{queue,active,completed}
    mkdir -p dev_communication/issues/ui/{queue,active,completed}
    mkdir -p dev_communication/issues/templates
    mkdir -p dev_communication/messaging/{api-to-ui,ui-to-api,archive,templates}
    mkdir -p dev_communication/architecture/{decisions,suggestions,gaps,templates}
    mkdir -p dev_communication/coordination
    mkdir -p dev_communication/initscripts
    echo -e "  ${GREEN}✓${NC} dev_communication directories created"
fi

# Create Claude commands directory (always local)
mkdir -p .claude/commands

echo -e "${GREEN}✓${NC} Directory structure ready"

echo -e "${BLUE}Creating skill files...${NC}"

# Create comms.md skill
if should_create_file ".claude/commands/comms.md"; then
cat > .claude/commands/comms.md << 'SKILL_EOF'
---
name: comms
description: Manage inter-team communication and issue tracking
argument-hint: "[check|send|issue|status|move|archive]"
---

# Inter-Team Communication

Manage messages and issues between API and UI teams.

## Actions

Based on arguments ($ARGUMENTS), perform one of these actions:

### 1. CHECK (default - no arguments)

Check inbox for new messages and pending issues.

**Trigger:** `/comms`, `/comms check`

**Steps:**
1. Scan `dev_communication/messaging/{inbox}/` for unread messages
2. Scan `dev_communication/issues/{team}/queue/` for pending issues
3. Scan `dev_communication/issues/{team}/active/` for in-progress issues
4. Report findings with counts and summaries

### 2. SEND

Send a message to the other team.

**Trigger:** `/comms send`

**Steps:**
1. Ask for: Subject, Priority (Critical/High/Medium/Low), Type (Request/Response/Info), Content
2. Generate filename: `YYYY-MM-DD_{subject_slug}.md`
3. Create in `dev_communication/messaging/{outbox}/`
4. Use template from `dev_communication/messaging/templates/`

### 3. ISSUE

Create a new issue.

**Trigger:** `/comms issue`

**Steps:**
1. Ask for: Title, Priority, Description, Acceptance Criteria
2. Find next issue number by scanning existing issues
3. Generate ID: `{TEAM}-ISS-{NNN}`
4. Create in `dev_communication/issues/{team}/queue/`

### 4. STATUS

Update team status file.

**Trigger:** `/comms status`

**Steps:**
1. Read current status from `dev_communication/coordination/{team}-team-status.md`
2. Ask what to update: Current Focus, Blockers, Recent Completions
3. Write updated status with timestamp

### 5. MOVE

Move issue to different stage.

**Trigger:** `/comms move {ISS-ID} {active|completed}`

**Steps:**
1. Parse issue ID and target stage from arguments
2. Find issue file in current location
3. Move file to target directory (`active/` or `completed/`)
4. Add status update with timestamp to the issue file

### 6. ARCHIVE

Archive a processed message.

**Trigger:** `/comms archive {filename}`

**Steps:**
1. Find message in inbox
2. Move to `dev_communication/messaging/archive/`
3. Add archived date to file

## File Locations

```
dev_communication/
├── issues/
│   ├── api/{queue,active,completed}/
│   └── ui/{queue,active,completed}/
├── messaging/
│   ├── api-to-ui/     # API outbox / UI inbox
│   ├── ui-to-api/     # UI outbox / API inbox
│   └── archive/
└── coordination/
    ├── api-team-status.md
    └── ui-team-status.md
```

## Templates

Use templates from `dev_communication/messaging/templates/` and `dev_communication/issues/templates/`.
SKILL_EOF
file_created ".claude/commands/comms.md"
fi

# Create adr.md skill
if should_create_file ".claude/commands/adr.md"; then
cat > .claude/commands/adr.md << 'SKILL_EOF'
---
name: adr
description: Manage architecture decisions, gaps, and suggestions
argument-hint: "[check|check security|check adaptive|gaps|suggest|poll|create|review]"
---

# Architecture Decision Management

Manage ADRs, track gaps, and process suggestions.

## Actions

Based on arguments ($ARGUMENTS), perform one of these actions:

### 1. STATUS (default - no arguments)

Show current architecture status.

**Trigger:** `/adr`, `/adr status`

**Steps:**
1. Read `dev_communication/architecture/index.md`
2. Count files in `dev_communication/architecture/suggestions/` (excluding index.md)
3. Read `dev_communication/architecture/gaps/index.md` for gap count
4. Count ADRs in architecture decisions directory

**Output:**
```
## Architecture Status

### ADRs: [count] documented
### Gaps: [count] known
### Suggestions: [count] pending review

Use `/adr check` for full analysis.
```

### 2. CHECK - Full Traversal & Analysis

**Trigger:** `/adr check`, `/adr check [domain]`

**Arguments:**
- `security` - Deep dive on security architecture
- `adaptive` - Focus on adaptive learning architecture
- `[domain]` - Focus on specific domain (auth, billing, content, ui, infra, etc.)

**Steps:**
1. Read architecture index
2. Read decision log
3. Scan all ADRs and extract: ID, Title, Status, Domain
4. Compare against expected architecture areas
5. Read gaps index
6. Generate comprehensive report

### 3. GAPS - Gap Analysis Only

**Trigger:** `/adr gaps`

**Steps:**
1. Read `dev_communication/architecture/gaps/index.md`
2. Summarize each gap: Domain, Priority, Suggested ADR
3. Recommend top 3 to address

### 4. SUGGEST - Create Architecture Suggestion

**Trigger:** `/adr suggest`, `/adr suggest [topic]`

**Steps:**
1. If no topic, ask for: Topic, Context, Teams affected, Priority
2. Generate filename: `YYYY-MM-DD_{team}_{topic_slug}.md`
3. Create in `dev_communication/architecture/suggestions/`
4. Confirm created

### 5. POLL - Scan Messages/Issues for Architecture Decisions

**Trigger:** `/adr poll`

**Steps:**
1. Scan messaging directories for unprocessed messages
2. Scan active issues
3. Look for keywords: "architecture", "pattern", "design decision", "convention"
4. Report findings and recommendations

### 6. CREATE - Create ADR from Suggestion or New

**Trigger:** `/adr create`, `/adr create [suggestion-file]`

**Steps:**
1. If suggestion provided, read it
2. Otherwise ask for: Domain, Title, Context, Decision, Consequences
3. Generate ADR content using template
4. Save to architecture decisions directory
5. Update decision log
6. If from suggestion, archive it

**ADR Skeleton Template:**

```markdown
# ADR-{DOMAIN}-{NUMBER}: {Title}

**Status:** Proposed
**Date:** {YYYY-MM-DD}
**Domain:** {domain}

## Context
[What problem or decision needs to be addressed?]

## Decision
[What is the proposed solution?]

## Consequences
### Positive
- [Benefit 1]

### Negative
- [Tradeoff 1]

## Links
- Related ADRs: [[ADR-XXX-NNN]]
```

### 7. REVIEW - Review/Update Existing ADR

**Trigger:** `/adr review [ADR-ID]`

**Steps:**
1. Read the ADR
2. Check for staleness, missing links, implementation drift
3. Suggest updates if needed
4. If approved, update the ADR

## File Locations

```
dev_communication/architecture/
├── index.md              # Hub dashboard
├── suggestions/          # Ingestion directory
└── gaps/                 # Gap tracker
```
SKILL_EOF
file_created ".claude/commands/adr.md"
fi

echo -e "${BLUE}Creating index files...${NC}"

# Skip shared files if dev_communication is a symlink
if [ "$SKIP_SHARED" = true ]; then
    echo -e "  ${YELLOW}→${NC} Skipping shared index files (symlinked)"
else

# Create dev_communication index
if should_create_file "dev_communication/index.md"; then
cat > dev_communication/index.md << EOF
# Dev Communication Hub

Central dashboard for inter-team communication and issue tracking.

## Guides

- [[PROCESS_GUIDE|Process Guide]] - Complete workflow documentation
- [[INSTALL_GUIDE|Installation Guide]] - Setup instructions

## Quick Links

- [[messaging/index|Messages]]
- [[issues/index|Issues]]
- [[coordination/index|Coordination]]
- [[architecture/index|Architecture]]

## Current Status

### API Team
- **Focus:** See [[coordination/api-team-status]]
- **Queue:** [[issues/api/queue/]]
- **Active:** [[issues/api/active/]]

### UI Team
- **Focus:** See [[coordination/ui-team-status]]
- **Queue:** [[issues/ui/queue/]]
- **Active:** [[issues/ui/active/]]

## Message Counts

| Direction | Pending | Archived |
|-----------|---------|----------|
| API → UI | 0 | 0 |
| UI → API | 0 | 0 |

## Issue Counts

| Team | Queue | Active | Completed |
|------|-------|--------|-----------|
| API | 0 | 0 | 0 |
| UI | 0 | 0 | 0 |

---

*Last updated: $(date +%Y-%m-%d)*
EOF
file_created "dev_communication/index.md"
fi

# Create messaging index
if should_create_file "dev_communication/messaging/index.md"; then
cat > dev_communication/messaging/index.md << 'EOF'
# Messages

Inter-team message hub.

## Directories

- `api-to-ui/` - Messages from API team to UI team
- `ui-to-api/` - Messages from UI team to API team
- `archive/` - Processed messages
- `templates/` - Message templates

## Usage

Send message: `/comms send`
Check inbox: `/comms check`
Archive: `/comms archive {filename}`
EOF
file_created "dev_communication/messaging/index.md"
fi

# Create issues index
if should_create_file "dev_communication/issues/index.md"; then
cat > dev_communication/issues/index.md << 'EOF'
# Issues

Issue tracking for both teams.

## Structure

Each team has three directories:
- `queue/` - Pending issues waiting to be started
- `active/` - Issues currently being worked on
- `completed/` - Finished issues

## Usage

Create issue: `/comms issue`
Start work: `/comms move ISS-XXX active`
Complete: `/comms move ISS-XXX completed`
EOF
file_created "dev_communication/issues/index.md"
fi

# Create architecture index
if should_create_file "dev_communication/architecture/index.md"; then
cat > dev_communication/architecture/index.md << 'EOF'
# Architecture Hub

Architecture decision tracking and suggestions.

## Links

- [[suggestions/index|Pending Suggestions]]
- [[gaps/index|Known Gaps]]

## Usage

Check status: `/adr`
Full analysis: `/adr check`
View gaps: `/adr gaps`
Create suggestion: `/adr suggest`
Scan for concerns: `/adr poll`
EOF
file_created "dev_communication/architecture/index.md"
fi

# Create suggestions index
if should_create_file "dev_communication/architecture/suggestions/index.md"; then
cat > dev_communication/architecture/suggestions/index.md << 'EOF'
# Architecture Suggestions

Pending suggestions for architecture decisions.

## Pending

*No pending suggestions*

## Template

When creating a suggestion, include:
- Topic/Title
- Context (what prompted this)
- Teams affected
- Priority assessment
EOF
file_created "dev_communication/architecture/suggestions/index.md"
fi

# Create gaps index
if should_create_file "dev_communication/architecture/gaps/index.md"; then
cat > dev_communication/architecture/gaps/index.md << 'EOF'
# Architecture Gaps

Known gaps in architecture documentation.

## Gap Summary

| Priority | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

## High Priority Gaps

*None identified yet*

## Medium Priority Gaps

*None identified yet*

## Recently Closed Gaps

| Gap | ADR Created | Date |
|-----|-------------|------|
| | | |
EOF
file_created "dev_communication/architecture/gaps/index.md"
fi

# Create coordination index
if should_create_file "dev_communication/coordination/index.md"; then
cat > dev_communication/coordination/index.md << 'EOF'
# Coordination Hub

Team coordination and status tracking.

## Team Status

- [[api-team-status|API Team]]
- [[ui-team-status|UI Team]]

## Cross-Team Dependencies

See [[dependencies]] for blockers and shared work.
EOF
file_created "dev_communication/coordination/index.md"
fi

# Create team status files
if should_create_file "dev_communication/coordination/api-team-status.md"; then
cat > dev_communication/coordination/api-team-status.md << EOF
# API Team Status

**Last Updated:** $(date +%Y-%m-%d)

## Current Focus

*Not set*

## In Progress

*None*

## Blockers

*None*

## Recent Completions

*None*
EOF
file_created "dev_communication/coordination/api-team-status.md"
fi

if should_create_file "dev_communication/coordination/ui-team-status.md"; then
cat > dev_communication/coordination/ui-team-status.md << EOF
# UI Team Status

**Last Updated:** $(date +%Y-%m-%d)

## Current Focus

*Not set*

## In Progress

*None*

## Blockers

*None*

## Recent Completions

*None*
EOF
file_created "dev_communication/coordination/ui-team-status.md"
fi

# Create dependencies file
if should_create_file "dev_communication/coordination/dependencies.md"; then
cat > dev_communication/coordination/dependencies.md << 'EOF'
# Cross-Team Dependencies

## API Blocked by UI

*None*

## UI Blocked by API

*None*

## Shared Work

*None*
EOF
file_created "dev_communication/coordination/dependencies.md"
fi

echo -e "${BLUE}Creating templates...${NC}"

# Create issue template
if should_create_file "dev_communication/issues/templates/issue-template.md"; then
cat > dev_communication/issues/templates/issue-template.md << 'EOF'
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

---

## Status Updates

| Date | Status | Notes |
|------|--------|-------|
| | | |
EOF
file_created "dev_communication/issues/templates/issue-template.md"
fi

# Create message templates
if should_create_file "dev_communication/messaging/templates/request.md"; then
cat > dev_communication/messaging/templates/request.md << 'EOF'
# Message: {Subject}

**From:** {API|UI} Team
**To:** {UI|API} Team
**Date:** YYYY-MM-DD
**Priority:** High | Medium | Low
**Type:** Request

## Content

[Your message here]

## Action Required

- [ ] [What you need from them]

## Related

- Issue: {ISS-XXX}
EOF
file_created "dev_communication/messaging/templates/request.md"
fi

if should_create_file "dev_communication/messaging/templates/response.md"; then
cat > dev_communication/messaging/templates/response.md << 'EOF'
# Message: RE: {Subject}

**From:** {API|UI} Team
**To:** {UI|API} Team
**Date:** YYYY-MM-DD
**Priority:** High | Medium | Low
**Type:** Response

## Content

[Your response]

## Related

- Original message: {link}
- Issue: {ISS-XXX}
EOF
file_created "dev_communication/messaging/templates/response.md"
fi

fi  # End SKIP_SHARED block

echo -e "${BLUE}Updating CLAUDE.md...${NC}"

# Check if CLAUDE.md exists
if [ -f "CLAUDE.md" ]; then
    echo "CLAUDE.md already exists. Adding dev communication section..."

    # Check if section already exists
    if grep -q "## Dev Communication" CLAUDE.md; then
        echo "Dev Communication section already exists in CLAUDE.md"
    else
        cat >> CLAUDE.md << EOF

---

## Dev Communication

**Location:** \`./dev_communication/\`
**Skill:** \`/comms\`

Inter-team communication hub for ${TEAM^^} ↔ ${OTHER_TEAM^^} coordination:
- **Messages:** \`messaging/${OUTBOX}/\` (outbox), \`messaging/${INBOX}/\` (inbox)
- **Issues:** \`issues/${TEAM}/{queue,active,completed}/\`
- **Status:** \`coordination/${TEAM}-team-status.md\`

Use \`/comms\` skill for:
- \`/comms\` or \`/comms check\` - Check inbox and pending issues
- \`/comms send\` - Send message to ${OTHER_TEAM^^} team
- \`/comms issue\` - Create new issue
- \`/comms status\` - Update team status
- \`/comms move\` - Move issue through lifecycle

---

## Architecture Decisions

**Hub:** \`dev_communication/architecture/\`
**Skill:** \`/adr\`

Use \`/adr\` skill for:
- \`/adr\` - Show status (ADRs, gaps, suggestions)
- \`/adr check\` - Full traversal and gap analysis
- \`/adr gaps\` - View known gaps
- \`/adr suggest\` - Create suggestion for review
- \`/adr poll\` - Scan messages/issues for architecture concerns
- \`/adr create\` - Create new ADR

### Supervisor Feedback Loop

After completing significant work, consider:
1. Did this establish a new pattern? → \`/adr suggest\`
2. Did this resolve a design issue? → \`/adr suggest\`
3. Does this affect the other team? → \`/comms send\`
EOF
        echo -e "${GREEN}✓${NC} Added sections to CLAUDE.md"
    fi
else
    cat > CLAUDE.md << EOF
# Project Instructions

## Dev Communication

**Location:** \`./dev_communication/\`
**Skill:** \`/comms\`

Inter-team communication hub for ${TEAM^^} ↔ ${OTHER_TEAM^^} coordination:
- **Messages:** \`messaging/${OUTBOX}/\` (outbox), \`messaging/${INBOX}/\` (inbox)
- **Issues:** \`issues/${TEAM}/{queue,active,completed}/\`
- **Status:** \`coordination/${TEAM}-team-status.md\`

Use \`/comms\` skill for:
- \`/comms\` or \`/comms check\` - Check inbox and pending issues
- \`/comms send\` - Send message to ${OTHER_TEAM^^} team
- \`/comms issue\` - Create new issue
- \`/comms status\` - Update team status
- \`/comms move\` - Move issue through lifecycle

---

## Architecture Decisions

**Hub:** \`dev_communication/architecture/\`
**Skill:** \`/adr\`

Use \`/adr\` skill for:
- \`/adr\` - Show status (ADRs, gaps, suggestions)
- \`/adr check\` - Full traversal and gap analysis
- \`/adr gaps\` - View known gaps
- \`/adr suggest\` - Create suggestion for review
- \`/adr poll\` - Scan messages/issues for architecture concerns
- \`/adr create\` - Create new ADR

### Supervisor Feedback Loop

After completing significant work, consider:
1. Did this establish a new pattern? → \`/adr suggest\`
2. Did this resolve a design issue? → \`/adr suggest\`
3. Does this affect the other team? → \`/comms send\`
EOF
    echo -e "${GREEN}✓${NC} Created CLAUDE.md"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Dev Communication Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Team: ${TEAM^^}"
echo "Inbox: dev_communication/messaging/${INBOX}/"
echo "Outbox: dev_communication/messaging/${OUTBOX}/"
echo "Issues: dev_communication/issues/${TEAM}/"
echo ""
echo "Quick start:"
echo "  /comms        - Check inbox and issues"
echo "  /comms send   - Send message to ${OTHER_TEAM^^} team"
echo "  /comms issue  - Create new issue"
echo "  /adr          - Check architecture status"
echo ""
echo "See dev_communication/PROCESS_GUIDE.md for full documentation."
