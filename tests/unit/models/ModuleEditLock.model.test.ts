import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ModuleEditLock from '@/models/academic/ModuleEditLock.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ModuleEditLock Model', () => {
  let mongoServer: MongoMemoryServer;
  let testModuleId: mongoose.Types.ObjectId;
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
    testModuleId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ModuleEditLock.deleteMany({});
  });

  const validData = () => ({
    moduleId: testModuleId,
    userId: testUserId,
    userName: 'John Doe',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid edit lock', async () => {
      const doc = await ModuleEditLock.create(validData());
      expect(doc.moduleId).toEqual(testModuleId);
      expect(doc.userId).toEqual(testUserId);
      expect(doc.userName).toBe('John Doe');
      expect(doc.expiresAt).toBeDefined();
      expect(doc.acquiredAt).toBeDefined();
      expect(doc.lastHeartbeat).toBeDefined();
      expect(doc.accessRequest).toBeNull();
    });

    it('should fail without moduleId', async () => {
      const data = validData();
      delete (data as any).moduleId;
      await expect(ModuleEditLock.create(data)).rejects.toThrow(/Module ID is required/);
    });

    it('should fail without userId', async () => {
      const data = validData();
      delete (data as any).userId;
      await expect(ModuleEditLock.create(data)).rejects.toThrow(/User ID is required/);
    });

    it('should fail without userName', async () => {
      const data = validData();
      delete (data as any).userName;
      await expect(ModuleEditLock.create(data)).rejects.toThrow(/User name is required/);
    });

    it('should fail without expiresAt', async () => {
      const data = validData();
      delete (data as any).expiresAt;
      await expect(ModuleEditLock.create(data)).rejects.toThrow(/Expiration time is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should trim userName', async () => {
      const doc = await ModuleEditLock.create({
        ...validData(),
        userName: '  John Doe  '
      });
      expect(doc.userName).toBe('John Doe');
    });

    it('should reject userName exceeding 200 chars', async () => {
      await expect(ModuleEditLock.create({
        ...validData(),
        userName: 'a'.repeat(201)
      })).rejects.toThrow(/User name cannot exceed 200 characters/);
    });
  });

  describe('Defaults', () => {
    it('should default acquiredAt to now', async () => {
      const before = new Date();
      const doc = await ModuleEditLock.create(validData());
      expect(doc.acquiredAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });

    it('should default lastHeartbeat to now', async () => {
      const before = new Date();
      const doc = await ModuleEditLock.create(validData());
      expect(doc.lastHeartbeat.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    });

    it('should default accessRequest to null', async () => {
      const doc = await ModuleEditLock.create(validData());
      expect(doc.accessRequest).toBeNull();
    });
  });

  describe('Access Request Subdocument', () => {
    it('should store an access request', async () => {
      const requesterId = new mongoose.Types.ObjectId();
      const doc = await ModuleEditLock.create({
        ...validData(),
        accessRequest: {
          userId: requesterId,
          userName: 'Jane Smith',
          requestedAt: new Date()
        }
      });
      expect(doc.accessRequest).toBeDefined();
      expect(doc.accessRequest!.userId).toEqual(requesterId);
      expect(doc.accessRequest!.userName).toBe('Jane Smith');
    });
  });

  describe('Unique Index on moduleId', () => {
    it('should reject duplicate moduleId', async () => {
      await ModuleEditLock.create(validData());
      await expect(ModuleEditLock.create({
        ...validData(),
        userId: new mongoose.Types.ObjectId(),
        userName: 'Another User'
      })).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Static Methods', () => {
    it('findActiveByModuleId should find non-expired lock', async () => {
      await ModuleEditLock.create(validData());
      const found = await ModuleEditLock.findActiveByModuleId(testModuleId.toString());
      expect(found).toBeDefined();
      expect(found!.moduleId).toEqual(testModuleId);
    });

    it('findActiveByModuleId should not find expired lock', async () => {
      await ModuleEditLock.create({
        ...validData(),
        expiresAt: new Date(Date.now() - 1000)
      });
      const found = await ModuleEditLock.findActiveByModuleId(testModuleId.toString());
      expect(found).toBeNull();
    });

    it('findActiveByModuleId should return null for non-existent module', async () => {
      const found = await ModuleEditLock.findActiveByModuleId(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt and updatedAt', async () => {
      const doc = await ModuleEditLock.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
