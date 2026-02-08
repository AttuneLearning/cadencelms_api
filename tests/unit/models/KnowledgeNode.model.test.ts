import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import KnowledgeNode from '@/models/content/KnowledgeNode.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('KnowledgeNode Model', () => {
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
    await KnowledgeNode.deleteMany({});
  });

  const createNode = (overrides: any = {}) => {
    return KnowledgeNode.create({
      departmentId: new mongoose.Types.ObjectId(),
      name: 'Algebra Basics',
      slug: 'algebra-basics',
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
      ...overrides
    });
  };

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid knowledge node with required fields', async () => {
      const deptId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const node = await createNode({
        departmentId: deptId,
        name: 'Algebra Basics',
        slug: 'algebra-basics',
        createdBy: userId,
        updatedBy: userId
      });

      expect(node.departmentId).toEqual(deptId);
      expect(node.name).toBe('Algebra Basics');
      expect(node.slug).toBe('algebra-basics');
      expect(node.createdBy).toEqual(userId);
      expect(node.updatedBy).toEqual(userId);
    });

    it('should require departmentId', async () => {
      const node = new KnowledgeNode({
        name: 'Test Node',
        slug: 'test-node',
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.save()).rejects.toThrow(/Department ID is required/);
    });

    it('should require name', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        slug: 'test-node',
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.save()).rejects.toThrow(/Name is required/);
    });

    it('should require slug', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.save()).rejects.toThrow(/Slug is required/);
    });

    it('should require createdBy', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        slug: 'test-node',
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.save()).rejects.toThrow(/Created by is required/);
    });

    it('should require updatedBy', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        slug: 'test-node',
        createdBy: new mongoose.Types.ObjectId()
      });

      await expect(node.save()).rejects.toThrow(/Updated by is required/);
    });
  });

  describe('Field Constraints', () => {
    it('should enforce name maxlength of 200', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'A'.repeat(201),
        slug: 'test-node',
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.validate()).rejects.toThrow(/Name must not exceed 200 characters/);
    });

    it('should allow name at exactly 200 characters', async () => {
      const node = await createNode({ name: 'A'.repeat(200) });
      expect(node.name).toHaveLength(200);
    });

    it('should enforce slug maxlength of 100', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        slug: 'a'.repeat(101),
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.validate()).rejects.toThrow(/Slug must not exceed 100 characters/);
    });

    it('should enforce slug lowercase alphanumeric with hyphens only', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        slug: 'Invalid Slug!',
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.validate()).rejects.toThrow(/Slug must be lowercase alphanumeric with hyphens only/);
    });

    it('should accept valid slug with lowercase and hyphens', async () => {
      const node = await createNode({ slug: 'valid-slug-123' });
      expect(node.slug).toBe('valid-slug-123');
    });

    it('should convert slug to lowercase', async () => {
      const node = await createNode({ slug: 'UPPERCASE' });
      expect(node.slug).toBe('uppercase');
    });

    it('should enforce description maxlength of 2000', async () => {
      const node = new KnowledgeNode({
        departmentId: new mongoose.Types.ObjectId(),
        name: 'Test Node',
        slug: 'test-node',
        description: 'A'.repeat(2001),
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId()
      });

      await expect(node.validate()).rejects.toThrow(/Description must not exceed 2000 characters/);
    });

    it('should allow description at exactly 2000 characters', async () => {
      const node = await createNode({ description: 'A'.repeat(2000) });
      expect(node.description).toHaveLength(2000);
    });

    it('should trim name whitespace', async () => {
      const node = await createNode({ name: '  Trimmed Name  ' });
      expect(node.name).toBe('Trimmed Name');
    });

    it('should trim slug whitespace', async () => {
      const node = await createNode({ slug: '  trimmed-slug  ' });
      expect(node.slug).toBe('trimmed-slug');
    });

    it('should trim description whitespace', async () => {
      const node = await createNode({ description: '  Some description  ' });
      expect(node.description).toBe('Some description');
    });
  });

  describe('Default Values', () => {
    it('should default depthRange to {min: "exposure", max: "mastery"}', async () => {
      const node = await createNode();
      expect(node.depthRange.min).toBe('exposure');
      expect(node.depthRange.max).toBe('mastery');
    });

    it('should default tags to empty array', async () => {
      const node = await createNode();
      expect(node.tags).toEqual([]);
    });

    it('should default isActive to true', async () => {
      const node = await createNode();
      expect(node.isActive).toBe(true);
    });

    it('should default parentNodeId to null', async () => {
      const node = await createNode();
      expect(node.parentNodeId).toBeNull();
    });

    it('should default prerequisiteNodeIds to empty array', async () => {
      const node = await createNode();
      expect(node.prerequisiteNodeIds).toEqual([]);
    });

    it('should default relatedNodeIds to empty array', async () => {
      const node = await createNode();
      expect(node.relatedNodeIds).toEqual([]);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const node = await createNode({ description: 'Covers fundamental algebraic concepts' });
      expect(node.description).toBe('Covers fundamental algebraic concepts');
    });

    it('should store tags', async () => {
      const node = await createNode({ tags: ['math', 'algebra', 'basics'] });
      expect(node.tags).toHaveLength(3);
      expect(node.tags).toContain('math');
      expect(node.tags).toContain('algebra');
    });

    it('should store parentNodeId', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const node = await createNode({ parentNodeId: parentId });
      expect(node.parentNodeId).toEqual(parentId);
    });

    it('should store prerequisiteNodeIds', async () => {
      const prereqIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
      const node = await createNode({ prerequisiteNodeIds: prereqIds });
      expect(node.prerequisiteNodeIds).toHaveLength(2);
      expect(node.prerequisiteNodeIds[0]).toEqual(prereqIds[0]);
      expect(node.prerequisiteNodeIds[1]).toEqual(prereqIds[1]);
    });

    it('should store relatedNodeIds', async () => {
      const relatedIds = [new mongoose.Types.ObjectId()];
      const node = await createNode({ relatedNodeIds: relatedIds });
      expect(node.relatedNodeIds).toHaveLength(1);
      expect(node.relatedNodeIds[0]).toEqual(relatedIds[0]);
    });

    it('should store custom depthRange values', async () => {
      const node = await createNode({
        depthRange: { min: 'recall', max: 'analysis' }
      });
      expect(node.depthRange.min).toBe('recall');
      expect(node.depthRange.max).toBe('analysis');
    });

    it('should set isActive to false', async () => {
      const node = await createNode({ isActive: false });
      expect(node.isActive).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const node = await createNode();
      expect(node.createdAt).toBeDefined();
      expect(node.createdAt).toBeInstanceOf(Date);
      expect(node.updatedAt).toBeDefined();
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it('should have timestamps close to current time', async () => {
      const before = new Date();
      const node = await createNode();
      const after = new Date();

      expect(node.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(node.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Compound Unique Index (departmentId + slug)', () => {
    it('should allow same slug in different departments', async () => {
      const dept1 = new mongoose.Types.ObjectId();
      const dept2 = new mongoose.Types.ObjectId();

      await createNode({ departmentId: dept1, slug: 'shared-slug' });
      const node2 = await createNode({ departmentId: dept2, slug: 'shared-slug' });

      expect(node2.slug).toBe('shared-slug');
    });

    it('should reject duplicate slug within same department', async () => {
      const deptId = new mongoose.Types.ObjectId();

      await createNode({ departmentId: deptId, slug: 'unique-slug' });

      await expect(
        createNode({ departmentId: deptId, slug: 'unique-slug' })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different slugs in the same department', async () => {
      const deptId = new mongoose.Types.ObjectId();

      await createNode({ departmentId: deptId, slug: 'slug-one' });
      const node2 = await createNode({ departmentId: deptId, slug: 'slug-two' });

      expect(node2.slug).toBe('slug-two');
    });
  });

  describe('Queries', () => {
    it('should find nodes by departmentId', async () => {
      const deptId = new mongoose.Types.ObjectId();
      await createNode({ departmentId: deptId, slug: 'node-1' });
      await createNode({ departmentId: deptId, slug: 'node-2' });
      await createNode({ departmentId: new mongoose.Types.ObjectId(), slug: 'node-3' });

      const nodes = await KnowledgeNode.find({ departmentId: deptId });
      expect(nodes).toHaveLength(2);
    });

    it('should find active nodes', async () => {
      const deptId = new mongoose.Types.ObjectId();
      await createNode({ departmentId: deptId, slug: 'active-node', isActive: true });
      await createNode({ departmentId: deptId, slug: 'inactive-node', isActive: false });

      const activeNodes = await KnowledgeNode.find({ departmentId: deptId, isActive: true });
      expect(activeNodes).toHaveLength(1);
      expect(activeNodes[0].slug).toBe('active-node');
    });

    it('should find children of a parent node', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();

      await createNode({ departmentId: deptId, slug: 'child-1', parentNodeId: parentId });
      await createNode({ departmentId: deptId, slug: 'child-2', parentNodeId: parentId });
      await createNode({ departmentId: deptId, slug: 'orphan' });

      const children = await KnowledgeNode.find({ parentNodeId: parentId });
      expect(children).toHaveLength(2);
    });
  });
});
