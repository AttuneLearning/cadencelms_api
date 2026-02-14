# ADR-API-004: Ideal Endpoint Structure and Response Envelope

**Status:** Accepted
**Date:** 2026-02-13
**Domain:** Platform/API

## Context

The current backend surface has drift across endpoint naming, route depth, action modeling, and response envelope shape. We need one canonical target for ideal endpoint structure and response format that is applied directly (no compatibility-first fallback), aligned with product direction.

## Decision

### 1. Base Path Policy

- Default API path root is unprefixed resource paths.
- Canonical pattern: `/{resource}` (example: `/courses`, `/assessments/:assessmentId/attempts`).
- Do not use `/api` or `/api/vN` for the active default surface.

### 2. Version Prefix Policy

- Version-prefixed routes (example: `/api/v2/...`) are optional, not default.
- They may be introduced only when explicitly requested by the Product Owner.
- When introduced, version-prefixed routes must be explicit in scope and lifecycle.

### 3. Endpoint Naming and Shape

- Use plural nouns for collections: `/users`, `/programs`, `/learning-units`.
- Use kebab-case for multi-word resources.
- Maximum nested resource depth: 2 levels.
- Avoid generic roots and mixed-concern mounts.
- Prefer resource-state updates over RPC-style action endpoints when practical.

Action endpoints are allowed only when the operation cannot be represented cleanly as CRUD/state transition.

### 4. Canonical Response Envelope

Success envelope:

```json
{
  "status": "success",
  "data": {},
  "meta": {
    "requestId": "req_123",
    "pagination": {
      "cursor": "abc",
      "nextCursor": "def",
      "limit": 20
    }
  }
}
```

Error envelope:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Rules:
- `status` is always present and is either `success` or `error`.
- `data` appears only on success.
- `error` appears only on failure.
- `meta.requestId` is included on both success and error.
- `meta.pagination` is included for list responses only.

### 5. Contract-First Requirement

- Every active endpoint family must have a corresponding contract artifact in `contracts/api/`.
- Route changes and envelope changes must update contracts and tests in the same change set.

## Consequences

**Positive**
- Single canonical route style and response format.
- Lower client complexity and easier API discoverability.
- Better ADR alignment and cleaner long-term maintenance.

**Negative**
- Large one-time migration cost when normalizing existing routes.
- Requires strict coordination across tests, contracts, and consumers.

## Alternatives Considered

- Keep `/api/v2` as permanent default (rejected: conflicts with product direction for ideal default path style).
- Support dual envelopes (`success` boolean + canonical envelope) indefinitely (rejected: prolongs ambiguity and compatibility debt).
- Allow deep nesting for convenience (rejected: increases coupling and route complexity).

## Links

- [[ADR-API-001-API-DESIGN-STANDARDS]]
- [[ADR-API-003-REST-CONVENTIONS]]
- [[ADR-DEV-003-IDEAL-API-DESIGN]]
