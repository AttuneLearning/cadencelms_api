# Architecture Gaps

Tracking known gaps in architecture documentation.

## Purpose

This directory tracks architectural areas that need ADRs but haven't been formally documented yet. Gaps are identified through:
- `/adr check` gap analysis
- Deferred suggestions
- Development discoveries

---

## Gap Summary

| Priority | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 1 |

---

## Critical Gaps

*None currently*

---

## High Priority Gaps

### Multi-tenancy / Department Isolation

**Domain:** Platform/Auth
**Why it matters:** Core to data security and access control
**Current state:** Implemented but not formally documented
**Suggested ADR:** ADR-AUTH-002-MULTI-TENANCY-MODEL
**Blocking:** Nothing, but increases tech debt risk

### Adaptive Learning Architecture

**Domain:** Content/Learning
**Why it matters:** New system being built, decisions being made
**Current state:** Implementation plan exists, no formal ADR
**Suggested ADR:** ADR-CONTENT-002-ADAPTIVE-LEARNING-ARCHITECTURE
**Blocking:** Could lead to inconsistent implementation

---

## Medium Priority Gaps

### Session Management

**Domain:** Platform/Auth
**Why it matters:** Security, user experience, token lifecycle
**Current state:** Implemented, not documented
**Suggested ADR:** ADR-AUTH-003-SESSION-MANAGEMENT

### Notification Architecture

**Domain:** Business Operations
**Why it matters:** Email, in-app, push - needs consistent approach
**Current state:** Partial implementation, no unified design
**Suggested ADR:** ADR-OPS-001-NOTIFICATION-ARCHITECTURE

### Reporting Architecture

**Domain:** Business Operations
**Why it matters:** Report generation, analytics, exports
**Current state:** Basic implementation exists
**Suggested ADR:** ADR-OPS-002-REPORTING-ARCHITECTURE

### CI/CD Pipeline Design

**Domain:** Infrastructure
**Why it matters:** Deployment consistency, rollback strategy
**Current state:** Exists but not documented
**Suggested ADR:** ADR-INFRA-002-CICD-PIPELINE

---

## Low Priority Gaps

### External Integrations (LTI, xAPI, SAML)

**Domain:** Integration
**Why it matters:** Future extensibility
**Current state:** Not yet implemented
**Suggested ADR:** ADR-INT-001-EXTERNAL-INTEGRATIONS

---

## Gap Lifecycle

```
Identified → Prioritized → Scheduled → ADR Created → Closed
```

1. **Identified** - Gap discovered via analysis or suggestion
2. **Prioritized** - Assigned Critical/High/Medium/Low
3. **Scheduled** - Assigned to sprint/milestone
4. **ADR Created** - Formal documentation complete
5. **Closed** - Remove from gaps, update this index

---

## Recently Closed Gaps

| Gap | ADR Created | Date |
|-----|-------------|------|
| Offline Strategy (UI) | ADR-UI-001-FSD-ARCHITECTURE | 2026-01-27 |

---

[[../index|← Back to Architecture Hub]]
