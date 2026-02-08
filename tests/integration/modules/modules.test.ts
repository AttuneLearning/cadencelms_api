/**
 * Modules API Integration Tests
 *
 * Tests the modules API endpoints under /api/v2/courses/:courseId/modules
 * Modules are logical groupings of learning units within a course.
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Modules API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testCourse: any;
  let canonicalCourse: any;
  let courseVersion: any;
  let testUser: any;

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

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'modules-test@example.com',
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const courseCode = 'TC' + Date.now();

    // Create legacy Course (for backward compatibility)
    testCourse = await Course.create({
      name: 'Test Course',
      code: courseCode,
      description: 'A test course for module testing',
      departmentId: testDepartment._id,
      credits: 3,
      status: 'draft',
      isActive: true,
      createdBy: testUser._id
    });

    // Create CanonicalCourse (new course versioning system)
    canonicalCourse = await CanonicalCourse.create({
      _id: testCourse._id, // Use same ID for compatibility
      code: courseCode,
      departmentId: testDepartment._id,
      status: 'draft',
      isActive: true,
      createdBy: testUser._id,
      updatedBy: testUser._id
    });

    // Create CourseVersion (draft version)
    courseVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Test Course',
      description: 'A test course for module testing',
      credits: 3,
      duration: 120,
      status: 'draft',
      isLatest: true,
      createdBy: testUser._id
    });

    // Update canonical course with version references
    await CanonicalCourse.findByIdAndUpdate(canonicalCourse._id, {
      currentVersionId: courseVersion._id,
      latestDraftVersionId: courseVersion._id
    });
  });

  afterEach(async () => {
    await CourseVersionModule.deleteMany({});
    await Module.deleteMany({});
    await CourseVersion.deleteMany({});
    await CanonicalCourse.deleteMany({});
    await Course.deleteMany({ code: /^TC/ });
  });

  /**
   * Helper: Create a module and link it to the course version via CourseVersionModule.
   * This is required because the modules service now uses CourseVersionModule for lookups.
   */
  async function createModuleWithLink(moduleData: any, order: number): Promise<any> {
    const module = await Module.create({
      ownerDepartmentId: testDepartment._id,
      isShared: false,
      completionCriteria: { type: 'all_required', requireAllExpositions: true },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      createdBy: testUser._id,
      ...moduleData
    });

    await CourseVersionModule.create({
      courseVersionId: courseVersion._id,
      moduleId: module._id,
      order
    });

    return module;
  }

  // =========================================================================
  // List Modules Tests
  // =========================================================================
  describe('GET /api/v2/courses/:courseId/modules', () => {
    describe('successful listing', () => {
      it('should list all modules in a course', async () => {
        // Create test modules with CourseVersionModule links
        await createModuleWithLink({
          title: 'Module 1',
          description: 'First module',
          isPublished: true
        }, 1);
        await createModuleWithLink({
          title: 'Module 2',
          description: 'Second module',
          isPublished: false,
          presentationRules: {
            presentationMode: 'learner_choice',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          }
        }, 2);

        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.modules).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should return modules ordered by order field', async () => {
        // Create modules in non-sequential order to test sorting
        await createModuleWithLink({ title: 'Third Module' }, 3);
        await createModuleWithLink({ title: 'First Module' }, 1);
        await createModuleWithLink({ title: 'Second Module' }, 2);

        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('First Module');
        expect(response.body.data.modules[1].title).toBe('Second Module');
        expect(response.body.data.modules[2].title).toBe('Third Module');
      });

      it('should return empty array when course has no modules', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('filtering', () => {
      beforeEach(async () => {
        await createModuleWithLink({ title: 'Published Module', isPublished: true }, 1);
        await createModuleWithLink({ title: 'Unpublished Module', isPublished: false }, 2);
      });

      it('should filter by isPublished=true', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?isPublished=true`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.modules[0].title).toBe('Published Module');
        expect(response.body.data.modules[0].isPublished).toBe(true);
      });

      it('should filter by isPublished=false', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?isPublished=false`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.modules[0].title).toBe('Unpublished Module');
        expect(response.body.data.modules[0].isPublished).toBe(false);
      });
    });

    describe('pagination', () => {
      beforeEach(async () => {
        // Create 15 modules for pagination testing
        for (let i = 1; i <= 15; i++) {
          await createModuleWithLink({ title: `Module ${i}` }, i);
        }
      });

      it('should paginate results with default limit', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(10);
        expect(response.body.data.pagination.total).toBe(15);
        expect(response.body.data.pagination.totalPages).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(false);
      });

      it('should paginate with custom limit', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.totalPages).toBe(3);
      });

      it('should return second page', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=2&limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.hasPrev).toBe(true);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.modules[0].title).toBe('Module 6');
      });

      it('should return last page correctly', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=3&limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.hasPrev).toBe(true);
        expect(response.body.data.pagination.hasNext).toBe(false);
      });

      it('should reject page less than 1', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=0`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should reject limit greater than 100', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?limit=101`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('sorting', () => {
      beforeEach(async () => {
        await createModuleWithLink({ title: 'Alpha Module' }, 2);
        await createModuleWithLink({ title: 'Beta Module' }, 1);
      });

      it('should sort by order (default)', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Beta Module');
        expect(response.body.data.modules[1].title).toBe('Alpha Module');
      });

      it('should sort by title ascending', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?sort=title`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Alpha Module');
        expect(response.body.data.modules[1].title).toBe('Beta Module');
      });

      it('should sort by title descending', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?sort=-title`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Beta Module');
        expect(response.body.data.modules[1].title).toBe('Alpha Module');
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`);

        expect(response.status).toBe(401);
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Single Module Tests
  // =========================================================================
  describe('GET /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await createModuleWithLink({
        title: 'Test Module',
        description: 'A test module',
        isPublished: true,
        estimatedDuration: 60,
        objectives: ['Learn testing', 'Understand modules'],
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 80,
          requireAllExpositions: true
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_mastery',
          masteryThreshold: 85,
          maxRepetitions: 3,
          repeatOn: { failedAttempt: true, belowMastery: true, learnerRequest: false },
          repeatableCategories: ['practice', 'graded'],
          showAllAvailable: true,
          allowSkip: false
        }
      }, 1);
    });

    describe('successful retrieval', () => {
      it('should return module with valid ID', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testModule._id.toString());
        expect(response.body.data.title).toBe('Test Module');
        expect(response.body.data.description).toBe('A test module');
        expect(response.body.data.estimatedDuration).toBe(60);
        expect(response.body.data.objectives).toEqual(['Learn testing', 'Understand modules']);
      });

      it('should include completionCriteria in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completionCriteria).toBeDefined();
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(80);
        expect(response.body.data.completionCriteria.requireAllExpositions).toBe(true);
      });

      it('should include presentationRules in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.presentationRules).toBeDefined();
        expect(response.body.data.presentationRules.presentationMode).toBe('learner_choice');
        expect(response.body.data.presentationRules.repetitionMode).toBe('until_mastery');
        expect(response.body.data.presentationRules.masteryThreshold).toBe(85);
      });

      it('should include learningUnits array in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toBeDefined();
        expect(Array.isArray(response.body.data.learningUnits)).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID format', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should return module even when accessed via different course URL', async () => {
        // With the new architecture, modules are department-owned (not course-owned).
        // Single module operations (GET by ID) work regardless of the course URL context.
        // The course ID in the URL is for navigation/context only.
        // Module-to-course association is enforced only in listing endpoints (via CourseVersionModule).
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Module is accessible because modules are department-owned
        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(testModule._id.toString());
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Create Module Tests
  // =========================================================================
  describe('POST /api/v2/courses/:courseId/modules', () => {
    describe('successful creation', () => {
      it('should create module with minimal required fields', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'New Module'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('New Module');
        // Modules are now department-owned, not course-owned
        expect(response.body.data.ownerDepartmentId).toBe(testDepartment._id.toString());
        expect(response.body.data.order).toBe(1);
        expect(response.body.data.isPublished).toBe(false);
      });

      it('should create module with all fields', async () => {
        const moduleData = {
          title: 'Complete Module',
          description: 'A fully specified module',
          isPublished: true,
          estimatedDuration: 120,
          objectives: ['Objective 1', 'Objective 2'],
          availableFrom: '2026-02-01T00:00:00.000Z',
          availableUntil: '2026-12-31T23:59:59.000Z',
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 75,
            requireAllExpositions: true
          },
          presentationRules: {
            presentationMode: 'learner_choice',
            repetitionMode: 'until_passed',
            masteryThreshold: 80,
            maxRepetitions: 5,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: true
            },
            repeatableCategories: ['practice', 'graded'],
            showAllAvailable: true,
            allowSkip: false
          }
        };

        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(moduleData);

        expect(response.status).toBe(201);
        expect(response.body.data.title).toBe('Complete Module');
        expect(response.body.data.description).toBe('A fully specified module');
        expect(response.body.data.isPublished).toBe(true);
        expect(response.body.data.estimatedDuration).toBe(120);
        expect(response.body.data.objectives).toEqual(['Objective 1', 'Objective 2']);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(75);
        expect(response.body.data.presentationRules.presentationMode).toBe('learner_choice');
      });

      it('should auto-assign order number', async () => {
        // Create first module
        await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'First Module' });

        // Create second module
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Second Module' });

        expect(response.status).toBe(201);
        expect(response.body.data.order).toBe(2);
      });

      it('should apply default completionCriteria when not provided', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module with defaults' });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('all_required');
      });

      it('should apply default presentationRules when not provided', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module with defaults' });

        expect(response.status).toBe(201);
        expect(response.body.data.presentationRules.presentationMode).toBe('prescribed');
        expect(response.body.data.presentationRules.repetitionMode).toBe('none');
      });
    });

    describe('validation errors', () => {
      it('should return 422 when title is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 when title is empty', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: '' });

        expect(response.status).toBe(422);
      });

      it('should return 422 when title exceeds 200 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'A'.repeat(201) });

        expect(response.status).toBe(422);
      });

      it('should return 422 when description exceeds 2000 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: 'A'.repeat(2001)
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for negative estimatedDuration', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            estimatedDuration: -1
          });

        expect(response.status).toBe(422);
      });
    });

    describe('completionCriteria validation', () => {
      it('should return 422 for invalid completionCriteria type', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            completionCriteria: {
              type: 'invalid_type'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid percentage completionCriteria', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Percentage Module',
            completionCriteria: {
              type: 'percentage',
              percentageRequired: 80
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(80);
      });

      it('should return 422 for percentageRequired out of range', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Percentage',
            completionCriteria: {
              type: 'percentage',
              percentageRequired: 150
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid points completionCriteria', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Points Module',
            completionCriteria: {
              type: 'points',
              pointsRequired: 100
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('points');
      });
    });

    describe('presentationRules validation', () => {
      it('should return 422 for invalid presentationMode', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            presentationRules: {
              presentationMode: 'invalid_mode'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid repetitionMode', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            presentationRules: {
              presentationMode: 'learner_choice',
              repetitionMode: 'invalid_mode'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid presentationRules', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Presentation Rules Module',
            presentationRules: {
              presentationMode: 'random',
              repetitionMode: 'spaced',
              masteryThreshold: 90,
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: false,
              allowSkip: true
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.presentationRules.presentationMode).toBe('random');
        expect(response.body.data.presentationRules.repetitionMode).toBe('spaced');
      });

      it('should return 422 for masteryThreshold out of range', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Mastery',
            presentationRules: {
              presentationMode: 'learner_choice',
              masteryThreshold: 101
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid repeatableCategories', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Categories',
            presentationRules: {
              presentationMode: 'learner_choice',
              repeatableCategories: ['invalid_category']
            }
          });

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .send({ title: 'Unauthorized Module' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Update Module Tests
  // =========================================================================
  describe('PUT /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await createModuleWithLink({
        title: 'Original Title',
        description: 'Original description',
        isPublished: false,
        estimatedDuration: 30
      }, 1);
    });

    describe('successful updates', () => {
      it('should update title', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Updated Title' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.description).toBe('Original description');
      });

      it('should perform partial update', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Updated description',
            estimatedDuration: 60
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Original Title');
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.estimatedDuration).toBe(60);
      });

      it('should perform full update', async () => {
        const fullUpdate = {
          title: 'Fully Updated Module',
          description: 'New description',
          isPublished: true,
          estimatedDuration: 90,
          objectives: ['New objective'],
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 85
          },
          presentationRules: {
            presentationMode: 'random',
            repetitionMode: 'until_mastery',
            masteryThreshold: 90,
            repeatOn: { failedAttempt: true, belowMastery: true, learnerRequest: false },
            repeatableCategories: ['graded'],
            showAllAvailable: false,
            allowSkip: true
          }
        };

        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(fullUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Fully Updated Module');
        expect(response.body.data.isPublished).toBe(true);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.presentationRules.presentationMode).toBe('random');
      });

      it('should update isPublished status', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublished: true });

        expect(response.status).toBe(200);
        expect(response.body.data.isPublished).toBe(true);
      });

      it('should update availability dates', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            availableFrom: '2026-03-01T00:00:00.000Z',
            availableUntil: '2026-06-30T23:59:59.000Z'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.availableFrom).toBeDefined();
        expect(response.body.data.availableUntil).toBeDefined();
      });

      it('should clear availableFrom by setting to null', async () => {
        // First set a date
        await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: '2026-03-01T00:00:00.000Z' });

        // Then clear it
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: null });

        expect(response.status).toBe(200);
        expect(response.body.data.availableFrom).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(404);
      });

      it('should allow update via different course URL (department-owned modules)', async () => {
        // With the new architecture, modules are department-owned (not course-owned).
        // Module operations work regardless of the course URL context.
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC2' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .put(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Updated via Other Course' });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Updated via Other Course');
      });

      it('should return 422 for invalid title length', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'A'.repeat(201) });

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Delete Module Tests
  // =========================================================================
  describe('DELETE /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await createModuleWithLink({
        title: 'Module to Delete'
      }, 1);
    });

    describe('successful deletion', () => {
      it('should delete module (soft delete)', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');

        // Verify module is deleted
        const deletedModule = await Module.findById(testModule._id);
        expect(deletedModule).toBeNull();
      });

      it('should delete correct module from multiple', async () => {
        // Create additional module
        const module2 = await createModuleWithLink({
          title: 'Keep This Module'
        }, 2);

        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        // Verify only the correct module was deleted (check via CourseVersionModule)
        const remainingLinks = await CourseVersionModule.find({ courseVersionId: courseVersion._id });
        expect(remainingLinks).toHaveLength(1);
        expect(remainingLinks[0].moduleId.toString()).toBe(module2._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should allow delete via different course URL (department-owned modules)', async () => {
        // With the new architecture, modules are department-owned (not course-owned).
        // Module operations work regardless of the course URL context.
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC3' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .delete(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        // Verify module was deleted
        const deletedModule = await Module.findById(testModule._id);
        expect(deletedModule).toBeNull();
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Reorder Modules Tests
  // =========================================================================
  describe('PATCH /api/v2/courses/:courseId/modules/reorder', () => {
    let modules: any[];

    beforeEach(async () => {
      // Create three modules with CourseVersionModule links
      const moduleA = await createModuleWithLink({ title: 'Module A' }, 1);
      const moduleB = await createModuleWithLink({ title: 'Module B' }, 2);
      const moduleC = await createModuleWithLink({ title: 'Module C' }, 3);
      modules = [moduleA, moduleB, moduleC];
    });

    describe('successful reordering', () => {
      it('should reorder modules', async () => {
        // Reverse the order: C, B, A
        const newOrder = [
          modules[2]._id.toString(),
          modules[1]._id.toString(),
          modules[0]._id.toString()
        ];

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: newOrder });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify new order via CourseVersionModule
        const cvms = await CourseVersionModule.find({ courseVersionId: courseVersion._id }).sort({ order: 1 });
        expect(cvms[0].moduleId.toString()).toBe(modules[2]._id.toString()); // Module C
        expect(cvms[0].order).toBe(1);
        expect(cvms[1].moduleId.toString()).toBe(modules[1]._id.toString()); // Module B
        expect(cvms[1].order).toBe(2);
        expect(cvms[2].moduleId.toString()).toBe(modules[0]._id.toString()); // Module A
        expect(cvms[2].order).toBe(3);
      });

      it('should reorder with partial swap', async () => {
        // Swap B and C: A, C, B
        const newOrder = [
          modules[0]._id.toString(),
          modules[2]._id.toString(),
          modules[1]._id.toString()
        ];

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: newOrder });

        expect(response.status).toBe(200);

        const cvms = await CourseVersionModule.find({ courseVersionId: courseVersion._id }).sort({ order: 1 });
        expect(cvms[0].moduleId.toString()).toBe(modules[0]._id.toString()); // Module A
        expect(cvms[1].moduleId.toString()).toBe(modules[2]._id.toString()); // Module C
        expect(cvms[2].moduleId.toString()).toBe(modules[1]._id.toString()); // Module B
      });
    });

    describe('validation errors', () => {
      it('should return 422 when moduleIds is not provided', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(422);
      });

      it('should return 422 when moduleIds is empty array', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: [] });

        expect(response.status).toBe(422);
      });

      it('should return 400 when moduleIds is not an array', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: 'not-an-array' });

        expect(response.status).toBe(422);
      });

      it('should return 400 when not all modules are included', async () => {
        // Only include two of three modules
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString()
            ]
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when invalid module ID is included', async () => {
        const invalidId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              invalidId.toString()
            ]
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when module from different course is included', async () => {
        // Create module in different course
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC4' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const otherModule = await Module.create({
          courseId: otherCourse._id,
          ownerDepartmentId: testDepartment._id,
          isShared: false,
          title: 'Other Module',
          order: 1,
          completionCriteria: { type: 'all_required' },
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

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              otherModule._id.toString()
            ]
          });

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              modules[2]._id.toString()
            ]
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Prerequisites Tests
  // =========================================================================
  describe('Prerequisites', () => {
    let moduleA: any;
    let moduleB: any;

    beforeEach(async () => {
      moduleA = await createModuleWithLink({
        title: 'Module A'
      }, 1);

      moduleB = await createModuleWithLink({
        title: 'Module B',
        prerequisites: [moduleA._id]
      }, 2);
    });

    describe('create with prerequisites', () => {
      it('should create module with valid prerequisites', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Module C',
            prerequisites: [moduleA._id.toString(), moduleB._id.toString()]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.prerequisites).toContain(moduleA._id.toString());
        expect(response.body.data.prerequisites).toContain(moduleB._id.toString());
      });

      it('should return 400 for non-existent prerequisite', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Module with Invalid Prereq',
            prerequisites: [nonExistentId.toString()]
          });

        expect(response.status).toBe(400);
      });
    });

    describe('update prerequisites', () => {
      it('should update module prerequisites', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleB._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: []
          });

        expect(response.status).toBe(200);
        expect(response.body.data.prerequisites).toHaveLength(0);
      });

      it('should add prerequisite to module', async () => {
        // Create Module C without prerequisites
        const createResponse = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module C' });

        const moduleC = createResponse.body.data;

        // Update to add prerequisite
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleC.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleA._id.toString()]
          });

        expect(response.status).toBe(200);
        expect(response.body.data.prerequisites).toContain(moduleA._id.toString());
      });
    });

    describe('circular dependency prevention', () => {
      it('should prevent module from being its own prerequisite', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleA._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleA._id.toString()]
          });

        expect(response.status).toBe(400);
      });

      it('should prevent circular prerequisites (A -> B -> A)', async () => {
        // moduleB already has moduleA as prerequisite
        // Try to make moduleA depend on moduleB
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleA._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleB._id.toString()]
          });

        expect(response.status).toBe(400);
      });
    });
  });
});
