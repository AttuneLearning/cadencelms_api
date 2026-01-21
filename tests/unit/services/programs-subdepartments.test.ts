import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the department hierarchy utility before importing service
jest.mock('@/utils/departmentHierarchy', () => ({
  getDepartmentAndSubdepartments: jest.fn()
}));

import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';
import { ProgramsService } from '@/services/academic/programs.service';
import Program from '@/models/academic/Program.model';
import Department from '@/models/organization/Department.model';

const mockedGetDepartmentAndSubdepartments = getDepartmentAndSubdepartments as jest.MockedFunction<typeof getDepartmentAndSubdepartments>;

describe('ProgramsService.listPrograms - includeSubdepartments', () => {
  let mongoServer: MongoMemoryServer;
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear mock
    mockedGetDepartmentAndSubdepartments.mockReset();

    // Create department hierarchy
    parentDept = await Department.create({
      name: 'Parent Dept',
      code: 'PDEPT' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    childDept = await Department.create({
      name: 'Child Dept',
      code: 'CDEPT' + Date.now(),
      parentDepartmentId: parentDept._id,
      level: 1,
      path: [parentDept._id],
      isActive: true
    });

    grandchildDept = await Department.create({
      name: 'Grandchild Dept',
      code: 'GDEPT' + Date.now(),
      parentDepartmentId: childDept._id,
      level: 2,
      path: [parentDept._id, childDept._id],
      isActive: true
    });

    // Create programs
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
    await Program.deleteMany({});
    await Department.deleteMany({});
  });

  describe('includeSubdepartments=false (default)', () => {
    it('should return only programs from specified department', async () => {
      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: false
      }, 'test-user');

      expect(result.programs).toHaveLength(1);
      expect(result.programs[0].name).toBe('Parent Program');
    });

    it('should not call getDepartmentAndSubdepartments', async () => {
      await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: false
      }, 'test-user');

      expect(mockedGetDepartmentAndSubdepartments).not.toHaveBeenCalled();
    });
  });

  describe('includeSubdepartments=true', () => {
    it('should return programs from department and all subdepartments', async () => {
      // Mock the hierarchy function to return all department IDs
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        parentDept._id.toString(),
        childDept._id.toString(),
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: true
      }, 'test-user');

      expect(mockedGetDepartmentAndSubdepartments).toHaveBeenCalledWith(parentDept._id.toString());
      expect(result.programs).toHaveLength(3);

      const programNames = result.programs.map((p: any) => p.name);
      expect(programNames).toContain('Parent Program');
      expect(programNames).toContain('Child Program');
      expect(programNames).toContain('Grandchild Program');
    });

    it('should return programs from child department and its subdepartments', async () => {
      // Mock to return child and grandchild only
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        childDept._id.toString(),
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: childDept._id.toString(),
        includeSubdepartments: true
      }, 'test-user');

      expect(result.programs).toHaveLength(2);

      const programNames = result.programs.map((p: any) => p.name);
      expect(programNames).toContain('Child Program');
      expect(programNames).toContain('Grandchild Program');
      expect(programNames).not.toContain('Parent Program');
    });

    it('should return only leaf program when no subdepartments', async () => {
      // Mock to return only grandchild (leaf department)
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: grandchildDept._id.toString(),
        includeSubdepartments: true
      }, 'test-user');

      expect(result.programs).toHaveLength(1);
      expect(result.programs[0].name).toBe('Grandchild Program');
    });
  });

  describe('department.level in response', () => {
    it('should include department.level in response (1-indexed)', async () => {
      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: false
      }, 'test-user');

      expect(result.programs[0].department.level).toBe(1); // 0-indexed + 1
    });

    it('should have correct level for each department in hierarchy', async () => {
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        parentDept._id.toString(),
        childDept._id.toString(),
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: true
      }, 'test-user');

      const parentProg = result.programs.find((p: any) => p.name === 'Parent Program');
      const childProg = result.programs.find((p: any) => p.name === 'Child Program');
      const grandchildProg = result.programs.find((p: any) => p.name === 'Grandchild Program');

      expect(parentProg.department.level).toBe(1);
      expect(childProg.department.level).toBe(2);
      expect(grandchildProg.department.level).toBe(3);
    });
  });

  describe('pagination with includeSubdepartments', () => {
    it('should paginate combined results correctly', async () => {
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        parentDept._id.toString(),
        childDept._id.toString(),
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: true,
        limit: 2,
        page: 1
      }, 'test-user');

      expect(result.programs).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should return remaining results on page 2', async () => {
      mockedGetDepartmentAndSubdepartments.mockResolvedValue([
        parentDept._id.toString(),
        childDept._id.toString(),
        grandchildDept._id.toString()
      ]);

      const result = await ProgramsService.listPrograms({
        department: parentDept._id.toString(),
        includeSubdepartments: true,
        limit: 2,
        page: 2
      }, 'test-user');

      expect(result.programs).toHaveLength(1);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid department ID', async () => {
      await expect(
        ProgramsService.listPrograms({
          department: 'invalid-id',
          includeSubdepartments: true
        }, 'test-user')
      ).rejects.toThrow('Invalid department ID');
    });
  });
});
