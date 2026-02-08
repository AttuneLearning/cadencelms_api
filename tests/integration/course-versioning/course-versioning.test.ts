/**
 * Course Versioning API Integration Tests
 *
 * Tests the course versioning API endpoints:
 * - POST /api/v2/courses/:id/versions - Create new draft version
 * - GET /api/v2/courses/:id/versions - List all versions
 * - GET /api/v2/course-versions/:id - Get specific version
 * - PATCH /api/v2/course-versions/:id - Update draft version
 * - POST /api/v2/course-versions/:id/publish - Publish a version
 * - POST /api/v2/course-versions/:id/lock - Lock a version
 *
 * Related: API-ISS-014 (Course Versioning Core)
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

describeIfMongo('Course Versioning API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;
  let canonicalCourse: any;
  let publishedVersion: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await seedLearningUnitLookups();

    // Create course-status lookup values
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

    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: [
        'content:courses:read',
        'content:courses:manage',
        'content:lessons:read',
        'content:lessons:manage'
      ],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true },
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'versioning-test@example.com',
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
    // Create a canonical course with a published version for each test
    canonicalCourse = await CanonicalCourse.create({
      code: 'CS' + Date.now(),
      departmentId: testDepartment._id,
      programId: null,
      totalVersions: 1,
      createdBy: testUser._id
    });

    publishedVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Introduction to Testing',
      description: 'Learn about software testing',
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
      instructorIds: [testUser._id],
      status: 'published',
      isLocked: false,
      isLatest: true,
      parentVersionId: null,
      createdBy: testUser._id,
      publishedAt: new Date(),
      publishedBy: testUser._id
    });

    // Update canonical course with published version reference
    canonicalCourse.currentPublishedVersionId = publishedVersion._id;
    await canonicalCourse.save();
  });

  afterEach(async () => {
    await CourseVersionModule.deleteMany({});
    await CourseVersion.deleteMany({});
    await CanonicalCourse.deleteMany({});
    await Module.deleteMany({});
  });

  // =========================================================================
  // Create Version Tests (POST /api/v2/courses/:id/versions)
  // =========================================================================
  describe('POST /api/v2/courses/:id/versions', () => {
    describe('successful version creation', () => {
      it('should create a new draft version from published version', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ changeNotes: 'Adding new module' });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBe(2);
        expect(response.body.data.status).toBe('draft');
        expect(response.body.data.isLocked).toBe(false);
        expect(response.body.data.isLatest).toBe(true);
        expect(response.body.data.parentVersionId).toBe(publishedVersion._id.toString());
        expect(response.body.data.title).toBe('Introduction to Testing');
        expect(response.body.data.changeNotes).toBe('Adding new module');
      });

      it('should copy settings from published version', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(201);

        // Fetch full version to check settings
        const versionResponse = await request(app)
          .get(`/api/v2/course-versions/${response.body.data.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(versionResponse.body.data.settings.passingScore).toBe(70);
        expect(versionResponse.body.data.settings.maxAttempts).toBe(3);
        expect(versionResponse.body.data.settings.certificateEnabled).toBe(true);
      });

      it('should copy module associations from published version', async () => {
        // First add a module to the published version
        const testModule = await Module.create({
          ownerDepartmentId: testDepartment._id,
          isShared: false,
          title: 'Test Module',
          description: 'A test module',
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
          createdBy: testUser._id
        });

        await CourseVersionModule.create({
          courseVersionId: publishedVersion._id,
          moduleId: testModule._id,
          order: 1,
          isRequired: true
        });

        // Create new draft version
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(201);

        // Check modules were copied
        const modulesResponse = await request(app)
          .get(`/api/v2/course-versions/${response.body.data.id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(modulesResponse.body.data.modules.length).toBe(1);
        // Verify module was copied - check the populated module details
        const moduleEntry = modulesResponse.body.data.modules[0];
        expect(moduleEntry.module).toBeDefined();
        expect(moduleEntry.module.title).toBe('Test Module');
        expect(moduleEntry.order).toBe(1);
        expect(moduleEntry.isRequired).toBe(true);
      });

      it('should update canonical course with draft reference', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(201);

        // Verify canonical course was updated
        const updatedCanonical = await CanonicalCourse.findById(canonicalCourse._id);
        expect(updatedCanonical?.latestDraftVersionId?.toString()).toBe(response.body.data.id);
        expect(updatedCanonical?.totalVersions).toBe(2);
      });

      it('should mark previous published version as not latest', async () => {
        await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        const previousVersion = await CourseVersion.findById(publishedVersion._id);
        expect(previousVersion?.isLatest).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should return 409 if draft already exists', async () => {
        // Create first draft
        await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        // Try to create second draft
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('draft version already exists');
      });

      it('should return 400 for canonical course without published version', async () => {
        // Create a new canonical course without a published version
        const newCanonical = await CanonicalCourse.create({
          code: 'EMPTY' + Date.now(),
          departmentId: testDepartment._id,
          totalVersions: 0,
          createdBy: testUser._id
        });

        const response = await request(app)
          .post(`/api/v2/courses/${newCanonical._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('no published version exists');
      });

      it('should return 404 for non-existent canonical course', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/courses/${nonExistentId}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid course ID', async () => {
        const response = await request(app)
          .post('/api/v2/courses/invalid-id/versions')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // List Versions Tests (GET /api/v2/courses/:id/versions)
  // =========================================================================
  describe('GET /api/v2/courses/:id/versions', () => {
    describe('successful listing', () => {
      it('should list all versions for a canonical course', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.versions).toHaveLength(1);
        expect(response.body.data.total).toBe(1);
        expect(response.body.data.versions[0].version).toBe(1);
      });

      it('should return versions sorted by version number descending', async () => {
        // Create a draft version
        await request(app)
          .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .get(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.versions).toHaveLength(2);
        expect(response.body.data.versions[0].version).toBe(2); // Most recent first
        expect(response.body.data.versions[1].version).toBe(1);
      });

      it('should include version metadata', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${canonicalCourse._id}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const version = response.body.data.versions[0];
        expect(version).toHaveProperty('id');
        expect(version).toHaveProperty('canonicalCourseId');
        expect(version).toHaveProperty('version');
        expect(version).toHaveProperty('title');
        expect(version).toHaveProperty('status');
        expect(version).toHaveProperty('isLocked');
        expect(version).toHaveProperty('isLatest');
        expect(version).toHaveProperty('credits');
        expect(version).toHaveProperty('duration');
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent canonical course', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/courses/${nonExistentId}/versions`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid course ID', async () => {
        const response = await request(app)
          .get('/api/v2/courses/invalid-id/versions')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${canonicalCourse._id}/versions`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Version Tests (GET /api/v2/course-versions/:id)
  // =========================================================================
  describe('GET /api/v2/course-versions/:id', () => {
    describe('successful retrieval', () => {
      it('should get a specific version with full details', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${publishedVersion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(publishedVersion._id.toString());
        expect(response.body.data.title).toBe('Introduction to Testing');
        expect(response.body.data.description).toBe('Learn about software testing');
        expect(response.body.data.credits).toBe(3);
        expect(response.body.data.duration).toBe(120);
        expect(response.body.data.status).toBe('published');
      });

      it('should include settings in response', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${publishedVersion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.settings).toBeDefined();
        expect(response.body.data.settings.passingScore).toBe(70);
        expect(response.body.data.settings.maxAttempts).toBe(3);
        expect(response.body.data.settings.certificateEnabled).toBe(true);
        expect(response.body.data.settings.allowSelfEnrollment).toBe(false);
      });

      it('should include instructor IDs', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${publishedVersion._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.instructorIds).toContain(testUser._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 404 for non-existent version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/course-versions/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid version ID', async () => {
        const response = await request(app)
          .get('/api/v2/course-versions/invalid-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/course-versions/${publishedVersion._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Update Draft Tests (PATCH /api/v2/course-versions/:id)
  // =========================================================================
  describe('PATCH /api/v2/course-versions/:id', () => {
    let draftVersion: any;

    beforeEach(async () => {
      // Create a draft version for update tests
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      draftVersion = response.body.data;
    });

    describe('successful updates', () => {
      it('should update draft title', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Updated Course Title' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Course Title');
      });

      it('should update draft description', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ description: 'New description for the course' });

        expect(response.status).toBe(200);
        expect(response.body.data.description).toBe('New description for the course');
      });

      it('should update credits and duration', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ credits: 4, duration: 180 });

        expect(response.status).toBe(200);
        expect(response.body.data.credits).toBe(4);
        expect(response.body.data.duration).toBe(180);
      });

      it('should update settings partially', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            settings: {
              passingScore: 80,
              allowSelfEnrollment: true
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.data.settings.passingScore).toBe(80);
        expect(response.body.data.settings.allowSelfEnrollment).toBe(true);
        // Other settings should remain unchanged
        expect(response.body.data.settings.maxAttempts).toBe(3);
      });

      it('should update change notes', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ changeNotes: 'Updated curriculum for 2026' });

        expect(response.status).toBe(200);
        expect(response.body.data.changeNotes).toBe('Updated curriculum for 2026');
      });

      it('should update multiple fields at once', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Complete Redesign',
            description: 'Fully updated content',
            credits: 5,
            settings: { passingScore: 75 }
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Complete Redesign');
        expect(response.body.data.description).toBe('Fully updated content');
        expect(response.body.data.credits).toBe(5);
        expect(response.body.data.settings.passingScore).toBe(75);
      });
    });

    describe('error handling', () => {
      it('should return 400 when updating published version', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${publishedVersion._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Cannot update' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Only draft versions');
      });

      it('should return 400 when updating locked version', async () => {
        // Lock the draft version
        await CourseVersion.findByIdAndUpdate(draftVersion.id, { isLocked: true });

        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Cannot update' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('locked');
      });

      it('should return 404 for non-existent version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .patch(`/api/v2/course-versions/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Test' });

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/course-versions/${draftVersion.id}`)
          .send({ title: 'Test' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Publish Version Tests (POST /api/v2/course-versions/:id/publish)
  // =========================================================================
  describe('POST /api/v2/course-versions/:id/publish', () => {
    let draftVersion: any;

    beforeEach(async () => {
      // Create a draft version for publish tests
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      draftVersion = response.body.data;
    });

    describe('successful publishing', () => {
      it('should publish a draft version', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('published');
        expect(response.body.data.isLatest).toBe(true);
        expect(response.body.data.publishedAt).toBeDefined();
        expect(response.body.data.publishedBy).toBe(testUser._id.toString());
      });

      it('should lock previous published version', async () => {
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        const previousVersion = await CourseVersion.findById(publishedVersion._id);
        expect(previousVersion?.isLocked).toBe(true);
        expect(previousVersion?.lockedReason).toBe('superseded');
        expect(previousVersion?.lockedAt).toBeDefined();
        expect(previousVersion?.lockedBy?.toString()).toBe(testUser._id.toString());
      });

      it('should capture stats at lock time for previous version', async () => {
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        const previousVersion = await CourseVersion.findById(publishedVersion._id);
        expect(previousVersion?.statsAtLock).toBeDefined();
        expect(previousVersion?.statsAtLock?.moduleCount).toBeDefined();
      });

      it('should update canonical course references', async () => {
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        const updatedCanonical = await CanonicalCourse.findById(canonicalCourse._id);
        expect(updatedCanonical?.currentPublishedVersionId?.toString()).toBe(draftVersion.id);
        expect(updatedCanonical?.latestDraftVersionId).toBeNull();
      });

      it('should mark previous version as not latest', async () => {
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        const previousVersion = await CourseVersion.findById(publishedVersion._id);
        expect(previousVersion?.isLatest).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should return 400 when publishing already published version', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${publishedVersion._id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Only draft versions');
      });

      it('should return 400 when publishing locked draft', async () => {
        // Lock the draft
        await CourseVersion.findByIdAndUpdate(draftVersion.id, { isLocked: true });

        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('locked');
      });

      it('should return 404 for non-existent version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/course-versions/${nonExistentId}/publish`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/publish`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Lock Version Tests (POST /api/v2/course-versions/:id/lock)
  // =========================================================================
  describe('POST /api/v2/course-versions/:id/lock', () => {
    let draftVersion: any;

    beforeEach(async () => {
      // Create a draft version for lock tests
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      draftVersion = response.body.data;
    });

    describe('successful locking', () => {
      it('should lock a version manually', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/lock`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'Preserving for audit' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isLocked).toBe(true);
        expect(response.body.data.lockedAt).toBeDefined();
        expect(response.body.data.lockedBy).toBe(testUser._id.toString());
        expect(response.body.data.lockedReason).toBe('manual');
      });

      it('should capture stats at lock time', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.statsAtLock).toBeDefined();
        expect(response.body.data.statsAtLock.moduleCount).toBeDefined();
      });

      it('should lock published version', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${publishedVersion._id}/lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.isLocked).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return 409 when locking already locked version', async () => {
        // First lock
        await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/lock`)
          .set('Authorization', `Bearer ${authToken}`);

        // Try to lock again
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already locked');
      });

      it('should return 404 for non-existent version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/course-versions/${nonExistentId}/lock`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/course-versions/${draftVersion.id}/lock`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Full Versioning Lifecycle Test
  // =========================================================================
  describe('Full Versioning Lifecycle', () => {
    it('should handle complete version lifecycle: create, update, publish', async () => {
      // 1. Create draft version
      const createResponse = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ changeNotes: 'Version 2 changes' });

      expect(createResponse.status).toBe(201);
      const draftId = createResponse.body.data.id;

      // 2. Update draft
      const updateResponse = await request(app)
        .patch(`/api/v2/course-versions/${draftId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Introduction to Testing v2',
          credits: 4,
          settings: { passingScore: 75 }
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.title).toBe('Introduction to Testing v2');

      // 3. Publish draft
      const publishResponse = await request(app)
        .post(`/api/v2/course-versions/${draftId}/publish`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(publishResponse.status).toBe(200);
      expect(publishResponse.body.data.status).toBe('published');

      // 4. Verify canonical course state
      const canonicalResponse = await CanonicalCourse.findById(canonicalCourse._id);
      expect(canonicalResponse?.currentPublishedVersionId?.toString()).toBe(draftId);
      expect(canonicalResponse?.latestDraftVersionId).toBeNull();
      expect(canonicalResponse?.totalVersions).toBe(2);

      // 5. Verify old version is locked
      const oldVersion = await CourseVersion.findById(publishedVersion._id);
      expect(oldVersion?.isLocked).toBe(true);
      expect(oldVersion?.lockedReason).toBe('superseded');
      expect(oldVersion?.isLatest).toBe(false);

      // 6. List versions - should show both
      const listResponse = await request(app)
        .get(`/api/v2/courses/${canonicalCourse._id}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.body.data.versions).toHaveLength(2);
      expect(listResponse.body.data.versions[0].version).toBe(2);
      expect(listResponse.body.data.versions[0].status).toBe('published');
      expect(listResponse.body.data.versions[1].version).toBe(1);
      expect(listResponse.body.data.versions[1].isLocked).toBe(true);
    });
  });
});
