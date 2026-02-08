/**
 * Course Creation with Modules Integration Test
 *
 * Tests the fix for the "Course not found" issue when creating modules
 * immediately after course creation.
 *
 * Background: The modules service expects CanonicalCourse IDs, but the
 * old course creation endpoint was returning old Course model IDs.
 *
 * This test verifies:
 * 1. POST /api/v2/courses creates CanonicalCourse + CourseVersion
 * 2. POST /api/v2/courses/:id/modules can find the course immediately
 *
 * Related: UI message 2026-02-05_ui_modules_endpoint_course_not_found.md
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
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

describeIfMongo('Course Creation with Modules Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testUser: any;

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

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Seed role definitions and access rights
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: [
        'content:courses:read',
        'content:courses:manage',
        'content:modules:read',
        'content:modules:manage',
        'content:lessons:manage'
      ],
      isActive: true
    });

    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true },
      { name: 'content:modules:read', domain: 'content', resource: 'modules', action: 'read', description: 'Read modules', isActive: true },
      { name: 'content:modules:manage', domain: 'content', resource: 'modules', action: 'manage', description: 'Manage modules', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true }
    ]);

    // Create test user with permissions
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await User.create({
      email: 'instructor@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Test',
        lastName: 'Instructor',
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
        name: 'Test Instructor'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await CanonicalCourse.deleteMany({});
    await CourseVersion.deleteMany({});
    await Module.deleteMany({});
  });

  describe('POST /api/v2/courses → POST /api/v2/courses/:id/modules', () => {
    it('should create a course and immediately add a module without "Course not found" error', async () => {
      // Step 1: Create a course
      const createCourseResponse = await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'UAT Test Course - Instructor Workflow',
          code: 'UAT510470',
          description: 'Test course for module creation',
          department: testDepartment._id.toString(),
          credits: 3,
          duration: 120
        });

      if (createCourseResponse.status !== 201) {
        console.error('Course creation failed:', createCourseResponse.body);
      }
      expect(createCourseResponse.status).toBe(201);

      expect(createCourseResponse.body.success).toBe(true);
      expect(createCourseResponse.body.data).toHaveProperty('id');
      expect(createCourseResponse.body.data.code).toBe('UAT510470');

      const courseId = createCourseResponse.body.data.id;

      // Verify CanonicalCourse was created
      const canonicalCourse = await CanonicalCourse.findById(courseId);
      expect(canonicalCourse).toBeTruthy();
      expect(canonicalCourse?.code).toBe('UAT510470');

      // Verify CourseVersion was created
      const courseVersion = await CourseVersion.findOne({
        canonicalCourseId: courseId
      });
      expect(courseVersion).toBeTruthy();
      expect(courseVersion?.version).toBe(1);
      expect(courseVersion?.status).toBe('draft');

      // Step 2: Immediately create a module for this course
      const createModuleResponse = await request(app)
        .post(`/api/v2/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Module 1: Introduction',
          description: 'First module of the course',
          order: 1,
          isRequired: true
        })
        .expect(201);

      expect(createModuleResponse.body.success).toBe(true);
      expect(createModuleResponse.body.data).toHaveProperty('id');
      expect(createModuleResponse.body.data.title).toBe('Module 1: Introduction');

      // Verify the module was created
      const module = await Module.findById(createModuleResponse.body.data.id);
      expect(module).toBeTruthy();
      expect(module?.title).toBe('Module 1: Introduction');
    });

    it('should return 404 if course ID is invalid', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/v2/courses/${invalidId}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Module 1',
          description: 'Test module',
          order: 1,
          isRequired: true
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Course not found/i);
    });

    it('should handle multiple modules created sequentially', async () => {
      // Create a course
      const createCourseResponse = await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Multi-Module Course',
          code: 'MULTI001',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(201);

      const courseId = createCourseResponse.body.data.id;

      // Create first module
      const module1Response = await request(app)
        .post(`/api/v2/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Module 1',
          description: 'First module',
          order: 1,
          isRequired: true
        })
        .expect(201);

      expect(module1Response.body.success).toBe(true);

      // Create second module
      const module2Response = await request(app)
        .post(`/api/v2/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Module 2',
          description: 'Second module',
          order: 2,
          isRequired: true
        })
        .expect(201);

      expect(module2Response.body.success).toBe(true);

      // Verify both modules exist
      const modules = await Module.find({
        ownerDepartmentId: testDepartment._id
      }).sort({ order: 1 });

      expect(modules).toHaveLength(2);
      expect(modules[0].title).toBe('Module 1');
      expect(modules[1].title).toBe('Module 2');
    });
  });

  describe('Course creation creates versioning structures', () => {
    it('should create CanonicalCourse and CourseVersion v1', async () => {
      const response = await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Versioning Test Course',
          code: 'VERS001',
          description: 'Testing versioning structures',
          department: testDepartment._id.toString(),
          credits: 3,
          duration: 60
        })
        .expect(201);

      const courseId = response.body.data.id;

      // Check CanonicalCourse
      const canonical = await CanonicalCourse.findById(courseId);
      expect(canonical).toBeTruthy();
      expect(canonical?.code).toBe('VERS001');
      expect(canonical?.totalVersions).toBe(1);
      expect(canonical?.latestDraftVersionId).toBeTruthy();

      // Check CourseVersion
      const version = await CourseVersion.findById(canonical?.latestDraftVersionId);
      expect(version).toBeTruthy();
      expect(version?.version).toBe(1);
      expect(version?.title).toBe('Versioning Test Course');
      expect(version?.status).toBe('draft');
      expect(version?.isLatest).toBe(true);
      expect(version?.isLocked).toBe(false);
    });

    it('should enforce unique course codes within department', async () => {
      // Create first course
      await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'First Course',
          code: 'DUP001',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Second Course',
          code: 'DUP001',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already exists/i);
    });
  });

  describe('GET /api/v2/courses - List courses', () => {
    it('should list newly created courses', async () => {
      // Create a course
      const createResponse = await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'UAT Test Course 757162',
          code: 'UAT757162',
          description: 'Test course for list endpoint',
          department: testDepartment._id.toString(),
          credits: 3,
          duration: 90
        })
        .expect(201);

      const courseId = createResponse.body.data.id;

      // List courses
      const listResponse = await request(app)
        .get('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ department: testDepartment._id.toString() })
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.courses).toBeDefined();
      expect(Array.isArray(listResponse.body.data.courses)).toBe(true);

      // Verify the newly created course appears in the list
      const createdCourse = listResponse.body.data.courses.find(
        (c: any) => c.id === courseId
      );

      expect(createdCourse).toBeDefined();
      expect(createdCourse.title).toBe('UAT Test Course 757162');
      expect(createdCourse.code).toBe('UAT757162');
      expect(createdCourse.status).toBe('draft');
    });

    it('should filter courses by department', async () => {
      // Create courses in the test department
      await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Course 1',
          code: 'TEST001',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(201);

      await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Course 2',
          code: 'TEST002',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(201);

      // List courses for this department
      const response = await request(app)
        .get('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ department: testDepartment._id.toString() })
        .expect(200);

      expect(response.body.data.courses.length).toBeGreaterThanOrEqual(2);
      
      // All courses should be from the test department
      response.body.data.courses.forEach((course: any) => {
        expect(course.department.id).toBe(testDepartment._id.toString());
      });
    });

    it('should search courses by code', async () => {
      // Create a course with specific code
      await request(app)
        .post('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Searchable Course',
          code: 'SEARCH999',
          department: testDepartment._id.toString(),
          credits: 3
        })
        .expect(201);

      // Search for it
      const response = await request(app)
        .get('/api/v2/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'SEARCH999' })
        .expect(200);

      expect(response.body.data.courses.length).toBeGreaterThanOrEqual(1);
      const foundCourse = response.body.data.courses.find(
        (c: any) => c.code === 'SEARCH999'
      );
      expect(foundCourse).toBeDefined();
      expect(foundCourse.title).toBe('Searchable Course');
    });
  });
});

