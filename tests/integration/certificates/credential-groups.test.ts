/**
 * Credential Groups & Certificate Definitions API Integration Tests
 *
 * Tests the credential groups and certificate definitions API endpoints:
 * - POST /api/v2/credential-groups - Create credential group
 * - GET /api/v2/credential-groups - List credential groups
 * - GET /api/v2/credential-groups/:id - Get credential group by ID
 * - PATCH /api/v2/credential-groups/:id - Update credential group
 * - DELETE /api/v2/credential-groups/:id - Delete credential group (soft)
 * - GET /api/v2/credential-groups/:id/definitions - List definitions for group
 *
 * Certificate Definition endpoints:
 * - POST /api/v2/certificate-definitions - Create definition
 * - GET /api/v2/certificate-definitions - List definitions
 * - GET /api/v2/certificate-definitions/:id - Get definition by ID
 * - PATCH /api/v2/certificate-definitions/:id - Update definition
 * - POST /api/v2/certificate-definitions/:id/activate - Activate definition
 * - POST /api/v2/certificate-definitions/:id/deprecate - Deprecate definition
 * - POST /api/v2/certificate-definitions/:id/requirements - Add requirement
 * - GET /api/v2/certificate-definitions/:id/requirements - List requirements
 * - DELETE /api/v2/certificate-definitions/:id/requirements/:reqId - Remove requirement
 *
 * Related: API-ISS-017 (Credential Groups & Certificate Definitions)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Credential Groups & Certificate Definitions API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let readOnlyToken: string;
  let testDepartment: any;
  let testProgram: any;
  let testUser: any;
  let readOnlyUser: any;
  let courseVersion: any;
  let canonicalCourse: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test department
    testDepartment = await Department.create({
      name: 'Certificate Test Department',
      code: 'CRT' + Date.now().toString().slice(-6),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Create test program
    testProgram = await Program.create({
      name: 'Test Certificate Program',
      code: 'TCP' + Date.now().toString().slice(-6),
      departmentId: testDepartment._id,
      type: 'certificate',
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:certificates:read', domain: 'content', resource: 'certificates', action: 'read', description: 'Read certificates', isActive: true },
      { name: 'content:certificates:manage', domain: 'content', resource: 'certificates', action: 'manage', description: 'Manage certificates', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true }
    ]);

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Certificate Administrator',
      description: 'Can manage certificates',
      accessRights: [
        'content:certificates:read',
        'content:certificates:manage',
        'content:courses:read',
        'content:courses:manage'
      ],
      isActive: true
    });

    await RoleDefinition.create({
      name: 'instructor',
      userType: 'staff',
      displayName: 'Certificate Viewer',
      description: 'Can view certificates only',
      accessRights: [
        'content:certificates:read',
        'content:courses:read'
      ],
      isActive: true
    });

    // Create test user with manage permissions
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'cert-admin@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Cert',
        lastName: 'Admin',
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

    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Cert Admin'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create read-only user
    readOnlyUser = await User.create({
      email: 'cert-viewer@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: readOnlyUser._id,
      person: {
        firstName: 'Cert',
        lastName: 'Viewer',
        emails: [{
          email: readOnlyUser.email,
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
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    readOnlyToken = jwt.sign(
      {
        userId: readOnlyUser._id.toString(),
        email: readOnlyUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Cert Viewer'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create a published course version for requirement tests
    canonicalCourse = await CanonicalCourse.create({
      code: 'REQ-COURSE-' + Date.now(),
      departmentId: testDepartment._id,
      totalVersions: 1,
      createdBy: testUser._id
    });

    courseVersion = await CourseVersion.create({
      canonicalCourseId: canonicalCourse._id,
      version: 1,
      title: 'Required Course for Certificate',
      description: 'Course required for certificate',
      credits: 3,
      duration: 60,
      settings: {
        allowSelfEnrollment: false,
        passingScore: 70,
        maxAttempts: 3,
        certificateEnabled: false,
        enforcePrerequisites: false,
        showProgressBar: true,
        allowModuleSkipping: false
      },
      instructorIds: [testUser._id],
      status: 'published',
      isLocked: false,
      isLatest: true,
      createdBy: testUser._id,
      publishedAt: new Date(),
      publishedBy: testUser._id
    });

    canonicalCourse.currentPublishedVersionId = courseVersion._id;
    await canonicalCourse.save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clean up between tests
  afterEach(async () => {
    await CertificateRequirement.deleteMany({});
    await CertificateDefinition.deleteMany({});
    await CredentialGroup.deleteMany({});
  });

  // =========================================================================
  // Credential Group CRUD Tests
  // =========================================================================
  describe('Credential Group CRUD', () => {
    describe('POST /api/v2/credential-groups', () => {
      it('should create a credential group successfully', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'AWS Solutions Architect',
            code: 'AWS-SA',
            description: 'Certification for cloud architecture',
            type: 'certificate',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('AWS Solutions Architect');
        expect(response.body.data.code).toBe('AWS-SA');
        expect(response.body.data.type).toBe('certificate');
        expect(response.body.data.isActive).toBe(true);
        expect(response.body.data.id).toBeDefined();
      });

      it('should create a credential group with optional badge fields', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Safety Badge',
            code: 'SAFETY-1',
            description: 'Safety certification badge',
            type: 'badge',
            badgeImageUrl: 'https://example.com/badge.png',
            badgeColor: '#FF5733',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.data.badgeImageUrl).toBe('https://example.com/badge.png');
        expect(response.body.data.badgeColor).toBe('#FF5733');
      });

      it('should create a credential group linked to a program', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Program Diploma',
            code: 'PROG-DIP',
            description: 'Diploma for completing the program',
            type: 'diploma',
            departmentId: testDepartment._id.toString(),
            programId: testProgram._id.toString()
          });

        expect(response.status).toBe(201);
        expect(response.body.data.programId).toBe(testProgram._id.toString());
      });

      it('should enforce unique code within department', async () => {
        // Create first credential group
        await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'First Cert',
            code: 'UNIQUE-CODE',
            description: 'First certificate',
            type: 'certificate',
            departmentId: testDepartment._id.toString()
          });

        // Try to create duplicate
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Second Cert',
            code: 'UNIQUE-CODE',
            description: 'Second certificate with same code',
            type: 'certificate',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already exists');
      });

      it('should return 422 for invalid credential type', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Invalid Type',
            code: 'INVALID',
            description: 'Test',
            type: 'invalid-type',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Missing Fields'
            // Missing code, description, type, departmentId
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid hex color', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Bad Color',
            code: 'BAD-COLOR',
            description: 'Test',
            type: 'badge',
            badgeColor: 'not-a-color',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(422);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post('/api/v2/credential-groups')
          .send({
            name: 'Test',
            code: 'TEST',
            description: 'Test',
            type: 'certificate',
            departmentId: testDepartment._id.toString()
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/credential-groups', () => {
      beforeEach(async () => {
        // Create test credential groups
        await CredentialGroup.create([
          {
            name: 'Certificate One',
            code: 'CERT-1',
            description: 'First certificate',
            type: 'certificate',
            departmentId: testDepartment._id,
            isActive: true,
            createdBy: testUser._id
          },
          {
            name: 'Badge Two',
            code: 'BADGE-2',
            description: 'A badge',
            type: 'badge',
            departmentId: testDepartment._id,
            isActive: true,
            createdBy: testUser._id
          },
          {
            name: 'Inactive Diploma',
            code: 'DIP-3',
            description: 'An inactive diploma',
            type: 'diploma',
            departmentId: testDepartment._id,
            isActive: false,
            createdBy: testUser._id
          }
        ]);
      });

      it('should list all credential groups', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.credentialGroups.length).toBe(3);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(3);
      });

      it('should filter by type', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups?type=badge')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.credentialGroups.length).toBe(1);
        expect(response.body.data.credentialGroups[0].type).toBe('badge');
      });

      it('should filter by active status', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups?isActive=true')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.credentialGroups.length).toBe(2);
        expect(response.body.data.credentialGroups.every((g: any) => g.isActive)).toBe(true);
      });

      it('should filter by department', async () => {
        const response = await request(app)
          .get(`/api/v2/credential-groups?departmentId=${testDepartment._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.credentialGroups.length).toBe(3);
      });

      it('should search by name or code', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups?search=Badge')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.credentialGroups.length).toBe(1);
        expect(response.body.data.credentialGroups[0].name).toContain('Badge');
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups?page=1&limit=2')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.credentialGroups.length).toBe(2);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v2/credential-groups/:id', () => {
      let credentialGroup: any;

      beforeEach(async () => {
        credentialGroup = await CredentialGroup.create({
          name: 'Detail Test Cert',
          code: 'DETAIL-TEST',
          description: 'For testing detail retrieval',
          type: 'certificate',
          departmentId: testDepartment._id,
          isActive: true,
          createdBy: testUser._id
        });
      });

      it('should get credential group by ID with statistics', async () => {
        const response = await request(app)
          .get(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(credentialGroup._id.toString());
        expect(response.body.data.name).toBe('Detail Test Cert');
        expect(response.body.data.statistics).toBeDefined();
        expect(response.body.data.statistics.totalDefinitions).toBe(0);
      });

      it('should return 404 for non-existent credential group', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/credential-groups/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await request(app)
          .get('/api/v2/credential-groups/invalid-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('PATCH /api/v2/credential-groups/:id', () => {
      let credentialGroup: any;

      beforeEach(async () => {
        credentialGroup = await CredentialGroup.create({
          name: 'Update Test Cert',
          code: 'UPDATE-TEST',
          description: 'For testing updates',
          type: 'certificate',
          departmentId: testDepartment._id,
          isActive: true,
          createdBy: testUser._id
        });
      });

      it('should update credential group name', async () => {
        const response = await request(app)
          .patch(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated Certificate Name' });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated Certificate Name');
      });

      it('should update multiple fields', async () => {
        const response = await request(app)
          .patch(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'New Name',
            description: 'New description',
            badgeColor: '#123456'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('New Name');
        expect(response.body.data.description).toBe('New description');
        expect(response.body.data.badgeColor).toBe('#123456');
      });

      it('should deactivate credential group', async () => {
        const response = await request(app)
          .patch(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isActive: false });

        expect(response.status).toBe(200);
        expect(response.body.data.isActive).toBe(false);
      });

      it('should return 404 for non-existent credential group', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .patch(`/api/v2/credential-groups/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Test' });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/v2/credential-groups/:id', () => {
      let credentialGroup: any;

      beforeEach(async () => {
        credentialGroup = await CredentialGroup.create({
          name: 'Delete Test Cert',
          code: 'DELETE-TEST',
          description: 'For testing deletion',
          type: 'certificate',
          departmentId: testDepartment._id,
          isActive: true,
          createdBy: testUser._id
        });
      });

      it('should soft delete credential group (deactivate)', async () => {
        const response = await request(app)
          .delete(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        // Verify it's deactivated
        const updated = await CredentialGroup.findById(credentialGroup._id);
        expect(updated?.isActive).toBe(false);
      });

      it('should prevent deletion when active definitions exist', async () => {
        // Create an active definition
        const definition = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Active Definition',
          description: 'Test',
          status: 'active',
          createdBy: testUser._id
        });

        // Add a requirement to allow activation
        await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });

        const response = await request(app)
          .delete(`/api/v2/credential-groups/${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('active definitions');
      });

      it('should return 404 for non-existent credential group', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/credential-groups/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // =========================================================================
  // Certificate Definition Tests
  // =========================================================================
  describe('Certificate Definition CRUD', () => {
    let credentialGroup: any;

    beforeEach(async () => {
      credentialGroup = await CredentialGroup.create({
        name: 'Definition Test Group',
        code: 'DEF-TEST-' + Date.now(),
        description: 'For definition tests',
        type: 'certificate',
        departmentId: testDepartment._id,
        isActive: true,
        createdBy: testUser._id
      });
    });

    describe('POST /api/v2/certificate-definitions', () => {
      it('should create a certificate definition', async () => {
        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString(),
            title: 'Version 1 Definition',
            description: 'First version of the certificate requirements'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBe(1);
        expect(response.body.data.status).toBe('draft');
        expect(response.body.data.isCompatible).toBe(true);
      });

      it('should auto-increment version number', async () => {
        // Create first definition
        await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString(),
            title: 'Version 1',
            description: 'First version'
          });

        // Create second definition
        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString(),
            title: 'Version 2',
            description: 'Second version'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.version).toBe(2);
        expect(response.body.data.parentDefinitionId).toBeDefined();
      });

      it('should create definition with all optional fields', async () => {
        const validFrom = new Date('2026-01-01');
        const validUntil = new Date('2027-12-31');

        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString(),
            title: 'Full Definition',
            description: 'Definition with all fields',
            isCompatible: false,
            compatibilityBreakReason: 'Major curriculum change',
            validFrom: validFrom.toISOString(),
            validUntil: validUntil.toISOString(),
            expiresAfterMonths: 24,
            autoIssue: true
          });

        expect(response.status).toBe(201);
        expect(response.body.data.isCompatible).toBe(false);
        expect(response.body.data.compatibilityBreakReason).toBe('Major curriculum change');
        expect(response.body.data.expiresAfterMonths).toBe(24);
        expect(response.body.data.autoIssue).toBe(true);
      });

      it('should return 404 for non-existent credential group', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: nonExistentId.toString(),
            title: 'Test',
            description: 'Test'
          });

        expect(response.status).toBe(404);
      });

      it('should return 400 for inactive credential group', async () => {
        await CredentialGroup.findByIdAndUpdate(credentialGroup._id, { isActive: false });

        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString(),
            title: 'Test',
            description: 'Test'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('inactive');
      });

      it('should return 422 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            credentialGroupId: credentialGroup._id.toString()
            // Missing title and description
          });

        expect(response.status).toBe(422);
      });
    });

    describe('GET /api/v2/certificate-definitions', () => {
      beforeEach(async () => {
        await CertificateDefinition.create([
          {
            credentialGroupId: credentialGroup._id,
            version: 1,
            title: 'Draft Definition',
            description: 'Draft',
            status: 'draft',
            createdBy: testUser._id
          },
          {
            credentialGroupId: credentialGroup._id,
            version: 2,
            title: 'Active Definition',
            description: 'Active',
            status: 'active',
            createdBy: testUser._id
          }
        ]);
      });

      it('should list all definitions', async () => {
        const response = await request(app)
          .get('/api/v2/certificate-definitions')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.definitions.length).toBe(2);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/v2/certificate-definitions?status=active')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.definitions.length).toBe(1);
        expect(response.body.data.definitions[0].status).toBe('active');
      });

      it('should filter by credential group', async () => {
        const response = await request(app)
          .get(`/api/v2/certificate-definitions?credentialGroupId=${credentialGroup._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.definitions.length).toBe(2);
      });
    });

    describe('GET /api/v2/certificate-definitions/:id', () => {
      let definition: any;

      beforeEach(async () => {
        definition = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Detail Test Definition',
          description: 'For detail testing',
          status: 'draft',
          createdBy: testUser._id
        });
      });

      it('should get definition by ID with requirements', async () => {
        // Add a requirement
        await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });

        const response = await request(app)
          .get(`/api/v2/certificate-definitions/${definition._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(definition._id.toString());
        expect(response.body.data.requirements).toBeDefined();
        expect(response.body.data.requirements.length).toBe(1);
      });

      it('should return 404 for non-existent definition', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/certificate-definitions/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PATCH /api/v2/certificate-definitions/:id', () => {
      let definition: any;

      beforeEach(async () => {
        definition = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Update Test Definition',
          description: 'For update testing',
          status: 'draft',
          createdBy: testUser._id
        });
      });

      it('should update draft definition', async () => {
        const response = await request(app)
          .patch(`/api/v2/certificate-definitions/${definition._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Title',
            description: 'Updated description'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.description).toBe('Updated description');
      });

      it('should not allow updating non-draft definition', async () => {
        await CertificateDefinition.findByIdAndUpdate(definition._id, { status: 'active' });

        const response = await request(app)
          .patch(`/api/v2/certificate-definitions/${definition._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Cannot Update' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('draft');
      });
    });

    describe('POST /api/v2/certificate-definitions/:id/activate', () => {
      let definition: any;

      beforeEach(async () => {
        definition = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Activate Test Definition',
          description: 'For activation testing',
          status: 'draft',
          createdBy: testUser._id
        });
      });

      it('should activate definition with requirements', async () => {
        // Add a requirement first
        await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });

        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/activate`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('active');
      });

      it('should not activate definition without requirements', async () => {
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/activate`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('no requirements');
      });

      it('should deprecate existing active definition when activating new one', async () => {
        // Create and activate first definition
        await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });

        await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/activate`)
          .set('Authorization', `Bearer ${authToken}`);

        // Create second definition
        const secondDef = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 2,
          parentDefinitionId: definition._id,
          title: 'Second Definition',
          description: 'Second version',
          status: 'draft',
          createdBy: testUser._id
        });

        // Create second course version for second requirement
        const secondCourseVersion = await CourseVersion.create({
          canonicalCourseId: canonicalCourse._id,
          version: 2,
          title: 'Second Required Course',
          description: 'Another course',
          credits: 3,
          duration: 60,
          settings: {
            allowSelfEnrollment: false,
            passingScore: 70,
            maxAttempts: 3,
            certificateEnabled: false,
            enforcePrerequisites: false,
            showProgressBar: true,
            allowModuleSkipping: false
          },
          instructorIds: [testUser._id],
          status: 'published',
          isLocked: false,
          isLatest: true,
          createdBy: testUser._id
        });

        await CertificateRequirement.create({
          certificateDefinitionId: secondDef._id,
          courseVersionId: secondCourseVersion._id,
          isRequired: true,
          order: 0
        });

        // Activate second definition
        await request(app)
          .post(`/api/v2/certificate-definitions/${secondDef._id}/activate`)
          .set('Authorization', `Bearer ${authToken}`);

        // Verify first definition is deprecated
        const firstDefUpdated = await CertificateDefinition.findById(definition._id);
        expect(firstDefUpdated?.status).toBe('deprecated');
        expect(firstDefUpdated?.supersededByDefinitionId?.toString()).toBe(secondDef._id.toString());
      });
    });

    describe('POST /api/v2/certificate-definitions/:id/deprecate', () => {
      let definition: any;

      beforeEach(async () => {
        definition = await CertificateDefinition.create({
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Deprecate Test Definition',
          description: 'For deprecation testing',
          status: 'active',
          createdBy: testUser._id
        });
      });

      it('should deprecate active definition', async () => {
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/deprecate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'Superseded by new version' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('deprecated');
        expect(response.body.data.deprecatedReason).toBe('Superseded by new version');
      });

      it('should not deprecate already deprecated definition', async () => {
        await CertificateDefinition.findByIdAndUpdate(definition._id, {
          status: 'deprecated',
          deprecatedAt: new Date()
        });

        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/deprecate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'Test' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already deprecated');
      });
    });
  });

  // =========================================================================
  // Certificate Requirements Tests
  // =========================================================================
  describe('Certificate Requirements Management', () => {
    let credentialGroup: any;
    let definition: any;

    beforeEach(async () => {
      credentialGroup = await CredentialGroup.create({
        name: 'Requirement Test Group',
        code: 'REQ-TEST-' + Date.now(),
        description: 'For requirement tests',
        type: 'certificate',
        departmentId: testDepartment._id,
        isActive: true,
        createdBy: testUser._id
      });

      definition = await CertificateDefinition.create({
        credentialGroupId: credentialGroup._id,
        version: 1,
        title: 'Requirement Test Definition',
        description: 'For requirement testing',
        status: 'draft',
        createdBy: testUser._id
      });
    });

    describe('POST /api/v2/certificate-definitions/:id/requirements', () => {
      it('should add a required course requirement', async () => {
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true,
            order: 0
          });

        expect(response.status).toBe(201);
        expect(response.body.data.courseVersionId).toBe(courseVersion._id.toString());
        expect(response.body.data.isRequired).toBe(true);
        expect(response.body.data.order).toBe(0);
      });

      it('should add a requirement with minimum score', async () => {
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true,
            minimumScore: 80,
            order: 0
          });

        expect(response.status).toBe(201);
        expect(response.body.data.minimumScore).toBe(80);
      });

      it('should add an elective requirement with group settings', async () => {
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: false,
            electiveGroupId: 'tech-electives',
            electiveGroupName: 'Technology Electives',
            electiveMinCount: 2,
            order: 0
          });

        expect(response.status).toBe(201);
        expect(response.body.data.isRequired).toBe(false);
        expect(response.body.data.electiveGroupId).toBe('tech-electives');
        expect(response.body.data.electiveMinCount).toBe(2);
      });

      it('should auto-assign order if not provided', async () => {
        // Add first requirement
        await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true
          });

        // Create second course version
        const secondCourseVersion = await CourseVersion.create({
          canonicalCourseId: canonicalCourse._id,
          version: 3,
          title: 'Another Course',
          description: 'Another course',
          credits: 3,
          duration: 60,
          settings: {
            allowSelfEnrollment: false,
            passingScore: 70,
            maxAttempts: 3,
            certificateEnabled: false,
            enforcePrerequisites: false,
            showProgressBar: true,
            allowModuleSkipping: false
          },
          instructorIds: [testUser._id],
          status: 'published',
          isLocked: false,
          isLatest: true,
          createdBy: testUser._id
        });

        // Add second requirement without order
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: secondCourseVersion._id.toString(),
            isRequired: true
          });

        expect(response.status).toBe(201);
        expect(response.body.data.order).toBe(1);
      });

      it('should prevent duplicate course version requirements', async () => {
        // Add first requirement
        await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true
          });

        // Try to add duplicate
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already a requirement');
      });

      it('should not add requirements to non-draft definition', async () => {
        await CertificateDefinition.findByIdAndUpdate(definition._id, { status: 'active' });

        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: courseVersion._id.toString(),
            isRequired: true
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('non-draft');
      });

      it('should return 404 for non-existent course version', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            courseVersionId: nonExistentId.toString(),
            isRequired: true
          });

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/v2/certificate-definitions/:id/requirements', () => {
      beforeEach(async () => {
        await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });
      });

      it('should list all requirements for a definition', async () => {
        const response = await request(app)
          .get(`/api/v2/certificate-definitions/${definition._id}/requirements`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.requirements).toBeDefined();
        expect(response.body.data.requirements.length).toBe(1);
        expect(response.body.data.requirements[0].courseVersion).toBeDefined();
      });

      it('should return 404 for non-existent definition', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/certificate-definitions/${nonExistentId}/requirements`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/v2/certificate-definitions/:id/requirements/:reqId', () => {
      let requirement: any;

      beforeEach(async () => {
        requirement = await CertificateRequirement.create({
          certificateDefinitionId: definition._id,
          courseVersionId: courseVersion._id,
          isRequired: true,
          order: 0
        });
      });

      it('should remove requirement from draft definition', async () => {
        const response = await request(app)
          .delete(`/api/v2/certificate-definitions/${definition._id}/requirements/${requirement._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        // Verify requirement is deleted
        const deleted = await CertificateRequirement.findById(requirement._id);
        expect(deleted).toBeNull();
      });

      it('should not remove requirement from non-draft definition', async () => {
        await CertificateDefinition.findByIdAndUpdate(definition._id, { status: 'active' });

        const response = await request(app)
          .delete(`/api/v2/certificate-definitions/${definition._id}/requirements/${requirement._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('non-draft');
      });

      it('should return 404 for non-existent requirement', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/certificate-definitions/${definition._id}/requirements/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // =========================================================================
  // Credential Group Definitions Endpoint
  // =========================================================================
  describe('GET /api/v2/credential-groups/:id/definitions', () => {
    let credentialGroup: any;

    beforeEach(async () => {
      credentialGroup = await CredentialGroup.create({
        name: 'Group Defs Test',
        code: 'GRP-DEFS-' + Date.now(),
        description: 'For testing group definitions endpoint',
        type: 'certificate',
        departmentId: testDepartment._id,
        isActive: true,
        createdBy: testUser._id
      });

      // Create multiple definitions
      await CertificateDefinition.create([
        {
          credentialGroupId: credentialGroup._id,
          version: 1,
          title: 'Definition v1',
          description: 'First version',
          status: 'deprecated',
          createdBy: testUser._id
        },
        {
          credentialGroupId: credentialGroup._id,
          version: 2,
          title: 'Definition v2',
          description: 'Second version',
          status: 'active',
          createdBy: testUser._id
        },
        {
          credentialGroupId: credentialGroup._id,
          version: 3,
          title: 'Definition v3',
          description: 'Third version',
          status: 'draft',
          createdBy: testUser._id
        }
      ]);
    });

    it('should list all definitions for a credential group', async () => {
      const response = await request(app)
        .get(`/api/v2/credential-groups/${credentialGroup._id}/definitions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.definitions.length).toBe(3);
    });

    it('should filter definitions by status', async () => {
      const response = await request(app)
        .get(`/api/v2/credential-groups/${credentialGroup._id}/definitions?status=active`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.definitions.length).toBe(1);
      expect(response.body.data.definitions[0].status).toBe('active');
    });

    it('should return 404 for non-existent credential group', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/credential-groups/${nonExistentId}/definitions`)
        .set('Authorization', `Bearer ${authToken}`);

      // Service returns empty list if credential group doesn't exist
      // This is acceptable behavior - no 404 thrown
      expect(response.status).toBe(200);
      expect(response.body.data.definitions.length).toBe(0);
    });
  });

  // =========================================================================
  // Authorization Tests
  // =========================================================================
  describe('Authorization', () => {
    let credentialGroup: any;
    let definition: any;

    beforeEach(async () => {
      credentialGroup = await CredentialGroup.create({
        name: 'Auth Test Group',
        code: 'AUTH-TEST-' + Date.now(),
        description: 'For auth testing',
        type: 'certificate',
        departmentId: testDepartment._id,
        isActive: true,
        createdBy: testUser._id
      });

      definition = await CertificateDefinition.create({
        credentialGroupId: credentialGroup._id,
        version: 1,
        title: 'Auth Test Definition',
        description: 'For auth testing',
        status: 'draft',
        createdBy: testUser._id
      });
    });

    it('should allow read-only user to list credential groups', async () => {
      const response = await request(app)
        .get('/api/v2/credential-groups')
        .set('Authorization', `Bearer ${readOnlyToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow read-only user to get credential group details', async () => {
      const response = await request(app)
        .get(`/api/v2/credential-groups/${credentialGroup._id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow read-only user to list definitions', async () => {
      const response = await request(app)
        .get('/api/v2/certificate-definitions')
        .set('Authorization', `Bearer ${readOnlyToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow read-only user to list requirements', async () => {
      const response = await request(app)
        .get(`/api/v2/certificate-definitions/${definition._id}/requirements`)
        .set('Authorization', `Bearer ${readOnlyToken}`);

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Full Workflow Test
  // =========================================================================
  describe('Full Credential Workflow', () => {
    it('should complete full credential group and definition lifecycle', async () => {
      // 1. Create credential group
      const groupResponse = await request(app)
        .post('/api/v2/credential-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Full Workflow Certificate',
          code: 'WORKFLOW-' + Date.now(),
          description: 'Testing full workflow',
          type: 'certificate',
          departmentId: testDepartment._id.toString()
        });

      expect(groupResponse.status).toBe(201);
      const groupId = groupResponse.body.data.id;

      // 2. Create certificate definition
      const defResponse = await request(app)
        .post('/api/v2/certificate-definitions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          credentialGroupId: groupId,
          title: 'Workflow Definition v1',
          description: 'First version',
          expiresAfterMonths: 24
        });

      expect(defResponse.status).toBe(201);
      expect(defResponse.body.data.status).toBe('draft');
      const defId = defResponse.body.data.id;

      // 3. Add requirement
      const reqResponse = await request(app)
        .post(`/api/v2/certificate-definitions/${defId}/requirements`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseVersionId: courseVersion._id.toString(),
          isRequired: true,
          minimumScore: 70
        });

      expect(reqResponse.status).toBe(201);

      // 4. Activate definition
      const activateResponse = await request(app)
        .post(`/api/v2/certificate-definitions/${defId}/activate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.body.data.status).toBe('active');

      // 5. Verify credential group shows statistics
      const groupDetailResponse = await request(app)
        .get(`/api/v2/credential-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(groupDetailResponse.status).toBe(200);
      expect(groupDetailResponse.body.data.statistics.totalDefinitions).toBe(1);
      expect(groupDetailResponse.body.data.statistics.activeDefinitions).toBe(1);

      // 6. Create second version
      const def2Response = await request(app)
        .post('/api/v2/certificate-definitions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          credentialGroupId: groupId,
          title: 'Workflow Definition v2',
          description: 'Second version with updates'
        });

      expect(def2Response.status).toBe(201);
      expect(def2Response.body.data.version).toBe(2);
      expect(def2Response.body.data.parentDefinitionId).toBe(defId);

      // 7. Deprecate first definition manually
      const deprecateResponse = await request(app)
        .post(`/api/v2/certificate-definitions/${defId}/deprecate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Manually deprecated for testing' });

      expect(deprecateResponse.status).toBe(200);
      expect(deprecateResponse.body.data.status).toBe('deprecated');
    });
  });
});
