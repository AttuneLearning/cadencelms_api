import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ModuleCompletion from '@/models/progress/ModuleCompletion.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ModuleCompletion Model', () => {
  let mongoServer: MongoMemoryServer;
  let testLearnerId: mongoose.Types.ObjectId;
  let testModuleId: mongoose.Types.ObjectId;
  let testVersionId: mongoose.Types.ObjectId;
  let testEnrollmentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    testLearnerId = new mongoose.Types.ObjectId();
    testModuleId = new mongoose.Types.ObjectId();
    testVersionId = new mongoose.Types.ObjectId();
    testEnrollmentId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ModuleCompletion.deleteMany({});
  });

  const validData = () => ({
    learnerId: testLearnerId,
    moduleId: testModuleId,
    completedInCourseVersionId: testVersionId,
    completedInEnrollmentId: testEnrollmentId,
    completedAt: new Date()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid module completion', async () => {
      const doc = await ModuleCompletion.create(validData());
      expect(doc.learnerId).toEqual(testLearnerId);
      expect(doc.moduleId).toEqual(testModuleId);
      expect(doc.completedInCourseVersionId).toEqual(testVersionId);
      expect(doc.completedInEnrollmentId).toEqual(testEnrollmentId);
      expect(doc.completedAt).toBeDefined();
      expect(doc.isGlobalCompletion).toBe(true);
      expect(doc.score).toBeNull();
    });

    it('should fail without learnerId', async () => {
      const data = validData();
      delete (data as any).learnerId;
      await expect(ModuleCompletion.create(data)).rejects.toThrow(/Learner ID is required/);
    });

    it('should fail without moduleId', async () => {
      const data = validData();
      delete (data as any).moduleId;
      await expect(ModuleCompletion.create(data)).rejects.toThrow(/Module ID is required/);
    });

    it('should fail without completedInCourseVersionId', async () => {
      const data = validData();
      delete (data as any).completedInCourseVersionId;
      await expect(ModuleCompletion.create(data)).rejects.toThrow(/Course version ID is required/);
    });

    it('should fail without completedInEnrollmentId', async () => {
      const data = validData();
      delete (data as any).completedInEnrollmentId;
      await expect(ModuleCompletion.create(data)).rejects.toThrow(/Enrollment ID is required/);
    });

    it('should fail without completedAt', async () => {
      const data = validData();
      delete (data as any).completedAt;
      await expect(ModuleCompletion.create(data)).rejects.toThrow(/Completion date is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should reject score below 0', async () => {
      await expect(ModuleCompletion.create({
        ...validData(),
        score: -1
      })).rejects.toThrow(/Score cannot be negative/);
    });

    it('should reject score above 100', async () => {
      await expect(ModuleCompletion.create({
        ...validData(),
        score: 101
      })).rejects.toThrow(/Score cannot exceed 100/);
    });

    it('should accept valid score', async () => {
      const doc = await ModuleCompletion.create({
        ...validData(),
        score: 85
      });
      expect(doc.score).toBe(85);
    });

    it('should accept null score', async () => {
      const doc = await ModuleCompletion.create({
        ...validData(),
        score: null
      });
      expect(doc.score).toBeNull();
    });
  });

  describe('Defaults', () => {
    it('should default isGlobalCompletion to true', async () => {
      const doc = await ModuleCompletion.create(validData());
      expect(doc.isGlobalCompletion).toBe(true);
    });

    it('should default score to null', async () => {
      const doc = await ModuleCompletion.create(validData());
      expect(doc.score).toBeNull();
    });

    it('should accept isGlobalCompletion false', async () => {
      const doc = await ModuleCompletion.create({
        ...validData(),
        isGlobalCompletion: false
      });
      expect(doc.isGlobalCompletion).toBe(false);
    });
  });

  describe('Unique Compound Index', () => {
    it('should reject duplicate learnerId + moduleId', async () => {
      await ModuleCompletion.create(validData());
      await expect(ModuleCompletion.create(validData())).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same module for different learners', async () => {
      await ModuleCompletion.create(validData());
      const doc2 = await ModuleCompletion.create({
        ...validData(),
        learnerId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });

    it('should allow same learner for different modules', async () => {
      await ModuleCompletion.create(validData());
      const doc2 = await ModuleCompletion.create({
        ...validData(),
        moduleId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt and updatedAt', async () => {
      const doc = await ModuleCompletion.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
