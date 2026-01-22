import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Module Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;
  let testCourse: any;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDepartment = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });

    testCourse = await Course.create({
      name: 'Introduction to Programming',
      code: 'CS101',
      departmentId: testDepartment._id,
      credits: 3,
      isActive: true
    });

    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Module.deleteMany({});
    await Course.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid module with required fields', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Introduction Module',
        completionCriteria: {
          type: 'all_required'
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: {
            failedAttempt: false,
            belowMastery: false,
            learnerRequest: false
          },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.courseId).toEqual(testCourse._id);
      expect(module.title).toBe('Introduction Module');
      expect(module.isPublished).toBe(false);
      expect(module.order).toBe(1);
    });

    it('should require courseId field', async () => {
      const module = new Module({
        title: 'Introduction Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow(/courseId/);
    });

    it('should require title field', async () => {
      const module = new Module({
        courseId: testCourse._id,
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow(/title/);
    });

    it('should require createdBy field', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Introduction Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1
      });

      await expect(module.save()).rejects.toThrow(/createdBy/);
    });

    it('should trim whitespace from title', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: '  Introduction Module  ',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.title).toBe('Introduction Module');
    });

    it('should enforce title maxlength of 200', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'A'.repeat(201),
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.validate()).rejects.toThrow();
    });
  });

  describe('CompletionCriteria Subdocument', () => {
    it('should require completionCriteria.type field', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {},
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow();
    });

    it('should accept all_required completion type', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.completionCriteria.type).toBe('all_required');
    });

    it('should accept percentage completion type with percentageRequired', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 80
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.completionCriteria.type).toBe('percentage');
      expect(module.completionCriteria.percentageRequired).toBe(80);
    });

    it('should enforce percentageRequired range 0-100', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 150
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.validate()).rejects.toThrow();
    });

    it('should accept gate_learning_unit completion type with gateLearningUnitId', async () => {
      const gateLearningUnitId = new mongoose.Types.ObjectId();
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'gate_learning_unit',
          gateLearningUnitScore: 70
        },
        gateLearningUnitId: gateLearningUnitId,
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.completionCriteria.type).toBe('gate_learning_unit');
      expect(module.completionCriteria.gateLearningUnitScore).toBe(70);
      expect(module.gateLearningUnitId).toEqual(gateLearningUnitId);
    });

    it('should accept points completion type with pointsRequired', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'points',
          pointsRequired: 100
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.completionCriteria.type).toBe('points');
      expect(module.completionCriteria.pointsRequired).toBe(100);
    });

    it('should reject invalid completion type', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'invalid_type' as any
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.validate()).rejects.toThrow();
    });

    it('should accept requireAllExpositions flag', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 80,
          requireAllExpositions: true
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.completionCriteria.requireAllExpositions).toBe(true);
    });
  });

  describe('PresentationRules Subdocument', () => {
    it('should require presentationRules.presentationMode', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        } as any,
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow();
    });

    it('should accept prescribed presentation mode with prescribedOrder', async () => {
      const learningUnitIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
      ];

      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'prescribed',
          prescribedOrder: learningUnitIds,
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.presentationMode).toBe('prescribed');
      expect(module.presentationRules.prescribedOrder).toHaveLength(2);
    });

    it('should accept learner_choice presentation mode', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.presentationMode).toBe('learner_choice');
    });

    it('should accept random presentation mode', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'random',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.presentationMode).toBe('random');
    });

    it('should require presentationRules.repetitionMode', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        } as any,
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow();
    });

    it('should accept until_mastery repetition mode with masteryThreshold', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_mastery',
          masteryThreshold: 90,
          repeatOn: { failedAttempt: false, belowMastery: true, learnerRequest: false },
          repeatableCategories: ['practice', 'assessment'],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.repetitionMode).toBe('until_mastery');
      expect(module.presentationRules.masteryThreshold).toBe(90);
    });

    it('should enforce masteryThreshold range 0-100', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_mastery',
          masteryThreshold: 150,
          repeatOn: { failedAttempt: false, belowMastery: true, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.validate()).rejects.toThrow();
    });

    it('should accept maxRepetitions as number', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_passed',
          maxRepetitions: 3,
          repeatOn: { failedAttempt: true, belowMastery: false, learnerRequest: false },
          repeatableCategories: ['assessment'],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.maxRepetitions).toBe(3);
    });

    it('should accept maxRepetitions as null for unlimited', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_passed',
          maxRepetitions: null,
          repeatOn: { failedAttempt: true, belowMastery: false, learnerRequest: false },
          repeatableCategories: ['assessment'],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.maxRepetitions).toBeNull();
    });

    it('should accept cooldownBetweenRepetitions', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'spaced',
          cooldownBetweenRepetitions: 24,
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: true },
          repeatableCategories: ['exposition', 'practice'],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.cooldownBetweenRepetitions).toBe(24);
    });

    it('should require repeatOn subdocument', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        } as any,
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.save()).rejects.toThrow();
    });

    it('should accept valid repeatableCategories', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_passed',
          repeatOn: { failedAttempt: true, belowMastery: false, learnerRequest: false },
          repeatableCategories: ['exposition', 'practice', 'assessment'],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.presentationRules.repeatableCategories).toHaveLength(3);
      expect(module.presentationRules.repeatableCategories).toContain('exposition');
      expect(module.presentationRules.repeatableCategories).toContain('practice');
      expect(module.presentationRules.repeatableCategories).toContain('assessment');
    });

    it('should reject invalid repeatableCategories', async () => {
      const module = new Module({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: ['invalid_category' as any],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await expect(module.validate()).rejects.toThrow();
    });
  });

  describe('Prerequisites Array', () => {
    it('should accept empty prerequisites array', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        prerequisites: [],
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.prerequisites).toEqual([]);
    });

    it('should store module prerequisites', async () => {
      const prereqModule = await Module.create({
        courseId: testCourse._id,
        title: 'Prerequisite Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        prerequisites: [prereqModule._id],
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 2,
        createdBy: testUserId
      });

      expect(module.prerequisites).toHaveLength(1);
      expect(module.prerequisites[0]).toEqual(prereqModule._id);
    });

    it('should default prerequisites to empty array', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.prerequisites).toEqual([]);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        description: 'This is a test module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.description).toBe('This is a test module');
    });

    it('should store availableFrom date', async () => {
      const now = new Date();
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        availableFrom: now,
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.availableFrom?.getTime()).toBe(now.getTime());
    });

    it('should store availableUntil date', async () => {
      const future = new Date(Date.now() + 86400000);
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        availableUntil: future,
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.availableUntil?.getTime()).toBe(future.getTime());
    });

    it('should store objectives array', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        objectives: ['Learn basics', 'Practice concepts', 'Master skills'],
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.objectives).toHaveLength(3);
      expect(module.objectives?.[0]).toBe('Learn basics');
    });
  });

  describe('Default Values', () => {
    it('should default isPublished to false', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.isPublished).toBe(false);
    });

    it('should default estimatedDuration to 0', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        order: 1,
        createdBy: testUserId
      });

      expect(module.estimatedDuration).toBe(0);
    });

    it('should default order to 0', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        createdBy: testUserId
      });

      expect(module.order).toBe(0);
    });

    it('should auto-generate timestamps', async () => {
      const module = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      expect(module.createdAt).toBeDefined();
      expect(module.updatedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should find modules by courseId', async () => {
      await Module.create({
        courseId: testCourse._id,
        title: 'Module 1',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      const modules = await Module.find({ courseId: testCourse._id });
      expect(modules).toHaveLength(1);
      expect(modules[0].title).toBe('Module 1');
    });

    it('should find published modules', async () => {
      await Module.create({
        courseId: testCourse._id,
        title: 'Published Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: true,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      await Module.create({
        courseId: testCourse._id,
        title: 'Draft Module',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 2,
        createdBy: testUserId
      });

      const published = await Module.find({ isPublished: true });
      expect(published).toHaveLength(1);
      expect(published[0].title).toBe('Published Module');
    });

    it('should sort modules by order within course', async () => {
      await Module.create({
        courseId: testCourse._id,
        title: 'Module 2',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 2,
        createdBy: testUserId
      });

      await Module.create({
        courseId: testCourse._id,
        title: 'Module 1',
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        isPublished: false,
        estimatedDuration: 60,
        order: 1,
        createdBy: testUserId
      });

      const modules = await Module.find({ courseId: testCourse._id }).sort({ order: 1 });
      expect(modules).toHaveLength(2);
      expect(modules[0].title).toBe('Module 1');
      expect(modules[1].title).toBe('Module 2');
    });
  });
});
