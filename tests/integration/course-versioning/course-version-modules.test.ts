/**
 * Course Version Module Management API Integration Tests
 *
 * Tests the course version module management endpoints:
 * - GET    /api/v2/course-versions/:id/modules           - List modules
 * - POST   /api/v2/course-versions/:id/modules           - Add module
 * - DELETE /api/v2/course-versions/:id/modules/:moduleId - Remove module
 * - PATCH  /api/v2/course-versions/:id/modules/reorder   - Reorder modules
 * - PATCH  /api/v2/course-versions/:id/modules/:moduleId - Update settings
 *
 * Related: API-ISS-015 (Course Version Module Management)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Module from '@/models/academic/Module.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Course Version Module Management API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;
  let canonicalCourse: any;
  let draftVersion: any;
  let publishedVersion: any;
  let testModule1: any;
  let testModule2: any;
  let testModule3: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await seedLearningUnitLookups();

    await LookupValue.create([
      { category: 'course-status', key: 'draft', displayAs: 'Draft', sortOrder: 1, isActive: true },
      { category: 'course-status', key: 'published', displayAs: 'Published', sortOrder: 2, isActive: true }
    ]);

    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: ['content:courses:read', 'content:courses:manage'],
      isActive: true
    });

    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'module-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{ email: testUser.email, type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
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
    // Create canonical course
    canonicalCourse = await CanonicalCourse.create({
      code: 'MOD' + Date.now(),
      departmentId: testDepartment._id,
      totalVersions: 2,
      createdBy: testUser._id
    });

    // Create published version
    publishedVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Module Test Course',
      description: 'Testing module management',
      credits: 3,
      duration: 120,
      settings: { allowSelfEnrollment: false, passingScore: 70 },
      status: 'published',
      isLocked: false,
      isLatest: false,
      createdBy: testUser._id,
      publishedAt: new Date(),
      publishedBy: testUser._id
    });

    // Create draft version
    draftVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 2,
      title: 'Module Test Course v2',
      description: 'Testing module management v2',
      credits: 3,
      duration: 120,
      settings: { allowSelfEnrollment: false, passingScore: 70 },
      status: 'draft',
      isLocked: false,
      isLatest: true,
      parentVersionId: publishedVersion._id,
      createdBy: testUser._id
    });

    canonicalCourse.currentPublishedVersionId = publishedVersion._id;
    canonicalCourse.latestDraftVersionId = draftVersion._id;
    await canonicalCourse.save();

    // Create test modules
    const moduleDefaults = {
      ownerDepartmentId: testDepartment._id,
      isShared: false,
      isPublished: true,
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
    };

    testModule1 = await Module.create({
      ...moduleDefaults,
      title: 'Module 1',
      description: 'First module',
      order: 1
    });

    testModule2 = await Module.create({
      ...moduleDefaults,
      title: 'Module 2',
      description: 'Second module',
      order: 2
    });

    testModule3 = await Module.create({
      ...moduleDefaults,
      title: 'Module 3',
      description: 'Third module',
      order: 3
    });
  });

  afterEach(async () => {
    await CourseVersionModule.deleteMany({});
    await CourseVersion.deleteMany({});
    await CanonicalCourse.deleteMany({});
    await Module.deleteMany({});
  });

  // =========================================================================
  // List Modules Tests (GET /api/v2/course-versions/:id/modules)
  // =========================================================================
  describe('GET /api/v2/course-versions/:id/modules', () => {
    beforeEach(async () => {
      // Add modules to draft version
      await CourseVersionModule.create([
        { courseVersionId: draftVersion._id, moduleId: testModule1._id, order: 1, isRequired: true },
        { courseVersionId: draftVersion._id, moduleId: testModule2._id, order: 2, isRequired: false }
      ]);
    });

    describe('successful listing', () => {
      it('should list modules sorted by order', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.modules).toHaveLength(2);
        expect(response.body.data.modules[0].order).toBe(1);
        expect(response.body.data.modules[1].order).toBe(2);
      });

      it('should include module details in response', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const firstModule = response.body.data.modules[0];
        expect(firstModule).toHaveProperty('id');
        expect(firstModule).toHaveProperty('courseVersionId');
        expect(firstModule).toHaveProperty('moduleId');
        expect(firstModule).toHaveProperty('module');
        expect(firstModule.module.title).toBe('Module 1');
      });

      it('should return empty array for version with no modules', async () => {
        // Create a new draft version with no modules
        const emptyVersion = await CourseVersion.create({
          canonicalCourseId: canonicalCourse._id,
          version: 3,
          title: 'Empty Version',
          credits: 1,
          duration: 60,
          status: 'draft',
          isLocked: false,
          isLatest: false,
          createdBy: testUser._id
        });

        const response = await request(app)
          .get(`/api/v2/course-versions/${emptyVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(0);
        expect(response.body.data.total).toBe(0);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/course-versions/${nonExistentId}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid version ID', async () => {
        const response = await request(app)
          .get('/api/v2/course-versions/invalid-id/modules')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${draftVersion._id}/modules`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Add Module Tests (POST /api/v2/course-versions/:id/modules)
  // =========================================================================
  describe('POST /api/v2/course-versions/:id/modules', () => {
    describe('successful addition', () => {
      it('should add module to draft version', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString() });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe(testModule1._id.toString());
        expect(response.body.data.courseVersionId).toBe(draftVersion._id.toString());
        expect(response.body.data.isRequired).toBe(true); // Default
      });

      it('should auto-calculate order when not provided', async () => {
        // Add first module
        const firstResponse = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString() });

        expect(firstResponse.status).toBe(201);
        const firstOrder = firstResponse.body.data.order;

        // Add second module without order - should be after first
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule2._id.toString() });

        expect(response.status).toBe(201);
        expect(response.body.data.order).toBeGreaterThan(firstOrder);
      });

      it('should use provided order', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString(), order: 5 });

        expect(response.status).toBe(201);
        expect(response.body.data.order).toBe(5);
      });

      it('should set isRequired to provided value', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString(), isRequired: false });

        expect(response.status).toBe(201);
        expect(response.body.data.isRequired).toBe(false);
      });

      it('should set availability dates', async () => {
        const availableFrom = new Date('2026-03-01');
        const availableUntil = new Date('2026-06-01');

        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleId: testModule1._id.toString(),
            availableFrom: availableFrom.toISOString(),
            availableUntil: availableUntil.toISOString()
          });

        expect(response.status).toBe(201);
        expect(new Date(response.body.data.availableFrom).getTime()).toBe(availableFrom.getTime());
        expect(new Date(response.body.data.availableUntil).getTime()).toBe(availableUntil.getTime());
      });
    });

    describe('error handling', () => {
      it('should return 400 when adding to published version', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${publishedVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('draft');
      });

      it('should return 409 when adding duplicate module', async () => {
        // Add module first time
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString() });

        // Try to add same module again
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: testModule1._id.toString() });

        expect(response.status).toBe(409);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleId: nonExistentId.toString() });

        expect(response.status).toBe(404);
      });

      it('should return validation error for missing moduleId', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        // Validation middleware returns 422 for invalid request body
        expect([400, 422]).toContain(response.status);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
          .send({ moduleId: testModule1._id.toString() });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Remove Module Tests (DELETE /api/v2/course-versions/:id/modules/:moduleId)
  // =========================================================================
  describe('DELETE /api/v2/course-versions/:id/modules/:moduleId', () => {
    beforeEach(async () => {
      await CourseVersionModule.create([
        { courseVersionId: draftVersion._id, moduleId: testModule1._id, order: 1, isRequired: true },
        { courseVersionId: draftVersion._id, moduleId: testModule2._id, order: 2, isRequired: true },
        { courseVersionId: draftVersion._id, moduleId: testModule3._id, order: 3, isRequired: true }
      ]);
    });

    describe('successful removal', () => {
      it('should remove module from version', async () => {
        const response = await request(app)
          .delete(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule2._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify module was removed
        const remaining = await CourseVersionModule.find({ courseVersionId: draftVersion._id });
        expect(remaining).toHaveLength(2);
        expect(remaining.some(m => m.moduleId.toString() === testModule2._id.toString())).toBe(false);
      });

      it('should reorder remaining modules after removal', async () => {
        await request(app)
          .delete(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule2._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        const remaining = await CourseVersionModule.find({ courseVersionId: draftVersion._id }).sort({ order: 1 });
        expect(remaining).toHaveLength(2);
        // Orders should be preserved or sequential
        expect(remaining[0].order).toBeLessThan(remaining[1].order);
      });
    });

    describe('error handling', () => {
      it('should return 400 when removing from published version', async () => {
        // Add module to published version directly
        await CourseVersionModule.create({
          courseVersionId: publishedVersion._id,
          moduleId: testModule1._id,
          order: 1,
          isRequired: true
        });

        const response = await request(app)
          .delete(`/api/v2/course-versions/${publishedVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('draft');
      });

      it('should return 404 for module not in version', async () => {
        const response = await request(app)
          .delete(`/api/v2/course-versions/${draftVersion._id}/modules/${new mongoose.Types.ObjectId()}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Reorder Modules Tests (PATCH /api/v2/course-versions/:id/modules/reorder)
  // =========================================================================
  describe('PATCH /api/v2/course-versions/:id/modules/reorder', () => {
    beforeEach(async () => {
      await CourseVersionModule.create([
        { courseVersionId: draftVersion._id, moduleId: testModule1._id, order: 1, isRequired: true },
        { courseVersionId: draftVersion._id, moduleId: testModule2._id, order: 2, isRequired: true },
        { courseVersionId: draftVersion._id, moduleId: testModule3._id, order: 3, isRequired: true }
      ]);
    });

    describe('successful reordering', () => {
      it('should reorder modules', async () => {
        const newOrder = [
          testModule3._id.toString(),
          testModule1._id.toString(),
          testModule2._id.toString()
        ];

        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleOrder: newOrder });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.modules).toHaveLength(3);

        // Verify new order - modules should be in the requested sequence
        const modules = response.body.data.modules;
        expect(modules[0].module.title).toBe('Module 3');
        expect(modules[1].module.title).toBe('Module 1');
        expect(modules[2].module.title).toBe('Module 2');
        // Orders should be sequential (0, 1, 2 or 1, 2, 3 depending on implementation)
        expect(modules[0].order).toBeLessThan(modules[1].order);
        expect(modules[1].order).toBeLessThan(modules[2].order);
      });

      it('should persist reordering to database', async () => {
        const newOrder = [
          testModule2._id.toString(),
          testModule3._id.toString(),
          testModule1._id.toString()
        ];

        await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleOrder: newOrder });

        // Verify in database
        const modules = await CourseVersionModule.find({ courseVersionId: draftVersion._id }).sort({ order: 1 });
        expect(modules[0].moduleId.toString()).toBe(testModule2._id.toString());
        expect(modules[1].moduleId.toString()).toBe(testModule3._id.toString());
        expect(modules[2].moduleId.toString()).toBe(testModule1._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 400 when reordering published version', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${publishedVersion._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleOrder: [testModule1._id.toString()] });

        expect(response.status).toBe(400);
      });

      it('should return 400 for incomplete module list', async () => {
        // Only include 2 of 3 modules
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleOrder: [testModule1._id.toString(), testModule2._id.toString()]
          });

        expect(response.status).toBe(400);
      });

      it('should return validation error for missing moduleOrder', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        // Validation middleware returns 422 for invalid request body
        expect([400, 422]).toContain(response.status);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
          .send({ moduleOrder: [] });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Update Module Settings Tests (PATCH /api/v2/course-versions/:id/modules/:moduleId)
  // =========================================================================
  describe('PATCH /api/v2/course-versions/:id/modules/:moduleId', () => {
    beforeEach(async () => {
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule1._id,
        order: 1,
        isRequired: true,
        availableFrom: null,
        availableUntil: null
      });
    });

    describe('successful updates', () => {
      it('should update isRequired', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isRequired: false });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isRequired).toBe(false);
      });

      it('should update availableFrom', async () => {
        const availableFrom = new Date('2026-04-01');

        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: availableFrom.toISOString() });

        expect(response.status).toBe(200);
        expect(new Date(response.body.data.availableFrom).getTime()).toBe(availableFrom.getTime());
      });

      it('should update availableUntil', async () => {
        const availableUntil = new Date('2026-12-31');

        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableUntil: availableUntil.toISOString() });

        expect(response.status).toBe(200);
        expect(new Date(response.body.data.availableUntil).getTime()).toBe(availableUntil.getTime());
      });

      it('should update multiple settings at once', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isRequired: false,
            availableFrom: '2026-03-01T00:00:00.000Z',
            availableUntil: '2026-09-01T00:00:00.000Z'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isRequired).toBe(false);
        expect(response.body.data.availableFrom).toBeDefined();
        expect(response.body.data.availableUntil).toBeDefined();
      });

      it('should clear availableFrom when set to null', async () => {
        // First set a value
        await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: '2026-03-01T00:00:00.000Z' });

        // Then clear it
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: null });

        expect(response.status).toBe(200);
        expect(response.body.data.availableFrom).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return 400 when updating published version', async () => {
        // Add module to published version
        await CourseVersionModule.create({
          courseVersionId: publishedVersion._id,
          moduleId: testModule1._id,
          order: 1,
          isRequired: true
        });

        const response = await request(app)
          .patch(`/api/v2/course-versions/${publishedVersion._id}/modules/${testModule1._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isRequired: false });

        expect(response.status).toBe(400);
      });

      it('should return 404 for module not in version', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule2._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isRequired: false });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
          .send({ isRequired: false });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Full Module Management Workflow
  // =========================================================================
  describe('Full Module Management Workflow', () => {
    it('should handle complete module management lifecycle', async () => {
      // 1. Add modules
      await request(app)
        .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moduleId: testModule1._id.toString(), order: 1 });

      await request(app)
        .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moduleId: testModule2._id.toString(), order: 2 });

      await request(app)
        .post(`/api/v2/course-versions/${draftVersion._id}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ moduleId: testModule3._id.toString(), order: 3 });

      // 2. Verify modules were added
      let listResponse = await request(app)
        .get(`/api/v2/course-versions/${draftVersion._id}/modules`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.body.data.modules).toHaveLength(3);

      // 3. Reorder modules (3, 1, 2)
      await request(app)
        .patch(`/api/v2/course-versions/${draftVersion._id}/modules/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          moduleOrder: [
            testModule3._id.toString(),
            testModule1._id.toString(),
            testModule2._id.toString()
          ]
        });

      // 4. Update settings for first module
      await request(app)
        .patch(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule3._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isRequired: false });

      // 5. Remove middle module
      await request(app)
        .delete(`/api/v2/course-versions/${draftVersion._id}/modules/${testModule1._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 6. Verify final state
      listResponse = await request(app)
        .get(`/api/v2/course-versions/${draftVersion._id}/modules`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.body.data.modules).toHaveLength(2);
      expect(listResponse.body.data.modules[0].module.title).toBe('Module 3');
      expect(listResponse.body.data.modules[0].isRequired).toBe(false);
    });
  });
});
