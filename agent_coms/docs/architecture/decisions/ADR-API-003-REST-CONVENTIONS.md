# ADR-API-003: REST Conventions

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Platform/API

## Context

CadenceLMS exposes a REST API for the UI and future third-party integrations. Consistent REST conventions are essential for:
- Predictable API behavior across all resources
- Reduced cognitive load for developers
- Clear mapping between domain concepts and API endpoints
- Proper use of HTTP semantics
- Maintainable and evolvable API surface

This ADR establishes REST conventions specific to the LMS domain, complementing ADR-API-001 (API Design Standards) with detailed resource modeling guidelines.

## Decision

### 1. Resource Naming

#### Principles

1. **Use nouns, not verbs** - Resources are things, not actions
2. **Use plural nouns** - Collections are the default
3. **Use kebab-case** - Multi-word resources use hyphens
4. **Be consistent** - Same concept, same name everywhere
5. **Be specific** - Avoid generic names like "items" or "data"

#### LMS Domain Resources

| Resource | Endpoint | Notes |
|----------|----------|-------|
| Users | `/users` | All user accounts |
| Learners | `/learners` | Learner profiles |
| Staff | `/staff` | Staff profiles |
| Departments | `/departments` | Organizational units |
| Programs | `/programs` | Academic programs |
| Program Levels | `/program-levels` | Levels within programs |
| Courses | `/courses` | Course definitions |
| Course Segments | `/course-segments` | Modules within courses |
| Learning Units | `/learning-units` | Content items (lessons, activities) |
| Classes | `/classes` | Course instances/sections |
| Enrollments | `/enrollments` | Learner-class relationships |
| Grades | `/grades` | Grade records |
| Questions | `/questions` | Assessment questions |
| Question Banks | `/question-banks` | Question collections |
| Exams | `/exams` | Assessment definitions |
| Exam Attempts | `/exam-attempts` | Learner exam submissions |
| Content | `/content` | SCORM packages, files |
| Certificates | `/certificates` | Earned certificates |
| Certificate Templates | `/certificate-templates` | Certificate designs |
| Reports | `/reports` | Report definitions |
| Report Jobs | `/report-jobs` | Report execution instances |
| Lookup Values | `/lookup-values` | Reference data |
| Audit Logs | `/audit-logs` | System audit trail |

#### Naming Anti-Patterns

```
❌ /getCourses           → ✅ GET /courses
❌ /course/list          → ✅ GET /courses
❌ /createUser           → ✅ POST /users
❌ /user_profiles        → ✅ /users or /user-profiles
❌ /Course               → ✅ /courses (lowercase, plural)
❌ /datum                → ✅ /data or specific name
```

### 2. URL Structure

#### Hierarchy Pattern

```
/{version}/{resource}[/{id}][/{sub-resource}][/{sub-id}]
```

#### Resource Relationships

**Nested Resources (Parent-Child Ownership):**
Use nesting when the child cannot exist without the parent.

```
GET  /courses/:courseId/segments              # Segments belong to course
GET  /courses/:courseId/segments/:segmentId
POST /courses/:courseId/segments

GET  /programs/:programId/levels              # Levels belong to program
GET  /classes/:classId/enrollments            # Enrollments belong to class
GET  /exams/:examId/questions                 # Questions in an exam
```

**Flat Resources (Independent Entities):**
Use flat structure when resources have independent identity.

```
GET  /enrollments/:enrollmentId               # Enrollment has own ID
GET  /grades/:gradeId                         # Grade has own ID
GET  /exam-attempts/:attemptId                # Attempt has own ID
GET  /questions/:questionId                   # Question can exist in multiple banks
```

**Relationship References:**
Use query parameters to filter by relationship.

```
GET  /enrollments?classId=cls_123             # Enrollments for a class
GET  /enrollments?learnerId=usr_456           # Enrollments for a learner
GET  /grades?enrollmentId=enr_789             # Grades for an enrollment
GET  /questions?bankId=qb_123                 # Questions in a bank
```

#### Maximum Nesting Depth: 2 Levels

```
✅ /courses/:courseId/segments/:segmentId
✅ /departments/:deptId/staff

❌ /departments/:deptId/courses/:courseId/segments/:segmentId/learning-units
   → Instead: GET /learning-units?segmentId=seg_123
```

### 3. HTTP Methods

#### Method Semantics

| Method | Purpose | Idempotent | Safe | Request Body | Response |
|--------|---------|------------|------|--------------|----------|
| GET | Retrieve resource(s) | Yes | Yes | No | Resource |
| POST | Create resource | No | No | Yes | Created resource |
| PUT | Replace resource | Yes | No | Yes | Updated resource |
| PATCH | Partial update | No* | No | Yes | Updated resource |
| DELETE | Remove resource | Yes | No | No | 204 or confirmation |
| HEAD | Get headers only | Yes | Yes | No | Headers only |
| OPTIONS | Get allowed methods | Yes | Yes | No | Allow header |

*PATCH can be made idempotent with proper implementation

#### Method Usage Examples

**GET - Retrieve:**
```http
GET /api/v2/courses
GET /api/v2/courses/crs_123
GET /api/v2/courses/crs_123/segments
```

**POST - Create:**
```http
POST /api/v2/courses
Content-Type: application/json

{
  "title": "Introduction to TypeScript",
  "departmentId": "dept_456"
}
```

**PUT - Full Replace:**
```http
PUT /api/v2/courses/crs_123
Content-Type: application/json

{
  "title": "Advanced TypeScript",
  "description": "Deep dive into TypeScript",
  "departmentId": "dept_456",
  "status": "published"
}
```

**PATCH - Partial Update:**
```http
PATCH /api/v2/courses/crs_123
Content-Type: application/json

{
  "status": "published"
}
```

**DELETE - Remove:**
```http
DELETE /api/v2/courses/crs_123
```

#### When to Use PUT vs PATCH

| Scenario | Method | Example |
|----------|--------|---------|
| Update all fields | PUT | Replace entire course definition |
| Update one field | PATCH | Change course status only |
| Toggle boolean | PATCH | `{ "isPublished": true }` |
| Add to array | PATCH | `{ "tags": { "$add": ["new-tag"] } }` |
| Idempotent update | PUT | Setting exact state |
| Upsert operation | PUT | Create if not exists |

### 4. Action Endpoints

For operations that don't map cleanly to CRUD, use action sub-resources.

#### Action Pattern

```
POST /{resource}/{id}/{action}
```

#### LMS Action Endpoints

| Action | Endpoint | Purpose |
|--------|----------|---------|
| Publish course | `POST /courses/:id/publish` | Change status to published |
| Unpublish course | `POST /courses/:id/unpublish` | Revert to draft |
| Archive course | `POST /courses/:id/archive` | Move to archive |
| Clone course | `POST /courses/:id/clone` | Create copy |
| Enroll learner | `POST /classes/:id/enroll` | Add learner to class |
| Withdraw learner | `POST /enrollments/:id/withdraw` | Remove from class |
| Submit exam | `POST /exam-attempts/:id/submit` | Finalize attempt |
| Grade attempt | `POST /exam-attempts/:id/grade` | Assign grade |
| Reset progress | `POST /enrollments/:id/reset` | Clear learner progress |
| Generate report | `POST /reports/:id/generate` | Create report job |
| Issue certificate | `POST /certificates/issue` | Generate certificate |
| Revoke certificate | `POST /certificates/:id/revoke` | Invalidate certificate |

#### Action Request/Response

```http
POST /api/v2/courses/crs_123/publish
Content-Type: application/json

{
  "effectiveDate": "2026-02-01T00:00:00Z",
  "notifyEnrolled": true
}

---

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": "crs_123",
    "status": "published",
    "publishedAt": "2026-01-27T15:30:00Z"
  }
}
```

### 5. Query Parameters

#### Filtering

**Simple Equality:**
```
GET /courses?status=published
GET /courses?departmentId=dept_123
GET /enrollments?learnerId=usr_456&classId=cls_789
```

**Operators:**
```
GET /courses?status[in]=draft,published
GET /courses?status[ne]=archived
GET /courses?createdAt[gte]=2026-01-01
GET /courses?createdAt[lt]=2026-02-01
GET /courses?title[contains]=typescript
GET /courses?title[startsWith]=intro
GET /enrollments?progress[gte]=50&progress[lte]=100
```

| Operator | Meaning | Example |
|----------|---------|---------|
| (none) | Equals | `?status=active` |
| `[in]` | In list | `?status[in]=a,b,c` |
| `[nin]` | Not in list | `?status[nin]=archived` |
| `[ne]` | Not equals | `?status[ne]=deleted` |
| `[gt]` | Greater than | `?score[gt]=80` |
| `[gte]` | Greater or equal | `?score[gte]=80` |
| `[lt]` | Less than | `?score[lt]=50` |
| `[lte]` | Less or equal | `?score[lte]=50` |
| `[contains]` | Contains substring | `?title[contains]=java` |
| `[startsWith]` | Starts with | `?title[startsWith]=intro` |
| `[endsWith]` | Ends with | `?email[endsWith]=@edu` |
| `[exists]` | Field exists | `?completedAt[exists]=true` |

#### Sorting

```
GET /courses?sort=title:asc
GET /courses?sort=createdAt:desc
GET /courses?sort=departmentId:asc,title:asc    # Multiple fields
```

#### Pagination

See ADR-API-001 for pagination details. Summary:

```
GET /courses?limit=20&cursor=eyJpZCI6ImNyc18yMCJ9
GET /courses?limit=20&offset=40
```

#### Field Selection (Sparse Fieldsets)

```
GET /courses?fields=id,title,status
GET /courses?fields=id,title,department.name    # Nested fields
```

#### Expansion (Include Related)

```
GET /courses/:id?expand=segments
GET /courses/:id?expand=segments,department
GET /enrollments?expand=learner,class
```

#### Search

```
GET /courses?search=typescript fundamentals
GET /users?search=john@example
```

### 6. Response Codes

#### Success Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 202 | Accepted | Async operation accepted |
| 204 | No Content | Successful DELETE, or empty result |

#### Client Error Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 400 | Bad Request | Malformed JSON, invalid syntax |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Valid auth but lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 409 | Conflict | Duplicate, version conflict |
| 410 | Gone | Resource permanently deleted |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |

#### Server Error Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 500 | Internal Server Error | Unexpected error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Maintenance, overload |
| 504 | Gateway Timeout | Upstream timeout |

### 7. Resource Lifecycle States

#### Standard State Machines

**Content Lifecycle (Courses, Learning Units):**
```
           ┌──────────────────────┐
           │                      │
           ▼                      │
 ┌──────────────┐  publish   ┌────┴──────┐  archive   ┌──────────┐
 │    draft     │───────────▶│ published │───────────▶│ archived │
 └──────────────┘            └───────────┘            └──────────┘
        ▲                          │
        │         unpublish        │
        └──────────────────────────┘
```

**Enrollment Lifecycle:**
```
 ┌────────────┐  activate   ┌────────────┐  complete   ┌───────────┐
 │  pending   │────────────▶│   active   │────────────▶│ completed │
 └────────────┘             └────────────┘             └───────────┘
                                  │
                             withdraw
                                  │
                                  ▼
                            ┌───────────┐
                            │ withdrawn │
                            └───────────┘
```

**Exam Attempt Lifecycle:**
```
 ┌─────────────┐  start    ┌─────────────┐  submit   ┌───────────┐
 │  not_started│──────────▶│ in_progress │──────────▶│ submitted │
 └─────────────┘           └─────────────┘           └───────────┘
                                  │                        │
                              timeout                   grade
                                  │                        │
                                  ▼                        ▼
                           ┌───────────┐            ┌──────────┐
                           │  expired  │            │  graded  │
                           └───────────┘            └──────────┘
```

#### State Transitions via Actions

State changes should use action endpoints, not PATCH:

```
✅ POST /courses/:id/publish
✅ POST /enrollments/:id/withdraw
✅ POST /exam-attempts/:id/submit

❌ PATCH /courses/:id { "status": "published" }
```

### 8. Bulk Operations

#### Bulk Create

```http
POST /api/v2/enrollments/bulk
Content-Type: application/json

{
  "items": [
    { "learnerId": "usr_1", "classId": "cls_1" },
    { "learnerId": "usr_2", "classId": "cls_1" },
    { "learnerId": "usr_3", "classId": "cls_1" }
  ]
}
```

#### Bulk Update

```http
PATCH /api/v2/courses/bulk
Content-Type: application/json

{
  "ids": ["crs_1", "crs_2", "crs_3"],
  "updates": {
    "status": "archived"
  }
}
```

#### Bulk Delete

```http
POST /api/v2/courses/bulk-delete
Content-Type: application/json

{
  "ids": ["crs_1", "crs_2", "crs_3"]
}
```

#### Bulk Response Format

```json
{
  "data": {
    "succeeded": [
      { "id": "crs_1", "status": "archived" },
      { "id": "crs_2", "status": "archived" }
    ],
    "failed": [
      {
        "id": "crs_3",
        "error": {
          "code": "VALIDATION_ERROR",
          "message": "Cannot archive course with active enrollments"
        }
      }
    ]
  },
  "meta": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  }
}
```

### 9. Versioning Strategy

#### URL Versioning

```
/api/v1/courses    # Legacy
/api/v2/courses    # Current
/api/v3/courses    # Future
```

#### Version Lifecycle

1. **Active**: Current recommended version
2. **Deprecated**: Still works, warns in headers
3. **Sunset**: Returns 410 Gone

#### Deprecation Headers

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jul 2027 00:00:00 GMT
Link: </api/v3/courses>; rel="successor-version"
```

### 10. Idempotency

#### Idempotency Keys

For non-idempotent operations (POST), clients can provide an idempotency key:

```http
POST /api/v2/payments
Idempotency-Key: pay_req_abc123
Content-Type: application/json

{
  "amount": 99.99,
  "enrollmentId": "enr_456"
}
```

**Server Behavior:**
- First request: Process and store result with key
- Duplicate request (same key): Return stored result
- Key TTL: 24 hours

#### Naturally Idempotent Operations

| Method | Idempotent | Notes |
|--------|------------|-------|
| GET | Yes | Always safe to retry |
| PUT | Yes | Same payload = same result |
| DELETE | Yes | Delete twice = still deleted |
| PATCH | Depends | Absolute values = idempotent |
| POST | No | Use Idempotency-Key header |

## Consequences

### Positive
- Predictable API structure across all resources
- Clear conventions reduce decision fatigue
- Proper HTTP semantics improve cacheability
- State machines prevent invalid transitions
- Bulk operations reduce roundtrips

### Negative
- Learning curve for team members new to REST
- Some operations don't fit REST model cleanly
- Nested resources can lead to long URLs
- Strict conventions may feel restrictive

### Neutral
- Complements ADR-API-001 design standards
- Aligns with industry REST best practices
- May need adjustments as LMS domain evolves

## Alternatives Considered

### GraphQL
- **Rejected**: REST is simpler for our use cases; GraphQL overhead not justified.

### RPC-style Endpoints
- **Rejected**: Loses REST benefits (caching, discoverability, standard tooling).

### Deep Nesting (>2 levels)
- **Rejected**: Creates long URLs, couples resources tightly, harder to cache.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-API-001-API-DESIGN-STANDARDS]] (response format, pagination)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (HTTP caching)
- References:
  - [REST API Design Best Practices](https://restfulapi.net/)
  - [HTTP Methods - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
