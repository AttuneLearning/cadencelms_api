# ADR-SEC-001: Security Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Security

## Context

CadenceLMS handles sensitive educational data including:
- Personal Identifiable Information (PII): names, emails, addresses
- Government IDs: SSN, passport numbers, driver's licenses
- Academic records: grades, transcripts, certifications
- Financial data: payment information (via Stripe)
- Health-related accommodations: disability documentation

A comprehensive security architecture is essential to:
- Protect user privacy and comply with regulations (FERPA, GDPR)
- Prevent common web vulnerabilities (OWASP Top 10)
- Ensure data integrity and availability
- Maintain audit trails for compliance
- Enable secure integrations with third-party systems

## Decision

### 1. Security Layers Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: NETWORK SECURITY                                      │
│  ├── TLS 1.3 for all connections                                │
│  ├── CORS policy enforcement                                    │
│  └── Rate limiting at edge                                      │
│                                                                  │
│  Layer 2: APPLICATION SECURITY                                  │
│  ├── Security headers (Helmet)                                  │
│  ├── Input validation (Zod schemas)                             │
│  ├── Output encoding                                            │
│  └── CSRF protection                                            │
│                                                                  │
│  Layer 3: AUTHENTICATION                                        │
│  ├── JWT access tokens (15 min)                                 │
│  ├── Refresh tokens (7 days, Redis)                             │
│  ├── Password hashing (bcrypt)                                  │
│  └── MFA support (future)                                       │
│                                                                  │
│  Layer 4: AUTHORIZATION                                         │
│  ├── Role-based access control (RBAC)                           │
│  ├── Department-scoped permissions                              │
│  ├── Resource ownership checks                                  │
│  └── Cached permission resolution                               │
│                                                                  │
│  Layer 5: DATA PROTECTION                                       │
│  ├── Field-level encryption (AES-256-GCM)                       │
│  ├── Password hashing (bcrypt, cost 10)                         │
│  ├── Secure token generation                                    │
│  └── Key rotation support                                       │
│                                                                  │
│  Layer 6: AUDIT & MONITORING                                    │
│  ├── Audit logs for sensitive operations                        │
│  ├── Security event logging                                     │
│  └── Anomaly detection (future)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Authentication Security

#### Password Handling

**Hashing Algorithm:** bcrypt with cost factor 10

```typescript
// src/utils/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;  // ~100ms on modern hardware

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not in common password list
- Not similar to email or name

**Password Storage:**
```typescript
// Password excluded from queries by default
const userSchema = {
  password: {
    type: String,
    required: true,
    select: false  // Never returned unless explicitly requested
  }
};

// Only fetch when needed for verification
const user = await User.findById(id).select('+password');
```

#### Token Security

**Access Tokens (JWT):**
```typescript
// Token structure
{
  "sub": "user_123",           // User ID
  "email": "user@example.com",
  "userTypes": ["staff"],
  "permissionVersion": 5,      // For cache invalidation
  "iat": 1706367600,           // Issued at
  "exp": 1706368500            // Expires (15 minutes)
}

// Signing
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: '15m'
});
```

**Refresh Tokens:**
```typescript
// Cryptographically secure random token
const refreshToken = crypto.randomBytes(64).toString('hex');

// Store hashed version in Redis
const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
await Cache.set(`refresh_token:${userId}`, hashedToken, 7 * 24 * 60 * 60);  // 7 days

// Return plain token to client (stored in httpOnly cookie)
```

**Token Lifecycle:**

| Token Type | Storage | Lifetime | Revocation |
|------------|---------|----------|------------|
| Access (JWT) | Memory/localStorage | 15 minutes | Wait for expiry |
| Refresh | httpOnly cookie | 7 days | Delete from Redis |
| Password Reset | None (email link) | 1 hour | Delete from Redis after use |
| Email Verification | None (email link) | 24 hours | Delete from Redis after use |

#### Password Reset Flow

```typescript
// 1. Generate secure token
const resetToken = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

// 2. Store hashed token (not plain!) with expiry
await Cache.set(`password_reset:${hashedToken}`, userId, 60 * 60);  // 1 hour

// 3. Send plain token in email link (HTTPS only)
// https://app.example.com/reset-password/{resetToken}

// 4. On reset: hash incoming token, lookup in Redis, verify, update password
// 5. Invalidate all refresh tokens (force re-login everywhere)
await Cache.del(`refresh_token:${userId}`);
```

### 3. Authorization Security

See **ADR-AUTH-001: Unified Authorization Model** for complete details.

**Key Security Principles:**
- Deny by default
- Minimum privilege
- Permission caching with version-based invalidation
- Department-scoped access control
- Escalation for admin operations

```typescript
// Authorization check pattern
const result = await authorize(userId, requiredRight, { departmentId, resourceId });

if (!result.authorized) {
  throw ApiError.forbidden(result.reason);
}
```

### 4. Input Validation

#### Validation Strategy

**Layer 1: Schema Validation (Zod)**
```typescript
import { z } from 'zod';

const createCourseSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name cannot exceed 200 characters')
    .trim(),
  code: z.string()
    .min(1, 'Code is required')
    .max(50, 'Code cannot exceed 50 characters')
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, 'Code must be alphanumeric'),
  credits: z.number()
    .int()
    .min(0, 'Credits cannot be negative')
    .max(20, 'Credits cannot exceed 20'),
  departmentId: z.string()
    .regex(/^[a-f0-9]{24}$/, 'Invalid department ID')
});

// Middleware
export function validate(schema: z.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw ApiError.badRequest('Validation failed', result.error.errors);
    }
    req.body = result.data;  // Use sanitized data
    next();
  };
}
```

**Layer 2: Mongoose Validation**
```typescript
const courseSchema = {
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [200, 'Course name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: '{VALUE} is not a valid status'
    }
  }
};
```

**Layer 3: Business Logic Validation**
```typescript
// Pre-save hook for cross-collection validation
courseSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'published') {
    // Ensure course has at least one module
    const moduleCount = await Module.countDocuments({ courseId: this._id });
    if (moduleCount === 0) {
      return next(new Error('Cannot publish course without modules'));
    }
  }
  next();
});
```

#### Input Sanitization

| Input Type | Sanitization | Example |
|------------|--------------|---------|
| Strings | Trim whitespace | `name.trim()` |
| Email | Lowercase, trim | `email.toLowerCase().trim()` |
| HTML content | Sanitize with DOMPurify | `DOMPurify.sanitize(html)` |
| File uploads | Validate MIME type, scan | Check magic bytes |
| URLs | Validate protocol, domain | Allow only https:// |
| ObjectIds | Validate format | `/^[a-f0-9]{24}$/` |

### 5. Output Encoding

#### Prevent XSS in API Responses

```typescript
// JSON responses are automatically safe (JSON encoding)
res.json({ name: userInput });  // Safe: encoded as JSON string

// For HTML rendering (if any), use template engine escaping
// or explicit encoding
import { encode } from 'html-entities';
const safeHtml = encode(userInput);
```

#### Response Filtering

```typescript
// Never return sensitive fields
const userSchema = {
  password: { type: String, select: false },
  refreshTokenHash: { type: String, select: false },
  mfaSecret: { type: String, select: false }
};

// Explicit projection in queries
const user = await User.findById(id)
  .select('-__v')  // Exclude version key
  .lean();

// Transform before sending
function sanitizeUser(user: IUser) {
  const { password, refreshTokenHash, ...safe } = user;
  return safe;
}
```

### 6. Security Headers

**Helmet Configuration:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // For inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Prevent MIME type sniffing
  noSniff: true,
  // XSS filter
  xssFilter: true,
  // HSTS (HTTPS only)
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

**Response Headers:**
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. CORS Configuration

```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,           // https://app.cadencelms.com
      process.env.ADMIN_URL,              // https://admin.cadencelms.com
    ];

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,                       // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400                            // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

### 8. Rate Limiting

#### Rate Limit Tiers

| Endpoint Type | Limit | Window | Key |
|---------------|-------|--------|-----|
| Auth (login/register) | 5 requests | 15 minutes | IP |
| Password reset | 3 requests | 1 hour | Email |
| API (authenticated) | 1000 requests | 1 minute | User ID |
| API (unauthenticated) | 100 requests | 1 minute | IP |
| File uploads | 10 requests | 1 hour | User ID |
| Bulk operations | 5 requests | 1 minute | User ID |

#### Implementation

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Auth rate limiter
const authLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

app.use('/api/v2/auth/login', authLimiter);
app.use('/api/v2/auth/register', authLimiter);

// API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000,  // 1 minute
  max: 1000,
  keyGenerator: (req) => req.user?.id || req.ip
});

app.use('/api/v2', apiLimiter);
```

### 9. Data Encryption

#### Field-Level Encryption (PII)

**Algorithm:** AES-256-GCM (authenticated encryption)

```typescript
// Encrypted format: version:iv:authTag:ciphertext
// Example: 01:a1b2c3d4e5f6...:g7h8i9j0...:k1l2m3n4...

// Encrypt sensitive fields
const encrypted = EncryptionFactory.encrypt('123-45-6789');

// Decrypt when needed
const decrypted = EncryptionFactory.decrypt(encrypted);

// Check if already encrypted
if (!EncryptionFactory.isEncrypted(value)) {
  value = EncryptionFactory.encrypt(value);
}
```

**Encrypted Fields:**

| Model | Field | Reason |
|-------|-------|--------|
| Demographics | ssn | Government ID |
| Demographics | passportNumber | Government ID |
| Demographics | driverLicenseNumber | Government ID |
| Demographics | alienRegistrationNumber | Government ID |
| PersonExtended | emergencyContactPhone | PII |

**Key Management:**
```bash
# Generate encryption key
openssl rand -hex 32

# Environment variables
ENCRYPTION_KEY=<64-hex-chars>        # Current key (version 01)
ENCRYPTION_KEY_V02=<64-hex-chars>    # After rotation (version 02)
```

**Key Rotation:**
```typescript
// Re-encrypt data with new key version
const newEncrypted = EncryptionFactory.reEncrypt(oldEncrypted, '02');

// Migration script for key rotation
async function rotateEncryptionKey(newVersion: string) {
  const learners = await Learner.find({ 'demographics.ssn': { $exists: true } });

  for (const learner of learners) {
    if (learner.demographics?.ssn) {
      const currentVersion = EncryptionFactory.getKeyVersion(learner.demographics.ssn);
      if (currentVersion !== newVersion) {
        learner.demographics.ssn = EncryptionFactory.reEncrypt(
          learner.demographics.ssn,
          newVersion
        );
        await learner.save();
      }
    }
  }
}
```

#### Encryption at Rest

| Data Type | Encryption | Notes |
|-----------|------------|-------|
| MongoDB | Cloud provider encryption | AWS EBS / Atlas encryption |
| Redis | TLS + cloud encryption | AWS ElastiCache encryption |
| S3 (files) | SSE-S3 or SSE-KMS | Server-side encryption |
| Backups | Encrypted snapshots | Same key management |

#### Encryption in Transit

| Connection | Protocol | Notes |
|------------|----------|-------|
| Client ↔ API | TLS 1.3 | Enforced via HSTS |
| API ↔ MongoDB | TLS 1.2+ | Connection string: `mongodb+srv://` |
| API ↔ Redis | TLS 1.2+ | `rediss://` protocol |
| API ↔ S3 | HTTPS | AWS SDK default |

### 10. Audit Logging

#### Audited Operations

| Category | Operations | Data Captured |
|----------|------------|---------------|
| Authentication | Login, logout, password change | User ID, IP, success/failure |
| Authorization | Permission denied, escalation | User, resource, required right |
| Data Access | View sensitive PII | User, fields accessed |
| Data Modification | Create, update, delete | User, entity, changes |
| Grade Changes | Grade override, correction | User, old value, new value, reason |
| Admin Actions | Role changes, user management | Admin, target user, action |

#### Audit Log Schema

```typescript
const auditLogSchema = {
  action: String,           // 'login', 'create', 'update', 'delete', 'access'
  category: String,         // 'auth', 'data', 'admin', 'grade'
  entityType: String,       // 'User', 'Course', 'Enrollment'
  entityId: ObjectId,
  userId: ObjectId,         // Who performed the action
  ipAddress: String,
  userAgent: String,
  changes: {
    before: Mixed,          // Previous state (for updates)
    after: Mixed            // New state (for updates)
  },
  metadata: Mixed,          // Additional context
  timestamp: Date
};

// Indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });  // 7 years
```

#### Audit Logging Implementation

```typescript
// Service for creating audit logs
class AuditService {
  static async log(params: {
    action: string;
    category: string;
    entityType: string;
    entityId: string;
    userId: string;
    req: Request;
    changes?: { before?: any; after?: any };
    metadata?: any;
  }) {
    await AuditLog.create({
      ...params,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });
  }
}

// Usage in service layer
async function updateEnrollmentGrade(enrollmentId: string, grade: number, req: Request) {
  const enrollment = await Enrollment.findById(enrollmentId);
  const oldGrade = enrollment.grade;

  enrollment.grade = grade;
  await enrollment.save();

  await AuditService.log({
    action: 'update',
    category: 'grade',
    entityType: 'Enrollment',
    entityId: enrollmentId,
    userId: req.user.id,
    req,
    changes: { before: { grade: oldGrade }, after: { grade } }
  });
}
```

### 11. Dependency Security

#### Package Management

```bash
# Regular security audits
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

#### Security Scanning

| Tool | Purpose | Frequency |
|------|---------|-----------|
| npm audit | Dependency vulnerabilities | Every build |
| Snyk | Deep vulnerability scanning | Daily |
| Dependabot | Automated updates | Continuous |
| SonarQube | Code quality & security | PR checks |

#### Dependency Guidelines

1. **Minimize dependencies** - Fewer packages = smaller attack surface
2. **Pin versions** - Use exact versions in package.json
3. **Review changelogs** - Before updating major versions
4. **Avoid deprecated packages** - Check maintenance status
5. **Prefer well-maintained packages** - Active community, recent updates

### 12. Secret Management

#### Environment Variables

```bash
# .env.example (committed)
DATABASE_URL=mongodb://localhost:27017/cadencelms
JWT_SECRET=<generate-with-openssl-rand-hex-64>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...

# .env (never committed)
# Contains actual secrets
```

#### Secret Storage Hierarchy

| Environment | Secret Storage | Notes |
|-------------|----------------|-------|
| Development | .env file (gitignored) | Local only |
| CI/CD | GitHub Secrets | Encrypted at rest |
| Staging | AWS Secrets Manager | Rotatable |
| Production | AWS Secrets Manager | Rotatable, audited |

#### Secret Rotation

| Secret | Rotation Frequency | Process |
|--------|-------------------|---------|
| JWT secret | 90 days | Deploy new secret, old valid for overlap |
| Encryption key | Annually | Re-encrypt data with new key version |
| API keys (Stripe, etc.) | 90 days | Rotate in provider dashboard |
| Database password | 90 days | Update in secrets manager |

### 13. Security Checklist

#### Pre-Deployment

- [ ] All dependencies updated and audited
- [ ] No secrets in code or version control
- [ ] Input validation on all endpoints
- [ ] Authorization checks on all protected routes
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Audit logging enabled

#### Ongoing

- [ ] Weekly: Review security alerts
- [ ] Monthly: npm audit and updates
- [ ] Quarterly: Penetration testing
- [ ] Quarterly: Access review (who has production access)
- [ ] Annually: Encryption key rotation
- [ ] Annually: Security training for team

## Consequences

### Positive
- Defense in depth with multiple security layers
- Compliance-ready audit logging
- PII protection with field-level encryption
- Secure authentication flow with token rotation
- Protection against OWASP Top 10

### Negative
- Encryption adds latency for PII access
- Rate limiting may impact legitimate bulk operations
- Audit logging increases storage requirements
- Key rotation requires planned maintenance

### Neutral
- Existing implementations formalized in this ADR
- Security is ongoing process, not one-time implementation
- Trade-offs between security and usability

## Alternatives Considered

### OAuth 2.0 / OpenID Connect (External IdP)
- **Deferred**: May add in future for enterprise SSO; current JWT approach sufficient for initial launch.

### Hardware Security Modules (HSM)
- **Deferred**: Cost prohibitive for current scale; cloud KMS provides adequate security.

### Web Application Firewall (WAF)
- **Recommended for Production**: Add AWS WAF or Cloudflare in front of API for additional protection.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-AUTH-001-UNIFIED-AUTHORIZATION-MODEL]] (authorization details)
  - [[ADR-API-002-API-CACHING-STRATEGY]] (permission caching)
  - [[ADR-DATA-001-DATA-ARCHITECTURE]] (audit log schema)
- Implementation:
  - `src/utils/password.ts` - Password hashing
  - `src/utils/encryption/EncryptionFactory.ts` - Field encryption
  - `src/services/auth/password.service.ts` - Password reset flow
  - `src/app.ts` - Helmet configuration
  - `src/models/system/AuditLog.model.ts` - Audit logging
- References:
  - [OWASP Top 10](https://owasp.org/www-project-top-ten/)
  - [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
  - [FERPA Compliance](https://www2.ed.gov/policy/gen/guid/fpco/ferpa/)
