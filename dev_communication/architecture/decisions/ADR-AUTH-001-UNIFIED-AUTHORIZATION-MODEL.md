# ADR-AUTH-001: Unified Authorization Model

**Status:** Accepted  
**Date:** 2026-01-22  
**Domain:** Platform/Auth  

## Context

The existing authorization model used two parallel systems:
- Route-level checks via `requireAccessRight('content:courses:read')` against `allAccessRights`.
- Service-level checks via manual `departmentMemberships` + role logic.
- This created inconsistent behavior and 3-10+ DB queries per request without caching.

## Decision

Replace the dual authorization system with a unified scoped permissions model:
- A single `authorize(user, right, { resource })` function.
- Cached permissions with `globalRights` + `departmentRights`.
- 0-1 DB queries per request.

## Consequences

- Single source of truth for permission checks.
- A phased migration to deprecate and remove legacy checks.
- Architecture reviews required per migration phase.

## Migration Plan

1. Phase 1: Add caching (non-breaking).  
2. Phase 2: Add unified structure (non-breaking).  
3. Phase 3: Migrate checks (deprecate old).  
4. Phase 4: Remove deprecated paths.

## Links

- Decision log: [[../decision-log]]
- Source: ../../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md
- Spec: ../../../api/specs/UNIFIED_AUTHORIZATION_MODEL.md
