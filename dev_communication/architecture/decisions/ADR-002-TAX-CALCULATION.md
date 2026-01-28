# ADR-002: Tax Calculation

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

Billing system requires automated tax calculation that handles nexus complexity and rate updates.

## Decision

Use TaxJar for automated tax calculation.

## Rationale

Industry standard, strong API, and automatic rate updates. Supports complex nexus requirements.

## Implementation Notes

- Integrate TaxJar API for tax calculation.
- Fallback: Manual tax rate configuration per department/region.
- Support tax-exempt organizations.

## Alternatives Considered

- Avalara (higher cost, enterprise focus).
- Manual configuration (maintenance burden).

## Links

- Decision log: [[../decision-log]]
- Source: ../../../specs/BILLING_REGISTRATION_SYSTEM_SPEC.md
