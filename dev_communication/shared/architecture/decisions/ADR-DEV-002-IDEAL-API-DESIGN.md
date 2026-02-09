# ADR-DEV-002: Ideal API Design First

**Status:** Accepted
**Date:** 2026-01-29
**Domain:** Development Process

## Context

During the Question System migration, backward compatibility layers were added (deprecated fields, normalization utilities, fallback patterns) despite the original spec explicitly stating "No Backwards Compatibility - Nothing in production, always ideal API design."

This created:
- Duplicated fields (`questionType` + `questionTypes[]`, `correctAnswer` + `correctAnswers[]`)
- Complex normalization code to transform between formats
- Confusion about which fields to use
- Technical debt that will need cleanup later

The root cause: development principles weren't captured in a location that Claude Code agents read every session.

## Decision

**Unless otherwise specified, always design for the ideal API/route structure.**

This means:
1. **No backward compatibility layers** - Don't add deprecated fields, legacy fallbacks, or migration shims unless explicitly requested
2. **No production data assumption** - Treat greenfield features as having no existing data to maintain
3. **Clean over compatible** - Prefer simple, clean code over complex backward-compatible code
4. **Update callers** - If a change breaks existing code, update the existing code rather than adding compatibility layers

### When Backward Compatibility IS Needed

Only add backward compatibility when:
1. User explicitly requests it
2. There is confirmed production data that would break
3. External systems depend on the current API shape
4. A migration period is explicitly defined with removal date

In these cases, document:
- What the compatibility layer is
- Why it's needed
- When it will be removed

## Consequences

### Positive
- Cleaner, simpler codebase
- No accumulation of deprecated code paths
- Faster development (no dual-format handling)
- Clear API contracts without legacy baggage

### Negative
- May require more upfront coordination with API team
- Breaking changes require updating all callers immediately
- Less forgiving of incomplete specifications

### Neutral
- Requires development principles to be captured in CLAUDE.md

## Implementation

1. Add "Development Principles" section to CLAUDE.md (both UI and API projects)
2. Create `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md` with detailed guidelines
3. Reference principles in CLAUDE.md for every-session visibility

## Links

- Related: [[ADR-API-001-API-DESIGN-STANDARDS]]
- Triggered by: Question System Migration (UI-ISS-075 through UI-ISS-080)
