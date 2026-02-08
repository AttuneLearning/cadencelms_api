# Pattern: Integration Test Setup

**Category:** Testing
**Created:** 2026-02-04
**Tags:** #pattern #testing #api

## Problem

Integration tests for the API need consistent setup including MongoDB, authentication, authorization, and test data seeding. How do we structure tests for consistency and reliability?

## Solution

Use a standard structure with MongoMemoryServer, helper utilities, and consistent before/after hooks.

### Test File Structure

```typescript
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Feature API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;

  beforeAll(async () => {
    // 1. Start MongoMemoryServer
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 2. Seed lookup values (required by many models)
    await seedLearningUnitLookups();

    // 3. Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // 4. Refresh department cache
    await refreshDepartmentCache();

    // 5. Seed roles and access rights
    await RoleDefinition.create({ /* ... */ });
    await AccessRight.create([ /* ... */ ]);

    // 6. Create test user with Staff record
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({ /* ... */ });
    await Staff.create({ /* ... */ });

    // 7. Generate auth token
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Test User'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create per-test data
  });

  afterEach(async () => {
    // Clean up per-test data
  });

  describe('POST /api/v2/resource', () => {
    describe('successful creation', () => {
      it('should create resource with valid data', async () => {
        const response = await request(app)
          .post('/api/v2/resource')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ /* data */ });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing required fields', async () => { /* ... */ });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => { /* ... */ });
    });
  });
});
```

## Key Helpers

| Helper | Purpose |
|--------|---------|
| `describeIfMongo` | Skip tests when MongoDB unavailable |
| `refreshDepartmentCache` | Update cached department data |
| `seedLearningUnitLookups` | Create required lookup values |

## Test Organization

Group tests by:
1. **HTTP Method** - `describe('POST /api/v2/...')`
2. **Outcome** - `describe('successful creation')`, `describe('validation errors')`
3. **Aspect** - `describe('authorization')`, `describe('error handling')`

## When to Use

- All API endpoint integration tests
- Tests requiring MongoDB
- Tests requiring authentication

## When NOT to Use

- Unit tests (no MongoDB needed)
- Tests that only check TypeScript compilation

## Examples in Codebase

- `tests/integration/module-edit-lock/module-edit-lock.test.ts`
- `tests/integration/adaptive-learning/knowledge-nodes.test.ts`
- `tests/integration/modules/modules.test.ts`

## Related Patterns

- [[describe-if-mongo]]
- [[department-scoping]]

## Links

- Memory log: [[../memory-log]]
- ADR: `dev_communication/architecture/decisions/ADR-DEV-001-TESTING-STRATEGY.md`
