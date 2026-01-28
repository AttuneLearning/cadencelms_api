# ADR-006: PDF Generation

**Status:** Approved  
**Date:** 2026-01-14  
**Domain:** Billing  

## Context

The system needs PDF generation for certificates without heavy external dependencies.

## Decision

Use PDFKit for PDF generation.

## Rationale

Lightweight, pure Node.js, fast, and sufficient for certificate generation.

## Implementation Notes

- PDFKit for certificate generation.
- Template-based design with customization.
- Generate on-demand (not stored as files).
- Cache generated PDFs in S3 with TTL.

## Alternatives Considered

- Puppeteer (heavier, requires Chrome, better for complex layouts).
- wkhtmltopdf (external binary dependency).

## Links

- Decision log: [[../decision-log]]
- Source: ../../../specs/BILLING_REGISTRATION_SYSTEM_SPEC.md
