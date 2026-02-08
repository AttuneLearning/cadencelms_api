/**
 * Module Edit Lock API Integration Tests
 *
 * Tests the module edit lock API endpoints under /api/v2/modules/:id/edit-lock
 * These endpoints implement optimistic locking to prevent simultaneous module edits.
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Module from '@/models/academic/Module.model';
import ModuleEditLock from '@/models/academic/ModuleEditLock.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Module Edit Lock API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let authToken2: string;
  let testDepartment: any;
  let testCourse: any;
  let testModule: any;
  let testUser: any;
  let testUser2: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await seedLearningUnitLookups();

    // Create course-status lookup values required by Course model
    await LookupValue.create({
      category: 'course-status',
      key: 'draft',
      displayAs: 'Draft',
      sortOrder: 1,
      isActive: true
    });

    await LookupValue.create({
      category: 'course-status',
      key: 'published',
      displayAs: 'Published',
      sortOrder: 2,
      isActive: true
    });

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // Refresh department cache after creating departments
    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: ['content:lessons:read', 'content:lessons:manage', 'content:courses:read', 'content:courses:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Create test user 1
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'lock-test-user1@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Test',
        lastName: 'User1',
        emails: [{
          email: testUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create test user 2
    testUser2 = await User.create({
      email: 'lock-test-user2@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser2._id,
      person: {
        firstName: 'Test',
        lastName: 'User2',
        emails: [{
          email: testUser2.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate auth tokens
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Test User1'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    authToken2 = jwt.sign(
      {
        userId: testUser2._id.toString(),
        email: testUser2.email,
        roles: ['staff'],
        type: 'access',
        name: 'Test User2'
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
    // Create a test course for each test
    testCourse = await Course.create({
      name: 'Test Course',
      code: 'TC' + Date.now(),
      description: 'A test course for module edit lock testing',
      departmentId: testDepartment._id,
      credits: 3,
      status: 'draft',
      isActive: true,
      createdBy: testUser._id
    });

    // Create a test module
    testModule = await Module.create({
      courseId: testCourse._id,
      ownerDepartmentId: testDepartment._id,
      isShared: false,
      title: 'Test Module',
      description: 'A test module',
      order: 1,
      isPublished: false,
      completionCriteria: { type: 'all_required', requireAllExpositions: true },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      createdBy: testUser._id
    });
  });

  afterEach(async () => {
    await ModuleEditLock.deleteMany({});
    await Module.deleteMany({});
    await Course.deleteMany({ code: /^TC/ });
  });

  // =========================================================================
  // Acquire Lock Tests (POST /api/v2/modules/:id/edit-lock)
  // =========================================================================
  describe('POST /api/v2/modules/:id/edit-lock', () => {
    describe('successful lock acquisition', () => {
      it('should acquire lock on unlocked module', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe(testModule._id.toString());
        expect(response.body.data.isLocked).toBe(true);
        expect(response.body.data.lock).toBeDefined();
        expect(response.body.data.lock.userId).toBe(testUser._id.toString());
        expect(response.body.data.lock.acquiredAt).toBeDefined();
        expect(response.body.data.lock.expiresAt).toBeDefined();
        expect(response.body.data.accessRequest).toBeNull();
      });

      it('should refresh lock if same user already holds it', async () => {
        // First acquire
        const firstResponse = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(firstResponse.status).toBe(200);
        const firstExpiresAt = firstResponse.body.data.lock.expiresAt;

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second acquire by same user
        const secondResponse = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.data.isLocked).toBe(true);
        // Expiry should be extended
        expect(new Date(secondResponse.body.data.lock.expiresAt).getTime())
          .toBeGreaterThanOrEqual(new Date(firstExpiresAt).getTime());
      });

      it('should set expiresAt to 30 minutes from now', async () => {
        const beforeRequest = Date.now();

        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        const afterRequest = Date.now();
        const expiresAt = new Date(response.body.data.lock.expiresAt).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        // expiresAt should be approximately 30 minutes from now
        expect(expiresAt).toBeGreaterThanOrEqual(beforeRequest + thirtyMinutes - 1000);
        expect(expiresAt).toBeLessThanOrEqual(afterRequest + thirtyMinutes + 1000);
      });
    });

    describe('lock conflict (MODULE_LOCKED)', () => {
      it('should return 409 when module is locked by another user', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 2 tries to acquire lock
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken2}`);

        expect(response.status).toBe(409);
        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('MODULE_LOCKED');
        expect(response.body.message).toContain('currently being edited');
        expect(response.body.data).toBeDefined();
        expect(response.body.data.isLocked).toBe(true);
        expect(response.body.data.lock.userId).toBe(testUser._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .post('/api/v2/modules/invalid-id/edit-lock')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/modules/${nonExistentId}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Release Lock Tests (DELETE /api/v2/modules/:id/edit-lock)
  // =========================================================================
  describe('DELETE /api/v2/modules/:id/edit-lock', () => {
    describe('successful lock release', () => {
      it('should release lock held by user', async () => {
        // First acquire lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // Then release it
        const response = await request(app)
          .delete(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('released');

        // Verify lock is gone
        const lock = await ModuleEditLock.findOne({ moduleId: testModule._id });
        expect(lock).toBeNull();
      });

      it('should be idempotent - succeed even if no lock exists', async () => {
        const response = await request(app)
          .delete(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return 403 when trying to release lock held by another user', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 2 tries to release it
        const response = await request(app)
          .delete(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken2}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('do not hold the lock');
      });

      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .delete('/api/v2/modules/invalid-id/edit-lock')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/modules/${testModule._id}/edit-lock`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Lock Status Tests (GET /api/v2/modules/:id/edit-lock)
  // =========================================================================
  describe('GET /api/v2/modules/:id/edit-lock', () => {
    describe('successful status check', () => {
      it('should return isLocked: false when no lock exists', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe(testModule._id.toString());
        expect(response.body.data.isLocked).toBe(false);
        expect(response.body.data.lock).toBeNull();
        expect(response.body.data.accessRequest).toBeNull();
      });

      it('should return lock info when module is locked', async () => {
        // Acquire lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // Check status (as different user)
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken2}`);

        expect(response.status).toBe(200);
        expect(response.body.data.isLocked).toBe(true);
        expect(response.body.data.lock).toBeDefined();
        expect(response.body.data.lock.userId).toBe(testUser._id.toString());
        expect(response.body.data.lock.acquiredAt).toBeDefined();
        expect(response.body.data.lock.expiresAt).toBeDefined();
      });

      it('should include access request if one exists', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 2 requests access
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken2}`);

        // Check status
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.accessRequest).toBeDefined();
        expect(response.body.data.accessRequest.userId).toBe(testUser2._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .get('/api/v2/modules/invalid-id/edit-lock')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/modules/${nonExistentId}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/edit-lock`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Heartbeat Tests (PATCH /api/v2/modules/:id/edit-lock)
  // =========================================================================
  describe('PATCH /api/v2/modules/:id/edit-lock', () => {
    describe('successful heartbeat', () => {
      it('should extend lock expiry', async () => {
        // Acquire lock
        const acquireResponse = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        const originalExpiresAt = acquireResponse.body.data.lock.expiresAt;

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));

        // Send heartbeat
        const heartbeatResponse = await request(app)
          .patch(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(heartbeatResponse.status).toBe(200);
        expect(heartbeatResponse.body.success).toBe(true);
        expect(heartbeatResponse.body.message).toContain('extended');
        expect(heartbeatResponse.body.data.isLocked).toBe(true);

        // Expiry should be extended
        expect(new Date(heartbeatResponse.body.data.lock.expiresAt).getTime())
          .toBeGreaterThan(new Date(originalExpiresAt).getTime());
      });
    });

    describe('error handling', () => {
      it('should return 404 when no lock exists', async () => {
        const response = await request(app)
          .patch(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.code).toBe('LOCK_NOT_FOUND');
      });

      it('should return 403 when trying to heartbeat lock held by another user', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 2 tries to heartbeat
        const response = await request(app)
          .patch(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken2}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('do not hold the lock');
      });

      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .patch('/api/v2/modules/invalid-id/edit-lock')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/modules/${testModule._id}/edit-lock`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Request Access Tests (POST /api/v2/modules/:id/edit-lock/request-access)
  // =========================================================================
  describe('POST /api/v2/modules/:id/edit-lock/request-access', () => {
    describe('successful access request', () => {
      it('should store access request on locked module', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 2 requests access
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken2}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('request submitted');
        expect(response.body.data.accessRequest).toBeDefined();
        expect(response.body.data.accessRequest.userId).toBe(testUser2._id.toString());
        expect(response.body.data.accessRequest.requestedAt).toBeDefined();
      });

      it('should replace existing access request (no queue)', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // Create a third user
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        const testUser3 = await User.create({
          email: 'lock-test-user3@example.com',
          password: hashedPassword,
          userTypes: ['staff'],
          defaultDashboard: 'staff',
          isActive: true
        });

        await Staff.create({
          _id: testUser3._id,
          person: {
            firstName: 'Test',
            lastName: 'User3',
            emails: [{
              email: testUser3.email,
              type: 'institutional',
              isPrimary: true,
              verified: true,
              allowNotifications: true
            }],
            phones: [],
            addresses: [],
            timezone: 'America/New_York',
            languagePreference: 'en'
          },
          departmentMemberships: [{
            departmentId: testDepartment._id,
            roles: ['content-admin'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }]
        });

        const authToken3 = jwt.sign(
          {
            userId: testUser3._id.toString(),
            email: testUser3.email,
            roles: ['staff'],
            type: 'access',
            name: 'Test User3'
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        // User 2 requests access first
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken2}`);

        // User 3 requests access (should replace user 2's request)
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken3}`);

        expect(response.status).toBe(200);
        expect(response.body.data.accessRequest.userId).toBe(testUser3._id.toString());

        // Cleanup
        await User.deleteOne({ _id: testUser3._id });
        await Staff.deleteOne({ _id: testUser3._id });
      });
    });

    describe('error handling', () => {
      it('should return 400 when module is not locked', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('not currently locked');
      });

      it('should return 400 when requesting access to own lock', async () => {
        // User 1 acquires lock
        await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // User 1 tries to request access to own lock
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already hold the lock');
      });

      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .post('/api/v2/modules/invalid-id/edit-lock/request-access')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/modules/${nonExistentId}/edit-lock/request-access`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/edit-lock/request-access`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Lock Expiry Tests
  // =========================================================================
  describe('Lock Expiry Behavior', () => {
    it('should allow acquiring lock after previous lock expires', async () => {
      // Create a lock that expires immediately
      const now = new Date();
      await ModuleEditLock.create({
        moduleId: testModule._id,
        userId: testUser._id,
        userName: 'Test User1',
        acquiredAt: new Date(now.getTime() - 60000), // 1 minute ago
        expiresAt: new Date(now.getTime() - 1000), // Already expired
        lastHeartbeat: new Date(now.getTime() - 60000)
      });

      // User 2 should be able to acquire lock
      const response = await request(app)
        .post(`/api/v2/modules/${testModule._id}/edit-lock`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLocked).toBe(true);
      expect(response.body.data.lock.userId).toBe(testUser2._id.toString());
    });

    it('should not show expired lock in status check', async () => {
      // Create a lock that expires immediately
      const now = new Date();
      await ModuleEditLock.create({
        moduleId: testModule._id,
        userId: testUser._id,
        userName: 'Test User1',
        acquiredAt: new Date(now.getTime() - 60000),
        expiresAt: new Date(now.getTime() - 1000), // Already expired
        lastHeartbeat: new Date(now.getTime() - 60000)
      });

      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/edit-lock`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLocked).toBe(false);
      expect(response.body.data.lock).toBeNull();
    });
  });
});
