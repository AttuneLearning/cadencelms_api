# ADR-API-001: API Design Standards

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Platform/API

## Context

CadenceLMS requires consistent API design for predictable client development, maintainable API surface, clear error handling, and efficient pagination.

## Decision

### Versioning

Default: no URL version prefix for the active API surface.

- Current version pattern: `/{resource}`
- Versioned prefixes (example: `/api/v2/{resource}`) are allowed only when explicitly requested by the Product Owner.
- If a versioned prefix is introduced, it must be treated as a deliberate versioning event with explicit rollout scope.

### URL Structure

- Plural nouns: `/users`, `/courses`
- Kebab-case: `/learning-units`
- Max nesting depth: 2 levels
- Actions as sub-resources: `POST /courses/:id/publish`

### HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| GET | Retrieve | Yes |
| POST | Create/action | No |
| PUT | Full update | Yes |
| PATCH | Partial update | No |
| DELETE | Remove | Yes |

### Response Envelope

```json
{
  "data": { ... },
  "meta": { "pagination": {...}, "requestId": "..." },
  "errors": [ ... ]
}
```

### Pagination

Cursor-based (default), offset fallback.
- `limit` - Items per page (default: 20, max: 100)
- `cursor` - Opaque cursor for next page

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400/422 | Field validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | No valid auth token |
| `PERMISSION_DENIED` | 403 | Lacks required permission |
| `RESOURCE_NOT_FOUND` | 404 | Entity doesn't exist |
| `DUPLICATE_RESOURCE` | 409 | Unique constraint violation |

### Date Format

ISO 8601 UTC: `2026-01-27T15:30:00.000Z`

## Consequences

**Positive:** Consistent developer experience, predictable error handling, efficient pagination.

**Negative:** Version transitions require explicit product coordination instead of automatic URL versioning.

## Patterns

- `endpoint-structure` - Route/controller/service structure
- `validation-joi` - Request validation patterns

## Links

- [[ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]]
- [[ADR-API-002-API-CACHING-STRATEGY]]
- [[ADR-API-004-IDEAL-ENDPOINT-STRUCTURE-AND-RESPONSE-ENVELOPE]]
- `src/utils/ApiError.ts`, `src/utils/ApiResponse.ts`
