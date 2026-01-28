/**
 * Cognitive Depth Levels API Integration Tests
 *
 * Tests the cognitive depth levels API endpoints:
 * - GET /api/v2/cognitive-depth-levels (system defaults)
 * - GET /api/v2/departments/:departmentId/cognitive-depth-levels (department levels)
 * - POST /api/v2/departments/:departmentId/cognitive-depth-levels (create override)
 * - PUT /api/v2/departments/:departmentId/cognitive-depth-levels/:slug (update)
 * - DELETE /api/v2/departments/:departmentId/cognitive-depth-levels/:slug (delete)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import CognitiveDepthLevel from '@/models/content/CognitiveDepthLevel.model';
import { LookupValue } from '@/models/LookupValue.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Cognitive Depth Levels API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

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

    // Seed LookupValues for course status
    await LookupValue.create([
      { category: 'course-status', key: 'draft', displayAs: 'Draft', sortOrder: 1, isActive: true },
      { category: 'course-status', key: 'published', displayAs: 'Published', sortOrder: 2, isActive: true },
      { category: 'course-status', key: 'archived', displayAs: 'Archived', sortOrder: 3, isActive: true }
    ]);

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: [
        'content:department:read',
        'content:department:manage',
        'content:own:read',
        'content:courses:read',
        'content:courses:manage'
      ],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:department:read', domain: 'content', resource: 'department', action: 'read', description: 'Read department content', isActive: true },
      { name: 'content:department:manage', domain: 'content', resource: 'department', action: 'manage', description: 'Manage department content', isActive: true },
      { name: 'content:own:read', domain: 'content', resource: 'own', action: 'read', description: 'Read own content', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'cognitive-levels-test@example.com',
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

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Seed system default cognitive depth levels
    await CognitiveDepthLevel.create([
      { slug: 'exposure', name: 'Exposure', order: 1, advanceThreshold: 0.6, minAttempts: 2, isDefault: true },
      { slug: 'practice', name: 'Practice', order: 2, advanceThreshold: 0.7, minAttempts: 3, isDefault: true },
      { slug: 'proficiency', name: 'Proficiency', order: 3, advanceThreshold: 0.8, minAttempts: 4, isDefault: true },
      { slug: 'mastery', name: 'Mastery', order: 4, advanceThreshold: 0.9, minAttempts: 5, isDefault: true }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up department-specific levels after each test, preserve system defaults
    await CognitiveDepthLevel.deleteMany({ departmentId: { $ne: null } });
  });

  // =========================================================================
  // System Defaults Listing Tests
  // =========================================================================
  describe('GET /api/v2/cognitive-depth-levels', () => {
    describe('successful listing', () => {
      it('should return system defaults', async () => {
        const response = await request(app)
          .get('/api/v2/cognitive-depth-levels')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(4);

        // Verify correct order and data
        expect(response.body.data[0].slug).toBe('exposure');
        expect(response.body.data[0].name).toBe('Exposure');
        expect(response.body.data[0].order).toBe(1);
        expect(response.body.data[0].advanceThreshold).toBe(0.6);
        expect(response.body.data[0].minAttempts).toBe(2);
        expect(response.body.data[0].isDefault).toBe(true);

        expect(response.body.data[1].slug).toBe('practice');
        expect(response.body.data[2].slug).toBe('proficiency');
        expect(response.body.data[3].slug).toBe('mastery');
      });

      it('should return levels sorted by order', async () => {
        const response = await request(app)
          .get('/api/v2/cognitive-depth-levels')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        const orders = response.body.data.map((level: any) => level.order);
        expect(orders).toEqual([1, 2, 3, 4]);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get('/api/v2/cognitive-depth-levels');

        expect(response.status).toBe(401);
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/v2/cognitive-depth-levels')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Department Levels Listing Tests
  // =========================================================================
  describe('GET /api/v2/departments/:departmentId/cognitive-depth-levels', () => {
    describe('successful listing', () => {
      it('should return only system defaults when no department overrides exist', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(4);

        // All should be system defaults, not overrides
        response.body.data.forEach((level: any) => {
          expect(level.isDefault).toBe(true);
          expect(level.isOverride).toBe(false);
          expect(level.departmentId).toBeNull();
        });
      });

      it('should return merged levels (system + department overrides)', async () => {
        // Create a department override for 'practice' level
        await CognitiveDepthLevel.create({
          departmentId: testDepartment._id,
          slug: 'practice',
          name: 'Department Practice',
          description: 'Customized practice level',
          order: 2,
          advanceThreshold: 0.75,
          minAttempts: 4,
          isDefault: false
        });

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(4);

        // Find the practice level
        const practiceLevel = response.body.data.find((l: any) => l.slug === 'practice');
        expect(practiceLevel.name).toBe('Department Practice');
        expect(practiceLevel.advanceThreshold).toBe(0.75);
        expect(practiceLevel.minAttempts).toBe(4);
        expect(practiceLevel.isOverride).toBe(true);
        expect(practiceLevel.departmentId).toBe(testDepartment._id.toString());

        // Other levels should still be system defaults
        const exposureLevel = response.body.data.find((l: any) => l.slug === 'exposure');
        expect(exposureLevel.isDefault).toBe(true);
        expect(exposureLevel.isOverride).toBe(false);
      });

      it('should include custom department levels', async () => {
        // Create a completely new level for the department
        await CognitiveDepthLevel.create({
          departmentId: testDepartment._id,
          slug: 'expert',
          name: 'Expert',
          description: 'Beyond mastery',
          order: 5,
          advanceThreshold: 0.95,
          minAttempts: 6,
          isDefault: false
        });

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(5);

        const expertLevel = response.body.data.find((l: any) => l.slug === 'expert');
        expect(expertLevel).toBeDefined();
        expect(expertLevel.name).toBe('Expert');
        expect(expertLevel.order).toBe(5);
        expect(expertLevel.isOverride).toBe(false); // Not overriding system default
      });
    });

    describe('error handling', () => {
      it('should return 404 for invalid department ID format', async () => {
        const response = await request(app)
          .get('/api/v2/departments/invalid-id/cognitive-depth-levels')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for non-existent department', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/departments/${nonExistentId}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Create Department Override Tests
  // =========================================================================
  describe('POST /api/v2/departments/:departmentId/cognitive-depth-levels', () => {
    describe('successful creation', () => {
      it('should create new level with all fields', async () => {
        const levelData = {
          slug: 'advanced',
          name: 'Advanced',
          description: 'Advanced level for high performers',
          order: 5,
          advanceThreshold: 0.85,
          minAttempts: 5
        };

        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(levelData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe('advanced');
        expect(response.body.data.name).toBe('Advanced');
        expect(response.body.data.description).toBe('Advanced level for high performers');
        expect(response.body.data.order).toBe(5);
        expect(response.body.data.advanceThreshold).toBe(0.85);
        expect(response.body.data.minAttempts).toBe(5);
        expect(response.body.data.departmentId).toBe(testDepartment._id.toString());
        expect(response.body.data.isDefault).toBe(false);
      });

      it('should create override for existing system default', async () => {
        const levelData = {
          slug: 'exposure',
          name: 'Custom Exposure',
          description: 'Department-specific exposure level',
          order: 1,
          advanceThreshold: 0.5,
          minAttempts: 1
        };

        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(levelData);

        expect(response.status).toBe(201);
        expect(response.body.data.slug).toBe('exposure');
        expect(response.body.data.name).toBe('Custom Exposure');
        expect(response.body.data.isOverride).toBe(true);
      });

      it('should normalize slug to lowercase', async () => {
        const levelData = {
          slug: 'UPPERCASE-SLUG',
          name: 'Test Level',
          order: 6,
          advanceThreshold: 0.7,
          minAttempts: 3
        };

        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(levelData);

        expect(response.status).toBe(201);
        expect(response.body.data.slug).toBe('uppercase-slug');
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 for missing slug', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Level',
            order: 5,
            advanceThreshold: 0.8,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for missing name', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            order: 5,
            advanceThreshold: 0.8,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for missing order', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            advanceThreshold: 0.8,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for missing advanceThreshold', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for missing minAttempts', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            advanceThreshold: 0.8
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for invalid advanceThreshold (negative)', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            advanceThreshold: -0.5,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for invalid advanceThreshold (greater than 100)', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            advanceThreshold: 150,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for duplicate slug in department', async () => {
        // First create a level
        await CognitiveDepthLevel.create({
          departmentId: testDepartment._id,
          slug: 'unique-level',
          name: 'Unique Level',
          order: 5,
          advanceThreshold: 0.8,
          minAttempts: 3,
          isDefault: false
        });

        // Try to create another with same slug
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'unique-level',
            name: 'Another Level',
            order: 6,
            advanceThreshold: 0.9,
            minAttempts: 4
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 for negative order', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: -1,
            advanceThreshold: 0.8,
            minAttempts: 3
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for minAttempts less than 1', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            advanceThreshold: 0.8,
            minAttempts: 0
          });

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .send({
            slug: 'test-level',
            name: 'Test Level',
            order: 5,
            advanceThreshold: 0.8,
            minAttempts: 3
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Update Department Level Tests
  // =========================================================================
  describe('PUT /api/v2/departments/:departmentId/cognitive-depth-levels/:slug', () => {
    beforeEach(async () => {
      // Create a department level to update
      await CognitiveDepthLevel.create({
        departmentId: testDepartment._id,
        slug: 'updateable-level',
        name: 'Original Name',
        description: 'Original description',
        order: 10,
        advanceThreshold: 0.7,
        minAttempts: 3,
        isDefault: false
      });
    });

    describe('successful updates', () => {
      it('should update existing level', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name',
            description: 'Updated description',
            advanceThreshold: 0.85
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.advanceThreshold).toBe(0.85);
        // Unchanged fields should remain
        expect(response.body.data.order).toBe(10);
        expect(response.body.data.minAttempts).toBe(3);
      });

      it('should perform partial update', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            minAttempts: 5
          });

        expect(response.status).toBe(200);
        expect(response.body.data.minAttempts).toBe(5);
        expect(response.body.data.name).toBe('Original Name');
      });

      it('should update order', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            order: 15
          });

        expect(response.status).toBe(200);
        expect(response.body.data.order).toBe(15);
      });

      it('should update isActive status', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isActive: false
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isActive).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent slug', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/non-existent-slug`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name'
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 when trying to update system default directly', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/exposure`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Modified Exposure'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 for invalid department ID', async () => {
        const response = await request(app)
          .put('/api/v2/departments/invalid-id/cognitive-depth-levels/updateable-level')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name'
          });

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid advanceThreshold in update', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            advanceThreshold: 200
          });

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/updateable-level`)
          .send({
            name: 'Updated Name'
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Delete Department Level Tests
  // =========================================================================
  describe('DELETE /api/v2/departments/:departmentId/cognitive-depth-levels/:slug', () => {
    beforeEach(async () => {
      // Create levels for deletion tests
      await CognitiveDepthLevel.create([
        {
          departmentId: testDepartment._id,
          slug: 'deletable-custom',
          name: 'Deletable Custom Level',
          order: 10,
          advanceThreshold: 0.85,
          minAttempts: 4,
          isDefault: false
        },
        {
          departmentId: testDepartment._id,
          slug: 'exposure',
          name: 'Department Exposure Override',
          order: 1,
          advanceThreshold: 0.5,
          minAttempts: 1,
          isDefault: false
        }
      ]);
    });

    describe('successful deletion', () => {
      it('should delete custom level', async () => {
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/deletable-custom`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify level is deleted
        const deletedLevel = await CognitiveDepthLevel.findOne({
          slug: 'deletable-custom',
          departmentId: testDepartment._id
        });
        expect(deletedLevel).toBeNull();
      });

      it('should delete override and revert to system default', async () => {
        // First verify the override exists
        const beforeDelete = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        const overrideBefore = beforeDelete.body.data.find((l: any) => l.slug === 'exposure');
        expect(overrideBefore.name).toBe('Department Exposure Override');
        expect(overrideBefore.isOverride).toBe(true);

        // Delete the override
        const deleteResponse = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/exposure`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(deleteResponse.status).toBe(200);

        // Verify it reverts to system default
        const afterDelete = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels`)
          .set('Authorization', `Bearer ${authToken}`);

        const levelAfter = afterDelete.body.data.find((l: any) => l.slug === 'exposure');
        expect(levelAfter.name).toBe('Exposure');
        expect(levelAfter.isDefault).toBe(true);
        expect(levelAfter.isOverride).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent slug', async () => {
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/non-existent-slug`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 when trying to delete system default', async () => {
        // Try to delete a system default that doesn't have a department override
        await CognitiveDepthLevel.deleteOne({
          slug: 'mastery',
          departmentId: testDepartment._id
        });

        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/mastery`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 for invalid department ID', async () => {
        const response = await request(app)
          .delete('/api/v2/departments/invalid-id/cognitive-depth-levels/deletable-custom')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for non-existent department', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/departments/${nonExistentId}/cognitive-depth-levels/deletable-custom`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/departments/${testDepartment._id}/cognitive-depth-levels/deletable-custom`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ============================================
  // COURSE-LEVEL OVERRIDES TESTS
  // ============================================

  describe('GET /api/v2/courses/:courseId/cognitive-depth-levels', () => {
    let testCourse: any;

    beforeEach(async () => {
      // Import Course model dynamically
      const Course = (await import('@/models/academic/Course.model')).default;
      
      // Create test course
      testCourse = await Course.create({
        name: 'Test Course for Depth Levels',
        code: 'TEST101-' + Date.now(),
        departmentId: testDepartment._id,
        status: 'draft',
        credits: 3
      });
    });

    it('should get cognitive depth levels for a course', async () => {
      const response = await request(app)
        .get(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('levels');
      expect(response.body.data).toHaveProperty('canOverride');
      expect(response.body.data).toHaveProperty('hasOverrides');
      expect(Array.isArray(response.body.data.levels)).toBe(true);
      
      // Each level should have source field
      if (response.body.data.levels.length > 0) {
        expect(response.body.data.levels[0]).toHaveProperty('source');
        expect(['system', 'department', 'course']).toContain(response.body.data.levels[0].source);
      }
    });

    it('should return canOverride false when department does not allow', async () => {
      const response = await request(app)
        .get(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.canOverride).toBe(false);
    });

    it('should return 404 for non-existent course', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/courses/${nonExistentId}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v2/courses/:courseId/cognitive-depth-levels/:slug', () => {
    let testCourse: any;

    beforeEach(async () => {
      const Course = (await import('@/models/academic/Course.model')).default;
      
      testCourse = await Course.create({
        name: 'Test Course for Overrides',
        code: 'TEST102-' + Date.now(),
        departmentId: testDepartment._id,
        status: 'draft',
        credits: 3
      });

      // Enable course overrides on department
      testDepartment.allowCourseDepthOverrides = true;
      await testDepartment.save();
    });

    it('should create a course override when department allows', async () => {
      const response = await request(app)
        .put(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels/exposure`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          advanceThreshold: 0.75,
          minAttempts: 3
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('course');
      expect(response.body.data.advanceThreshold).toBe(0.75);
      expect(response.body.data.minAttempts).toBe(3);
    });

    it('should return 403 when department does not allow overrides', async () => {
      // Disable overrides
      testDepartment.allowCourseDepthOverrides = false;
      await testDepartment.save();

      const response = await request(app)
        .put(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels/exposure`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          advanceThreshold: 0.75
        });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .put(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels/nonexistent`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          advanceThreshold: 0.75
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v2/courses/:courseId/cognitive-depth-levels/:slug', () => {
    let testCourse: any;

    beforeEach(async () => {
      const Course = (await import('@/models/academic/Course.model')).default;
      const { CourseDepthOverride } = await import('@/models/content/CourseDepthOverride.model');
      
      testCourse = await Course.create({
        name: 'Test Course for Delete',
        code: 'TEST103-' + Date.now(),
        departmentId: testDepartment._id,
        status: 'draft',
        credits: 3
      });

      // Create an override to delete
      await CourseDepthOverride.create({
        courseId: testCourse._id,
        slug: 'exposure',
        advanceThreshold: 0.75,
        minAttempts: 3,
        createdBy: testUser._id
      });
    });

    it('should delete a course override', async () => {
      const response = await request(app)
        .delete(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels/exposure`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revert');
    });

    it('should return 404 when override does not exist', async () => {
      const response = await request(app)
        .delete(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels/practice`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v2/courses/:courseId/cognitive-depth-levels (all)', () => {
    let testCourse: any;

    beforeEach(async () => {
      const Course = (await import('@/models/academic/Course.model')).default;
      const { CourseDepthOverride } = await import('@/models/content/CourseDepthOverride.model');
      
      testCourse = await Course.create({
        name: 'Test Course for Delete All',
        code: 'TEST104-' + Date.now(),
        departmentId: testDepartment._id,
        status: 'draft',
        credits: 3
      });

      // Create multiple overrides
      await CourseDepthOverride.create([
        { courseId: testCourse._id, slug: 'exposure', advanceThreshold: 0.75, createdBy: testUser._id },
        { courseId: testCourse._id, slug: 'practice', minAttempts: 4, createdBy: testUser._id }
      ]);
    });

    it('should delete all course overrides', async () => {
      const response = await request(app)
        .delete(`/api/v2/courses/${testCourse._id}/cognitive-depth-levels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(2);
    });
  });

  describe('GET /api/v2/departments/:departmentId/adaptive-settings', () => {
    it('should get department adaptive settings', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/adaptive-settings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('allowCourseDepthOverrides');
      expect(response.body.data).toHaveProperty('defaultDepthLevels');
      expect(Array.isArray(response.body.data.defaultDepthLevels)).toBe(true);
    });
  });

  describe('PATCH /api/v2/departments/:departmentId/adaptive-settings', () => {
    it('should update allowCourseDepthOverrides flag', async () => {
      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/adaptive-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ allowCourseDepthOverrides: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.allowCourseDepthOverrides).toBe(true);
    });

    it('should toggle allowCourseDepthOverrides to false', async () => {
      testDepartment.allowCourseDepthOverrides = true;
      await testDepartment.save();

      const response = await request(app)
        .patch(`/api/v2/departments/${testDepartment._id}/adaptive-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ allowCourseDepthOverrides: false });

      expect(response.status).toBe(200);
      expect(response.body.data.allowCourseDepthOverrides).toBe(false);
    });
  });
});
