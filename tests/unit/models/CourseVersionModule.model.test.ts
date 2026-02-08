import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CourseVersionModule Model', () => {
  let mongoServer: MongoMemoryServer;
  let testVersionId: mongoose.Types.ObjectId;
  let testModuleId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    testVersionId = new mongoose.Types.ObjectId();
    testModuleId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await CourseVersionModule.deleteMany({});
  });

  const validData = () => ({
    courseVersionId: testVersionId,
    moduleId: testModuleId,
    order: 0
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid course version module', async () => {
      const doc = await CourseVersionModule.create(validData());
      expect(doc.courseVersionId).toEqual(testVersionId);
      expect(doc.moduleId).toEqual(testModuleId);
      expect(doc.order).toBe(0);
      expect(doc.isRequired).toBe(true);
      expect(doc.availableFrom).toBeNull();
      expect(doc.availableUntil).toBeNull();
    });

    it('should fail without courseVersionId', async () => {
      const data = validData();
      delete (data as any).courseVersionId;
      await expect(CourseVersionModule.create(data)).rejects.toThrow(/Course version reference is required/);
    });

    it('should fail without moduleId', async () => {
      const data = validData();
      delete (data as any).moduleId;
      await expect(CourseVersionModule.create(data)).rejects.toThrow(/Module reference is required/);
    });

    it('should fail without order', async () => {
      const data = validData();
      delete (data as any).order;
      await expect(CourseVersionModule.create(data)).rejects.toThrow(/Order is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should reject negative order', async () => {
      await expect(CourseVersionModule.create({
        ...validData(),
        order: -1
      })).rejects.toThrow(/Order cannot be negative/);
    });
  });

  describe('Defaults', () => {
    it('should default isRequired to true', async () => {
      const doc = await CourseVersionModule.create(validData());
      expect(doc.isRequired).toBe(true);
    });

    it('should default availableFrom to null', async () => {
      const doc = await CourseVersionModule.create(validData());
      expect(doc.availableFrom).toBeNull();
    });

    it('should default availableUntil to null', async () => {
      const doc = await CourseVersionModule.create(validData());
      expect(doc.availableUntil).toBeNull();
    });
  });

  describe('Custom Fields', () => {
    it('should accept dates for availability', async () => {
      const from = new Date('2026-01-01');
      const until = new Date('2026-06-30');
      const doc = await CourseVersionModule.create({
        ...validData(),
        availableFrom: from,
        availableUntil: until
      });
      expect(doc.availableFrom).toEqual(from);
      expect(doc.availableUntil).toEqual(until);
    });

    it('should accept isRequired false', async () => {
      const doc = await CourseVersionModule.create({
        ...validData(),
        isRequired: false
      });
      expect(doc.isRequired).toBe(false);
    });
  });

  describe('Unique Compound Index', () => {
    it('should reject duplicate courseVersionId + moduleId', async () => {
      await CourseVersionModule.create(validData());
      await expect(CourseVersionModule.create(validData())).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same module in different versions', async () => {
      await CourseVersionModule.create(validData());
      const doc2 = await CourseVersionModule.create({
        ...validData(),
        courseVersionId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });

    it('should allow different modules in same version', async () => {
      await CourseVersionModule.create(validData());
      const doc2 = await CourseVersionModule.create({
        ...validData(),
        moduleId: new mongoose.Types.ObjectId(),
        order: 1
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt only', async () => {
      const doc = await CourseVersionModule.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
    });
  });
});
