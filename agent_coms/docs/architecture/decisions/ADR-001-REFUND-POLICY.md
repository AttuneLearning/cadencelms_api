# ADR-001: Refund Policy

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

Refund policy needed to balance user support with fraud/abuse risk in the Billing & Registration system.

## Decision

Refunds require admin approval.

## Rationale

Prevents abuse and allows case-by-case review.

## Implementation Notes

- No automatic refunds.
- Refund requests go to the `billing-admin` queue.
- Approval creates refund in payment processor.
- Rejection sends notification with reason.

## Links

- Decision log: [[../decision-log]]
- Source: ../../../specs/BILLING_REGISTRATION_SYSTEM_SPEC.md
