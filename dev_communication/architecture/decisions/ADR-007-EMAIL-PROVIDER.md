# ADR-007: Email Provider

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

The system requires a reliable email provider with good deliverability and extensibility.

## Decision

Use SendGrid as the default email provider with an extensible architecture.

## Rationale

Reliable deliverability and reasonable pricing.

## Implementation Notes

- Abstract `IEmailProvider` interface.
- `EmailProviderFactory` for provider selection.
- Default: SendGrid.
- Planned: Mailgun.
- Template system with variable substitution.

## Links

- Decision log: [[../decision-log]]
- Source: [[../../specs/commerce/BILLING_REGISTRATION_SYSTEM_SPEC]]
