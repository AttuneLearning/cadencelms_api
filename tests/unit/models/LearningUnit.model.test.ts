import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LearningUnit from '@/models/content/LearningUnit.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('LearningUnit Model', () => {
  let mongoServer: MongoMemoryServer;
  let testModuleId: mongoose.Types.ObjectId;
  let testContentId: mongoose.Types.ObjectId;
  let testCreatedBy: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedLearningUnitLookups();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testModuleId = new mongoose.Types.ObjectId();
    testContentId = new mongoose.Types.ObjectId();
    testCreatedBy = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await LearningUnit.deleteMany({});
  });

  describe('Required Fields Validation', () => {
    it('should create a valid learning unit with all required fields', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Introduction to Variables',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.moduleId).toEqual(testModuleId);
      expect(learningUnit.title).toBe('Introduction to Variables');
      expect(learningUnit.type).toBe('media');
      expect(learningUnit.category).toBe('topic');
      expect(learningUnit.sequence).toBe(1);
      expect(learningUnit.isActive).toBe(true);
    });

    it('should require moduleId field', async () => {
      const learningUnit = new LearningUnit({
        title: 'Introduction to Variables',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow(/moduleId/);
    });

    it('should require title field', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow(/title/);
    });

    it('should require type field', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Introduction to Variables',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow(/type/);
    });

    it('should require category field', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Introduction to Variables',
        type: 'media',
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow(/category/);
    });

    it('should require sequence field', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Introduction to Variables',
        type: 'media',
        category: 'topic',
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow(/sequence/);
    });
  });

  describe('Type Enum Validation', () => {
    const validTypes = ['scorm', 'custom', 'exercise', 'media', 'document', 'assessment', 'assignment'];

    validTypes.forEach(type => {
      it(`should accept valid type: ${type}`, async () => {
        const learningUnit = await LearningUnit.create({
          moduleId: testModuleId,
          title: 'Test Learning Unit',
          type: type as any,
          category: 'topic',
          sequence: 1,
          isActive: true
        });

        expect(learningUnit.type).toBe(type);
      });
    });

    it('should reject invalid type', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'invalid-type' as any,
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow();
    });
  });

  describe('Category Enum Validation', () => {
    const validCategories = ['topic', 'assignment', 'practice', 'graded'];

    validCategories.forEach(category => {
      it(`should accept valid category: ${category}`, async () => {
        const learningUnit = await LearningUnit.create({
          moduleId: testModuleId,
          title: 'Test Learning Unit',
          type: 'media',
          category: category as any,
          sequence: 1,
          isActive: true
        });

        expect(learningUnit.category).toBe(category);
      });
    });

    it('should reject invalid category', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'invalid-category' as any,
        sequence: 1,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set isRequired default to true', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.isRequired).toBe(true);
    });

    it('should set isReplayable default to false', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.isReplayable).toBe(false);
    });

    it('should set weight default to 0', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.weight).toBe(0);
    });

    it('should allow overriding default values', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        isRequired: false,
        isReplayable: true,
        weight: 50
      });

      expect(learningUnit.isRequired).toBe(false);
      expect(learningUnit.isReplayable).toBe(true);
      expect(learningUnit.weight).toBe(50);
    });
  });

  describe('Weight Validation', () => {
    it('should accept weight of 0', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        weight: 0
      });

      expect(learningUnit.weight).toBe(0);
    });

    it('should accept weight of 100', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        weight: 100
      });

      expect(learningUnit.weight).toBe(100);
    });

    it('should accept weight between 0 and 100', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        weight: 75
      });

      expect(learningUnit.weight).toBe(75);
    });

    it('should reject weight less than 0', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        weight: -1
      });

      await expect(learningUnit.save()).rejects.toThrow();
    });

    it('should reject weight greater than 100', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        weight: 101
      });

      await expect(learningUnit.save()).rejects.toThrow();
    });
  });

  describe('Optional Fields', () => {
    it('should allow description field', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        description: 'A detailed description',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.description).toBe('A detailed description');
    });

    it('should allow contentId field', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        contentId: testContentId,
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.contentId).toEqual(testContentId);
    });

    it('should allow availability dates', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        availableFrom: now,
        availableUntil: future
      });

      expect(learningUnit.availableFrom).toEqual(now);
      expect(learningUnit.availableUntil).toEqual(future);
    });

    it('should allow settings object', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'assessment',
        category: 'graded',
        sequence: 1,
        isActive: true,
        settings: {
          allowMultipleAttempts: true,
          maxAttempts: 3,
          timeLimit: 60,
          showFeedback: true,
          shuffleQuestions: true,
          passingScore: 70
        }
      });

      expect(learningUnit.settings).toEqual({
        allowMultipleAttempts: true,
        maxAttempts: 3,
        timeLimit: 60,
        showFeedback: true,
        shuffleQuestions: true,
        passingScore: 70
      });
    });

    it('should allow estimatedDuration field', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        estimatedDuration: 45
      });

      expect(learningUnit.estimatedDuration).toBe(45);
    });

    it('should allow metadata field', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        metadata: {
          tags: ['intro', 'beginner'],
          difficulty: 'easy'
        }
      });

      expect(learningUnit.metadata).toEqual({
        tags: ['intro', 'beginner'],
        difficulty: 'easy'
      });
    });

    it('should allow createdBy field', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true,
        createdBy: testCreatedBy
      });

      expect(learningUnit.createdBy).toEqual(testCreatedBy);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.createdAt).toBeDefined();
      expect(learningUnit.updatedAt).toBeDefined();
      expect(learningUnit.createdAt).toBeInstanceOf(Date);
      expect(learningUnit.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      const originalUpdatedAt = learningUnit.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      learningUnit.title = 'Updated Title';
      await learningUnit.save();

      expect(learningUnit.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have moduleId index', async () => {
      const indexes = await LearningUnit.collection.getIndexes();
      const moduleIdIndex = Object.keys(indexes).find(key =>
        indexes[key].some((field: any) => field[0] === 'moduleId')
      );
      expect(moduleIdIndex).toBeDefined();
    });

    it('should have compound moduleId and sequence index', async () => {
      const indexes = await LearningUnit.collection.getIndexes();
      const compoundIndex = Object.keys(indexes).find(key => {
        const fields = indexes[key];
        return fields.length >= 2 &&
               fields.some((f: any) => f[0] === 'moduleId') &&
               fields.some((f: any) => f[0] === 'sequence');
      });
      expect(compoundIndex).toBeDefined();
    });

    it('should have compound moduleId and category index', async () => {
      const indexes = await LearningUnit.collection.getIndexes();
      const compoundIndex = Object.keys(indexes).find(key => {
        const fields = indexes[key];
        return fields.length >= 2 &&
               fields.some((f: any) => f[0] === 'moduleId') &&
               fields.some((f: any) => f[0] === 'category');
      });
      expect(compoundIndex).toBeDefined();
    });

    it('should have type index', async () => {
      const indexes = await LearningUnit.collection.getIndexes();
      const typeIndex = Object.keys(indexes).find(key =>
        indexes[key].some((field: any) => field[0] === 'type')
      );
      expect(typeIndex).toBeDefined();
    });

    it('should have isActive index', async () => {
      const indexes = await LearningUnit.collection.getIndexes();
      const isActiveIndex = Object.keys(indexes).find(key =>
        indexes[key].some((field: any) => field[0] === 'isActive')
      );
      expect(isActiveIndex).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      // Create test data
      await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Unit 1 - Topic',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Unit 2 - Practice',
        type: 'exercise',
        category: 'practice',
        sequence: 2,
        isActive: true
      });

      await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Unit 3 - Graded',
        type: 'assessment',
        category: 'graded',
        sequence: 3,
        isActive: true
      });

      const otherModuleId = new mongoose.Types.ObjectId();
      await LearningUnit.create({
        moduleId: otherModuleId,
        title: 'Other Module Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });
    });

    it('should find learning units by moduleId', async () => {
      const units = await LearningUnit.find({ moduleId: testModuleId }).sort({ sequence: 1 });
      expect(units).toHaveLength(3);
      expect(units[0].title).toBe('Unit 1 - Topic');
      expect(units[1].title).toBe('Unit 2 - Practice');
      expect(units[2].title).toBe('Unit 3 - Graded');
    });

    it('should find learning units by category', async () => {
      const topicUnits = await LearningUnit.find({
        moduleId: testModuleId,
        category: 'topic'
      });
      expect(topicUnits).toHaveLength(1);
      expect(topicUnits[0].category).toBe('topic');
    });

    it('should find learning units by type', async () => {
      const mediaUnits = await LearningUnit.find({
        moduleId: testModuleId,
        type: 'media'
      });
      expect(mediaUnits).toHaveLength(1);
      expect(mediaUnits[0].type).toBe('media');
    });

    it('should find active learning units', async () => {
      await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Inactive Unit',
        type: 'media',
        category: 'topic',
        sequence: 4,
        isActive: false
      });

      const activeUnits = await LearningUnit.find({
        moduleId: testModuleId,
        isActive: true
      });
      expect(activeUnits).toHaveLength(3);
    });

    it('should sort by sequence efficiently', async () => {
      const units = await LearningUnit.find({ moduleId: testModuleId })
        .sort({ sequence: 1 });

      expect(units[0].sequence).toBe(1);
      expect(units[1].sequence).toBe(2);
      expect(units[2].sequence).toBe(3);
    });
  });

  describe('Sequence Validation', () => {
    it('should validate sequence is at least 1', async () => {
      const learningUnit = new LearningUnit({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 0,
        isActive: true
      });

      await expect(learningUnit.save()).rejects.toThrow();
    });

    it('should accept sequence of 1', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 1,
        isActive: true
      });

      expect(learningUnit.sequence).toBe(1);
    });

    it('should accept any positive sequence number', async () => {
      const learningUnit = await LearningUnit.create({
        moduleId: testModuleId,
        title: 'Test Learning Unit',
        type: 'media',
        category: 'topic',
        sequence: 999,
        isActive: true
      });

      expect(learningUnit.sequence).toBe(999);
    });
  });
});
