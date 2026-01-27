# ADR-005: Payment Processor

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

The billing system needs a reliable processor with broad payment method support and future extensibility.

## Decision

Use Stripe as the default payment processor with an extensible architecture.

## Rationale

Best developer experience and widest payment method support.

## Implementation Notes

- Abstract `IPaymentProcessor` interface.
- `PaymentProcessorFactory` for processor selection.
- Configuration-driven processor selection per department.
- Default: Stripe.
- Future: Square, GPay (via Stripe), Elavon.

## Links

- Decision log: [[../decision-log]]
- Source: ../../../specs/BILLING_REGISTRATION_SYSTEM_SPEC.md
