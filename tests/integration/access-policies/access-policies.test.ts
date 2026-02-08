/**
 * Access Policies API Integration Tests
 *
 * Tests the access policy and duration management API endpoints:
 *
 * Department Access Policy:
 * - GET /api/v2/departments/:departmentId/access-policy
 * - PUT /api/v2/departments/:departmentId/access-policy
 *
 * Program Access Override:
 * - GET /api/v2/programs/:programId/access-override
 * - PUT /api/v2/programs/:programId/access-override
 * - DELETE /api/v2/programs/:programId/access-override
 * - GET /api/v2/programs/:programId/effective-policy
 *
 * Extension Requests:
 * - GET /api/v2/access-extension-requests
 * - GET /api/v2/access-extension-requests/:requestId
 * - PATCH /api/v2/access-extension-requests/:requestId
 * - POST /api/v2/enrollments/:enrollmentId/extension-request
 * - POST /api/v2/enrollments/:enrollmentId/extend
 *
 * Learner Version Access:
 * - GET /api/v2/users/learners/:learnerId/version-access
 *
 * Related: API-ISS-019 (Access Policies & Duration Management)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import DepartmentAccessPolicy from '@/models/policy/DepartmentAccessPolicy.model';
import ProgramAccessOverride from '@/models/policy/ProgramAccessOverride.model';
import AccessExtensionRequest from '@/models/policy/AccessExtensionRequest.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Access Policies API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let staffAuthToken: string;
  let learnerAuthToken: string;
  let testDepartment: any;
  let testStaff: any;
  let testLearner: any;
  let testProgram: any;
  let testEnrollment: any;
  let academicYear: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TST' + Date.now().toString().slice(-6),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'department-admin',
        userType: 'staff',
        displayName: 'Policy Administrator',
        description: 'Can manage policies',
        accessRights: [
          'settings:department:read',
          'settings:department:manage',
          'settings:program:read',
          'settings:program:manage',
          'settings:extension-requests:read',
          'settings:extension-requests:manage',
          'enrollment:department:read',
          'enrollment:department:manage'
        ],
        isActive: true
      },
      {
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Learner',
        description: 'Standard learner role',
        accessRights: [
          'enrollment:own:read',
          'enrollment:own:manage'
        ],
        isActive: true
      }
    ]);

    // Seed access rights
    await AccessRight.create([
      { name: 'settings:department:read', domain: 'settings', resource: 'department', action: 'read', description: 'Read department policies', isActive: true },
      { name: 'settings:department:manage', domain: 'settings', resource: 'department', action: 'manage', description: 'Manage department policies', isActive: true },
      { name: 'settings:program:read', domain: 'settings', resource: 'program', action: 'read', description: 'Read program policies', isActive: true },
      { name: 'settings:program:manage', domain: 'settings', resource: 'program', action: 'manage', description: 'Manage program policies', isActive: true },
      { name: 'settings:extension-requests:read', domain: 'settings', resource: 'extension-requests', action: 'read', description: 'Read extension requests', isActive: true },
      { name: 'settings:extension-requests:manage', domain: 'settings', resource: 'extension-requests', action: 'manage', description: 'Manage extension requests', isActive: true },
      { name: 'enrollment:department:read', domain: 'enrollment', resource: 'department', action: 'read', description: 'Read department enrollments', isActive: true },
      { name: 'enrollment:department:manage', domain: 'enrollment', resource: 'department', action: 'manage', description: 'Manage department enrollments', isActive: true },
      { name: 'enrollment:own:read', domain: 'enrollment', resource: 'own', action: 'read', description: 'Read own enrollments', isActive: true },
      { name: 'enrollment:own:manage', domain: 'enrollment', resource: 'own', action: 'manage', description: 'Manage own enrollments', isActive: true }
    ]);

    // Create test staff user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const staffUser = await User.create({
      email: 'policy-staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    testStaff = await Staff.create({
      _id: staffUser._id,
      person: {
        firstName: 'Policy',
        lastName: 'Staff',
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
        roles: ['department-admin'],
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
        name: 'Policy Staff'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test learner user
    const learnerUser = await User.create({
      email: 'learner@example.com',
      password: hashedPassword,
      userTypes: ['learner'],
      defaultDashboard: 'learner',
      isActive: true
    });

    testLearner = await Learner.create({
      _id: learnerUser._id,
      person: {
        firstName: 'Test',
        lastName: 'Learner',
        emails: [{
          email: learnerUser.email,
          type: 'personal',
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
        associatedAt: new Date()
      }]
    });

    // Generate learner auth token
    learnerAuthToken = jwt.sign(
      {
        userId: learnerUser._id.toString(),
        email: learnerUser.email,
        roles: ['course-taker'],
        type: 'access',
        name: 'Test Learner'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test program
    testProgram = await Program.create({
      name: 'Test Program',
      code: 'TPG' + Date.now().toString().slice(-6),
      departmentId: testDepartment._id,
      type: 'certificate',
      level: 0,
      path: [],
      isActive: true
    });

    // Create a mock academic year (simple object ID for testing)
    academicYear = { _id: new mongoose.Types.ObjectId() };

    // Create test enrollment with access expiration
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

    testEnrollment = await Enrollment.create({
      learnerId: testLearner._id,
      programId: testProgram._id,
      academicYearId: academicYear._id,
      status: 'active',
      enrollmentDate: new Date(),
      accessExpiresAt: expirationDate
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up policy data between tests but keep base test data
    await DepartmentAccessPolicy.deleteMany({});
    await ProgramAccessOverride.deleteMany({});
    await AccessExtensionRequest.deleteMany({});
  });

  // ===========================================================================
  // Department Access Policy Tests
  // ===========================================================================
  describe('Department Access Policy', () => {
    describe('GET /api/v2/departments/:departmentId/access-policy', () => {
      it('should return default policy when none exists', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isDefault).toBe(true);
        expect(response.body.data.defaultAccessDuration.type).toBe('perpetual');
        expect(response.body.data.allowNewVersionAccess).toBe(true);
        expect(response.body.data.allowCertificateUpgrade).toBe(true);
        expect(response.body.data.allowCourseRetakes).toBe(true);
        expect(response.body.data.notifications.notifyBeforeExpiration).toBe(true);
      });

      it('should return existing policy', async () => {
        // Create a policy first
        await DepartmentAccessPolicy.create({
          departmentId: testDepartment._id,
          defaultAccessDuration: { type: 'months', value: 12 },
          allowNewVersionAccess: false,
          allowCourseRetakes: false,
          maxRetakesPerCourse: 2,
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.isDefault).toBe(false);
        expect(response.body.data.defaultAccessDuration.type).toBe('months');
        expect(response.body.data.defaultAccessDuration.value).toBe(12);
        expect(response.body.data.allowNewVersionAccess).toBe(false);
        expect(response.body.data.allowCourseRetakes).toBe(false);
        expect(response.body.data.maxRetakesPerCourse).toBe(2);
      });

      it('should return 400 for invalid department ID', async () => {
        const response = await request(app)
          .get('/api/v2/departments/invalid-id/access-policy')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/departments/${testDepartment._id}/access-policy`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/v2/departments/:departmentId/access-policy', () => {
      it('should create new department access policy', async () => {
        const policyData = {
          defaultAccessDuration: { type: 'years', value: 2 },
          allowNewVersionAccess: true,
          newVersionAccessWindow: 90,
          allowCertificateUpgrade: true,
          certificateUpgradeWindow: 60,
          allowCourseRetakes: true,
          maxRetakesPerCourse: 3,
          retakeCooldownDays: 7,
          notifications: {
            notifyBeforeExpiration: true,
            daysBeforeExpirationNotification: 14,
            notifyOnNewVersion: true,
            notifyOnCertificateUpgrade: true,
            notifyAdminOnExtensionRequest: true
          }
        };

        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send(policyData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.defaultAccessDuration.type).toBe('years');
        expect(response.body.data.defaultAccessDuration.value).toBe(2);
        expect(response.body.data.allowNewVersionAccess).toBe(true);
        expect(response.body.data.newVersionAccessWindow).toBe(90);
        expect(response.body.data.maxRetakesPerCourse).toBe(3);
        expect(response.body.data.notifications.daysBeforeExpirationNotification).toBe(14);
      });

      it('should update existing department access policy', async () => {
        // Create initial policy
        await DepartmentAccessPolicy.create({
          departmentId: testDepartment._id,
          defaultAccessDuration: { type: 'months', value: 6 },
          allowCourseRetakes: false,
          isActive: true
        });

        // Update the policy
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            defaultAccessDuration: { type: 'months', value: 12 },
            allowCourseRetakes: true,
            maxRetakesPerCourse: 5
          });

        expect(response.status).toBe(200);
        expect(response.body.data.defaultAccessDuration.value).toBe(12);
        expect(response.body.data.allowCourseRetakes).toBe(true);
        expect(response.body.data.maxRetakesPerCourse).toBe(5);
      });

      it('should accept perpetual access duration without value', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            defaultAccessDuration: { type: 'perpetual' }
          });

        expect(response.status).toBe(200);
        expect(response.body.data.defaultAccessDuration.type).toBe('perpetual');
      });

      it('should return 422 when value is missing for non-perpetual type', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            defaultAccessDuration: { type: 'months' } // Missing value
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid duration type', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            defaultAccessDuration: { type: 'invalid-type', value: 12 }
          });

        expect(response.status).toBe(422);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
          .send({ defaultAccessDuration: { type: 'perpetual' } });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===========================================================================
  // Program Access Override Tests
  // ===========================================================================
  describe('Program Access Override', () => {
    describe('GET /api/v2/programs/:programId/access-override', () => {
      it('should return no override message when none exists', async () => {
        const response = await request(app)
          .get(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.hasOverride).toBe(false);
        expect(response.body.data.message).toContain('Department defaults apply');
      });

      it('should return existing override', async () => {
        // Create an override
        await ProgramAccessOverride.create({
          programId: testProgram._id,
          accessDuration: { type: 'months', value: 18 },
          requireSequentialCompletion: true,
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.hasOverride).toBe(true);
        expect(response.body.data.accessDuration.type).toBe('months');
        expect(response.body.data.accessDuration.value).toBe(18);
        expect(response.body.data.requireSequentialCompletion).toBe(true);
      });

      it('should return 400 for invalid program ID', async () => {
        const response = await request(app)
          .get('/api/v2/programs/invalid-id/access-override')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/v2/programs/:programId/access-override', () => {
      it('should create new program access override', async () => {
        const overrideData = {
          accessDuration: { type: 'custom', value: 365 },
          allowNewVersionAccess: false,
          requireSequentialCompletion: true,
          notifications: {
            notifyBeforeExpiration: false
          }
        };

        const response = await request(app)
          .put(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send(overrideData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessDuration.type).toBe('custom');
        expect(response.body.data.accessDuration.value).toBe(365);
        expect(response.body.data.allowNewVersionAccess).toBe(false);
        expect(response.body.data.requireSequentialCompletion).toBe(true);
      });

      it('should update existing override', async () => {
        // Create initial override
        await ProgramAccessOverride.create({
          programId: testProgram._id,
          allowCourseRetakes: false,
          isActive: true
        });

        const response = await request(app)
          .put(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            allowCourseRetakes: true,
            maxRetakesPerCourse: 10
          });

        expect(response.status).toBe(200);
        expect(response.body.data.allowCourseRetakes).toBe(true);
        expect(response.body.data.maxRetakesPerCourse).toBe(10);
      });

      it('should allow null to clear specific overrides', async () => {
        // Create override with values
        await ProgramAccessOverride.create({
          programId: testProgram._id,
          accessDuration: { type: 'months', value: 12 },
          allowCourseRetakes: true,
          isActive: true
        });

        const response = await request(app)
          .put(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            accessDuration: null,
            allowCourseRetakes: null
          });

        expect(response.status).toBe(200);
        expect(response.body.data.accessDuration).toBeNull();
        expect(response.body.data.allowCourseRetakes).toBeNull();
      });

      it('should return 404 for non-existent program', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/programs/${nonExistentId}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({ requireSequentialCompletion: true });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/v2/programs/:programId/access-override', () => {
      it('should delete program access override', async () => {
        // Create an override first
        await ProgramAccessOverride.create({
          programId: testProgram._id,
          accessDuration: { type: 'months', value: 12 },
          isActive: true
        });

        const response = await request(app)
          .delete(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted successfully');

        // Verify it's soft deleted
        const deletedOverride = await ProgramAccessOverride.findOne({
          programId: testProgram._id
        });
        expect(deletedOverride?.isActive).toBe(false);
      });

      it('should return 404 when no override exists', async () => {
        const response = await request(app)
          .delete(`/api/v2/programs/${testProgram._id}/access-override`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/v2/programs/:programId/effective-policy', () => {
      it('should return department defaults when no program override exists', async () => {
        // Create department policy
        await DepartmentAccessPolicy.create({
          departmentId: testDepartment._id,
          defaultAccessDuration: { type: 'years', value: 1 },
          allowNewVersionAccess: true,
          allowCourseRetakes: false,
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/programs/${testProgram._id}/effective-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.source.hasProgramOverride).toBe(false);
        expect(response.body.data.accessDuration.type).toBe('years');
        expect(response.body.data.accessDuration.value).toBe(1);
        expect(response.body.data.allowNewVersionAccess).toBe(true);
        expect(response.body.data.allowCourseRetakes).toBe(false);
      });

      it('should merge department policy with program override', async () => {
        // Create department policy
        await DepartmentAccessPolicy.create({
          departmentId: testDepartment._id,
          defaultAccessDuration: { type: 'years', value: 1 },
          allowNewVersionAccess: true,
          allowCourseRetakes: true,
          maxRetakesPerCourse: 5,
          retakeCooldownDays: 14,
          isActive: true
        });

        // Create program override (only overrides some values)
        await ProgramAccessOverride.create({
          programId: testProgram._id,
          accessDuration: { type: 'months', value: 6 },
          allowCourseRetakes: false,
          // maxRetakesPerCourse not set - should inherit from department
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/programs/${testProgram._id}/effective-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.source.hasProgramOverride).toBe(true);
        // Program override values
        expect(response.body.data.accessDuration.type).toBe('months');
        expect(response.body.data.accessDuration.value).toBe(6);
        expect(response.body.data.allowCourseRetakes).toBe(false);
        // Inherited from department
        expect(response.body.data.allowNewVersionAccess).toBe(true);
        expect(response.body.data.maxRetakesPerCourse).toBe(5);
        expect(response.body.data.retakeCooldownDays).toBe(14);
      });

      it('should return system defaults when no policies exist', async () => {
        const response = await request(app)
          .get(`/api/v2/programs/${testProgram._id}/effective-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.source.hasProgramOverride).toBe(false);
        expect(response.body.data.accessDuration.type).toBe('perpetual');
        expect(response.body.data.allowNewVersionAccess).toBe(true);
        expect(response.body.data.allowCertificateUpgrade).toBe(true);
        expect(response.body.data.allowCourseRetakes).toBe(true);
      });

      it('should return 404 for non-existent program', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/programs/${nonExistentId}/effective-policy`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ===========================================================================
  // Access Extension Request Tests
  // ===========================================================================
  describe('Access Extension Requests', () => {
    describe('POST /api/v2/enrollments/:enrollmentId/extension-request', () => {
      it('should create extension request for learner\'s own enrollment', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'months', value: 3 },
            requestReason: 'Need more time to complete coursework'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.enrollmentId).toBe(testEnrollment._id.toString());
        expect(response.body.data.learnerId).toBe(testLearner._id.toString());
        expect(response.body.data.requestedExtension.type).toBe('months');
        expect(response.body.data.requestedExtension.value).toBe(3);
        expect(response.body.data.status).toBe('pending');
      });

      it('should create perpetual extension request', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'perpetual' },
            requestReason: 'Requesting lifetime access'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.requestedExtension.type).toBe('perpetual');
      });

      it('should return 409 when pending request already exists', async () => {
        // Create first request
        await AccessExtensionRequest.create({
          enrollmentId: testEnrollment._id,
          learnerId: testLearner._id,
          departmentId: testDepartment._id,
          requestedExtension: { type: 'months', value: 1 },
          status: 'pending'
        });

        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'months', value: 2 }
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('pending extension request');
      });

      it('should return 422 when value is missing for non-perpetual type', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'days' } // Missing value
          });

        expect(response.status).toBe(422);
      });

      it('should return 404 for non-existent enrollment', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/enrollments/${nonExistentId}/extension-request`)
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'days', value: 30 }
          });

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid enrollment ID', async () => {
        const response = await request(app)
          .post('/api/v2/enrollments/invalid-id/extension-request')
          .set('Authorization', `Bearer ${learnerAuthToken}`)
          .send({
            requestedExtension: { type: 'days', value: 30 }
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v2/access-extension-requests', () => {
      beforeEach(async () => {
        // Create multiple extension requests
        await AccessExtensionRequest.create([
          {
            enrollmentId: testEnrollment._id,
            learnerId: testLearner._id,
            departmentId: testDepartment._id,
            requestedExtension: { type: 'months', value: 1 },
            status: 'pending',
            requestedAt: new Date()
          },
          {
            enrollmentId: testEnrollment._id,
            learnerId: testLearner._id,
            departmentId: testDepartment._id,
            requestedExtension: { type: 'months', value: 2 },
            status: 'approved',
            requestedAt: new Date(Date.now() - 86400000) // 1 day ago
          },
          {
            enrollmentId: testEnrollment._id,
            learnerId: testLearner._id,
            departmentId: testDepartment._id,
            requestedExtension: { type: 'days', value: 30 },
            status: 'denied',
            requestedAt: new Date(Date.now() - 172800000) // 2 days ago
          }
        ]);
      });

      it('should list all extension requests', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.requests.length).toBe(3);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(3);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests?status=pending')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.requests.length).toBe(1);
        expect(response.body.data.requests[0].status).toBe('pending');
      });

      it('should filter by department', async () => {
        const response = await request(app)
          .get(`/api/v2/access-extension-requests?departmentId=${testDepartment._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.requests.length).toBe(3);
      });

      it('should filter by learner', async () => {
        const response = await request(app)
          .get(`/api/v2/access-extension-requests?learnerId=${testLearner._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.requests.length).toBe(3);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests?page=1&limit=2')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.requests.length).toBe(2);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
      });

      it('should sort by requestedAt descending by default', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        const requests = response.body.data.requests;
        // Most recent should be first
        expect(new Date(requests[0].requestedAt).getTime())
          .toBeGreaterThan(new Date(requests[1].requestedAt).getTime());
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/access-extension-requests/:requestId', () => {
      let extensionRequest: any;

      beforeEach(async () => {
        extensionRequest = await AccessExtensionRequest.create({
          enrollmentId: testEnrollment._id,
          learnerId: testLearner._id,
          departmentId: testDepartment._id,
          requestedExtension: { type: 'months', value: 6 },
          requestReason: 'Need more time',
          status: 'pending',
          requestedAt: new Date()
        });
      });

      it('should get extension request by ID', async () => {
        const response = await request(app)
          .get(`/api/v2/access-extension-requests/${extensionRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(extensionRequest._id.toString());
        expect(response.body.data.requestedExtension.type).toBe('months');
        expect(response.body.data.requestedExtension.value).toBe(6);
        expect(response.body.data.requestReason).toBe('Need more time');
        expect(response.body.data.status).toBe('pending');
      });

      it('should return 404 for non-existent request', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/access-extension-requests/${nonExistentId}`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid request ID', async () => {
        const response = await request(app)
          .get('/api/v2/access-extension-requests/invalid-id')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('PATCH /api/v2/access-extension-requests/:requestId', () => {
      let pendingRequest: any;

      beforeEach(async () => {
        pendingRequest = await AccessExtensionRequest.create({
          enrollmentId: testEnrollment._id,
          learnerId: testLearner._id,
          departmentId: testDepartment._id,
          requestedExtension: { type: 'months', value: 3 },
          requestReason: 'Need more time',
          status: 'pending',
          requestedAt: new Date()
        });
      });

      it('should approve extension request', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'approved',
            reviewNotes: 'Approved as requested'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('approved');
        expect(response.body.data.reviewedBy).toBe(testStaff._id.toString());
        expect(response.body.data.reviewedAt).toBeDefined();
        expect(response.body.data.reviewNotes).toBe('Approved as requested');
        expect(response.body.data.grantedExtension.type).toBe('months');
        expect(response.body.data.grantedExtension.value).toBe(3);
        expect(response.body.data.newExpirationDate).toBeDefined();
      });

      it('should approve with different extension than requested', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'approved',
            reviewNotes: 'Approving for 1 month instead',
            grantedExtension: { type: 'months', value: 1 }
          });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('approved');
        expect(response.body.data.grantedExtension.type).toBe('months');
        expect(response.body.data.grantedExtension.value).toBe(1);
      });

      it('should deny extension request', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'denied',
            reviewNotes: 'Extension not needed based on current progress'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('denied');
        expect(response.body.data.reviewNotes).toBe('Extension not needed based on current progress');
        expect(response.body.data.grantedExtension).toBeUndefined();
        expect(response.body.data.newExpirationDate).toBeUndefined();
      });

      it('should update enrollment access when approved', async () => {
        await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'approved'
          });

        // Verify enrollment was updated
        const updatedEnrollment = await Enrollment.findById(testEnrollment._id);
        expect(updatedEnrollment?.accessExtendedAt).toBeDefined();
        expect(updatedEnrollment?.accessExtensionCount).toBe(1);
      });

      it('should return 422 when reviewing already reviewed request', async () => {
        // First approve the request
        await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({ status: 'approved' });

        // Try to review again
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({ status: 'denied' });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('Cannot review request');
      });

      it('should return 422 when status is missing', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            reviewNotes: 'Missing status'
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid status value', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'invalid-status'
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 when grantedExtension provided for denied request', async () => {
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${pendingRequest._id}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            status: 'denied',
            grantedExtension: { type: 'months', value: 1 }
          });

        expect(response.status).toBe(422);
        expect(response.body.message).toContain('grantedExtension');
      });

      it('should return 404 for non-existent request', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .patch(`/api/v2/access-extension-requests/${nonExistentId}`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({ status: 'approved' });

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/v2/enrollments/:enrollmentId/extend', () => {
      it('should directly extend enrollment access', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            extension: { type: 'days', value: 60 },
            reason: 'Administrative override for special circumstances'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessExpiresAt).toBeDefined();
        expect(response.body.data.accessExtensionReason).toBe('Administrative override for special circumstances');
        expect(response.body.data.accessExtensionCount).toBe(1);
      });

      it('should grant perpetual access', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            extension: { type: 'perpetual' },
            reason: 'Granting lifetime access'
          });

        expect(response.status).toBe(200);
        // When perpetual, accessExpiresAt should be null (no expiration)
        expect(response.body.data.accessExpiresAt).toBeUndefined();
      });

      it('should reactivate expired enrollment', async () => {
        // First expire the enrollment
        await Enrollment.findByIdAndUpdate(testEnrollment._id, {
          status: 'expired',
          accessExpiresAt: new Date(Date.now() - 86400000) // 1 day ago
        });

        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            extension: { type: 'months', value: 1 },
            reason: 'Reactivating enrollment'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('active');
      });

      it('should return 422 when reason is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            extension: { type: 'days', value: 30 }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 when extension is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            reason: 'Reason without extension'
          });

        expect(response.status).toBe(422);
      });

      it('should return 404 for non-existent enrollment', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/enrollments/${nonExistentId}/extend`)
          .set('Authorization', `Bearer ${staffAuthToken}`)
          .send({
            extension: { type: 'days', value: 30 },
            reason: 'Test'
          });

        expect(response.status).toBe(404);
      });
    });
  });

  // ===========================================================================
  // Learner Version Access Tests
  // ===========================================================================
  describe('Learner Version Access', () => {
    describe('GET /api/v2/users/learners/:learnerId/version-access', () => {
      it('should get learner version access information', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners/${testLearner._id}/version-access`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.learnerId).toBe(testLearner._id.toString());
        expect(response.body.data.enrollments).toBeDefined();
        expect(Array.isArray(response.body.data.enrollments)).toBe(true);
      });

      it('should return enrollment details with access information', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners/${testLearner._id}/version-access`)
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(200);

        if (response.body.data.enrollments.length > 0) {
          const enrollment = response.body.data.enrollments[0];
          expect(enrollment.enrollmentId).toBeDefined();
          expect(enrollment.programId).toBeDefined();
          expect(enrollment.programName).toBeDefined();
        }
      });

      it('should return 400 for invalid learner ID', async () => {
        const response = await request(app)
          .get('/api/v2/users/learners/invalid-id/version-access')
          .set('Authorization', `Bearer ${staffAuthToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/users/learners/${testLearner._id}/version-access`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ===========================================================================
  // Authorization Tests
  // ===========================================================================
  describe('Authorization', () => {
    it('should return 403 when learner tries to access department policy', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment._id}/access-policy`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when learner tries to update department policy', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({ defaultAccessDuration: { type: 'perpetual' } });

      expect(response.status).toBe(403);
    });

    it('should return 403 when learner tries to access program override', async () => {
      const response = await request(app)
        .get(`/api/v2/programs/${testProgram._id}/access-override`)
        .set('Authorization', `Bearer ${learnerAuthToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when learner tries to review extension requests', async () => {
      const extensionRequest = await AccessExtensionRequest.create({
        enrollmentId: testEnrollment._id,
        learnerId: testLearner._id,
        departmentId: testDepartment._id,
        requestedExtension: { type: 'months', value: 1 },
        status: 'pending'
      });

      const response = await request(app)
        .patch(`/api/v2/access-extension-requests/${extensionRequest._id}`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({ status: 'approved' });

      expect(response.status).toBe(403);
    });

    it('should return 403 when learner tries to directly extend enrollment', async () => {
      const response = await request(app)
        .post(`/api/v2/enrollments/${testEnrollment._id}/extend`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          extension: { type: 'days', value: 30 },
          reason: 'Self-extension attempt'
        });

      expect(response.status).toBe(403);
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================
  describe('Edge Cases and Error Handling', () => {
    it('should handle custom duration type correctly', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          defaultAccessDuration: { type: 'custom', value: 180 } // 180 days
        });

      expect(response.status).toBe(200);
      expect(response.body.data.defaultAccessDuration.type).toBe('custom');
      expect(response.body.data.defaultAccessDuration.value).toBe(180);
    });

    it('should reject negative duration values', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          defaultAccessDuration: { type: 'months', value: -5 }
        });

      expect(response.status).toBe(422);
    });

    it('should reject negative retake cooldown days', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment._id}/access-policy`)
        .set('Authorization', `Bearer ${staffAuthToken}`)
        .send({
          retakeCooldownDays: -1
        });

      expect(response.status).toBe(422);
    });

    it('should reject extension request for completed enrollment', async () => {
      // Update enrollment to completed status
      await Enrollment.findByIdAndUpdate(testEnrollment._id, {
        status: 'completed'
      });

      const response = await request(app)
        .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          requestedExtension: { type: 'months', value: 1 }
        });

      expect(response.status).toBe(422);
      expect(response.body.message).toContain('Cannot request extension');

      // Reset enrollment status for other tests
      await Enrollment.findByIdAndUpdate(testEnrollment._id, {
        status: 'active'
      });
    });

    it('should handle extension request with very long reason', async () => {
      const longReason = 'A'.repeat(2000); // Max length
      const response = await request(app)
        .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          requestedExtension: { type: 'days', value: 30 },
          requestReason: longReason
        });

      expect(response.status).toBe(201);
    });

    it('should reject extension request with reason exceeding max length', async () => {
      const tooLongReason = 'A'.repeat(2001); // Over max length
      const response = await request(app)
        .post(`/api/v2/enrollments/${testEnrollment._id}/extension-request`)
        .set('Authorization', `Bearer ${learnerAuthToken}`)
        .send({
          requestedExtension: { type: 'days', value: 30 },
          requestReason: tooLongReason
        });

      expect(response.status).toBe(422);
    });
  });
});
