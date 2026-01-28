---
name: traverse-architecture
description: Traverse architecture documentation, analyze coverage, and identify gaps in ADRs
argument-hint: "[focus-area]"
---

# Architecture Vault Traversal Skill

You are analyzing the CadenceLMS architecture documentation to understand what decisions are recorded and identify gaps.

## Step 1: Read the Architecture Index

Read these files to understand the current architecture documentation structure:

**API Repo:**
- `/home/adam/github/cadencelms_api/agent_coms/docs/architecture/index.md` - Main vault index
- `/home/adam/github/cadencelms_api/agent_coms/docs/architecture/decision-log.md` - Canonical ADR list
- `/home/adam/github/cadencelms_api/agent_coms/dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md` - Dev guidance

**UI Repo:**
- `/home/adam/github/cadencelms_ui/devdocs/architecture/FSD_IMPLEMENTATION_SPEC.md` - FSD architecture spec

## Step 2: Scan All ADRs

Read all Architecture Decision Records in:
- `/home/adam/github/cadencelms_api/agent_coms/docs/architecture/decisions/*.md`

For each ADR, extract:
- ID and Title
- Status (Accepted/Approved/Deprecated/Superseded)
- Domain (Platform/Auth, UI, Billing, Data, API, etc.)
- Key decisions made
- Links to related specs/contracts

## Step 3: Scan Dev Guidance

Check for additional architecture documentation in:
- `/home/adam/github/cadencelms_api/agent_coms/dev_guidance/architecture/`
- `/home/adam/github/cadencelms_ui/devdocs/architecture/`
- `/home/adam/github/cadencelms_ui/devdocs/plans/`

## Step 4: Compare Against Expected Architecture Areas

A complete LMS architecture should have decisions documented for these domains:

### Core Infrastructure
- [ ] **Data Architecture** - Database schema design, indexing, migrations
- [ ] **API Design** - REST conventions, pagination, versioning, error format
- [ ] **Security** - Input validation, XSS/CSRF, audit logging, encryption
- [ ] **Caching** - API caching, database caching, CDN
- [ ] **Monitoring** - Logging, metrics, alerting, health checks

### Authentication & Authorization
- [x] **Auth Model** - ADR-AUTH-001 covers unified authorization
- [ ] **Session Management** - Token lifecycle, refresh strategy
- [ ] **Multi-tenancy** - Department isolation, data boundaries

### Content & Learning
- [ ] **Content Delivery** - File storage, video streaming, CDN
- [ ] **SCORM Runtime** - Package handling, CMI data, offline sync
- [ ] **Question/Assessment** - Question types, grading, versioning
- [ ] **Adaptive Learning** - Knowledge nodes, cognitive depth, algorithms

### User Interface
- [x] **Architecture Pattern** - FSD documented in UI spec
- [x] **Form Pattern** - ADR-UI-FORM-001
- [x] **State Management** - Documented in FSD spec
- [ ] **Offline Strategy** - Mentioned but no formal ADR

### Business Operations
- [x] **Billing Policies** - ADRs 001-007 cover billing decisions
- [ ] **Notifications** - Email, in-app, push notification architecture
- [ ] **Reporting** - Report generation, analytics, exports

### Integration & Deployment
- [ ] **External Integrations** - LTI, xAPI, SAML, webhooks
- [ ] **CI/CD** - Pipeline design, environments, rollback
- [ ] **Infrastructure** - Hosting, scaling, disaster recovery

## Step 5: Generate Report

Output a report with:

### 1. Current Coverage Summary
List all documented ADRs with their status and domain.

### 2. Gap Analysis
For each missing area, explain:
- Why it matters for the LMS
- What decisions need to be made
- Suggested ADR title and priority

### 3. Recommendations
Prioritize which ADRs should be created next based on:
- Current development focus
- Risk of technical debt
- Dependencies between decisions

### 4. Suggested ADR Template

For the top 3 priority gaps, provide a skeleton ADR:

```markdown
# ADR-{DOMAIN}-{NUMBER}: {Title}

**Status:** Proposed
**Date:** {today}
**Domain:** {domain}

## Context
[What problem or decision needs to be addressed?]

## Decision
[What is the proposed solution?]

## Consequences
[What are the implications of this decision?]

## Links
- Related ADRs: [...]
- Specs: [...]
```

## Step 6: Update Decision Log (if requested)

If the user asks to create an ADR, follow the template at:
`/home/adam/github/cadencelms_api/agent_coms/docs/architecture/templates/adr-template.md`

After creating an ADR:
1. Add it to the decision log
2. Update the index.md with the new link
3. Add backlinks to related ADRs

## Arguments

If arguments are provided via $ARGUMENTS, focus the analysis:
- "gaps" - Only report missing areas
- "security" - Deep dive on security architecture
- "adaptive" - Focus on adaptive learning architecture
- "create ADR-{ID}" - Create the specified ADR
- "" (empty) - Full traversal and report
