import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseVersion from '@/models/academic/CourseVersion.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CourseVersion Model', () => {
  let mongoServer: MongoMemoryServer;
  let testCanonicalId: mongoose.Types.ObjectId;
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
    testCanonicalId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await CourseVersion.deleteMany({});
  });

  const validData = () => ({
    canonicalCourseId: testCanonicalId,
    version: 1,
    title: 'Introduction to Programming',
    createdBy: testUserId
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid course version with minimal fields', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.canonicalCourseId).toEqual(testCanonicalId);
      expect(doc.version).toBe(1);
      expect(doc.title).toBe('Introduction to Programming');
      expect(doc.createdBy).toEqual(testUserId);
      expect(doc.status).toBe('draft');
      expect(doc.isLocked).toBe(false);
      expect(doc.isLatest).toBe(true);
    });

    it('should fail without canonicalCourseId', async () => {
      const data = validData();
      delete (data as any).canonicalCourseId;
      await expect(CourseVersion.create(data)).rejects.toThrow(/Canonical course reference is required/);
    });

    it('should fail without version', async () => {
      const data = validData();
      delete (data as any).version;
      await expect(CourseVersion.create(data)).rejects.toThrow(/Version number is required/);
    });

    it('should fail without title', async () => {
      const data = validData();
      delete (data as any).title;
      await expect(CourseVersion.create(data)).rejects.toThrow(/Course title is required/);
    });

    it('should fail without createdBy', async () => {
      const data = validData();
      delete (data as any).createdBy;
      await expect(CourseVersion.create(data)).rejects.toThrow(/Creator is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should reject version less than 1', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        version: 0
      })).rejects.toThrow(/Version must be at least 1/);
    });

    it('should reject title exceeding 200 chars', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        title: 'a'.repeat(201)
      })).rejects.toThrow(/Course title cannot exceed 200 characters/);
    });

    it('should reject description exceeding 2000 chars', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        description: 'a'.repeat(2001)
      })).rejects.toThrow(/Description cannot exceed 2000 characters/);
    });

    it('should reject negative credits', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        credits: -1
      })).rejects.toThrow(/Credits cannot be negative/);
    });

    it('should reject negative duration', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        duration: -1
      })).rejects.toThrow(/Duration cannot be negative/);
    });

    it('should reject invalid status', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        status: 'invalid'
      })).rejects.toThrow(/Status must be draft, published, or archived/);
    });

    it('should reject invalid lockedReason', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        lockedReason: 'invalid'
      })).rejects.toThrow(/Lock reason must be superseded, archived, manual, or null/);
    });

    it('should reject changeNotes exceeding 2000 chars', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        changeNotes: 'a'.repeat(2001)
      })).rejects.toThrow(/Change notes cannot exceed 2000 characters/);
    });
  });

  describe('Settings Defaults', () => {
    it('should provide default settings', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.settings).toBeDefined();
      expect(doc.settings.allowSelfEnrollment).toBe(false);
      expect(doc.settings.passingScore).toBe(70);
      expect(doc.settings.maxAttempts).toBeNull();
      expect(doc.settings.certificateEnabled).toBe(false);
      expect(doc.settings.enforcePrerequisites).toBe(true);
      expect(doc.settings.showProgressBar).toBe(true);
      expect(doc.settings.allowModuleSkipping).toBe(false);
    });

    it('should validate passingScore range in settings', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        settings: { passingScore: 101 }
      })).rejects.toThrow(/Passing score cannot exceed 100/);
    });

    it('should validate maxAttempts min in settings', async () => {
      await expect(CourseVersion.create({
        ...validData(),
        settings: { maxAttempts: 0 }
      })).rejects.toThrow(/Max attempts must be at least 1/);
    });
  });

  describe('Defaults', () => {
    it('should default status to draft', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.status).toBe('draft');
    });

    it('should default isLocked to false', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.isLocked).toBe(false);
    });

    it('should default isLatest to true', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.isLatest).toBe(true);
    });

    it('should default credits to 0', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.credits).toBe(0);
    });

    it('should default duration to 0', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.duration).toBe(0);
    });

    it('should default description to null', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.description).toBeNull();
    });

    it('should default parentVersionId to null', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.parentVersionId).toBeNull();
    });

    it('should default publishedAt to null', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.publishedAt).toBeNull();
    });

    it('should default lockedReason to null', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.lockedReason).toBeNull();
    });

    it('should default instructorIds to empty array', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.instructorIds).toEqual([]);
    });
  });

  describe('Unique Compound Index', () => {
    it('should reject duplicate canonicalCourseId + version', async () => {
      await CourseVersion.create(validData());
      await expect(CourseVersion.create(validData())).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same version for different canonical courses', async () => {
      await CourseVersion.create(validData());
      const doc2 = await CourseVersion.create({
        ...validData(),
        canonicalCourseId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt and updatedAt', async () => {
      const doc = await CourseVersion.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
