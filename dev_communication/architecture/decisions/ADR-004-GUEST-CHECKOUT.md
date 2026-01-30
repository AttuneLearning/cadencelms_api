# ADR-004: Guest Checkout

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

Purchased courses require user accounts for access and tracking.

## Decision

Login is required before checkout (no guest checkout).

## Rationale

Ensures users have accounts to access purchased content and supports enrollment tracking.

## Implementation Notes

- Redirect to login/register before checkout.
- Cart persists via session ID and merges on login.
- Registration email sent on account creation.

## Links

- Decision log: [[../decision-log]]
- Source: [[../../specs/commerce/BILLING_REGISTRATION_SYSTEM_SPEC]]
