# ADR-API-002: API Caching Strategy

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Platform/API

## Context

CadenceLMS requires a comprehensive caching strategy to:
- Reduce database load and improve response times
- Support offline learning scenarios
- Handle high-traffic content delivery (SCORM packages, videos)
- Maintain data consistency while maximizing cache hit rates
- Scale efficiently as user base grows

The system already has Redis infrastructure and several caching implementations (permission cache, role cache, department cache). This ADR formalizes the complete caching architecture across all tiers.

## Decision

### Caching Tiers Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tier 1: CLIENT/BROWSER CACHE                                    │
│  ├── HTTP Cache-Control headers                                  │
│  ├── ETags for conditional requests                              │
│  └── Service Worker cache (offline support)                      │
│                                                                   │
│  Tier 2: CDN CACHE (Future)                                      │
│  ├── Static assets (JS, CSS, images)                             │
│  ├── SCORM packages                                              │
│  └── Video content                                               │
│                                                                   │
│  Tier 3: API RESPONSE CACHE (Redis)                              │
│  ├── Computed/expensive query results                            │
│  ├── Aggregated analytics data                                   │
│  └── Reference data (lookup values)                              │
│                                                                   │
│  Tier 4: APPLICATION CACHE (In-Memory)                           │
│  ├── Role definitions (RoleCacheService)                         │
│  ├── Department hierarchy (DepartmentCacheService)               │
│  └── Configuration/feature flags                                 │
│                                                                   │
│  Tier 5: USER SESSION CACHE (Redis)                              │
│  ├── Permission cache (auth:permissions:{userId})                │
│  ├── Session data                                                │
│  └── Rate limiting counters                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1. HTTP Caching Headers

#### Cache-Control Directives

| Directive | Use Case |
|-----------|----------|
| `private` | User-specific data (enrollments, grades, profile) |
| `public` | Shared data (course catalog, lookup values) |
| `no-cache` | Always revalidate (use with ETag) |
| `no-store` | Sensitive data (auth tokens, PII) |
| `max-age=N` | Cache duration in seconds |
| `stale-while-revalidate=N` | Serve stale while fetching fresh |
| `immutable` | Never changes (versioned assets) |

#### Response Header Patterns

**Static/Immutable Resources:**
```http
Cache-Control: public, max-age=31536000, immutable
```

**Public Reference Data:**
```http
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
ETag: "abc123"
```

**User-Specific Data:**
```http
Cache-Control: private, max-age=300, stale-while-revalidate=60
ETag: "user-123-v5"
```

**Real-time/Sensitive Data:**
```http
Cache-Control: no-store
```

### 2. Endpoint Caching Policies

#### Never Cache (no-store)

| Endpoint Pattern | Reason |
|------------------|--------|
| `POST /auth/*` | Authentication tokens |
| `*/me` | Current user data changes frequently |
| `POST/PUT/PATCH/DELETE *` | Mutations |
| `*/grades/*` (write) | Grade submissions |
| `*/payments/*` | Financial transactions |
| `*/audit-logs/*` | Security-sensitive |

#### Short Cache (1-5 minutes, private)

| Endpoint Pattern | TTL | Reason |
|------------------|-----|--------|
| `GET /users/:id` | 5 min | User profile, may change |
| `GET /enrollments` | 5 min | Enrollment status changes |
| `GET /progress/*` | 1 min | Learning progress updates frequently |
| `GET /notifications` | 1 min | Time-sensitive |
| `GET /classes/:id/roster` | 5 min | Class membership changes |

#### Medium Cache (15-60 minutes, private or public)

| Endpoint Pattern | TTL | Visibility | Reason |
|------------------|-----|------------|--------|
| `GET /courses/:id` | 30 min | public | Course content rarely changes |
| `GET /departments` | 60 min | public | Organizational structure stable |
| `GET /programs` | 60 min | public | Program catalog stable |
| `GET /analytics/*` | 15 min | private | Computed data, expensive queries |
| `GET /reports/:id` | 30 min | private | Generated reports |

#### Long Cache (1-24 hours, public)

| Endpoint Pattern | TTL | Reason |
|------------------|-----|--------|
| `GET /lookup-values/*` | 24 hr | Reference data rarely changes |
| `GET /roles` | 1 hr | Role definitions stable |
| `GET /permissions` | 1 hr | Permission matrix stable |
| `GET /content/:id/metadata` | 4 hr | Content metadata stable |
| `GET /certificate-templates` | 4 hr | Templates rarely change |

#### Immutable (versioned)

| Endpoint Pattern | TTL | Reason |
|------------------|-----|--------|
| `GET /content/:id/v/:version` | Forever | Versioned content never changes |
| `GET /scorm/:packageId/v/:version/*` | Forever | SCORM package versions immutable |
| `GET /assets/*?v=hash` | Forever | Hashed static assets |

### 3. ETag Implementation

#### ETag Generation Strategies

**Database Record ETags:**
```typescript
// Use updatedAt timestamp + id for database records
const etag = `"${record._id}-${record.updatedAt.getTime()}"`;

// Example: "course_abc123-1706367600000"
```

**Collection ETags:**
```typescript
// Use hash of sorted IDs + max updatedAt for collections
const maxUpdated = Math.max(...records.map(r => r.updatedAt.getTime()));
const hash = crypto.createHash('md5')
  .update(records.map(r => r._id).sort().join(','))
  .digest('hex')
  .substring(0, 8);
const etag = `"${hash}-${maxUpdated}"`;
```

**Computed Data ETags:**
```typescript
// Use hash of input parameters + computation timestamp
const inputHash = crypto.createHash('md5')
  .update(JSON.stringify(queryParams))
  .digest('hex')
  .substring(0, 8);
const etag = `"${inputHash}-${computedAt}"`;
```

#### Conditional Request Handling

```typescript
// Middleware for ETag validation
function handleConditionalRequest(req: Request, res: Response, etag: string) {
  res.setHeader('ETag', etag);

  const ifNoneMatch = req.header('If-None-Match');
  if (ifNoneMatch === etag) {
    return res.status(304).end(); // Not Modified
  }

  // Continue with full response
}
```

### 4. Redis Caching (Tier 3)

#### Existing Implementation

| Cache | Key Pattern | TTL | Purpose |
|-------|-------------|-----|---------|
| Permissions | `auth:permissions:{userId}` | 15 min | User permission resolution |
| Permission Version | `auth:user:{userId}:version` | None | Cache invalidation trigger |

#### Additional Redis Caches

| Cache | Key Pattern | TTL | Purpose |
|-------|-------------|-----|---------|
| Analytics | `analytics:{type}:{scope}:{period}` | 15 min | Aggregated metrics |
| Report Results | `report:{reportId}:result` | 30 min | Generated report data |
| Course Catalog | `catalog:courses:{deptId}` | 60 min | Department course listings |
| Search Results | `search:{hash}` | 5 min | Search query results |
| Rate Limits | `ratelimit:{userId}:{endpoint}` | 1 min | Request throttling |

#### Cache Key Conventions

```
{domain}:{entity}:{identifier}[:{qualifier}]

Examples:
- auth:permissions:user_123
- analytics:enrollment:dept_456:monthly
- catalog:courses:dept_789:published
- search:courses:abc123def456
```

### 5. In-Memory Caching (Tier 4)

#### Existing Services

| Service | Data | TTL | Refresh Strategy |
|---------|------|-----|------------------|
| `RoleCacheService` | Role definitions | 1 hour | Auto-refresh interval |
| `DepartmentCacheService` | Dept hierarchy | 1 hour | Auto-refresh + manual |

#### Guidelines for In-Memory Cache

**When to Use:**
- Data is read-heavy, write-rare
- Data is small enough to fit in memory
- All API instances need same data
- Lookup performance is critical (< 1ms)

**When NOT to Use:**
- User-specific data (use Redis instead)
- Data > 100MB (memory pressure)
- Data changes frequently (invalidation overhead)
- Data needs persistence across restarts

### 6. Cache Invalidation

#### Invalidation Strategies

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| **Time-based (TTL)** | Most caches | Set expiration on cache entry |
| **Event-driven** | User permissions | Publish invalidation event on role change |
| **Version-based** | User sessions | Increment version, compare on read |
| **Pattern-based** | Bulk operations | Delete keys matching pattern |

#### Invalidation Events

```typescript
// Cache invalidation events
enum CacheInvalidationEvent {
  // User-level
  USER_ROLE_CHANGED = 'cache:invalidate:user:role',
  USER_DEPARTMENT_CHANGED = 'cache:invalidate:user:department',

  // Entity-level
  COURSE_UPDATED = 'cache:invalidate:course',
  DEPARTMENT_HIERARCHY_CHANGED = 'cache:invalidate:departments',

  // System-level
  ROLE_DEFINITIONS_CHANGED = 'cache:invalidate:roles',
  LOOKUP_VALUES_CHANGED = 'cache:invalidate:lookups',
}
```

#### Invalidation Patterns

**User Permission Change:**
```typescript
// When user's role membership changes
await invalidateUserPermissions(userId);
await incrementUserPermissionVersion(userId);
// JWT will be refreshed with new version on next request
```

**Course Update:**
```typescript
// When course content changes
await Cache.del(`course:${courseId}`);
await Cache.delPattern(`catalog:courses:*`); // Invalidate all catalog caches
// HTTP clients will get 200 instead of 304 on next request
```

**Bulk Department Change:**
```typescript
// When department hierarchy restructured
await departmentCacheService.refresh();
await Cache.delPattern('catalog:*');
await Cache.delPattern('analytics:*:dept_*');
```

### 7. Stale-While-Revalidate Pattern

For non-critical data, serve stale content while fetching fresh:

```typescript
async function getWithStaleWhileRevalidate<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options: { ttl: number; staleTtl: number }
): Promise<T> {
  const cached = await Cache.get<{ data: T; fetchedAt: number }>(cacheKey);

  if (cached) {
    const age = Date.now() - cached.fetchedAt;

    // Fresh: return immediately
    if (age < options.ttl * 1000) {
      return cached.data;
    }

    // Stale but within grace period: return stale, refresh in background
    if (age < (options.ttl + options.staleTtl) * 1000) {
      // Fire-and-forget refresh
      fetchFn().then(data => {
        Cache.set(cacheKey, { data, fetchedAt: Date.now() }, options.ttl + options.staleTtl);
      }).catch(err => logger.error('Background refresh failed', err));

      return cached.data; // Return stale immediately
    }
  }

  // Cache miss or too stale: fetch synchronously
  const data = await fetchFn();
  await Cache.set(cacheKey, { data, fetchedAt: Date.now() }, options.ttl + options.staleTtl);
  return data;
}
```

### 8. CDN Caching (Future)

#### Recommended CDN Strategy

| Content Type | CDN Cache | Origin Cache | Notes |
|--------------|-----------|--------------|-------|
| Static assets | 1 year | N/A | Hash in filename |
| SCORM packages | 1 year | N/A | Versioned paths |
| Video content | 24 hours | 4 hours | HLS segments |
| API responses | No | Yes | Dynamic content |
| Images/thumbnails | 7 days | 1 day | Content-addressed |

#### CDN Headers

```http
# Static assets (immutable)
Cache-Control: public, max-age=31536000, immutable
CDN-Cache-Control: max-age=31536000

# SCORM packages
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/zip
Accept-Ranges: bytes

# Video segments
Cache-Control: public, max-age=86400
CDN-Cache-Control: max-age=604800
```

### 9. Monitoring & Observability

#### Cache Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `cache.hit_rate` | % of requests served from cache | < 70% |
| `cache.miss_rate` | % of cache misses | > 30% |
| `cache.latency_p99` | 99th percentile cache read time | > 10ms |
| `cache.memory_usage` | Redis memory consumption | > 80% |
| `cache.eviction_rate` | Keys evicted per second | > 100/s |

#### Cache Stats Endpoint

```typescript
// GET /api/v2/system/cache-stats (admin only)
{
  "redis": {
    "connected": true,
    "memoryUsage": "245MB",
    "keyCount": 15420,
    "hitRate": 0.87
  },
  "inMemory": {
    "roleCache": { "size": 12, "lastRefresh": "2026-01-27T10:00:00Z" },
    "departmentCache": { "size": 45, "lastRefresh": "2026-01-27T10:00:00Z" }
  }
}
```

## Consequences

### Positive
- Reduced database load (target: 70%+ cache hit rate)
- Faster response times (< 100ms for cached data)
- Better offline support with HTTP caching
- Scalable architecture with CDN-ready design
- Clear invalidation patterns prevent stale data

### Negative
- Added complexity in cache management
- Memory/Redis costs increase with scale
- Cache invalidation bugs can cause stale data
- Cold start performance impact

### Neutral
- Existing Redis infrastructure is reused
- In-memory caches already implemented
- HTTP caching requires client cooperation

## Alternatives Considered

### Memcached instead of Redis
- **Rejected**: Redis provides richer data structures (sorted sets for rate limiting, pub/sub for invalidation) and persistence options.

### No application-level caching (rely on database)
- **Rejected**: MongoDB query performance insufficient for authorization checks on every request.

### GraphQL with DataLoader
- **Rejected**: Adds complexity; REST with proper caching achieves similar benefits for our use cases.

## Implementation Notes

### Middleware for Cache Headers

```typescript
// src/middlewares/cacheControl.ts
export function cacheControl(options: CacheOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    const directives = [
      options.visibility || 'private',
      `max-age=${options.maxAge || 0}`,
    ];

    if (options.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    if (options.immutable) {
      directives.push('immutable');
    }

    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}

// Usage
router.get('/lookup-values',
  cacheControl({ visibility: 'public', maxAge: 86400, staleWhileRevalidate: 86400 }),
  getLookupValues
);
```

### Cache Warming on Startup

```typescript
// src/server.ts
async function warmCaches() {
  logger.info('Warming caches...');

  await Promise.all([
    roleCache.initialize(),
    departmentCacheService.initialize(),
    // Pre-fetch commonly accessed lookup values
    Cache.set('lookup:contentTypes', await LookupValue.find({ category: 'contentType' }), 86400),
  ]);

  logger.info('Cache warming complete');
}
```

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-API-001-API-DESIGN-STANDARDS]] (response format)
  - [[ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]] (permission caching)
- Implementation:
  - `src/config/redis.ts` - Redis configuration
  - `src/utils/permission-cache.ts` - Permission cache
  - `src/services/auth/role-cache.service.ts` - Role cache
  - `src/services/auth/department-cache.service.ts` - Department cache
