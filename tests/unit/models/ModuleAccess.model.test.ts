import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ModuleAccess from '@/models/progress/ModuleAccess.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ModuleAccess Model', () => {
  let mongoServer: MongoMemoryServer;
  let testLearnerId: mongoose.Types.ObjectId;
  let testEnrollmentId: mongoose.Types.ObjectId;
  let testCourseId: mongoose.Types.ObjectId;
  let testModuleId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testLearnerId = new mongoose.Types.ObjectId();
    testEnrollmentId = new mongoose.Types.ObjectId();
    testCourseId = new mongoose.Types.ObjectId();
    testModuleId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ModuleAccess.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid module access record', async () => {
      const now = new Date();
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.learnerId).toEqual(testLearnerId);
      expect(moduleAccess.enrollmentId).toEqual(testEnrollmentId);
      expect(moduleAccess.courseId).toEqual(testCourseId);
      expect(moduleAccess.moduleId).toEqual(testModuleId);
      expect(moduleAccess.firstAccessedAt).toEqual(now);
      expect(moduleAccess.lastAccessedAt).toEqual(now);
      expect(moduleAccess.accessCount).toBe(1);
      expect(moduleAccess.hasStartedLearningUnit).toBe(false);
      expect(moduleAccess.learningUnitsCompleted).toBe(0);
      expect(moduleAccess.learningUnitsTotal).toBe(5);
      expect(moduleAccess.status).toBe('accessed');
    });

    it('should require learnerId field', async () => {
      const moduleAccess = new ModuleAccess({
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await expect(moduleAccess.save()).rejects.toThrow(/learnerId/);
    });

    it('should require enrollmentId field', async () => {
      const moduleAccess = new ModuleAccess({
        learnerId: testLearnerId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await expect(moduleAccess.save()).rejects.toThrow(/enrollmentId/);
    });

    it('should require courseId field', async () => {
      const moduleAccess = new ModuleAccess({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await expect(moduleAccess.save()).rejects.toThrow(/courseId/);
    });

    it('should require moduleId field', async () => {
      const moduleAccess = new ModuleAccess({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await expect(moduleAccess.save()).rejects.toThrow(/moduleId/);
    });

    it('should not require status field (has default)', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5
      });

      expect(moduleAccess.status).toBe('accessed');
    });

    it('should validate status enum', async () => {
      const moduleAccess = new ModuleAccess({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'invalid-status'
      });

      await expect(moduleAccess.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['accessed', 'in_progress', 'completed'];

      for (const status of statuses) {
        const moduleAccess = await ModuleAccess.create({
          learnerId: new mongoose.Types.ObjectId(),
          enrollmentId: testEnrollmentId,
          courseId: testCourseId,
          moduleId: testModuleId,
          firstAccessedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 1,
          hasStartedLearningUnit: false,
          learningUnitsCompleted: 0,
          learningUnitsTotal: 5,
          status
        });

        expect(moduleAccess.status).toBe(status);
      }
    });
  });

  describe('Default Values', () => {
    it('should default accessCount to 1', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.accessCount).toBe(1);
    });

    it('should default hasStartedLearningUnit to false', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.hasStartedLearningUnit).toBe(false);
    });

    it('should default learningUnitsCompleted to 0', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.learningUnitsCompleted).toBe(0);
    });

    it('should default learningUnitsTotal to 0', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        status: 'accessed'
      });

      expect(moduleAccess.learningUnitsTotal).toBe(0);
    });

    it('should default status to accessed', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5
      });

      expect(moduleAccess.status).toBe('accessed');
    });
  });

  describe('Timestamps', () => {
    it('should track first access time', async () => {
      const firstAccess = new Date();
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: firstAccess,
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.firstAccessedAt).toEqual(firstAccess);
    });

    it('should track last access time', async () => {
      const lastAccess = new Date();
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 3600000),
        lastAccessedAt: lastAccess,
        accessCount: 2,
        hasStartedLearningUnit: true,
        learningUnitsCompleted: 1,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      expect(moduleAccess.lastAccessedAt).toEqual(lastAccess);
    });

    it('should track first learning unit started time', async () => {
      const firstLUStarted = new Date();
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 3600000),
        lastAccessedAt: new Date(),
        accessCount: 2,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: firstLUStarted,
        learningUnitsCompleted: 1,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      expect(moduleAccess.firstLearningUnitStartedAt).toEqual(firstLUStarted);
    });

    it('should track completion time', async () => {
      const completedTime = new Date();
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 7200000),
        lastAccessedAt: new Date(),
        accessCount: 5,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 3600000),
        learningUnitsCompleted: 5,
        learningUnitsTotal: 5,
        status: 'completed',
        completedAt: completedTime
      });

      expect(moduleAccess.completedAt).toEqual(completedTime);
    });

    it('should auto-generate createdAt and updatedAt timestamps', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess.createdAt).toBeDefined();
      expect(moduleAccess.updatedAt).toBeDefined();
      expect(moduleAccess.createdAt).toBeInstanceOf(Date);
      expect(moduleAccess.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      const originalUpdatedAt = moduleAccess.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      moduleAccess.accessCount = 2;
      moduleAccess.status = 'in_progress';
      await moduleAccess.save();

      expect(moduleAccess.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Progress Tracking', () => {
    it('should track access count', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 5,
        hasStartedLearningUnit: true,
        learningUnitsCompleted: 2,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      expect(moduleAccess.accessCount).toBe(5);
    });

    it('should track learning units completed', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 3,
        hasStartedLearningUnit: true,
        learningUnitsCompleted: 3,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      expect(moduleAccess.learningUnitsCompleted).toBe(3);
      expect(moduleAccess.learningUnitsTotal).toBe(5);
    });

    it('should track when all learning units are completed', async () => {
      const moduleAccess = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 7200000),
        lastAccessedAt: new Date(),
        accessCount: 10,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 3600000),
        learningUnitsCompleted: 5,
        learningUnitsTotal: 5,
        status: 'completed',
        completedAt: new Date()
      });

      expect(moduleAccess.learningUnitsCompleted).toBe(moduleAccess.learningUnitsTotal);
      expect(moduleAccess.status).toBe('completed');
      expect(moduleAccess.completedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should enforce unique compound index on learnerId and moduleId', async () => {
      await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      // Attempt to create duplicate
      const duplicate = new ModuleAccess({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await expect(duplicate.save()).rejects.toThrow();
    });

    it('should allow same learner to access different modules', async () => {
      const module2Id = new mongoose.Types.ObjectId();

      await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      const moduleAccess2 = await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: module2Id,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 3,
        status: 'accessed'
      });

      expect(moduleAccess2).toBeDefined();
    });

    it('should allow different learners to access same module', async () => {
      const learner2Id = new mongoose.Types.ObjectId();
      const enrollment2Id = new mongoose.Types.ObjectId();

      await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      const moduleAccess2 = await ModuleAccess.create({
        learnerId: learner2Id,
        enrollmentId: enrollment2Id,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      expect(moduleAccess2).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      // Create test data
      const module2Id = new mongoose.Types.ObjectId();
      const learner2Id = new mongoose.Types.ObjectId();
      const enrollment2Id = new mongoose.Types.ObjectId();

      await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 3600000),
        lastAccessedAt: new Date(),
        accessCount: 5,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 3000000),
        learningUnitsCompleted: 2,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      await ModuleAccess.create({
        learnerId: testLearnerId,
        enrollmentId: testEnrollmentId,
        courseId: testCourseId,
        moduleId: module2Id,
        firstAccessedAt: new Date(Date.now() - 7200000),
        lastAccessedAt: new Date(),
        accessCount: 10,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 6000000),
        learningUnitsCompleted: 3,
        learningUnitsTotal: 3,
        status: 'completed',
        completedAt: new Date()
      });

      await ModuleAccess.create({
        learnerId: learner2Id,
        enrollmentId: enrollment2Id,
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 1800000),
        lastAccessedAt: new Date(Date.now() - 1800000),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });
    });

    it('should find access records by learner', async () => {
      const records = await ModuleAccess.find({ learnerId: testLearnerId });
      expect(records).toHaveLength(2);
    });

    it('should find access records by module', async () => {
      const records = await ModuleAccess.find({ moduleId: testModuleId });
      expect(records).toHaveLength(2);
    });

    it('should find access records by enrollment', async () => {
      const records = await ModuleAccess.find({ enrollmentId: testEnrollmentId });
      expect(records).toHaveLength(2);
    });

    it('should find access records by course', async () => {
      const records = await ModuleAccess.find({ courseId: testCourseId });
      expect(records).toHaveLength(3);
    });

    it('should find records by status', async () => {
      const inProgress = await ModuleAccess.find({ status: 'in_progress' });
      const completed = await ModuleAccess.find({ status: 'completed' });
      const accessed = await ModuleAccess.find({ status: 'accessed' });

      expect(inProgress).toHaveLength(1);
      expect(completed).toHaveLength(1);
      expect(accessed).toHaveLength(1);
    });

    it('should find records by hasStartedLearningUnit (drop-off query)', async () => {
      const notStarted = await ModuleAccess.find({
        moduleId: testModuleId,
        hasStartedLearningUnit: false
      });

      expect(notStarted).toHaveLength(1);
      expect(notStarted[0].status).toBe('accessed');
    });

    it('should find records by module and status', async () => {
      const records = await ModuleAccess.find({
        moduleId: testModuleId,
        status: 'in_progress'
      });

      expect(records).toHaveLength(1);
    });

    it('should find specific learner-module access record', async () => {
      const record = await ModuleAccess.findOne({
        learnerId: testLearnerId,
        moduleId: testModuleId
      });

      expect(record).toBeDefined();
      expect(record?.status).toBe('in_progress');
      expect(record?.learningUnitsCompleted).toBe(2);
    });
  });

  describe('Analytics Queries', () => {
    beforeEach(async () => {
      // Create realistic test data for analytics
      const learners = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId());
      const enrollments = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId());

      // 2 learners accessed but never started
      await ModuleAccess.create({
        learnerId: learners[0],
        enrollmentId: enrollments[0],
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 86400000),
        lastAccessedAt: new Date(Date.now() - 86400000),
        accessCount: 1,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      await ModuleAccess.create({
        learnerId: learners[1],
        enrollmentId: enrollments[1],
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 172800000),
        lastAccessedAt: new Date(Date.now() - 172800000),
        accessCount: 2,
        hasStartedLearningUnit: false,
        learningUnitsCompleted: 0,
        learningUnitsTotal: 5,
        status: 'accessed'
      });

      // 2 learners in progress
      await ModuleAccess.create({
        learnerId: learners[2],
        enrollmentId: enrollments[2],
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 43200000),
        lastAccessedAt: new Date(),
        accessCount: 5,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 36000000),
        learningUnitsCompleted: 2,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      await ModuleAccess.create({
        learnerId: learners[3],
        enrollmentId: enrollments[3],
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 21600000),
        lastAccessedAt: new Date(),
        accessCount: 8,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 18000000),
        learningUnitsCompleted: 4,
        learningUnitsTotal: 5,
        status: 'in_progress'
      });

      // 1 learner completed
      await ModuleAccess.create({
        learnerId: learners[4],
        enrollmentId: enrollments[4],
        courseId: testCourseId,
        moduleId: testModuleId,
        firstAccessedAt: new Date(Date.now() - 259200000),
        lastAccessedAt: new Date(Date.now() - 86400000),
        accessCount: 10,
        hasStartedLearningUnit: true,
        firstLearningUnitStartedAt: new Date(Date.now() - 252000000),
        learningUnitsCompleted: 5,
        learningUnitsTotal: 5,
        status: 'completed',
        completedAt: new Date(Date.now() - 86400000)
      });
    });

    it('should identify learners at risk (accessed but not started)', async () => {
      const atRisk = await ModuleAccess.find({
        moduleId: testModuleId,
        hasStartedLearningUnit: false
      });

      expect(atRisk).toHaveLength(2);
    });

    it('should count learners by status', async () => {
      const accessed = await ModuleAccess.countDocuments({
        moduleId: testModuleId,
        status: 'accessed'
      });
      const inProgress = await ModuleAccess.countDocuments({
        moduleId: testModuleId,
        status: 'in_progress'
      });
      const completed = await ModuleAccess.countDocuments({
        moduleId: testModuleId,
        status: 'completed'
      });

      expect(accessed).toBe(2);
      expect(inProgress).toBe(2);
      expect(completed).toBe(1);
    });

    it('should find learners who started but have not progressed recently', async () => {
      const twoDaysAgo = new Date(Date.now() - 172800000);
      const stalled = await ModuleAccess.find({
        moduleId: testModuleId,
        hasStartedLearningUnit: true,
        status: 'in_progress',
        lastAccessedAt: { $lt: twoDaysAgo }
      });

      expect(stalled).toHaveLength(0); // All in-progress learners accessed recently in our test data
    });

    it('should calculate completion rate', async () => {
      const total = await ModuleAccess.countDocuments({ moduleId: testModuleId });
      const completed = await ModuleAccess.countDocuments({
        moduleId: testModuleId,
        status: 'completed'
      });

      const completionRate = (completed / total) * 100;
      expect(completionRate).toBe(20); // 1 out of 5
    });
  });
});
