# ADR-UI-FORM-001: Standardized Form Pattern

**Status:** Accepted  
**Date:** 2026-01-22  
**Domain:** UI  

## Context

Forms across the UI used a mix of `register()` and ad-hoc inputs, leading to inconsistent UX, validation messaging, and accessibility wiring.

## Decision

Standardize all forms on the shadcn + React Hook Form pattern via `src/shared/ui/form.tsx`:
- Use `<Form {...form}>` with `FormProvider`.
- Use `FormField` with `control` + `render`.
- Wrap inputs directly with `FormControl` for proper ID/aria wiring.

## Consequences

- Consistent validation UX and accessibility wiring across forms.
- Shared form components become the canonical pattern for new UI work.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-UI-001-FSD-ARCHITECTURE]] (form components within FSD structure)
- Reference:
  - [[../UI_COMPONENT_LIBRARY]] (UI component patterns)
  - `../../guidance/FEATURE_DEVELOPMENT_CHECKLIST.md` (development checklist)
