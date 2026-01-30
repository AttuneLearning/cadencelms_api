# Apply Development Principles to API Project

Instructions for applying the development principles update to the API project.

**Date:** 2026-01-29
**Triggered by:** Question System Migration backward compatibility issue
**ADR:** ADR-DEV-002-IDEAL-API-DESIGN

---

## Changes to Apply

### 1. Create ADR (if not exists)

**File:** `dev_communication/architecture/decisions/ADR-DEV-002-IDEAL-API-DESIGN.md`

Copy from UI project or create with same content. Key points:
- "Unless otherwise specified, always design for ideal API structure"
- No backward compatibility unless explicitly requested
- Clean over compatible

### 2. Create Development Principles Guide

**File:** `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md`

Copy from UI project. Contains:
- Ideal API Design First rule
- No Production Data Assumption
- Clean Over Compatible
- Update Callers Don't Shim
- Spec Authority
- Quick reference table

### 3. Update CLAUDE.md

Add this section at the top (after any existing header):

```markdown
## Development Principles

**Read:** `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md`

**Key Rule:** Unless otherwise specified, always design for the ideal API/route structure. No backward compatibility layers, deprecated fields, or legacy fallbacks unless explicitly requested.

---
```

Keep the rest of CLAUDE.md minimal - just reference the principles file.

---

## Files to Copy

From UI project (`/home/adam/github/cadencelms_ui/`):

| Source | Destination |
|--------|-------------|
| `dev_communication/architecture/decisions/ADR-DEV-002-IDEAL-API-DESIGN.md` | Same path in API |
| `dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md` | Same path in API |

---

## Verification

After applying, verify:

1. `CLAUDE.md` references development principles
2. ADR exists in architecture decisions
3. Principles file exists in guidance folder
4. Running `/adr` shows ADR-DEV-002 in the list

---

## Quick Apply Commands

```bash
# From cadencelms_ui directory
cp dev_communication/architecture/decisions/ADR-DEV-002-IDEAL-API-DESIGN.md \
   ../cadencelms_api/dev_communication/architecture/decisions/

cp dev_communication/guidance/DEVELOPMENT_PRINCIPLES.md \
   ../cadencelms_api/dev_communication/guidance/

# Then manually update API's CLAUDE.md to add the Development Principles section
```

---

## Why This Matters

Without these principles captured in CLAUDE.md:
- Agents default to "safe" backward-compatible code
- Deprecated fields accumulate
- Normalization layers add complexity
- Technical debt grows silently

With principles in CLAUDE.md:
- Every session starts with "ideal design first" mindset
- Backward compatibility only when explicitly needed
- Cleaner, simpler codebase
- Less technical debt
