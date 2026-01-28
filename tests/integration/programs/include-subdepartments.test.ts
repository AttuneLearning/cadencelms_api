import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Program from '@/models/academic/Program.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('GET /api/v2/programs - includeSubdepartments', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let parentDept: any;
  let childDept: any;
  let grandchildDept: any;
  let parentProgram: any;
  let childProgram: any;
  let grandchildProgram: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create department hierarchy: Parent -> Child -> Grandchild
    parentDept = await Department.create({
      name: 'Parent Department',
      code: 'PARENT' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    childDept = await Department.create({
      name: 'Child Department',
      code: 'CHILD' + Date.now(),
      parentDepartmentId: parentDept._id,
      level: 1,
      path: [parentDept._id],
      isActive: true
    });

    grandchildDept = await Department.create({
      name: 'Grandchild Department',
      code: 'GCHILD' + Date.now(),
      parentDepartmentId: childDept._id,
      level: 2,
      path: [parentDept._id, childDept._id],
      isActive: true
    });

    // Refresh department cache after creating departments
    await refreshDepartmentCache();

    // Seed role definition for department-admin
    await RoleDefinition.create({
      name: 'department-admin',
      userType: 'staff',
      displayName: 'Department Administrator',
      description: 'Can manage department content and programs',
      accessRights: ['content:programs:read', 'content:programs:manage', 'content:courses:read'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:programs:read', domain: 'content', resource: 'programs', action: 'read', description: 'Read programs', isActive: true },
      { name: 'content:programs:manage', domain: 'content', resource: 'programs', action: 'manage', description: 'Manage programs', isActive: true },
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true }
    ]);

    // Create a staff user with department-admin role
    const hashedPassword = await hashPassword('SecurePass123!');
    const userId = new mongoose.Types.ObjectId();

    await User.create({
      _id: userId,
      email: 'programs-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true,
      accessRights: []
    });

    await Staff.create({
      _id: userId,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{
          email: 'programs-test@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: parentDept._id,
        roles: ['department-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }],
      isActive: true
    });

    // Generate JWT token with new authorization format
    // Note: The actual authorization uses departmentRights computed from database
    // via roleCache.getCombinedAccessRights(), not from the JWT token
    authToken = jwt.sign(
      {
        userId: userId.toString(),
        email: 'programs-test@example.com',
        type: 'access',
        roles: ['department-admin'],
        globalRights: [],
        departmentRights: {
          [parentDept._id.toString()]: ['content:programs:read', 'content:programs:manage', 'content:courses:read']
        },
        departmentMemberships: [{ departmentId: parentDept._id.toString() }]
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
    // Create programs in each department
    parentProgram = await Program.create({
      name: 'Parent Program',
      code: 'PPROG' + Date.now(),
      departmentId: parentDept._id,
      type: 'certificate'
    });

    childProgram = await Program.create({
      name: 'Child Program',
      code: 'CPROG' + Date.now(),
      departmentId: childDept._id,
      type: 'certificate'
    });

    grandchildProgram = await Program.create({
      name: 'Grandchild Program',
      code: 'GPROG' + Date.now(),
      departmentId: grandchildDept._id,
      type: 'certificate'
    });
  });

  afterEach(async () => {
    await Program.deleteMany({ code: /^(PPROG|CPROG|GPROG)/ });
  });

  describe('includeSubdepartments=false (default)', () => {
    it('should return only programs from specified department', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.programs).toHaveLength(1);
      expect(response.body.data.programs[0].name).toBe('Parent Program');
    });

    it('should return only programs from specified department when explicitly false', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}&includeSubdepartments=false`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.programs).toHaveLength(1);
    });
  });

  describe('includeSubdepartments=true', () => {
    it('should return programs from department and all subdepartments', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}&includeSubdepartments=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.programs).toHaveLength(3);

      const programNames = response.body.data.programs.map((p: any) => p.name);
      expect(programNames).toContain('Parent Program');
      expect(programNames).toContain('Child Program');
      expect(programNames).toContain('Grandchild Program');
    });

    it('should return programs from child department and its subdepartments', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${childDept._id}&includeSubdepartments=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.programs).toHaveLength(2);

      const programNames = response.body.data.programs.map((p: any) => p.name);
      expect(programNames).toContain('Child Program');
      expect(programNames).toContain('Grandchild Program');
      expect(programNames).not.toContain('Parent Program');
    });

    it('should return only leaf department program when no subdepartments exist', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${grandchildDept._id}&includeSubdepartments=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.programs).toHaveLength(1);
      expect(response.body.data.programs[0].name).toBe('Grandchild Program');
    });

    it('should include department.level in response', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}&includeSubdepartments=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const programs = response.body.data.programs;
      for (const program of programs) {
        expect(program.department).toHaveProperty('level');
        expect(typeof program.department.level).toBe('number');
      }

      // Verify levels match hierarchy
      const parentProg = programs.find((p: any) => p.name === 'Parent Program');
      const childProg = programs.find((p: any) => p.name === 'Child Program');
      const grandchildProg = programs.find((p: any) => p.name === 'Grandchild Program');

      expect(parentProg.department.level).toBe(1); // 0-indexed converted to 1-indexed
      expect(childProg.department.level).toBe(2);
      expect(grandchildProg.department.level).toBe(3);
    });
  });

  describe('pagination with includeSubdepartments', () => {
    it('should paginate combined results correctly', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}&includeSubdepartments=true&limit=2&page=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.programs).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNext).toBe(true);
    });

    it('should return remaining results on subsequent pages', async () => {
      const response = await request(app)
        .get(`/api/v2/programs?department=${parentDept._id}&includeSubdepartments=true&limit=2&page=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.programs).toHaveLength(1);
      expect(response.body.data.pagination.hasPrev).toBe(true);
      expect(response.body.data.pagination.hasNext).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should ignore includeSubdepartments when department is not specified', async () => {
      const response = await request(app)
        .get('/api/v2/programs?includeSubdepartments=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should return all programs without filtering
      expect(response.body.data.programs.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 for invalid department ID', async () => {
      const response = await request(app)
        .get('/api/v2/programs?department=invalid-id&includeSubdepartments=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
