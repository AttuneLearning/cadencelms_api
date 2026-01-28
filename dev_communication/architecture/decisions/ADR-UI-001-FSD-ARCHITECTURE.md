# ADR-UI-001: Feature-Sliced Design Architecture

**Status:** Accepted
**Date:** 2026-01-07
**Domain:** UI

## Context

The LMS UI V2 required a complete rewrite (no migration from V1) with these constraints:

1. **Maintainability** - Clear architectural boundaries to prevent decay over time
2. **AI-Assisted Development** - Architecture optimized for agentic team development with isolated, well-defined slices
3. **Mobile Readiness** - Business logic structured for extraction to React Native (6-12 month timeline)
4. **Offline-First** - SCORM + documents available offline with sync
5. **Performance** - Lighthouse 90+ score target

## Decision

Adopt **Feature-Sliced Design (FSD)** as the UI architecture pattern.

### Layer Structure

```
src/
├── app/           # Application layer (highest) - providers, router, global styles
├── processes/     # Cross-feature business processes (auth flow, offline-sync)
├── pages/         # Route components
├── widgets/       # Composite UI blocks (header, scorm-player)
├── features/      # User interactions (auth, enrollment, progress)
├── entities/      # Business entities (user, course, content)
└── shared/        # Shared utilities (lowest) - api client, ui components, lib
```

### Layer Import Rules

```
app       → processes, pages, widgets, features, entities, shared
processes → pages, widgets, features, entities, shared
pages     → widgets, features, entities, shared
widgets   → features, entities, shared
features  → entities, shared
entities  → shared
shared    → (no internal dependencies)
```

**Key Constraints:**
- Features CANNOT import from other features
- Entities CANNOT import from features
- Same-layer imports only via public API (index.ts)
- ESLint enforces layer boundaries via `@feature-sliced/eslint-config`

### Technology Stack

| Category | Technology | Rationale |
|----------|------------|-----------|
| Framework | React 18 + TypeScript 5.4 + Vite 6 | Modern, fast, type-safe |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible primitives |
| Server State | TanStack Query | Caching, offline persistence, refetching |
| Client State | Zustand | Simple, persisted, for auth/UI state |
| Forms | React Hook Form + Zod | Validation, works in React Native |
| Offline | Dexie (IndexedDB) + Workbox (Service Worker) | SCORM offline, asset caching |
| Testing | Vitest + Testing Library + Playwright | Fast unit tests, E2E for critical flows |

### State Management Strategy

**Server State (TanStack Query):**
- Courses, content, enrollments, user data
- Caching with `staleTime: 5min`, `cacheTime: 24h`
- Offline persistence via `@tanstack/react-query-persist-client`

**Client State (Zustand):**
- Auth tokens, role, UI state, user preferences
- Persisted to localStorage

**Form State (React Hook Form):**
- Temporary form data, validation via Zod

### Offline Architecture

| Storage | Use Case |
|---------|----------|
| File System API | Large SCORM packages (Chrome/Edge) |
| IndexedDB (Dexie) | SCORM fallback, documents, sync queue |
| Service Worker (Workbox) | Asset caching, API cache-first |
| localStorage | TanStack Query cache, auth tokens |

**Sync Queue:** Mutations queued offline, synced when online with conflict resolution.

## Consequences

### Positive

- **Clear boundaries** - ESLint-enforced rules prevent architectural decay
- **AI-friendly** - Isolated slices with clear specifications enable agentic development
- **Mobile extraction** - Business logic in `entities/` and `features/*/model/` has no DOM dependencies
- **Testable** - Each layer can be tested in isolation
- **Scalable** - New features are self-contained slices

### Negative

- **Learning curve** - FSD has specific rules that differ from typical React patterns
- **Boilerplate** - Each feature requires api/, model/, ui/ subdirectories
- **Strict imports** - Cannot share logic between features (must extract to entities/shared)

### Risks

- **Over-engineering** - Risk of creating too many abstraction layers
- **Migration friction** - If team members are unfamiliar with FSD

## Alternatives Considered

### Monorepo + React Native Web
- **Rejected:** Too complex for web-first approach; mobile not immediate priority

### Micro-frontends
- **Rejected:** Overkill for team size and deployment needs

### Traditional feature folders (no strict layers)
- **Rejected:** No enforcement of architectural boundaries; tends to decay over time

## Sub-Decisions (Embedded in FSD Spec)

| ID | Decision | Summary |
|----|----------|---------|
| AD-001 | Architecture Pattern | Feature-Sliced Design |
| AD-002 | Styling System | Tailwind CSS + shadcn/ui |
| AD-003 | State Management | TanStack Query + Zustand |
| AD-004 | Offline Strategy | SCORM + Documents with IndexedDB + File System API |
| AD-005 | Mobile Strategy | Structure for 6-12 month extraction |
| AD-006 | Team Structure | AI-assisted development with human oversight |
| AD-007 | Testing Approach | Unit tests (primary) + Essential integration tests |
| AD-008 | First Feature | Learner Dashboard + Course Viewer |
| AD-009 | Performance Targets | Lighthouse 90+ score |
| AD-010 | Permissions Model | Component-level permission checks |
| AD-011 | Error Handling | Sentry + React Error Boundaries |
| AD-012 | Documentation | JSDoc + TypeScript types |
| AD-013 | CI/CD | GitHub Actions |
| AD-014 | Design System | Dark mode, WCAG 2.1 AA, Mobile-first |

## Links

- Decision log: [[../decision-log]]
- Full specification: `cadencelms_ui/devdocs/architecture/FSD_IMPLEMENTATION_SPEC.md`
- Related ADRs:
  - [[ADR-UI-FORM-001-STANDARDIZED-FORM-PATTERN]] - Form patterns within FSD
  - [[ADR-CONTENT-001-CONTENT-DELIVERY-ARCHITECTURE]] - References FSD offline strategy
  - [[ADR-SCORM-001-SCORM-RUNTIME-ARCHITECTURE]] - UI uses scorm-again per FSD spec
