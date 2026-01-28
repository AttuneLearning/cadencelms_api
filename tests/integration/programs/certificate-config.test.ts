import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '@/app';
import Program from '@/models/academic/Program.model';
import Template from '@/models/content/Template.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('PUT /api/v2/programs/:id/certificate', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testProgram: any;
  let testTemplate: any;
  let testDepartment: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Certificate Test Department',
      code: 'CERTT' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      slug: 'cert-test-department-' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // Refresh department cache after creating departments
    await refreshDepartmentCache();

    // Seed role definitions - use existing content-admin role
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content including programs',
      accessRights: ['content:programs:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create({
      name: 'content:programs:manage',
      domain: 'content',
      resource: 'programs',
      action: 'manage',
      description: 'Manage programs',
      isActive: true
    });

    // Create test user with proper authorization
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: `cert-test-${Date.now()}@example.com`,
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

    // Generate auth token with new authorization format
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        type: 'access',
        globalRights: ['*'], // System admin for test simplicity
        departmentRights: {
          [testDepartment._id.toString()]: ['content:programs:manage']
        },
        departmentMemberships: [{ departmentId: testDepartment._id }]
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
    // Create a test program
    testProgram = await Program.create({
      name: 'Test Certificate Program',
      code: 'TESTCERT' + Date.now(),
      departmentId: testDepartment._id,
      type: 'certificate'
    });

    // Create a test template
    testTemplate = await Template.create({
      name: 'Test Certificate Template',
      type: 'master',
      status: 'active',
      html: '<html>Certificate</html>',
      isGlobal: true,
      createdBy: testUser._id,
      isDeleted: false
    });
  });

  afterEach(async () => {
    await Program.deleteMany({ code: /^TESTCERT/ });
    await Template.deleteMany({ name: 'Test Certificate Template' });
  });

  describe('successful updates', () => {
    it('should enable certificate configuration', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          title: 'Certificate of Completion',
          signatoryName: 'Dr. Jane Smith',
          signatoryTitle: 'Department Director',
          validityPeriod: 24,
          autoIssue: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.certificate.enabled).toBe(true);
      expect(response.body.data.certificate.title).toBe('Certificate of Completion');
      expect(response.body.data.certificate.autoIssue).toBe(true);
    });

    it('should disable certificate configuration', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: false
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certificate.enabled).toBe(false);
      expect(response.body.data.certificate.autoIssue).toBe(false);
    });

    it('should accept valid templateId', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          templateId: testTemplate._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.certificate.templateId).toBe(testTemplate._id.toString());
    });
  });

  describe('validation errors', () => {
    it('should require enabled field', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Certificate'
        });

      expect(response.status).toBe(400);
    });

    it('should reject title exceeding 200 characters', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          title: 'A'.repeat(201)
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative validityPeriod', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          validityPeriod: -1
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid templateId', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          templateId: new mongoose.Types.ObjectId().toString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/v2/programs/${testProgram._id}/certificate`)
        .send({ enabled: true });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent program', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v2/programs/${fakeId}/certificate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(404);
    });
  });
});
