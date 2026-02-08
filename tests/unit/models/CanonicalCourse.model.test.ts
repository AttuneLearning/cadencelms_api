import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CanonicalCourse Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDeptId: mongoose.Types.ObjectId;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    testDeptId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await CanonicalCourse.deleteMany({});
  });

  const validData = () => ({
    code: 'CS101',
    departmentId: testDeptId,
    createdBy: testUserId
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid canonical course', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.code).toBe('CS101');
      expect(doc.departmentId).toEqual(testDeptId);
      expect(doc.createdBy).toEqual(testUserId);
      expect(doc.currentPublishedVersionId).toBeNull();
      expect(doc.latestDraftVersionId).toBeNull();
      expect(doc.totalVersions).toBe(0);
      expect(doc.programId).toBeNull();
    });

    it('should fail without code', async () => {
      const data = validData();
      delete (data as any).code;
      await expect(CanonicalCourse.create(data)).rejects.toThrow(/Course code is required/);
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(CanonicalCourse.create(data)).rejects.toThrow(/Department is required/);
    });

    it('should fail without createdBy', async () => {
      const data = validData();
      delete (data as any).createdBy;
      await expect(CanonicalCourse.create(data)).rejects.toThrow(/Creator is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should uppercase the code', async () => {
      const doc = await CanonicalCourse.create({ ...validData(), code: 'cs101' });
      expect(doc.code).toBe('CS101');
    });

    it('should trim the code', async () => {
      const doc = await CanonicalCourse.create({ ...validData(), code: '  CS101  ' });
      expect(doc.code).toBe('CS101');
    });

    it('should reject code exceeding 50 chars', async () => {
      await expect(CanonicalCourse.create({
        ...validData(),
        code: 'A'.repeat(51)
      })).rejects.toThrow(/Course code cannot exceed 50 characters/);
    });

    it('should reject negative totalVersions', async () => {
      await expect(CanonicalCourse.create({
        ...validData(),
        totalVersions: -1
      })).rejects.toThrow(/Total versions cannot be negative/);
    });
  });

  describe('Defaults', () => {
    it('should default programId to null', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.programId).toBeNull();
    });

    it('should default totalVersions to 0', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.totalVersions).toBe(0);
    });

    it('should default currentPublishedVersionId to null', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.currentPublishedVersionId).toBeNull();
    });

    it('should default latestDraftVersionId to null', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.latestDraftVersionId).toBeNull();
    });
  });

  describe('Unique Compound Index', () => {
    it('should reject duplicate departmentId + code', async () => {
      await CanonicalCourse.create(validData());
      await expect(CanonicalCourse.create(validData())).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same code in different departments', async () => {
      await CanonicalCourse.create(validData());
      const doc2 = await CanonicalCourse.create({
        ...validData(),
        departmentId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt and updatedAt', async () => {
      const doc = await CanonicalCourse.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
