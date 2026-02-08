import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CourseDepthOverride } from '@/models/content/CourseDepthOverride.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CourseDepthOverride Model', () => {
  let mongoServer: MongoMemoryServer;
  let testCourseId: mongoose.Types.ObjectId;
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
    testCourseId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await CourseDepthOverride.deleteMany({});
  });

  const validData = () => ({
    courseId: testCourseId,
    slug: 'exposure',
    advanceThreshold: 0.8,
    createdBy: testUserId
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid override with all fields', async () => {
      const doc = await CourseDepthOverride.create({
        ...validData(),
        minAttempts: 3,
        description: 'Custom threshold for intro course'
      });

      expect(doc.courseId).toEqual(testCourseId);
      expect(doc.slug).toBe('exposure');
      expect(doc.advanceThreshold).toBe(0.8);
      expect(doc.minAttempts).toBe(3);
      expect(doc.description).toBe('Custom threshold for intro course');
      expect(doc.createdBy).toEqual(testUserId);
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
    });

    it('should fail without courseId', async () => {
      const data = validData();
      delete (data as any).courseId;
      await expect(CourseDepthOverride.create(data)).rejects.toThrow(/Course ID is required/);
    });

    it('should fail without slug', async () => {
      const data = validData();
      delete (data as any).slug;
      await expect(CourseDepthOverride.create(data)).rejects.toThrow(/Slug is required/);
    });

    it('should fail without createdBy', async () => {
      const data = validData();
      delete (data as any).createdBy;
      await expect(CourseDepthOverride.create(data)).rejects.toThrow(/Creator is required/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should lowercase and trim the slug', async () => {
      const doc = await CourseDepthOverride.create({
        ...validData(),
        slug: '  EXPOSURE  '
      });
      expect(doc.slug).toBe('exposure');
    });

    it('should reject slug with invalid characters', async () => {
      await expect(CourseDepthOverride.create({
        ...validData(),
        slug: 'invalid slug!'
      })).rejects.toThrow(/Slug must be lowercase alphanumeric with hyphens only/);
    });

    it('should reject slug exceeding 50 characters', async () => {
      await expect(CourseDepthOverride.create({
        ...validData(),
        slug: 'a'.repeat(51)
      })).rejects.toThrow(/Slug must not exceed 50 characters/);
    });

    it('should reject advanceThreshold below 0', async () => {
      await expect(CourseDepthOverride.create({
        ...validData(),
        advanceThreshold: -0.1
      })).rejects.toThrow(/Advance threshold must be at least 0/);
    });

    it('should reject advanceThreshold above 1', async () => {
      await expect(CourseDepthOverride.create({
        ...validData(),
        advanceThreshold: 1.1
      })).rejects.toThrow(/Advance threshold must not exceed 1/);
    });

    it('should reject minAttempts below 1', async () => {
      await expect(CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test',
        minAttempts: 0,
        createdBy: testUserId
      })).rejects.toThrow(/Minimum attempts must be at least 1/);
    });

    it('should reject minAttempts above 100', async () => {
      await expect(CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test',
        minAttempts: 101,
        createdBy: testUserId
      })).rejects.toThrow(/Minimum attempts must not exceed 100/);
    });

    it('should reject description exceeding 500 characters', async () => {
      await expect(CourseDepthOverride.create({
        ...validData(),
        description: 'a'.repeat(501)
      })).rejects.toThrow(/Description must not exceed 500 characters/);
    });
  });

  describe('Pre-validate Hook', () => {
    it('should fail if no override field is provided', async () => {
      await expect(CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test',
        createdBy: testUserId
      })).rejects.toThrow(/At least one override field/);
    });

    it('should pass with only advanceThreshold', async () => {
      const doc = await CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test-a',
        advanceThreshold: 0.5,
        createdBy: testUserId
      });
      expect(doc.advanceThreshold).toBe(0.5);
    });

    it('should pass with only minAttempts', async () => {
      const doc = await CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test-b',
        minAttempts: 5,
        createdBy: testUserId
      });
      expect(doc.minAttempts).toBe(5);
    });

    it('should pass with only description', async () => {
      const doc = await CourseDepthOverride.create({
        courseId: testCourseId,
        slug: 'test-c',
        description: 'Override description',
        createdBy: testUserId
      });
      expect(doc.description).toBe('Override description');
    });
  });

  describe('Unique Compound Index', () => {
    it('should reject duplicate courseId + slug combination', async () => {
      await CourseDepthOverride.create(validData());
      await expect(CourseDepthOverride.create(validData())).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same slug for different courses', async () => {
      await CourseDepthOverride.create(validData());
      const doc2 = await CourseDepthOverride.create({
        ...validData(),
        courseId: new mongoose.Types.ObjectId()
      });
      expect(doc2).toBeDefined();
    });

    it('should allow different slugs for same course', async () => {
      await CourseDepthOverride.create(validData());
      const doc2 = await CourseDepthOverride.create({
        ...validData(),
        slug: 'mastery'
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-set createdAt and updatedAt', async () => {
      const doc = await CourseDepthOverride.create(validData());
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
