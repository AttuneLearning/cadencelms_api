# ADR-API-001: API Design Standards

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Platform/API

## Context

CadenceLMS requires a consistent API design across all endpoints to ensure:
- Predictable client development experience
- Maintainable and discoverable API surface
- Clear error handling and debugging
- Efficient data transfer with pagination
- Forward-compatible versioning strategy

Currently, endpoint patterns vary, error formats are inconsistent, and pagination approaches differ between features. This ADR establishes standards for all new API development and provides a migration path for existing endpoints.

## Decision

### 1. API Versioning

**Strategy:** URL-based versioning with semantic version major number.

```
/api/v2/users
/api/v2/learning-units/:id
```

**Rules:**
- Major version in URL path (`v1`, `v2`, etc.)
- Breaking changes require new major version
- Non-breaking additions allowed within version
- Deprecation headers warn of upcoming removals
- Minimum 6-month deprecation period for major versions

**Headers for Deprecation:**
```
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: </api/v3/users>; rel="successor-version"
```

### 2. URL Structure

**Pattern:** `/{version}/{resource}[/{id}][/{sub-resource}]`

**Naming Conventions:**
- Plural nouns for collections: `/users`, `/courses`, `/learning-units`
- Kebab-case for multi-word resources: `/learning-units`, `/course-segments`
- Nested resources for clear ownership: `/courses/:courseId/segments`
- Maximum nesting depth: 2 levels

**Examples:**
```
GET    /api/v2/courses                      # List courses
POST   /api/v2/courses                      # Create course
GET    /api/v2/courses/:id                  # Get course
PUT    /api/v2/courses/:id                  # Update course
DELETE /api/v2/courses/:id                  # Delete course
GET    /api/v2/courses/:id/segments         # List course segments
POST   /api/v2/courses/:id/segments         # Create segment in course
GET    /api/v2/courses/:id/segments/:segId  # Get specific segment
```

**Actions (non-CRUD operations):**
- Use verbs as sub-resources for actions: `POST /api/v2/courses/:id/publish`
- Bulk operations: `POST /api/v2/courses/bulk-delete`

### 3. HTTP Methods

| Method | Usage | Idempotent | Safe |
|--------|-------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create resource or action | No | No |
| PUT | Full update (replace) | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

### 4. Request Format

**Content-Type:** `application/json`

**Request Body Structure:**
```json
{
  "title": "Introduction to TypeScript",
  "description": "Learn TypeScript fundamentals",
  "departmentId": "dept_123",
  "settings": {
    "isPublished": false,
    "allowEnrollment": true
  }
}
```

**Query Parameters:**
- Filtering: `?status=active&departmentId=dept_123`
- Sorting: `?sort=createdAt:desc,title:asc`
- Field selection: `?fields=id,title,status`
- Search: `?search=typescript`
- Pagination: See Section 6

### 5. Response Format

**Envelope Structure:**

All responses use a consistent envelope:

```json
{
  "data": { ... },
  "meta": { ... },
  "errors": [ ... ]
}
```

**Single Resource Response:**
```json
{
  "data": {
    "id": "course_abc123",
    "type": "course",
    "attributes": {
      "title": "Introduction to TypeScript",
      "status": "draft",
      "createdAt": "2026-01-27T10:30:00Z",
      "updatedAt": "2026-01-27T14:45:00Z"
    },
    "relationships": {
      "department": {
        "id": "dept_123",
        "type": "department"
      },
      "createdBy": {
        "id": "user_456",
        "type": "user"
      }
    }
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

**Collection Response:**
```json
{
  "data": [
    { "id": "course_1", "type": "course", "attributes": { ... } },
    { "id": "course_2", "type": "course", "attributes": { ... } }
  ],
  "meta": {
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true,
      "nextCursor": "eyJpZCI6ImNvdXJzZV8yMCJ9"
    },
    "requestId": "req_xyz789"
  }
}
```

**Simplified Response (optional):**

For performance-critical endpoints, a simplified format without `type` and `relationships`:

```json
{
  "data": {
    "id": "course_abc123",
    "title": "Introduction to TypeScript",
    "status": "draft"
  }
}
```

### 6. Pagination

**Strategy:** Cursor-based pagination (default) with offset fallback.

**Query Parameters:**
- `limit` - Items per page (default: 20, max: 100)
- `cursor` - Opaque cursor for next page
- `offset` - Numeric offset (for random access, less efficient)
- `sort` - Sort field and direction

**Cursor Pagination (Preferred):**
```
GET /api/v2/courses?limit=20
GET /api/v2/courses?limit=20&cursor=eyJpZCI6ImNvdXJzZV8yMCJ9
```

**Response Meta:**
```json
{
  "meta": {
    "pagination": {
      "total": 150,
      "limit": 20,
      "hasMore": true,
      "nextCursor": "eyJpZCI6ImNvdXJzZV80MCJ9",
      "prevCursor": "eyJpZCI6ImNvdXJzZV8yMSJ9"
    }
  }
}
```

**Offset Pagination (Fallback):**
```
GET /api/v2/courses?limit=20&offset=40
```

**When to Use Each:**
- Cursor: Infinite scroll, real-time feeds, large datasets
- Offset: Jump to specific page, admin tables with page numbers

### 7. Error Handling

**HTTP Status Codes:**

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, version conflict |
| 422 | Unprocessable Entity | Semantic validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance, overload |

**Error Response Format:**
```json
{
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Title is required",
      "field": "title",
      "details": {
        "constraint": "required",
        "received": null
      }
    },
    {
      "code": "VALIDATION_ERROR",
      "message": "Status must be one of: draft, published, archived",
      "field": "status",
      "details": {
        "constraint": "enum",
        "allowed": ["draft", "published", "archived"],
        "received": "invalid"
      }
    }
  ],
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-27T15:30:00Z"
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400/422 | Field validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | No valid auth token |
| `TOKEN_EXPIRED` | 401 | Auth token expired |
| `PERMISSION_DENIED` | 403 | Lacks required permission |
| `RESOURCE_NOT_FOUND` | 404 | Entity doesn't exist |
| `DUPLICATE_RESOURCE` | 409 | Unique constraint violation |
| `VERSION_CONFLICT` | 409 | Optimistic lock failure |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable |

### 8. Authentication & Authorization Headers

**Request Headers:**
```
Authorization: Bearer <access_token>
X-Department-Context: dept_123  # Optional: scope operations
X-Request-ID: client_req_abc    # Optional: client correlation
```

**Response Headers:**
```
X-Request-ID: req_xyz789
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706367600
```

### 9. Date/Time Format

- All dates in ISO 8601 format with UTC timezone
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2026-01-27T15:30:00.000Z`

### 10. Filtering & Search

**Filter Operators:**
```
?status=active                    # Equality
?status[in]=active,draft          # In list
?status[ne]=archived              # Not equal
?createdAt[gte]=2026-01-01        # Greater than or equal
?createdAt[lt]=2026-02-01         # Less than
?title[contains]=typescript       # Contains substring
?title[startsWith]=intro          # Starts with
```

**Combined Filters:**
```
?status=active&departmentId=dept_123&createdAt[gte]=2026-01-01
```

**Full-Text Search:**
```
?search=typescript fundamentals
```

### 11. Bulk Operations

**Bulk Create:**
```
POST /api/v2/enrollments/bulk
{
  "items": [
    { "learnerId": "user_1", "courseId": "course_1" },
    { "learnerId": "user_2", "courseId": "course_1" }
  ]
}
```

**Bulk Update:**
```
PATCH /api/v2/courses/bulk
{
  "ids": ["course_1", "course_2"],
  "updates": {
    "status": "archived"
  }
}
```

**Bulk Delete:**
```
POST /api/v2/courses/bulk-delete
{
  "ids": ["course_1", "course_2"]
}
```

**Bulk Response:**
```json
{
  "data": {
    "succeeded": ["course_1"],
    "failed": [
      {
        "id": "course_2",
        "error": {
          "code": "PERMISSION_DENIED",
          "message": "Cannot delete published course"
        }
      }
    ]
  },
  "meta": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

## Consequences

### Positive
- Consistent developer experience across all endpoints
- Predictable error handling simplifies client development
- Cursor pagination handles large datasets efficiently
- Clear versioning strategy enables API evolution
- Standardized filtering reduces custom query implementations

### Negative
- Existing v1 endpoints require migration effort
- Envelope format adds payload overhead for simple responses
- Learning curve for team adopting new patterns

### Neutral
- OpenAPI spec generation can auto-document compliant endpoints
- Client SDK can be generated from spec

## Alternatives Considered

### GraphQL
- **Rejected**: Adds complexity for current team size; better suited for complex, varied query patterns. May reconsider for future analytics/reporting API.

### JSON:API Specification
- **Rejected**: Too rigid for LMS-specific needs; relationship syntax verbose for our use cases.

### RPC-style endpoints
- **Rejected**: Loses discoverability and standardization benefits of REST; harder to cache.

## Implementation Notes

### Migration Strategy
1. New endpoints built to this spec immediately
2. Existing v1 endpoints continue working
3. v2 endpoints created alongside v1
4. Deprecation headers added to v1
5. v1 sunset after migration period

### Validation
- Use Zod schemas for request validation
- Return all validation errors, not just first
- Include field path in nested object errors

### OpenAPI
- Generate OpenAPI 3.1 spec from route definitions
- Publish at `/api/docs` and `/api/openapi.json`

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]] (authorization headers)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (cache headers)
  - [[ADR-API-003-REST-CONVENTIONS]] (resource patterns)
- Implementation:
  - `src/middlewares/validateRequest.ts` - Request validation
  - `src/middlewares/errorHandler.ts` - Error response formatting
  - `src/utils/ApiError.ts` - Standardized error codes
  - `src/utils/ApiResponse.ts` - Response envelope utilities
  - `src/utils/pagination.ts` - Pagination utilities
