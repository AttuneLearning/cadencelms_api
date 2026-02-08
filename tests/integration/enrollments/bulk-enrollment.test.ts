import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Course from '@/models/academic/Course.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { LookupValue } from '@/models/LookupValue.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Bulk Course Enrollment API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let unauthorizedToken: string;
  let testDepartment: any;
  let testCourse: any;
  let testUserId: mongoose.Types.ObjectId;
  let learnerIds: string[];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Enrollment Test Department',
      code: 'ENRTEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // Refresh department cache
    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'department-admin',
      userType: 'staff',
      displayName: 'Department Administrator',
      description: 'Can manage enrollments',
      accessRights: ['enrollment:department:manage', 'enrollment:department:read'],
      isActive: true
    });

    await RoleDefinition.create({
      name: 'instructor',
      userType: 'staff',
      displayName: 'Instructor',
      description: 'Can view enrollments only',
      accessRights: ['enrollment:department:read'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'enrollment:department:manage', domain: 'enrollment', resource: 'department', action: 'manage', description: 'Manage enrollments', isActive: true },
      { name: 'enrollment:department:read', domain: 'enrollment', resource: 'department', action: 'read', description: 'Read enrollments', isActive: true }
    ]);

    // Seed lookup values for course status validation
    await LookupValue.create([
      {
        lookupId: 'course-status.draft',
        category: 'course-status',
        key: 'draft',
        parentLookupId: null,
        displayAs: 'Draft',
        sortOrder: 0,
        isActive: true
      },
      {
        lookupId: 'course-status.published',
        category: 'course-status',
        key: 'published',
        parentLookupId: null,
        displayAs: 'Published',
        sortOrder: 1,
        isActive: true
      },
      {
        lookupId: 'course-status.archived',
        category: 'course-status',
        key: 'archived',
        parentLookupId: null,
        displayAs: 'Archived',
        sortOrder: 2,
        isActive: true
      }
    ]);

    // Create staff user with enrollment management permission
    const hashedPassword = await hashPassword('SecurePass123!');
    testUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: testUserId,
      email: 'enrollment-admin@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: testUserId,
      person: {
        firstName: 'Enrollment',
        lastName: 'Admin',
        emails: [{ email: 'enrollment-admin@example.com', type: 'institutional', isPrimary: true, verified: true }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['department-admin'],
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Create unauthorized user (instructor - no manage permission)
    const unauthorizedUserId = new mongoose.Types.ObjectId();
    await User.create({
      _id: unauthorizedUserId,
      email: 'instructor@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: unauthorizedUserId,
      person: {
        firstName: 'Test',
        lastName: 'Instructor',
        emails: [{ email: 'instructor@example.com', type: 'institutional', isPrimary: true, verified: true }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Create test course
    testCourse = await Course.create({
      name: 'Test Course for Enrollment',
      code: 'ENROLL101',
      departmentId: testDepartment._id,
      status: 'published',
      credits: 3,
      isActive: true
    });

    // Create test learners
    learnerIds = [];
    for (let i = 0; i < 5; i++) {
      const learnerId = new mongoose.Types.ObjectId();
      await User.create({
        _id: learnerId,
        email: `learner${i}@example.com`,
        password: hashedPassword,
        userTypes: ['learner'],
        isActive: true
      });

      await Learner.create({
        _id: learnerId,
        person: {
          firstName: `Learner${i}`,
          lastName: 'Test',
          emails: [{ email: `learner${i}@example.com`, type: 'institutional', isPrimary: true, verified: true }],
          phones: [],
          addresses: []
        },
        departmentMemberships: [{
          departmentId: testDepartment._id,
          roles: ['course-taker'],
          isActive: true,
          joinedAt: new Date()
        }],
        isActive: true
      });

      learnerIds.push(learnerId.toString());
    }

    // Generate auth tokens
    authToken = jwt.sign(
      {
        userId: testUserId.toString(),
        email: 'enrollment-admin@example.com',
        roles: ['department-admin'],
        allAccessRights: ['enrollment:department:manage', 'enrollment:department:read'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    unauthorizedToken = jwt.sign(
      {
        userId: unauthorizedUserId.toString(),
        email: 'instructor@example.com',
        roles: ['instructor'],
        allAccessRights: ['enrollment:department:read'],
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
    // Clean up enrollments between tests
    await Enrollment.deleteMany({});
  });

  describe('POST /api/v2/enrollments/course/bulk', () => {
    it('should bulk enroll multiple learners in a course', async () => {
      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: learnerIds.slice(0, 3)
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enrolled).toHaveLength(3);
      expect(response.body.data.failed).toHaveLength(0);
      expect(response.body.data.summary).toEqual({
        total: 3,
        successful: 3,
        failed: 0
      });
    });

    it('should skip already enrolled learners', async () => {
      // First enrollment
      await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [learnerIds[0]]
        });

      // Second enrollment with same learner
      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [learnerIds[0], learnerIds[1]]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enrolled).toHaveLength(1);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0].reason).toBe('Already enrolled');
    });

    it('should fail for non-existent learners', async () => {
      const fakeLearnerId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [fakeLearnerId]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enrolled).toHaveLength(0);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0].reason).toBe('Learner not found');
    });

    it('should support optional startDate and expiresAt', async () => {
      const startDate = new Date('2026-03-01');
      const expiresAt = new Date('2026-12-31');

      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [learnerIds[0]],
          options: {
            startDate: startDate.toISOString(),
            expiresAt: expiresAt.toISOString(),
            sendNotification: false
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enrolled).toHaveLength(1);

      // Verify enrollment was created with correct dates
      const enrollment = await Enrollment.findById(response.body.data.enrolled[0].enrollmentId);
      expect(enrollment).toBeTruthy();
      expect(new Date(enrollment!.enrollmentDate).toDateString()).toBe(startDate.toDateString());
    });

    it('should return 400 for empty learnerIds array', async () => {
      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: []
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cannot be empty');
    });

    it('should return 400 for more than 500 learners', async () => {
      const tooManyLearners = Array(501).fill(new mongoose.Types.ObjectId().toString());

      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: tooManyLearners
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('500');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeCourseId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: fakeCourseId,
          learnerIds: [learnerIds[0]]
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Course not found');
    });

    it('should return 422 for unpublished course', async () => {
      const draftCourse = await Course.create({
        name: 'Draft Course',
        code: 'DRAFT101',
        departmentId: testDepartment._id,
        status: 'draft',
        credits: 2,
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: draftCourse._id.toString(),
          learnerIds: [learnerIds[0]]
        });

      expect(response.status).toBe(422);
      expect(response.body.message).toContain('not published');
    });

    it('should return 403 for unauthorized user', async () => {
      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [learnerIds[0]]
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v2/enrollments/course/bulk')
        .send({
          courseId: testCourse._id.toString(),
          learnerIds: [learnerIds[0]]
        });

      expect(response.status).toBe(401);
    });
  });
});
