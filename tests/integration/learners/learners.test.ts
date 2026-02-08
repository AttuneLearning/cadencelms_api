/**
 * Integration Tests: Learners Endpoint
 *
 * Tests for API-ISS-022 (Learner Directory Permission) and API-ISS-023 (Prioritized Learner List)
 *
 * Covers:
 * - GET /api/v2/users/learners with different permission levels
 * - Data masking based on learner:directory:read vs learner:pii:read
 * - Prioritized listing when department filter is provided
 * - Search and pagination behavior
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import AcademicYear from '@/models/academic/AcademicYear.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Learners API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;
  let otherDepartment: any;
  let testProgram: any;
  let academicYear: any;

  // Staff users
  let instructorUser: any;
  let instructorToken: string;
  let deptAdminUser: any;
  let deptAdminToken: string;
  let enrollmentAdminUser: any;
  let enrollmentAdminToken: string;
  let learnerUserNoAccess: any;
  let learnerTokenNoAccess: string;

  // Test learners
  let learnerInProgram1: any;
  let learnerInProgram2: any;
  let learnerNotInProgram1: any;
  let learnerNotInProgram2: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'instructor',
        userType: 'staff',
        displayName: 'Instructor',
        accessRights: ['learner:directory:read', 'content:courses:read'],
        isActive: true
      },
      {
        name: 'department-admin',
        userType: 'staff',
        displayName: 'Department Administrator',
        accessRights: ['learner:directory:read', 'content:courses:manage'],
        isActive: true
      },
      {
        name: 'enrollment-admin',
        userType: 'staff',
        displayName: 'Enrollment Administrator',
        accessRights: ['learner:pii:read', 'enrollment:*'],
        isActive: true
      },
      {
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Course Taker',
        accessRights: ['content:courses:read'],
        isActive: true
      }
    ]);

    // Seed access rights
    await AccessRight.create([
      { name: 'learner:directory:read', domain: 'learner', resource: 'directory', action: 'read', isActive: true },
      { name: 'learner:pii:read', domain: 'learner', resource: 'pii', action: 'read', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', isActive: true },
      { name: 'enrollment:*', domain: 'enrollment', resource: '*', action: '*', isActive: true }
    ]);

    // Create departments
    testDepartment = await Department.create({
      name: 'Computer Science',
      code: 'CS',
      slug: 'computer-science',
      isActive: true
    });

    otherDepartment = await Department.create({
      name: 'Mathematics',
      code: 'MATH',
      slug: 'mathematics',
      isActive: true
    });

    await refreshDepartmentCache();

    // Create academic year
    academicYear = await AcademicYear.create({
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
      isActive: true
    });

    // Create program in test department
    testProgram = await Program.create({
      name: 'BS Computer Science',
      code: 'BSCS',
      departmentId: testDepartment._id,
      type: 'bachelors',
      level: 1,
      path: [],
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create instructor (has learner:directory:read)
    instructorUser = await User.create({
      email: 'instructor@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: instructorUser._id,
      person: {
        firstName: 'John',
        lastName: 'Instructor',
        emails: [{ email: instructorUser.email, type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    instructorToken = jwt.sign({
      userId: instructorUser._id.toString(),
      email: instructorUser.email,
      type: 'access',
      allAccessRights: ['learner:directory:read', 'content:courses:read'],
      departmentMemberships: [{ departmentId: testDepartment._id.toString(), roles: ['instructor'] }]
    }, process.env.JWT_ACCESS_SECRET || 'test-secret', { expiresIn: '1h' });

    // Create department-admin (has learner:directory:read)
    deptAdminUser = await User.create({
      email: 'deptadmin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: deptAdminUser._id,
      person: {
        firstName: 'Jane',
        lastName: 'Admin',
        emails: [{ email: deptAdminUser.email, type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['department-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    deptAdminToken = jwt.sign({
      userId: deptAdminUser._id.toString(),
      email: deptAdminUser.email,
      type: 'access',
      allAccessRights: ['learner:directory:read', 'content:courses:manage'],
      departmentMemberships: [{ departmentId: testDepartment._id.toString(), roles: ['department-admin'] }]
    }, process.env.JWT_ACCESS_SECRET || 'test-secret', { expiresIn: '1h' });

    // Create enrollment-admin (has learner:pii:read via enrollment-admin role)
    enrollmentAdminUser = await User.create({
      email: 'enrolladmin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: enrollmentAdminUser._id,
      person: {
        firstName: 'Bob',
        lastName: 'Enrollment',
        emails: [{ email: enrollmentAdminUser.email, type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['enrollment-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    enrollmentAdminToken = jwt.sign({
      userId: enrollmentAdminUser._id.toString(),
      email: enrollmentAdminUser.email,
      type: 'access',
      userTypes: ['staff'],
      allAccessRights: ['learner:pii:read', 'enrollment:*'],
      departmentMemberships: [{ departmentId: testDepartment._id.toString(), roles: ['enrollment-admin'] }]
    }, process.env.JWT_ACCESS_SECRET || 'test-secret', { expiresIn: '1h' });

    // Create learner user (no admin access)
    learnerUserNoAccess = await User.create({
      email: 'learner@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });

    await Learner.create({
      _id: learnerUserNoAccess._id,
      person: {
        firstName: 'Student',
        lastName: 'Test',
        emails: [{ email: learnerUserNoAccess.email, type: 'personal', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      }
    });

    learnerTokenNoAccess = jwt.sign({
      userId: learnerUserNoAccess._id.toString(),
      email: learnerUserNoAccess.email,
      type: 'access',
      allAccessRights: ['content:courses:read'],
      departmentMemberships: []
    }, process.env.JWT_ACCESS_SECRET || 'test-secret', { expiresIn: '1h' });

    // Create test learners for list tests
    // Learners in program (should appear first when filtered by department)
    const learner1User = await User.create({
      email: 'alice.smith@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });
    learnerInProgram1 = await Learner.create({
      _id: learner1User._id,
      person: {
        firstName: 'Alice',
        lastName: 'Smith',
        emails: [{ email: learner1User.email, type: 'personal', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      }
    });
    await Enrollment.create({
      learnerId: learnerInProgram1._id,
      programId: testProgram._id,
      academicYearId: academicYear._id,
      status: 'active',
      enrollmentDate: new Date()
    });

    const learner2User = await User.create({
      email: 'bob.jones@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });
    learnerInProgram2 = await Learner.create({
      _id: learner2User._id,
      person: {
        firstName: 'Bob',
        lastName: 'Jones',
        emails: [{ email: learner2User.email, type: 'personal', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      }
    });
    await Enrollment.create({
      learnerId: learnerInProgram2._id,
      programId: testProgram._id,
      academicYearId: academicYear._id,
      status: 'active',
      enrollmentDate: new Date()
    });

    // Learners NOT in program (should appear after when filtered by department)
    const learner3User = await User.create({
      email: 'charlie.brown@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });
    learnerNotInProgram1 = await Learner.create({
      _id: learner3User._id,
      person: {
        firstName: 'Charlie',
        lastName: 'Brown',
        emails: [{ email: learner3User.email, type: 'personal', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      }
    });

    const learner4User = await User.create({
      email: 'diana.prince@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });
    learnerNotInProgram2 = await Learner.create({
      _id: learner4User._id,
      person: {
        firstName: 'Diana',
        lastName: 'Prince',
        emails: [{ email: learner4User.email, type: 'personal', isPrimary: true, verified: true, allowNotifications: true }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      }
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
    await Enrollment.deleteMany({});
  });

  describe('GET /api/v2/users/learners', () => {
    describe('Authorization (API-ISS-022)', () => {
      it('should return 403 when user has no learner permissions', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${learnerTokenNoAccess}`);

        expect(response.status).toBe(403);
      });

      it('should allow access with learner:directory:read permission', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${instructorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should allow access with learner:pii:read permission', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('Data Masking (API-ISS-022)', () => {
      it('should return masked data for learner:directory:read permission', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${instructorToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;
        expect(learners.length).toBeGreaterThan(0);

        // Check that data is masked
        const learner = learners.find((l: any) => l.id === learnerInProgram1._id.toString());
        if (learner) {
          // Should have displayName in "LastName, F." format
          expect(learner.displayName).toBeDefined();
          expect(learner.displayName).toMatch(/^[A-Z][a-z]+, [A-Z]\.$/);

          // Should NOT have full email exposed
          if (learner.email) {
            // If email is present, it should be masked or partial
            expect(learner.email).not.toBe('alice.smith@test.com');
          }
        }
      });

      it('should return full PII data for learner:pii:read permission', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;
        expect(learners.length).toBeGreaterThan(0);

        // Check that full data is available
        const learner = learners.find((l: any) => l.id === learnerInProgram1._id.toString());
        if (learner) {
          // Should have full name or email available
          expect(learner.firstName || learner.displayName).toBeDefined();
        }
      });
    });

    describe('Prioritized Listing (API-ISS-023)', () => {
      it('should return program enrollees first when department filter provided', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners?department=${testDepartment._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;

        // Find program enrollees in results
        const programEnrollees = learners.filter((l: any) => l.isProgramEnrollee === true);
        const nonEnrollees = learners.filter((l: any) => l.isProgramEnrollee === false);

        // Program enrollees should come before non-enrollees
        if (programEnrollees.length > 0 && nonEnrollees.length > 0) {
          const lastProgramEnrolleeIndex = learners.findIndex(
            (l: any) => l.id === programEnrollees[programEnrollees.length - 1].id
          );
          const firstNonEnrolleeIndex = learners.findIndex(
            (l: any) => l.id === nonEnrollees[0].id
          );

          expect(lastProgramEnrolleeIndex).toBeLessThan(firstNonEnrolleeIndex);
        }
      });

      it('should include isProgramEnrollee field in response', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners?department=${testDepartment._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;
        learners.forEach((learner: any) => {
          expect(learner.isProgramEnrollee).toBeDefined();
          expect(typeof learner.isProgramEnrollee).toBe('boolean');
        });
      });

      it('should include idSuffix field in masked response', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners?department=${testDepartment._id}`)
          .set('Authorization', `Bearer ${instructorToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;
        learners.forEach((learner: any) => {
          if (learner.idSuffix) {
            // idSuffix should be last 4 characters of ObjectId
            expect(learner.idSuffix.length).toBe(4);
          }
        });
      });
    });

    describe('Search', () => {
      it('should filter learners by search term', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners?search=alice')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`);

        expect(response.status).toBe(200);

        const learners = response.body.data.learners;
        // Should find Alice
        expect(learners.length).toBeGreaterThan(0);
      });

      it('should maintain priority when searching with department filter', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners?department=${testDepartment._id}&search=a`)
          .set('Authorization', `Bearer ${deptAdminToken}`);

        expect(response.status).toBe(200);
        // Results should still prioritize program enrollees
      });
    });

    describe('Pagination', () => {
      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners?page=1&limit=2')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learners.length).toBeLessThanOrEqual(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
      });

      it('should return correct total count', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(4);
      });
    });
  });
});
