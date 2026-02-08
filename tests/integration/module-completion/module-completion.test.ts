/**
 * Module Completion API Integration Tests
 *
 * Tests the module completion and sharing API endpoints:
 * - POST /api/v2/module-completions - Record a module completion
 * - GET /api/v2/module-completions/check - Check completion status for modules
 * - GET /api/v2/learners/:id/module-completions - Get learner's completions
 * - GET /api/v2/modules/:id/usage - Get courses using a module
 * - GET /api/v2/modules/:id/completion-stats - Get module completion statistics
 * - GET /api/v2/departments/:id/modules - List department-owned modules
 * - GET /api/v2/departments/:id/modules/available - List available modules
 *
 * Related: API-ISS-016 (Module Sharing & Global Completion)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Module from '@/models/academic/Module.model';
import ModuleCompletion from '@/models/progress/ModuleCompletion.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Module Completion API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let staffAuthToken: string;
  let learnerAuthToken: string;
  let testDepartment: any;
  let otherDepartment: any;
  let staffUser: any;
  let learnerUser: any;
  let testModule: any;
  let sharedModule: any;
  let testCourseVersion: any;
  let testEnrollment: any;
  let canonicalCourse: any;
  let testProgram: any;
  let academicYear: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await seedLearningUnitLookups();

    // Create course-status lookup values
    await LookupValue.create({
      category: 'course-status',
      key: 'published',
      displayAs: 'Published',
      sortOrder: 1,
      isActive: true
    });

    // Create test departments
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    otherDepartment = await Department.create({
      name: 'Other Department',
      code: 'OTHER' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Create test program for enrollment
    testProgram = await Program.create({
      name: 'Module Completion Test Program',
      code: 'MODCOMP' + Date.now(),
      departmentId: testDepartment._id,
      type: 'certificate',
      level: 0,
      path: [],
      isActive: true
    });

    // Create a mock academic year (simple object ID for testing)
    academicYear = { _id: new mongoose.Types.ObjectId() };

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: [
        'content:lessons:read',
        'content:lessons:manage',
        'reports:department:read'
      ],
      isActive: true
    });

    await RoleDefinition.create({
      name: 'course-taker',
      userType: 'learner',
      displayName: 'Course Taker',
      description: 'Standard learner role for taking courses',
      accessRights: [
        'content:lessons:read'
      ],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true },
      { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'Read department reports', isActive: true }
    ]);

    // Create staff user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    staffUser = await User.create({
      email: 'module-completion-staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: staffUser._id,
      person: {
        firstName: 'Staff',
        lastName: 'User',
        emails: [{
          email: staffUser.email,
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

    // Generate staff auth token
    staffAuthToken = jwt.sign(
      {
        userId: staffUser._id.toString(),
        email: staffUser.email,
        roles: ['staff'],
        type: 'access',
        userType: 'staff',
        name: 'Staff User'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create learner user
    learnerUser = await User.create({
      email: 'module-completion-learner@example.com',
      password: hashedPassword,
      userTypes: ['learner'],
      defaultDashboard: 'learner',
      isActive: true
    });

    await Learner.create({
      _id: learnerUser._id,
      person: {
        firstName: 'Learner',
        lastName: 'User',
        emails: [{
          email: learnerUser.email,
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
        roles: ['course-taker'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate learner auth token
    learnerAuthToken = jwt.sign(
      {
        userId: learnerUser._id.toString(),
        email: learnerUser.email,
        roles: ['course-taker'],
        type: 'access',
        userType: 'learner',
        name: 'Learner User'
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
    // Create test modules
    testModule = await Module.create({
      ownerDepartmentId: testDepartment._id,
      isShared: false,
      title: 'Test Module',
      description: 'A test module for completion tracking',
      order: 1,
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
      createdBy: staffUser._id
    });

    sharedModule = await Module.create({
      ownerDepartmentId: otherDepartment._id,
      isShared: true,
      title: 'Shared Module',
      description: 'A shared module available to all departments',
      order: 1,
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
      createdBy: staffUser._id
    });

    // Create a canonical course
    canonicalCourse = await CanonicalCourse.create({
      code: 'MOD-COMP' + Date.now(),
      departmentId: testDepartment._id,
      totalVersions: 1,
      createdBy: staffUser._id
    });

    // Create a course version
    testCourseVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Module Completion Test Course',
      description: 'Course for testing module completion',
      credits: 3,
      duration: 120,
      settings: {
        allowSelfEnrollment: false,
        passingScore: 70,
        maxAttempts: 3,
        certificateEnabled: true,
        enforcePrerequisites: true,
        showProgressBar: true,
        allowModuleSkipping: false
      },
      instructorIds: [staffUser._id],
      status: 'published',
      isLocked: false,
      isLatest: true,
      createdBy: staffUser._id,
      publishedAt: new Date(),
      publishedBy: staffUser._id
    });

    // Link module to course version
    await CourseVersionModule.create({
      courseVersionId: testCourseVersion._id,
      moduleId: testModule._id,
      order: 1,
      isRequired: true
    });

    // Create test enrollment
    testEnrollment = await Enrollment.create({
      learnerId: learnerUser._id,
      programId: testProgram._id,
      academicYearId: academicYear._id,
      status: 'active',
      enrollmentDate: new Date()
    });
  });

  afterEach(async () => {
    await ModuleCompletion.deleteMany({});
    await CourseVersionModule.deleteMany({});
    await CourseVersion.deleteMany({});
    await CanonicalCourse.deleteMany({});
    await Module.deleteMany({});
    await Enrollment.deleteMany({});
  });

  // =========================================================================
  // Record Completion Tests (POST /api/v2/module-completions)
  // =========================================================================
  describe('POST /api/v2/module-completions', () => {
    describe('successful completion recording', () => {
      it('should record a module completion', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString(),
            score: 85,
            isGlobalCompletion: true
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.completion).toBeDefined();
        expect(response.body.data.completion.moduleId.toString()).toBe(testModule._id.toString());
        expect(response.body.data.completion.learnerId.toString()).toBe(learnerUser._id.toString());
        expect(response.body.data.completion.score).toBe(85);
        expect(response.body.data.completion.isGlobalCompletion).toBe(true);
      });

      it('should record completion without score', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completion.score).toBeNull();
      });

      it('should be idempotent - not overwrite existing completion', async () => {
        // First completion
        await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString(),
            score: 85
          });

        // Second completion attempt with different score
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString(),
            score: 95
          });

        expect(response.status).toBe(201);
        // Score should remain 85 from first completion
        expect(response.body.data.completion.score).toBe(85);
      });

      it('should record non-global completion', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString(),
            isGlobalCompletion: false
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completion.isGlobalCompletion).toBe(false);
      });
    });

    describe('validation errors', () => {
      it('should return 422 for missing moduleId', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('moduleId');
      });

      it('should return 422 for missing courseVersionId', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('courseVersionId');
      });

      it('should return 422 for missing enrollmentId', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString()
          });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('enrollmentId');
      });

      it('should return 422 for invalid ObjectId format', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: 'invalid-id',
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for score outside valid range', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString(),
            score: 150
          });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('score');
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post('/api/v2/module-completions')
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            learnerId: learnerUser._id.toString(),
            moduleId: nonExistentId.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post('/api/v2/module-completions')
          .send({
            moduleId: testModule._id.toString(),
            courseVersionId: testCourseVersion._id.toString(),
            enrollmentId: testEnrollment._id.toString()
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Check Completions Tests (GET /api/v2/module-completions/check)
  // =========================================================================
  describe('GET /api/v2/module-completions/check', () => {
    beforeEach(async () => {
      // Record a completion for testModule
      await ModuleCompletion.create({
        learnerId: staffUser._id,
        moduleId: testModule._id,
        completedInCourseVersionId: testCourseVersion._id,
        completedInEnrollmentId: testEnrollment._id,
        completedAt: new Date(),
        score: 90,
        isGlobalCompletion: true
      });
    });

    describe('successful completion check', () => {
      it('should check completion status for single module', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: testModule._id.toString() })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.completions[testModule._id.toString()]).toBe(true);
      });

      it('should check completion status for multiple modules', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: `${testModule._id},${sharedModule._id}` })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions[testModule._id.toString()]).toBe(true);
        expect(response.body.data.completions[sharedModule._id.toString()]).toBe(false);
      });

      it('should return all false for modules user has not completed', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: sharedModule._id.toString() })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions[sharedModule._id.toString()]).toBe(false);
      });
    });

    describe('validation errors', () => {
      it('should return 422 for missing moduleIds', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid moduleIds format', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: 'invalid-id,another-invalid' })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(422);
      });

      it('should return 422 for more than 50 moduleIds', async () => {
        const ids = Array(51).fill(0).map(() => new mongoose.Types.ObjectId().toString()).join(',');
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: ids })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get('/api/v2/module-completions/check')
          .query({ moduleIds: testModule._id.toString() });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Learner Completions Tests (GET /api/v2/learners/:id/module-completions)
  // =========================================================================
  describe('GET /api/v2/learners/:id/module-completions', () => {
    beforeEach(async () => {
      // Create some completions for the learner
      await ModuleCompletion.create({
        learnerId: learnerUser._id,
        moduleId: testModule._id,
        completedInCourseVersionId: testCourseVersion._id,
        completedInEnrollmentId: testEnrollment._id,
        completedAt: new Date('2024-01-15'),
        score: 85,
        isGlobalCompletion: true
      });

      await ModuleCompletion.create({
        learnerId: learnerUser._id,
        moduleId: sharedModule._id,
        completedInCourseVersionId: testCourseVersion._id,
        completedInEnrollmentId: testEnrollment._id,
        completedAt: new Date('2024-01-20'),
        score: 92,
        isGlobalCompletion: true
      });
    });

    describe('successful retrieval', () => {
      it('should get all completions for a learner (staff access)', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.completions).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should get own completions (learner self-access)', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .set('Authorization', `Bearer ${learnerAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions).toHaveLength(2);
      });

      it('should filter completions by moduleId', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .query({ moduleId: testModule._id.toString() })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions).toHaveLength(1);
        expect(response.body.data.completions[0].moduleId._id.toString()).toBe(testModule._id.toString());
      });

      it('should filter completions by isGlobalCompletion', async () => {
        // Add a non-global completion
        await ModuleCompletion.deleteMany({ learnerId: learnerUser._id, moduleId: testModule._id });
        await ModuleCompletion.create({
          learnerId: learnerUser._id,
          moduleId: testModule._id,
          completedInCourseVersionId: testCourseVersion._id,
          completedInEnrollmentId: testEnrollment._id,
          completedAt: new Date(),
          isGlobalCompletion: false
        });

        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .query({ isGlobalCompletion: 'false' })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions.every((c: any) => c.isGlobalCompletion === false)).toBe(true);
      });

      it('should filter completions by date range', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .query({
            completedAfter: '2024-01-16T00:00:00.000Z',
            completedBefore: '2024-01-25T00:00:00.000Z'
          })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions).toHaveLength(1);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
          .query({ page: 1, limit: 1 })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completions).toHaveLength(1);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(1);
        expect(response.body.data.pagination.total).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${learnerUser._id}/module-completions`);

        expect(response.status).toBe(401);
      });

      it('should return 403 when learner tries to view another learner completions', async () => {
        const response = await request(app)
          .get(`/api/v2/learners/${staffUser._id}/module-completions`)
          .set('Authorization', `Bearer ${learnerAuthToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  // =========================================================================
  // Get Module Usage Tests (GET /api/v2/modules/:id/usage)
  // =========================================================================
  describe('GET /api/v2/modules/:id/usage', () => {
    describe('successful retrieval', () => {
      it('should get courses using a module', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/usage`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe(testModule._id.toString());
        expect(response.body.data.courseVersions).toHaveLength(1);
        expect(response.body.data.totalCourses).toBe(1);
      });

      it('should return empty list for unused module', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${sharedModule._id}/usage`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.courseVersions).toHaveLength(0);
        expect(response.body.data.totalCourses).toBe(0);
      });

      it('should include course version details', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/usage`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        const courseVersion = response.body.data.courseVersions[0];
        expect(courseVersion).toHaveProperty('courseVersionId');
        expect(courseVersion).toHaveProperty('title');
        expect(courseVersion).toHaveProperty('version');
        expect(courseVersion).toHaveProperty('order');
        expect(courseVersion).toHaveProperty('isRequired');
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/modules/${nonExistentId}/usage`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/usage`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Module Completion Stats Tests (GET /api/v2/modules/:id/completion-stats)
  // =========================================================================
  describe('GET /api/v2/modules/:id/completion-stats', () => {
    beforeEach(async () => {
      // Create multiple completions for stats
      await ModuleCompletion.create([
        {
          learnerId: learnerUser._id,
          moduleId: testModule._id,
          completedInCourseVersionId: testCourseVersion._id,
          completedInEnrollmentId: testEnrollment._id,
          completedAt: new Date(),
          score: 80,
          isGlobalCompletion: true
        },
        {
          learnerId: staffUser._id,
          moduleId: testModule._id,
          completedInCourseVersionId: testCourseVersion._id,
          completedInEnrollmentId: testEnrollment._id,
          completedAt: new Date(),
          score: 90,
          isGlobalCompletion: true
        }
      ]);
    });

    describe('successful retrieval', () => {
      it('should get completion statistics for a module', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/completion-stats`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe(testModule._id.toString());
        expect(response.body.data.stats.totalCompletions).toBe(2);
        expect(response.body.data.stats.globalCompletions).toBe(2);
        expect(response.body.data.stats.averageScore).toBe(85);
      });

      it('should return zero stats for module with no completions', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${sharedModule._id}/completion-stats`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.stats.totalCompletions).toBe(0);
        expect(response.body.data.stats.globalCompletions).toBe(0);
        expect(response.body.data.stats.averageScore).toBeNull();
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/completion-stats`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Department Modules Tests (GET /api/v2/departments/:id/modules)
  // =========================================================================
  describe('GET /api/v2/departments/:id/modules', () => {
    beforeEach(async () => {
      // Create additional modules for testing
      await Module.create({
        ownerDepartmentId: testDepartment._id,
        isShared: true,
        title: 'Department Shared Module',
        description: 'A shared module from test department',
        order: 2,
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
        createdBy: staffUser._id
      });
    });

    describe('successful retrieval', () => {
      it('should list modules owned by a department', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.modules.length).toBeGreaterThanOrEqual(2);
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter by isShared', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules`)
          .query({ isShared: 'true' })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules.every((m: any) => m.isShared === true)).toBe(true);
      });

      it('should filter by isPublished', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules`)
          .query({ isPublished: 'true' })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules.every((m: any) => m.isPublished === true)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules`)
          .query({ page: 1, limit: 1 })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(1);
      });

      it('should return empty list for department with no modules', async () => {
        const emptyDept = await Department.create({
          name: 'Empty Department',
          code: 'EMPTY' + Date.now(),
          level: 0,
          path: [],
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/departments/${emptyDept._id}/modules`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(0);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Available Modules Tests (GET /api/v2/departments/:id/modules/available)
  // =========================================================================
  describe('GET /api/v2/departments/:id/modules/available', () => {
    describe('successful retrieval', () => {
      it('should list modules available to a department (owned + shared)', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Should include testModule (owned) and sharedModule (shared from other dept)
        expect(response.body.data.modules.length).toBeGreaterThanOrEqual(2);
      });

      it('should include shared modules from other departments', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        const sharedFromOther = response.body.data.modules.find(
          (m: any) => m._id.toString() === sharedModule._id.toString()
        );
        expect(sharedFromOther).toBeDefined();
      });

      it('should filter by isPublished', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
          .query({ isPublished: 'true' })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules.every((m: any) => m.isPublished === true)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
          .query({ page: 1, limit: 1 })
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should populate owner department information', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        const moduleWithOwner = response.body.data.modules.find(
          (m: any) => m.ownerDepartmentId && typeof m.ownerDepartmentId === 'object'
        );
        if (moduleWithOwner) {
          expect(moduleWithOwner.ownerDepartmentId).toHaveProperty('name');
        }
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/modules/available`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Module Sharing Integration Test
  // =========================================================================
  describe('Module Sharing Integration', () => {
    it('should allow department to use shared module from another department', async () => {
      // Create a course version in testDepartment using the shared module from otherDepartment
      const newCanonical = await CanonicalCourse.create({
        code: 'SHARED-USE' + Date.now(),
        departmentId: testDepartment._id,
        totalVersions: 1,
        createdBy: staffUser._id
      });

      const newCourseVersion = await CourseVersion.create({
        canonicalCourseId: newCanonical._id,
        version: 1,
        title: 'Course Using Shared Module',
        description: 'Course that uses a shared module',
        credits: 2,
        duration: 60,
        settings: {
          allowSelfEnrollment: false,
          passingScore: 70,
          maxAttempts: 3,
          certificateEnabled: false,
          enforcePrerequisites: true,
          showProgressBar: true,
          allowModuleSkipping: false
        },
        instructorIds: [staffUser._id],
        status: 'published',
        isLocked: false,
        isLatest: true,
        createdBy: staffUser._id,
        publishedAt: new Date(),
        publishedBy: staffUser._id
      });

      // Link the shared module to this course version
      await CourseVersionModule.create({
        courseVersionId: newCourseVersion._id,
        moduleId: sharedModule._id,
        order: 1,
        isRequired: true
      });

      // Verify shared module usage shows both courses
      const response = await request(app)
        .get(`/api/v2/modules/${sharedModule._id}/usage`)
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalCourses).toBe(1);
      expect(response.body.data.courseVersions[0].courseVersionId).toBe(newCourseVersion._id.toString());
    });

    it('should track global completion across courses using the same module', async () => {
      // Record completion for shared module in one course
      await request(app)
        .post('/api/v2/module-completions')
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          learnerId: learnerUser._id.toString(),
          moduleId: sharedModule._id.toString(),
          courseVersionId: testCourseVersion._id.toString(),
          enrollmentId: testEnrollment._id.toString(),
          score: 95,
          isGlobalCompletion: true
        });

      // Check completion status - should show as completed
      const response = await request(app)
        .get('/api/v2/module-completions/check')
        .query({ moduleIds: sharedModule._id.toString() })
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.completions[sharedModule._id.toString()]).toBe(true);
    });
  });

  // =========================================================================
  // Full Workflow Test
  // =========================================================================
  describe('Full Module Completion Workflow', () => {
    it('should handle complete module completion workflow', async () => {
      // 1. List available modules for department
      const availableResponse = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/modules/available`)
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(availableResponse.status).toBe(200);
      const availableModules = availableResponse.body.data.modules;
      expect(availableModules.length).toBeGreaterThan(0);

      // 2. Record module completion
      const completionResponse = await request(app)
        .post('/api/v2/module-completions')
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          learnerId: learnerUser._id.toString(),
          moduleId: testModule._id.toString(),
          courseVersionId: testCourseVersion._id.toString(),
          enrollmentId: testEnrollment._id.toString(),
          score: 88,
          isGlobalCompletion: true
        });

      expect(completionResponse.status).toBe(201);

      // 3. Check completion status
      const checkResponse = await request(app)
        .get('/api/v2/module-completions/check')
        .query({ moduleIds: testModule._id.toString() })
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.completions[testModule._id.toString()]).toBe(true);

      // 4. Get learner's completions
      const learnerCompletionsResponse = await request(app)
        .get(`/api/v2/learners/${learnerUser._id}/module-completions`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(learnerCompletionsResponse.status).toBe(200);
      expect(learnerCompletionsResponse.body.data.completions).toHaveLength(1);

      // 5. Get module usage
      const usageResponse = await request(app)
        .get(`/api/v2/modules/${testModule._id}/usage`)
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.data.totalCourses).toBe(1);

      // 6. Get completion stats
      const statsResponse = await request(app)
        .get(`/api/v2/modules/${testModule._id}/completion-stats`)
        .set('Authorization', `Bearer ${staffAuthToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data.stats.totalCompletions).toBe(1);
      expect(statsResponse.body.data.stats.averageScore).toBe(88);
    });
  });
});
