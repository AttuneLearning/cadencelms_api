# ADR-DEV-001: Testing Strategy

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Development Process

## Context

Consistent testing practices are essential for code quality. Without a defined strategy, teams may skip tests, write inconsistent tests, or miss critical scenarios.

## Decision

### Lazy TDD Philosophy

Write tests **after** completing each development phase, not during implementation. This balances velocity with quality.

### Test Tiers

| Tier | When | Scope |
|------|------|-------|
| T1 | Per-phase | Unit + integration for completed phase |
| T2 | Milestone | Cross-feature integration |
| T3 | Always | `tsc --noEmit` type check |

### Test Requirements by Change Type

| Change Type | Required Tests |
|-------------|----------------|
| Bug fix | Regression test proving fix |
| New endpoint | Integration test |
| New UI component | Unit test for rendering |
| New feature | Integration + happy path E2E |
| Refactor | Existing tests must pass |

### Coverage Targets

| Metric | Target | Minimum |
|--------|--------|---------|
| Line coverage | 80% | 60% |
| Branch coverage | 75% | 50% |
| Critical paths | 100% | 90% |

**Critical paths:** Auth flows, payments, data mutations, error handling.

## Consequences

**Positive:** Consistent coverage, clear expectations, faster development with "lazy" approach.

**Negative:** Tests after implementation may miss edge cases, requires discipline.

## Patterns

- `testing-endpoint` - Integration test structure
- `testing-bugfix` - Regression test pattern

## Links

- [[ADR-API-001-API-DESIGN-STANDARDS]]
- `tests/` - API test directory
