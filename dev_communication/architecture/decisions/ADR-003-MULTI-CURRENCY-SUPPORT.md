# ADR-003: Multi-Currency Support

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

The billing system must support international learners while keeping accounting and reconciliation simple.

## Decision

Use a base settlement currency with multi-currency display at checkout.

## Rationale

Allows international payments while keeping reporting consistent in a single settlement currency.

## Implementation Notes

- Settlement currency: USD (configurable per deployment).
- All reconciliation/reporting in settlement currency.
- Display prices in local currencies at checkout.
- Payment processor handles conversion.
- Store display and settlement amounts + exchange rate at time of transaction.

## Links

- Decision log: [[../decision-log]]
- Source: [[../../specs/commerce/BILLING_REGISTRATION_SYSTEM_SPEC]]
