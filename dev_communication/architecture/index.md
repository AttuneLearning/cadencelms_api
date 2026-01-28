# Architecture Hub

Central hub for architecture decisions, gaps, and suggestions across API and UI teams.

## Quick Links

- [[decision-log|Decision Log]]
- [[decisions/index|All Decisions]]
- [[suggestions/index|Pending Suggestions]]
- [[gaps/index|Known Gaps]]
- [[templates/adr-template|ADR Template]]

## Skill

Use `/adr` skill for architecture management:

| Command | Purpose |
|---------|---------|
| `/adr` | Show status: ADRs, gaps, suggestions |
| `/adr check` | Full traversal and gap analysis |
| `/adr gaps` | Gap analysis only |
| `/adr suggest` | Create suggestion for review |
| `/adr poll` | Scan messages/issues for decisions |
| `/adr create` | Create ADR from suggestion |
| `/adr review` | Review/update existing ADR |

---

## Decision Tree (by domain)

### Platform / Auth
- [[decisions/ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]]

### Platform / API
- [[decisions/ADR-API-001-API-DESIGN-STANDARDS]]
- [[decisions/ADR-API-002-API-CACHING-STRATEGY]]
- [[decisions/ADR-API-003-REST-CONVENTIONS]]

### Data
- [[decisions/ADR-DATA-001-DATA-ARCHITECTURE]]

### Security
- [[decisions/ADR-SEC-001-SECURITY-ARCHITECTURE]]

### Content / Learning
- [[decisions/ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE]]
- [[decisions/ADR-SCORM-001-SCORM-RUNTIME-ARCHITECTURE]]

### Infrastructure
- [[decisions/ADR-INFRA-001-INFRASTRUCTURE-ARCHITECTURE]]

### UI / Frontend
- [[decisions/ADR-UI-001-FSD-ARCHITECTURE]]
- [[decisions/ADR-UI-FORM-001-STANDARDIZED-FORM-PATTERN]]

### Billing / Registration System
- [[decisions/ADR-001-REFUND-POLICY]]
- [[decisions/ADR-002-TAX-CALCULATION]]
- [[decisions/ADR-003-MULTI-CURRENCY-SUPPORT]]
- [[decisions/ADR-004-GUEST-CHECKOUT]]
- [[decisions/ADR-005-PAYMENT-PROCESSOR]]
- [[decisions/ADR-006-PDF-GENERATION]]
- [[decisions/ADR-007-EMAIL-PROVIDER]]

---

## Current Status

| Domain | Count | Status |
|--------|-------|--------|
| Billing | 7 | Approved |
| API | 3 | Accepted |
| Auth | 1 | Accepted |
| UI | 2 | Accepted |
| Data | 1 | Accepted |
| Security | 1 | Accepted |
| Content | 1 | Accepted |
| SCORM | 1 | Accepted |
| Infrastructure | 1 | Accepted |
| **Total** | **18** | |

---

## Known Gaps

| Domain | Gap | Priority |
|--------|-----|----------|
| Auth | Multi-tenancy | High |
| Content | Adaptive Learning | High |
| Auth | Session Management | Medium |
| Ops | Notifications | Medium |
| Ops | Reporting | Medium |
| Infrastructure | CI/CD | Medium |
| Integration | External (LTI, xAPI) | Low |

*See [[gaps/index]] for details*

---

## Feedback Loop

Architecture suggestions come from:
1. **Development work** - Patterns discovered during implementation
2. **Code review** - Decisions that should be documented
3. **Problem resolution** - Solutions that establish precedent
4. **Cross-team coordination** - Shared architectural concerns

See [[../coordination/supervisor-protocol|Supervisor Protocol]] for feedback process.

---

## Creating New ADRs

1. Create suggestion via `/adr suggest`
2. Review in weekly/sprint architecture review
3. If accepted, create ADR via `/adr create`
4. Update [[decision-log]] and this index

Template: [[templates/adr-template]]

---

## How to Use (Obsidian)

1. Start with [[decision-log]] to see the full list, status, and dates
2. Open a decision and review Context, Decision, Consequences, and Links
3. Use backlinks to see downstream impact and related decisions

---

[[../index|← Back to Dev Communication Hub]]
