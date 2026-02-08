import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Module from '@/models/academic/Module.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

/**
 * Course Actions Integration Tests
 *
 * Tests for course publish/unpublish/archive endpoints using
 * CanonicalCourse + CourseVersion (versioning system).
 *
 * Endpoints:
 * - POST /api/v2/courses/:id/publish
 * - POST /api/v2/courses/:id/unpublish
 * - POST /api/v2/courses/:id/archive
 */
describeIfMongo('Course Actions API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUserId: mongoose.Types.ObjectId;
  let canonicalCourse: any;
  let draftVersion: any;
  let testModule: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Course Actions Test Department',
      code: 'CATEST' + Date.now(),
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
      description: 'Can manage content including courses',
      accessRights: ['content:department:manage', 'content:courses:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:department:manage', domain: 'content', resource: 'department', action: 'manage', description: 'Manage department content', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Create staff user with content management permission
    const hashedPassword = await hashPassword('SecurePass123!');
    testUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: testUserId,
      email: 'content-admin@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: testUserId,
      person: {
        firstName: 'Content',
        lastName: 'Admin',
        emails: [{ email: 'content-admin@example.com', type: 'institutional', isPrimary: true, verified: true }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        userId: testUserId.toString(),
        email: 'content-admin@example.com',
        roles: ['content-admin'],
        allAccessRights: ['content:department:manage', 'content:courses:manage'],
        type: 'access'
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
    // Clean up before each test
    await CanonicalCourse.deleteMany({});
    await CourseVersion.deleteMany({});
    await CourseVersionModule.deleteMany({});
    await Module.deleteMany({});

    // Create a CanonicalCourse with a draft version for testing
    canonicalCourse = await CanonicalCourse.create({
      code: 'TEST101',
      departmentId: testDepartment._id,
      programId: null,
      currentPublishedVersionId: null,
      latestDraftVersionId: null,
      totalVersions: 1,
      createdBy: testUserId
    });

    draftVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Test Course',
      description: 'A test course for action endpoints',
      credits: 3,
      duration: 60,
      settings: {
        allowSelfEnrollment: false,
        passingScore: 70,
        maxAttempts: null,
        certificateEnabled: false,
        enforcePrerequisites: true,
        showProgressBar: true,
        allowModuleSkipping: false
      },
      instructorIds: [],
      status: 'draft',
      isLocked: false,
      isLatest: true,
      parentVersionId: null,
      createdBy: testUserId
    });

    // Update canonical course with draft version reference
    canonicalCourse.latestDraftVersionId = draftVersion._id;
    await canonicalCourse.save();

    // Create a test module with all required fields
    testModule = await Module.create({
      ownerDepartmentId: testDepartment._id,
      isShared: false,
      title: 'Test Module',
      description: 'A test module',
      prerequisites: [],
      completionCriteria: {
        type: 'all_required',
        requireAllExpositions: false
      },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: true,
      estimatedDuration: 60,
      order: 0,
      createdBy: testUserId
    });
  });

  describe('POST /api/v2/courses/:id/publish', () => {
    it('should publish a draft course with at least one module', async () => {
      // Add a module to the course version
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule._id,
        order: 0,
        isRequired: true
      });

      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeDefined();

      // Verify version was updated
      const updatedVersion = await CourseVersion.findById(draftVersion._id);
      expect(updatedVersion?.status).toBe('published');
      expect(updatedVersion?.publishedAt).toBeDefined();

      // Verify canonical course was updated
      const updatedCanonical = await CanonicalCourse.findById(canonicalCourse._id);
      expect(updatedCanonical?.currentPublishedVersionId?.toString()).toBe(draftVersion._id.toString());
    });

    it('should return 400 when publishing course without modules', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must have at least one module');
    });

    it('should return 409 when course is already published', async () => {
      // Add a module and publish first
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule._id,
        order: 0,
        isRequired: true
      });

      await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Try to publish again
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already published');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeCourseId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/v2/courses/${fakeCourseId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Course not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v2/courses/:id/unpublish', () => {
    beforeEach(async () => {
      // Publish the course first
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule._id,
        order: 0,
        isRequired: true
      });

      draftVersion.status = 'published';
      draftVersion.publishedAt = new Date();
      await draftVersion.save();

      canonicalCourse.currentPublishedVersionId = draftVersion._id;
      await canonicalCourse.save();
    });

    it('should unpublish a published course', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.publishedAt).toBeNull();

      // Verify version was updated
      const updatedVersion = await CourseVersion.findById(draftVersion._id);
      expect(updatedVersion?.status).toBe('draft');
      expect(updatedVersion?.publishedAt).toBeNull();

      // Verify canonical course was updated
      const updatedCanonical = await CanonicalCourse.findById(canonicalCourse._id);
      expect(updatedCanonical?.currentPublishedVersionId).toBeNull();
    });

    it('should accept unpublish reason', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Needs updates before republishing' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('draft');

      // Verify reason was saved in changeNotes
      const updatedVersion = await CourseVersion.findById(draftVersion._id);
      expect(updatedVersion?.changeNotes).toBe('Needs updates before republishing');
    });

    it('should return 409 when course is not published', async () => {
      // Reset to draft
      draftVersion.status = 'draft';
      draftVersion.publishedAt = null;
      await draftVersion.save();

      canonicalCourse.currentPublishedVersionId = null;
      await canonicalCourse.save();

      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('not currently published');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeCourseId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/v2/courses/${fakeCourseId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Course not found');
    });
  });

  describe('POST /api/v2/courses/:id/archive', () => {
    it('should archive a draft course', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
      expect(response.body.data.archivedAt).toBeDefined();

      // Verify version was updated
      const updatedVersion = await CourseVersion.findById(draftVersion._id);
      expect(updatedVersion?.status).toBe('archived');
      expect(updatedVersion?.isLocked).toBe(true);
      expect(updatedVersion?.lockedAt).toBeDefined();
      expect(updatedVersion?.lockedReason).toBe('archived');
    });

    it('should archive a published course', async () => {
      // Publish first
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule._id,
        order: 0,
        isRequired: true
      });

      draftVersion.status = 'published';
      draftVersion.publishedAt = new Date();
      await draftVersion.save();

      canonicalCourse.currentPublishedVersionId = draftVersion._id;
      await canonicalCourse.save();

      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('archived');

      // Verify canonical course currentPublishedVersionId is cleared
      const updatedCanonical = await CanonicalCourse.findById(canonicalCourse._id);
      expect(updatedCanonical?.currentPublishedVersionId).toBeNull();
    });

    it('should accept archive reason', async () => {
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Course content is outdated' });

      expect(response.status).toBe(200);

      // Verify reason was saved in changeNotes
      const updatedVersion = await CourseVersion.findById(draftVersion._id);
      expect(updatedVersion?.changeNotes).toBe('Course content is outdated');
    });

    it('should return 409 when course is already archived', async () => {
      // Archive first
      await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      // Try to archive again
      const response = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already archived');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeCourseId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/v2/courses/${fakeCourseId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Course not found');
    });
  });

  describe('Lifecycle: Publish → Unpublish → Archive', () => {
    it('should handle complete lifecycle', async () => {
      // Add module
      await CourseVersionModule.create({
        courseVersionId: draftVersion._id,
        moduleId: testModule._id,
        order: 0,
        isRequired: true
      });

      // 1. Publish
      const publishResponse = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(publishResponse.status).toBe(200);
      expect(publishResponse.body.data.status).toBe('published');

      // 2. Unpublish
      const unpublishResponse = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(unpublishResponse.status).toBe(200);
      expect(unpublishResponse.body.data.status).toBe('draft');

      // 3. Republish
      const republishResponse = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(republishResponse.status).toBe(200);
      expect(republishResponse.body.data.status).toBe('published');

      // 4. Archive
      const archiveResponse = await request(app)
        .post(`/api/v2/courses/${canonicalCourse._id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(archiveResponse.status).toBe(200);
      expect(archiveResponse.body.data.status).toBe('archived');
    });
  });
});
