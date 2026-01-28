/**
 * Certificate Templates Integration Tests
 * Tests the certificate templates API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Template from '@/models/content/Template.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Certificate Templates API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let departmentId: mongoose.Types.ObjectId;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create test department
    const department = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      isActive: true
    });
    departmentId = department._id;

    // Refresh department cache to pick up new departments
    await refreshDepartmentCache();

    // Create access right for content:programs:manage
    await AccessRight.create({
      name: 'content:programs:manage',
      domain: 'content',
      resource: 'programs',
      action: 'manage',
      description: 'Manage programs including certificate configuration',
      isActive: true
    });

    // Create role definition with the access right (using valid role name 'content-admin')
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage programs and certificates',
      accessRights: ['content:programs:manage'],
      isActive: true
    });

    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });
    userId = user._id.toString();

    // Create Staff record with department membership and role
    await Staff.create({
      _id: user._id,
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
        departmentId: departmentId,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Generate JWT token with new authorization format
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: 'access',
        globalRights: [],
        departmentRights: {
          [departmentId.toString()]: ['content:programs:manage']
        },
        departmentMemberships: [{ departmentId: departmentId.toString() }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    authToken = `Bearer ${token}`;
  });

  afterAll(async () => {
    await Template.deleteMany({});
    await Staff.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});
    await RoleDefinition.deleteMany({});
    await AccessRight.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test templates
    await Template.create([
      {
        name: 'System Certificate Template',
        type: 'master',
        isGlobal: true,
        status: 'active',
        html: '<html>System certificate</html>',
        createdBy: new mongoose.Types.ObjectId(userId),
        metadata: {
          description: 'Default system certificate template',
          thumbnailUrl: '/templates/system-thumb.png',
          isDefault: true
        }
      },
      {
        name: 'Department Certificate Template',
        type: 'department',
        departmentId: departmentId,
        status: 'active',
        html: '<html>Department certificate</html>',
        createdBy: new mongoose.Types.ObjectId(userId),
        metadata: {
          description: 'Custom department certificate',
          thumbnailUrl: '/templates/dept-thumb.png'
        }
      },
      {
        name: 'Inactive Template',
        type: 'master',
        isGlobal: true,
        status: 'draft',
        html: '<html>Draft</html>',
        createdBy: new mongoose.Types.ObjectId(userId)
      },
      {
        name: 'Custom User Template',
        type: 'custom',
        status: 'active',
        html: '<html>Custom</html>',
        createdBy: new mongoose.Types.ObjectId(userId)
      }
    ]);
  });

  afterEach(async () => {
    await Template.deleteMany({});
  });

  describe('GET /api/v2/certificate-templates', () => {
    it('should list all active certificate templates', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('templates');
      expect(Array.isArray(response.body.data.templates)).toBe(true);

      // Should include all active templates (master, department, and custom)
      // Should exclude draft templates (status !== active)
      expect(response.body.data.templates.length).toBe(3);
    });

    it('should filter by scope=system', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates?scope=system')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.templates.length).toBe(1);
      expect(response.body.data.templates[0].scope).toBe('system');
      expect(response.body.data.templates[0].name).toBe('System Certificate Template');
    });

    it('should filter by scope=department', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates?scope=department')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.templates.length).toBe(1);
      expect(response.body.data.templates[0].scope).toBe('department');
      expect(response.body.data.templates[0].name).toBe('Department Certificate Template');
    });

    it('should filter by departmentId', async () => {
      const response = await request(app)
        .get(`/api/v2/certificate-templates?departmentId=${departmentId.toString()}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.templates.length).toBe(1);
      const template = response.body.data.templates[0];
      expect(template.scope).toBe('department');
      // Verify departmentId is present (format may vary based on populate behavior)
      expect(template.departmentId).toBeDefined();
      expect(template.departmentName).toBe('Test Department');
    });

    it('should return empty array when no templates match', async () => {
      const nonExistentDeptId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/certificate-templates?departmentId=${nonExistentDeptId.toString()}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.templates.length).toBe(0);
    });

    it('should return 400 for invalid scope', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates?scope=invalid')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid departmentId', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates?departmentId=invalid-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should include template metadata in response', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates?scope=system')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const template = response.body.data.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('thumbnailUrl');
      expect(template).toHaveProperty('scope');
      expect(template).toHaveProperty('isDefault');
      expect(template.isDefault).toBe(true);
      expect(template.description).toBe('Default system certificate template');
      expect(template.thumbnailUrl).toBe('/templates/system-thumb.png');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-templates');

      expect(response.status).toBe(401);
    });

    // Note: Testing 403 for missing permissions requires proper role/permission setup
    // which may need more complex test infrastructure
  });
});
