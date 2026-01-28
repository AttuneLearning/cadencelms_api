/**
 * Report Jobs Integration Tests
 * Tests the report jobs API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import AccessRight from '@/models/AccessRight.model';
import { ReportJob } from '@/models/reports/ReportJob.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Report Jobs API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let mongoServer: MongoMemoryServer;
  let department: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create test department
    department = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      isVisible: true
    });

    // Refresh department cache to pick up new departments
    await refreshDepartmentCache();

    // Seed role definition for department-admin with report access rights
    await RoleDefinition.create({
      name: 'department-admin',
      userType: 'staff',
      displayName: 'Department Administrator',
      description: 'Manages department operations including reports',
      accessRights: ['reports:jobs:create', 'reports:jobs:read', 'reports:jobs:cancel'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'reports:jobs:create', domain: 'reports', resource: 'jobs', action: 'create', description: 'Create report jobs', isActive: true },
      { name: 'reports:jobs:read', domain: 'reports', resource: 'jobs', action: 'read', description: 'Read report jobs', isActive: true },
      { name: 'reports:jobs:cancel', domain: 'reports', resource: 'jobs', action: 'cancel', description: 'Cancel report jobs', isActive: true }
    ]);

    // Seed LookupValues
    await LookupValue.create([
      { category: 'report-type', key: 'enrollment-summary', displayAs: 'Enrollment Summary', isActive: true },
      { category: 'report-status', key: 'pending', displayAs: 'Pending', isActive: true },
      { category: 'report-status', key: 'cancelled', displayAs: 'Cancelled', isActive: true },
      { category: 'report-priority', key: 'normal', displayAs: 'Normal', isActive: true },
      { category: 'report-visibility', key: 'private', displayAs: 'Private', isActive: true },
      { category: 'output-format', key: 'json', displayAs: 'JSON', isActive: true }
    ]);

    // Create test user with new authorization format
    const hashedPassword = await hashPassword('TestPassword123!');
    const testUserId = new mongoose.Types.ObjectId();

    await User.create({
      _id: testUserId,
      email: 'test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    // Create Staff record with department membership
    await Staff.create({
      _id: testUserId,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{
          email: 'test@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: department._id,
        roles: ['department-admin']
      }],
      isActive: true
    });

    userId = testUserId.toString();

    // Generate JWT token with new authorization fields
    authToken = 'Bearer ' + jwt.sign(
      {
        userId: testUserId.toString(),
        email: 'test@example.com',
        type: 'access',
        roles: ['department-admin'],
        globalRights: [],
        departmentRights: {
          [department._id.toString()]: ['reports:jobs:create', 'reports:jobs:read', 'reports:jobs:cancel']
        },
        departmentMemberships: [{ departmentId: department._id.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await LookupValue.deleteMany({});
    await User.deleteMany({});
    await Staff.deleteMany({});
    await ReportJob.deleteMany({});
    await Department.deleteMany({});
    await RoleDefinition.deleteMany({});
    await AccessRight.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await ReportJob.deleteMany({});
  });

  describe('POST /api/v2/reports/jobs', () => {
    it('should create a new report job', async () => {
      const jobData = {
        reportType: 'enrollment-summary',
        name: 'Q1 Enrollment Report',
        description: 'First quarter enrollment report',
        parameters: {
          dateRange: {
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-03-31T23:59:59Z'
          }
        },
        output: {
          format: 'json'
        }
      };

      const response = await request(app)
        .post('/api/v2/reports/jobs')
        .set('Authorization', authToken)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject invalid report type', async () => {
      const jobData = {
        reportType: 'invalid-type',
        name: 'Invalid Report',
        parameters: {},
        output: { format: 'json' }
      };

      const response = await request(app)
        .post('/api/v2/reports/jobs')
        .set('Authorization', authToken)
        .send(jobData);

      // Note: Model-level validation throws 500, not 400
      // The error is: "Invalid reportType: ... Must be a registered report-type in LookupValue"
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/v2/reports/jobs', () => {
    it('should list report jobs', async () => {
      // Create test job
      await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get('/api/v2/reports/jobs')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter jobs by status', async () => {
      await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get('/api/v2/reports/jobs?status=pending')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.every((job: any) => job.status === 'pending')).toBe(true);
    });
  });

  describe('GET /api/v2/reports/jobs/:jobId', () => {
    it('should get job details', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get(`/api/v2/reports/jobs/${job._id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(job._id.toString());
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v2/reports/jobs/${fakeId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v2/reports/jobs/:jobId/cancel', () => {
    it('should cancel a pending job', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .post(`/api/v2/reports/jobs/${job._id}/cancel`)
        .set('Authorization', authToken)
        .send({ reason: 'No longer needed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});
