# Redis Token Store Architecture Plan

> **Purpose:** Migrate session tokens from in-memory storage to Redis for horizontal scaling  
> **Created:** 2026-01-13  
> **Status:** Planned enhancement for production readiness  
> **Priority:** High (blocks horizontal scaling)

---

## Problem Statement

### Current Implementation

Session tokens are stored in Node.js process memory:

```typescript
// Current approach
const adminSessions = new Map<string, AdminSession>();
```

### Issues

| Problem | Impact | Severity |
|---------|--------|----------|
| Server restart loses all sessions | Users logged out unexpectedly | 🔴 High |
| Multiple instances have isolated sessions | Load balancer breaks auth | 🔴 High |
| Cannot scale horizontally | Single instance bottleneck | 🔴 High |
| Memory grows with active users | OOM risk under load | 🟡 Medium |
| No centralized session revocation | Security gap | 🟡 Medium |

### Failure Scenario

```
User logs in → Server A stores token in memory
             ↓
Load balancer sends next request → Server B
             ↓
Server B doesn't have the token → "Unauthorized" ❌
```

---

## Solution: Redis Token Store

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Server A   │     │  Server B   │     │  Server C   │
│  (Node.js)  │     │  (Node.js)  │     │  (Node.js)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  (Shared)   │
                    └─────────────┘
```

All servers read/write to the same Redis instance. Session state is shared.

---

## Implementation

### 1. Token Store Service

**File:** `src/services/auth/token-store.ts`

```typescript
import { redisClient } from '@/config/redis.config';

interface StoredSession {
  userId: string;
  userEmail: string;
  userTypes: string[];
  departmentId?: string;
  roles?: string[];
  accessRights?: string[];
  createdAt: number;
  expiresAt: number;
}

const TOKEN_PREFIX = 'session:';
const ADMIN_TOKEN_PREFIX = 'admin-session:';
const USER_TOKENS_PREFIX = 'user-tokens:';

export const tokenStore = {
  /**
   * Store a user session token
   */
  async setSession(
    token: string,
    session: StoredSession,
    ttlSeconds: number
  ): Promise<void> {
    const key = `${TOKEN_PREFIX}${token}`;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(session));
    
    // Track token by user for "logout everywhere"
    await redisClient.sadd(`${USER_TOKENS_PREFIX}${session.userId}`, token);
  },

  /**
   * Retrieve a user session
   */
  async getSession(token: string): Promise<StoredSession | null> {
    const key = `${TOKEN_PREFIX}${token}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Delete a session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    const session = await this.getSession(token);
    if (session) {
      await redisClient.srem(`${USER_TOKENS_PREFIX}${session.userId}`, token);
    }
    await redisClient.del(`${TOKEN_PREFIX}${token}`);
  },

  /**
   * Delete all sessions for a user (logout everywhere)
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    const userTokensKey = `${USER_TOKENS_PREFIX}${userId}`;
    const tokens = await redisClient.smembers(userTokensKey);
    
    if (tokens.length === 0) return 0;

    const pipeline = redisClient.pipeline();
    for (const token of tokens) {
      pipeline.del(`${TOKEN_PREFIX}${token}`);
    }
    pipeline.del(userTokensKey);
    await pipeline.exec();
    
    return tokens.length;
  },

  /**
   * Store admin escalation session
   */
  async setAdminSession(
    token: string,
    session: StoredSession,
    ttlSeconds: number = 900
  ): Promise<void> {
    const key = `${ADMIN_TOKEN_PREFIX}${token}`;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(session));
  },

  /**
   * Retrieve admin escalation session
   */
  async getAdminSession(token: string): Promise<StoredSession | null> {
    const key = `${ADMIN_TOKEN_PREFIX}${token}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Extend session TTL (sliding expiration)
   */
  async extendSession(token: string, ttlSeconds: number): Promise<boolean> {
    const key = `${TOKEN_PREFIX}${token}`;
    const result = await redisClient.expire(key, ttlSeconds);
    return result === 1;
  },

  /**
   * Check if session exists without fetching data
   */
  async sessionExists(token: string): Promise<boolean> {
    const key = `${TOKEN_PREFIX}${token}`;
    return (await redisClient.exists(key)) === 1;
  }
};
```

---

### 2. Auth Service Updates

**File:** `src/services/auth/auth.service.ts`

```typescript
import { tokenStore } from './token-store';

export const login = async (email: string, password: string) => {
  // ... validate credentials ...

  const accessToken = generateJWT(user);
  const refreshToken = generateRefreshToken();

  // Store session in Redis
  await tokenStore.setSession(accessToken, {
    userId: user._id.toString(),
    userEmail: user.email,
    userTypes: user.userTypes,
    createdAt: Date.now(),
    expiresAt: Date.now() + (15 * 60 * 1000)
  }, 900); // 15 minutes TTL

  return { accessToken, refreshToken, user };
};

export const logout = async (token: string) => {
  await tokenStore.deleteSession(token);
};

export const logoutEverywhere = async (userId: string) => {
  const count = await tokenStore.deleteAllUserSessions(userId);
  return { sessionsRevoked: count };
};
```

---

### 3. Authentication Middleware Updates

**File:** `src/middlewares/authenticate.middleware.ts`

```typescript
import { tokenStore } from '@/services/auth/token-store';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // 1. Verify JWT signature (fast, local)
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 2. Check session exists in Redis (handles revocation)
  const session = await tokenStore.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or revoked' });
  }

  // 3. Optional: Sliding expiration
  await tokenStore.extendSession(token, 900);

  req.user = {
    id: session.userId,
    email: session.userEmail,
    userTypes: session.userTypes,
  };

  next();
};
```

---

## Redis Key Structure

```
session:{jwt-token}           → JSON session data (TTL: 15 min)
admin-session:{jwt-token}     → JSON admin session (TTL: 15 min)
user-tokens:{userId}          → Set of active tokens for user
refresh-token:{token}         → User ID (TTL: 7 days)
```

### Example

```
session:eyJhbGciOiJI...       → {"userId":"abc","email":"user@example.com",...}
user-tokens:abc123            → ["eyJhbGci...", "eyJhbGci..."]
```

---

## Benefits

| Feature | In-Memory | Redis |
|---------|-----------|-------|
| Server restart | Sessions lost ❌ | Sessions persist ✅ |
| Multiple instances | Isolated ❌ | Shared ✅ |
| Horizontal scaling | Broken ❌ | Works ✅ |
| Logout everywhere | Complex ❌ | Single operation ✅ |
| Session revocation | Wait for JWT expiry ❌ | Immediate ✅ |
| TTL management | Manual cleanup ❌ | Automatic ✅ |
| Memory pressure | Node.js heap ❌ | Offloaded ✅ |

---

## Advanced Features

### 1. Active Session Listing

```typescript
async getActiveSessions(userId: string) {
  const tokens = await redisClient.smembers(`user-tokens:${userId}`);
  const sessions = [];
  
  for (const token of tokens) {
    const session = await tokenStore.getSession(token);
    if (session) {
      sessions.push({
        createdAt: new Date(session.createdAt),
        tokenHint: `...${token.slice(-4)}` // Don't expose full token
      });
    }
  }
  
  return sessions;
}
```

### 2. Concurrent Session Limits

```typescript
async enforceSessionLimit(userId: string, maxSessions = 5) {
  const tokens = await redisClient.smembers(`user-tokens:${userId}`);
  
  if (tokens.length >= maxSessions) {
    const sessionsWithTime = await Promise.all(
      tokens.map(async (token) => ({
        token,
        session: await tokenStore.getSession(token)
      }))
    );
    
    // Remove oldest sessions
    sessionsWithTime
      .filter(s => s.session)
      .sort((a, b) => a.session!.createdAt - b.session!.createdAt)
      .slice(0, tokens.length - maxSessions + 1)
      .forEach(s => tokenStore.deleteSession(s.token));
  }
}
```

### 3. Immediate Revocation Events

```typescript
// Password change - invalidate all sessions
async onPasswordChange(userId: string) {
  await tokenStore.deleteAllUserSessions(userId);
}

// User deactivated - immediate lockout
async onUserDeactivated(userId: string) {
  await tokenStore.deleteAllUserSessions(userId);
}

// Security breach - revoke specific token
async onSuspiciousActivity(token: string) {
  await tokenStore.deleteSession(token);
}
```

---

## Configuration

### Environment Variables

```bash
# .env.development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SESSION_DB=1

# .env.production
REDIS_HOST=redis-cluster.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_SECRET}
REDIS_TLS=true
REDIS_SESSION_DB=1
```

### Redis Config Updates

**File:** `src/config/redis.config.ts`

```typescript
import Redis from 'ioredis';

const sessionRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_SESSION_DB || '1'),
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

export { sessionRedis as redisClient };
```

---

## Migration Plan

### Phase 1: Dual-Write (Week 1)

- Add `tokenStore` service
- Write to both memory and Redis
- Read from memory (fallback)
- Monitor Redis performance

### Phase 2: Redis Primary (Week 2)

- Read from Redis first
- Fallback to memory if Redis unavailable
- Log all fallbacks for monitoring

### Phase 3: Memory Removal (Week 3)

- Remove in-memory token storage
- Redis is sole source of truth
- Add Redis health check to startup

### Phase 4: Advanced Features (Week 4+)

- Session listing for users
- Concurrent session limits
- Admin session dashboard

---

## Testing

### Unit Tests

```typescript
describe('TokenStore', () => {
  beforeEach(async () => {
    await redisClient.flushdb();
  });

  it('should store and retrieve session', async () => {
    const token = 'test-token';
    const session = { userId: '123', userEmail: 'test@example.com' };
    
    await tokenStore.setSession(token, session, 900);
    const retrieved = await tokenStore.getSession(token);
    
    expect(retrieved.userId).toBe('123');
  });

  it('should delete all user sessions', async () => {
    const userId = '123';
    await tokenStore.setSession('token1', { userId }, 900);
    await tokenStore.setSession('token2', { userId }, 900);
    
    const count = await tokenStore.deleteAllUserSessions(userId);
    
    expect(count).toBe(2);
    expect(await tokenStore.getSession('token1')).toBeNull();
    expect(await tokenStore.getSession('token2')).toBeNull();
  });

  it('should expire sessions automatically', async () => {
    await tokenStore.setSession('token', { userId: '123' }, 1); // 1 second TTL
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    expect(await tokenStore.getSession('token')).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Authentication with Redis', () => {
  it('should maintain session across simulated server restart', async () => {
    // Login
    const { accessToken } = await authService.login('user@test.com', 'password');
    
    // Simulate "server restart" by clearing in-memory state
    // (In real implementation, this would be a different process)
    
    // Session should still be valid (from Redis)
    const session = await tokenStore.getSession(accessToken);
    expect(session).not.toBeNull();
  });
});
```

---

## Monitoring

### Health Check

```typescript
// src/utils/health-check.ts
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
};
```

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `session.count` | Active sessions in Redis | > 100k |
| `session.create.latency` | Time to store session | > 50ms |
| `session.get.latency` | Time to retrieve session | > 10ms |
| `session.revocations` | Sessions revoked/minute | > 100/min |
| `redis.connection.errors` | Failed Redis connections | > 0 |

---

## Rollback Plan

If Redis issues occur in production:

1. **Immediate:** Enable fallback to in-memory storage
2. **Short-term:** Route traffic to instances with memory sessions
3. **Resolution:** Fix Redis issues, replay failed writes

```typescript
// Emergency fallback flag
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

async getSession(token: string) {
  if (REDIS_ENABLED) {
    try {
      return await this.getFromRedis(token);
    } catch (error) {
      logger.error('Redis read failed, falling back to memory', error);
    }
  }
  return this.getFromMemory(token);
}
```

---

## Related Documentation

- `src/config/redis.config.ts` - Redis connection configuration
- `devdocs/architecture/transaction-pattern.md` - Database transaction patterns
- `devdocs/DEPLOYMENT_GUIDE.md` - Production Redis setup
