import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '@/models/organization/Department.model';

describe('Department Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid department with required fields', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering Department',
        isActive: true
      });

      expect(dept.name).toBe('Engineering');
      expect(dept.code).toBe('ENG');
      expect(dept.description).toBe('Engineering Department');
      expect(dept.isActive).toBe(true);
      expect(dept.parentDepartmentId).toBeUndefined();
      expect(dept.level).toBe(0);
      expect(dept.path).toHaveLength(1);
      expect(dept.path[0]).toEqual(dept._id);
    });

    it('should require name field', async () => {
      const dept = new Department({
        code: 'ENG'
      });

      await expect(dept.save()).rejects.toThrow(/name/);
    });

    it('should require code field', async () => {
      const dept = new Department({
        name: 'Engineering'
      });

      await expect(dept.save()).rejects.toThrow(/code/);
    });

    it('should enforce unique code', async () => {
      await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      await expect(
        Department.create({
          name: 'Engineering 2',
          code: 'ENG'
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should convert code to uppercase', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'eng'
      });

      expect(dept.code).toBe('ENG');
    });

    it('should trim whitespace from name and code', async () => {
      const dept = await Department.create({
        name: '  Engineering  ',
        code: '  eng  '
      });

      expect(dept.name).toBe('Engineering');
      expect(dept.code).toBe('ENG');
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create a root department with level 0', async () => {
      const root = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(root.level).toBe(0);
      expect(root.path).toHaveLength(1);
      expect(root.path[0]).toEqual(root._id);
    });

    it('should create a child department with correct level and path', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const child = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      expect(child.level).toBe(1);
      expect(child.path).toHaveLength(2);
      expect(child.path[0]).toEqual(parent._id);
      expect(child.path[1]).toEqual(child._id);
      expect(child.parentDepartmentId).toEqual(parent._id);
    });

    it('should create a grandchild department with correct level and path', async () => {
      const grandparent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const parent = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: grandparent._id
      });

      const child = await Department.create({
        name: 'Software Engineering',
        code: 'SE',
        parentDepartmentId: parent._id
      });

      expect(child.level).toBe(2);
      expect(child.path).toHaveLength(3);
      expect(child.path[0]).toEqual(grandparent._id);
      expect(child.path[1]).toEqual(parent._id);
      expect(child.path[2]).toEqual(child._id);
    });

    it('should handle multiple children of same parent', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const child1 = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      const child2 = await Department.create({
        name: 'Mechanical Engineering',
        code: 'ME',
        parentDepartmentId: parent._id
      });

      expect(child1.level).toBe(1);
      expect(child2.level).toBe(1);
      expect(child1.path[0]).toEqual(parent._id);
      expect(child2.path[0]).toEqual(parent._id);
    });
  });

  describe('Metadata Fields', () => {
    it('should set default isActive to true', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        isActive: false
      });

      expect(dept.isActive).toBe(false);
    });

    it('should store metadata', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        metadata: {
          color: '#FF0000',
          icon: 'engineering'
        }
      });

      expect(dept.metadata).toEqual({
        color: '#FF0000',
        icon: 'engineering'
      });
    });

    it('should auto-generate timestamps', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.createdAt).toBeDefined();
      expect(dept.updatedAt).toBeDefined();
      expect(dept.createdAt).toBeInstanceOf(Date);
      expect(dept.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Query Methods', () => {
    it('should find active departments', async () => {
      await Department.create({
        name: 'Active Dept',
        code: 'ACT',
        isActive: true
      });

      await Department.create({
        name: 'Inactive Dept',
        code: 'INACT',
        isActive: false
      });

      const active = await Department.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Dept');
    });

    it('should find by code', async () => {
      await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const dept = await Department.findOne({ code: 'ENG' });
      expect(dept).toBeDefined();
      expect(dept!.name).toBe('Engineering');
    });

    it('should find children of a department', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      await Department.create({
        name: 'CS',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      await Department.create({
        name: 'ME',
        code: 'ME',
        parentDepartmentId: parent._id
      });

      const children = await Department.find({ parentDepartmentId: parent._id });
      expect(children).toHaveLength(2);
    });
  });
});
