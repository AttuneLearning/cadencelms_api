---
name: adr
description: Manage architecture decisions, gaps, and suggestions
argument-hint: "[check|check security|check adaptive|gaps|suggest|poll|create|review]"
---

# Architecture Decision Management

Manage ADRs, track gaps, and process suggestions for CadenceLMS.

## Actions

Based on arguments ($ARGUMENTS) or user request, perform one of these actions:

---

### 1. STATUS (default - no arguments)

Show current architecture status.

**Trigger:** `/adr`, `/adr status`

**Steps:**
1. Read `dev_communication/architecture/index.md`
2. Count files in `dev_communication/architecture/suggestions/` (excluding index.md)
3. Read `dev_communication/architecture/gaps/index.md` for gap count
4. Read `dev_communication/architecture/decision-log.md` for ADR count

**Output:**
```
## Architecture Status

### ADRs: [count] documented
- [count] Accepted
- [count] Approved
- [count] Proposed

### Gaps: [count] known
- [count] High priority
- [count] Medium priority

### Suggestions: [count] pending review

Use `/adr check` for full analysis.
```

---

### 2. CHECK - Full Traversal & Analysis

**Trigger:** `/adr check`, `/adr check [domain]`

**Arguments:**
- `security` - Deep dive on security architecture (validation, XSS/CSRF, audit logging, encryption)
- `adaptive` - Focus on adaptive learning architecture (knowledge nodes, cognitive depth, algorithms)
- `[domain]` - Focus on specific domain (auth, billing, content, ui, infra, etc.)

**Steps:**
1. Read architecture index: `dev_communication/architecture/index.md`
2. Read decision log: `dev_communication/architecture/decision-log.md`
3. Scan all ADRs in: `dev_communication/architecture/decisions/*.md`
4. For each ADR extract: ID, Title, Status, Domain, Key decisions
5. Compare against expected architecture areas (see checklist below)
6. Read `dev_communication/architecture/gaps/index.md`
7. Generate comprehensive report

**Expected Architecture Areas Checklist:**

```
### Core Infrastructure
- [ ] Data Architecture (ADR-DATA-001 ✓)
- [ ] API Design (ADR-API-001 ✓)
- [ ] Security (ADR-SEC-001 ✓)
- [ ] Caching (ADR-API-002 ✓)
- [ ] Monitoring

### Authentication & Authorization
- [ ] Auth Model (ADR-AUTH-001 ✓)
- [ ] Session Management
- [ ] Multi-tenancy

### Content & Learning
- [ ] Content Delivery (ADR-CONTENT-001 ✓)
- [ ] SCORM Runtime (ADR-SCORM-001 ✓)
- [ ] Question/Assessment
- [ ] Adaptive Learning

### User Interface
- [ ] Architecture Pattern (FSD spec ✓)
- [ ] Form Pattern (ADR-UI-FORM-001 ✓)
- [ ] State Management (FSD spec ✓)
- [ ] Offline Strategy

### Business Operations
- [ ] Billing (ADR-001 to 007 ✓)
- [ ] Notifications
- [ ] Reporting

### Integration & Deployment
- [ ] External Integrations
- [ ] CI/CD
- [ ] Infrastructure (ADR-INFRA-001 ✓)
```

If `[domain]` argument provided, focus only on that domain.

---

### 3. GAPS - Gap Analysis Only

**Trigger:** `/adr gaps`

**Steps:**
1. Read `dev_communication/architecture/gaps/index.md`
2. For each gap, summarize: Domain, Priority, Suggested ADR
3. Recommend top 3 to address based on:
   - Current development focus
   - Risk of technical debt
   - Dependencies

**Output:**
```
## Architecture Gaps

### High Priority
1. [Gap] - [Why it matters]
2. [Gap] - [Why it matters]

### Medium Priority
...

### Recommendation
Address these gaps next:
1. [Gap] - [Reason]
```

---

### 4. SUGGEST - Create Architecture Suggestion

**Trigger:** `/adr suggest`, `/adr suggest [topic]`

**Steps:**
1. If no topic, ask for:
   - Topic/title
   - Context (what prompted this)
   - Which team(s) affected
   - Priority assessment
2. Read template from `dev_communication/architecture/suggestions/index.md`
3. Generate filename: `YYYY-MM-DD_{team}_{topic_slug}.md`
4. Create suggestion file in `dev_communication/architecture/suggestions/`
5. Update suggestions index with new entry
6. Confirm created

**Auto-suggest triggers** (for Supervisor agents):
- After completing significant feature
- After resolving complex bug
- During code review when pattern found
- When cross-team coordination reveals architectural concern

---

### 5. POLL - Scan Messages/Issues for Architecture Decisions

**Trigger:** `/adr poll`

**Steps:**
1. Scan `dev_communication/messaging/ui-to-api/` for unprocessed messages
2. Scan `dev_communication/messaging/api-to-ui/` for unprocessed messages
3. Scan `dev_communication/issues/api/active/` for active issues
4. Scan `dev_communication/issues/ui/active/` for active issues
5. Look for keywords: "architecture", "pattern", "design decision", "convention", "standard"
6. For each match:
   - Summarize the architectural concern
   - Suggest if ADR or suggestion needed
7. Report findings

**Output:**
```
## Architecture Poll Results

### Messages with Architecture Concerns
- [filename]: [summary of concern]

### Issues with Architecture Concerns
- [ISS-xxx]: [summary of concern]

### Recommendations
- [Create suggestion for X]
- [Update gap Y]
- [No action needed for Z]
```

---

### 6. CREATE - Create ADR from Suggestion or New

**Trigger:** `/adr create`, `/adr create [suggestion-file]`, `/adr create ADR-XXX-NNN`

**Steps:**
1. If suggestion file provided:
   - Read suggestion from `dev_communication/architecture/suggestions/`
   - Use content to populate ADR
2. If ADR ID provided:
   - Generate from gap or new
3. If neither, ask for:
   - Domain
   - Title
   - Context
   - Decision
   - Consequences

4. Read template: `dev_communication/architecture/templates/adr-template.md`
5. Generate ADR content using skeleton below
6. Save to: `dev_communication/architecture/decisions/ADR-{DOMAIN}-{NNN}-{TITLE}.md`
7. Update: `dev_communication/architecture/decision-log.md`
8. Update: `dev_communication/architecture/index.md`
9. If from suggestion, archive the suggestion
10. If gap addressed, update `dev_communication/architecture/gaps/index.md`
11. Confirm created with file path

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
- [Benefit 2]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Risks
- [Risk and mitigation]

## Links

- Related ADRs: [[ADR-XXX-NNN]]
- Specs: [link to relevant specs]
- Issues: [link to related issues]
```

---

### 7. REVIEW - Review/Update Existing ADR

**Trigger:** `/adr review [ADR-ID]`

**Steps:**
1. Read the ADR from `dev_communication/architecture/decisions/`
2. Check for:
   - Staleness (decisions no longer accurate)
   - Missing links to related ADRs
   - Implementation drift
   - Status accuracy
3. Suggest updates if needed
4. If user approves, update the ADR
5. Update decision log if status changed

---

## File Locations

```
dev_communication/architecture/
├── index.md              # Main hub + vault index
├── decision-log.md       # Canonical ADR list
├── decisions/            # ADR files
├── templates/            # ADR template
├── suggestions/          # Ingestion directory
└── gaps/                 # Gap tracker
```

## Team Context

This skill works for both API and UI teams:
- Suggestions tagged with team
- Gaps affect one or both teams
- ADRs are shared across teams

## Integration with Supervisor Protocol

See `dev_communication/coordination/supervisor-protocol.md` for:
- When to auto-suggest
- Review process
- Feedback loop triggers
