import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ModuleAccessService } from '@/services/progress/module-access.service';
import ModuleAccess from '@/models/progress/ModuleAccess.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ModuleAccessService - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('recordAccess()', () => {
    it('should create new access record on first access', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const result = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      expect(result).toBeDefined();
      expect(result.learnerId.toString()).toBe(learnerId);
      expect(result.moduleId.toString()).toBe(moduleId);
      expect(result.enrollmentId.toString()).toBe(enrollmentId);
      expect(result.courseId.toString()).toBe(courseId);
      expect(result.accessCount).toBe(1);
      expect(result.status).toBe('accessed');
      expect(result.hasStartedLearningUnit).toBe(false);
      expect(result.firstAccessedAt).toBeDefined();
      expect(result.lastAccessedAt).toBeDefined();
    });

    it('should update existing access record on subsequent access (upsert)', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      // First access
      const firstResult = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const firstAccessTime = firstResult.firstAccessedAt;

      // Wait a bit to ensure timestamps differ
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second access
      const secondResult = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      expect(secondResult.accessCount).toBe(2);
      expect(secondResult.firstAccessedAt.getTime()).toBe(firstAccessTime.getTime());
      expect(secondResult.lastAccessedAt.getTime()).toBeGreaterThan(firstAccessTime.getTime());
    });

    it('should preserve status on subsequent access', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      // First access
      const firstResult = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      // Mark as in_progress
      await ModuleAccessService.markLearningUnitStarted(firstResult._id.toString());

      // Another access
      const secondResult = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      expect(secondResult.status).toBe('in_progress');
      expect(secondResult.hasStartedLearningUnit).toBe(true);
    });

    it('should handle multiple learners accessing same module', async () => {
      const learner1Id = new mongoose.Types.ObjectId().toString();
      const learner2Id = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollment1Id = new mongoose.Types.ObjectId().toString();
      const enrollment2Id = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      await ModuleAccessService.recordAccess(learner1Id, moduleId, enrollment1Id, courseId);
      await ModuleAccessService.recordAccess(learner2Id, moduleId, enrollment2Id, courseId);

      const allAccess = await ModuleAccess.find({ moduleId });
      expect(allAccess).toHaveLength(2);
    });
  });

  describe('getAccessByEnrollment()', () => {
    it('should return all module access records for an enrollment', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();
      const module1Id = new mongoose.Types.ObjectId().toString();
      const module2Id = new mongoose.Types.ObjectId().toString();
      const module3Id = new mongoose.Types.ObjectId().toString();

      await ModuleAccessService.recordAccess(learnerId, module1Id, enrollmentId, courseId);
      await ModuleAccessService.recordAccess(learnerId, module2Id, enrollmentId, courseId);
      await ModuleAccessService.recordAccess(learnerId, module3Id, enrollmentId, courseId);

      const result = await ModuleAccessService.getAccessByEnrollment(enrollmentId);

      expect(result).toHaveLength(3);
    });

    it('should return empty array if no access records exist', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();

      const result = await ModuleAccessService.getAccessByEnrollment(enrollmentId);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should not return access records from other enrollments', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const enrollment1Id = new mongoose.Types.ObjectId().toString();
      const enrollment2Id = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();

      await ModuleAccessService.recordAccess(learnerId, moduleId, enrollment1Id, courseId);
      await ModuleAccessService.recordAccess(learnerId, moduleId, enrollment2Id, courseId);

      const result = await ModuleAccessService.getAccessByEnrollment(enrollment1Id);

      expect(result).toHaveLength(1);
      expect(result[0].enrollmentId.toString()).toBe(enrollment1Id);
    });
  });

  describe('getAccessByModule()', () => {
    it('should return all access records for a module with pagination', async () => {
      const moduleId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      // Create 5 access records
      for (let i = 0; i < 5; i++) {
        await ModuleAccessService.recordAccess(
          new mongoose.Types.ObjectId().toString(),
          moduleId,
          new mongoose.Types.ObjectId().toString(),
          courseId
        );
      }

      const result = await ModuleAccessService.getAccessByModule(moduleId, {
        page: 1,
        limit: 3
      });

      expect(result.accessRecords).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should filter by hasStartedLearningUnit', async () => {
      const moduleId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      // Create 3 access records
      const access1 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access3 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );

      // Mark 2 as started
      await ModuleAccessService.markLearningUnitStarted(access1._id.toString());
      await ModuleAccessService.markLearningUnitStarted(access3._id.toString());

      const startedResult = await ModuleAccessService.getAccessByModule(moduleId, {
        hasStartedLearningUnit: true
      });
      expect(startedResult.accessRecords).toHaveLength(2);

      const notStartedResult = await ModuleAccessService.getAccessByModule(moduleId, {
        hasStartedLearningUnit: false
      });
      expect(notStartedResult.accessRecords).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const moduleId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      // Create 3 access records
      const access1 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access2 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );

      // Change statuses
      await ModuleAccessService.markLearningUnitStarted(access1._id.toString());
      await ModuleAccessService.markCompleted(access2._id.toString());

      const accessedResult = await ModuleAccessService.getAccessByModule(moduleId, {
        status: 'accessed'
      });
      expect(accessedResult.accessRecords).toHaveLength(1);

      const inProgressResult = await ModuleAccessService.getAccessByModule(moduleId, {
        status: 'in_progress'
      });
      expect(inProgressResult.accessRecords).toHaveLength(1);

      const completedResult = await ModuleAccessService.getAccessByModule(moduleId, {
        status: 'completed'
      });
      expect(completedResult.accessRecords).toHaveLength(1);
    });

    it('should return empty results when no access records exist', async () => {
      const moduleId = new mongoose.Types.ObjectId().toString();

      const result = await ModuleAccessService.getAccessByModule(moduleId, {});

      expect(result.accessRecords).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getAccessSummary()', () => {
    it('should return correct summary statistics for a course', async () => {
      const courseId = new mongoose.Types.ObjectId().toString();
      const module1Id = new mongoose.Types.ObjectId().toString();
      const module2Id = new mongoose.Types.ObjectId().toString();

      // Create access records with different statuses
      const access1 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        module1Id,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access2 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        module1Id,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access3 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        module2Id,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access4 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        module2Id,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );

      // Set statuses: 1 accessed, 2 in_progress, 1 completed
      await ModuleAccessService.markLearningUnitStarted(access2._id.toString());
      await ModuleAccessService.markLearningUnitStarted(access3._id.toString());
      await ModuleAccessService.markCompleted(access4._id.toString());

      const summary = await ModuleAccessService.getAccessSummary(courseId);

      expect(summary.totalModules).toBe(2); // 2 unique modules
      expect(summary.totalAccess).toBe(4);
      expect(summary.accessedOnly).toBe(1);
      expect(summary.inProgress).toBe(2);
      expect(summary.completed).toBe(1);
      expect(summary.dropOffRate).toBeCloseTo(0.25, 2); // 1 out of 4 never started
    });

    it('should return zero values when no access records exist', async () => {
      const courseId = new mongoose.Types.ObjectId().toString();

      const summary = await ModuleAccessService.getAccessSummary(courseId);

      expect(summary.totalModules).toBe(0);
      expect(summary.totalAccess).toBe(0);
      expect(summary.accessedOnly).toBe(0);
      expect(summary.inProgress).toBe(0);
      expect(summary.completed).toBe(0);
      expect(summary.dropOffRate).toBe(0);
    });

    it('should handle all completed scenario', async () => {
      const courseId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();

      const access1 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );
      const access2 = await ModuleAccessService.recordAccess(
        new mongoose.Types.ObjectId().toString(),
        moduleId,
        new mongoose.Types.ObjectId().toString(),
        courseId
      );

      await ModuleAccessService.markCompleted(access1._id.toString());
      await ModuleAccessService.markCompleted(access2._id.toString());

      const summary = await ModuleAccessService.getAccessSummary(courseId);

      expect(summary.dropOffRate).toBe(0); // No one dropped off
      expect(summary.completed).toBe(2);
    });
  });

  describe('markLearningUnitStarted()', () => {
    it('should mark learning unit as started and update status', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const result = await ModuleAccessService.markLearningUnitStarted(access._id.toString());

      expect(result.hasStartedLearningUnit).toBe(true);
      expect(result.status).toBe('in_progress');
      expect(result.firstLearningUnitStartedAt).toBeDefined();
    });

    it('should not overwrite firstLearningUnitStartedAt on subsequent calls', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const firstResult = await ModuleAccessService.markLearningUnitStarted(access._id.toString());
      const firstStartTime = firstResult.firstLearningUnitStartedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const secondResult = await ModuleAccessService.markLearningUnitStarted(access._id.toString());

      expect(secondResult.firstLearningUnitStartedAt.getTime()).toBe(firstStartTime.getTime());
    });

    it('should throw error for invalid moduleAccessId', async () => {
      const invalidId = 'invalid-id';

      await expect(
        ModuleAccessService.markLearningUnitStarted(invalidId)
      ).rejects.toThrow('Module access record not found');
    });

    it('should throw error for non-existent moduleAccessId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        ModuleAccessService.markLearningUnitStarted(nonExistentId)
      ).rejects.toThrow('Module access record not found');
    });
  });

  describe('updateProgress()', () => {
    it('should update learning unit progress', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const result = await ModuleAccessService.updateProgress(access._id.toString(), 3, 10);

      expect(result.learningUnitsCompleted).toBe(3);
      expect(result.learningUnitsTotal).toBe(10);
    });

    it('should auto-set status to in_progress when progress is updated', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      expect(access.status).toBe('accessed');

      const result = await ModuleAccessService.updateProgress(access._id.toString(), 1, 5);

      expect(result.status).toBe('in_progress');
      expect(result.hasStartedLearningUnit).toBe(true);
    });

    it('should throw error for invalid moduleAccessId', async () => {
      await expect(
        ModuleAccessService.updateProgress('invalid-id', 3, 10)
      ).rejects.toThrow('Module access record not found');
    });

    it('should throw error if completed exceeds total', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      await expect(
        ModuleAccessService.updateProgress(access._id.toString(), 15, 10)
      ).rejects.toThrow('Completed units cannot exceed total units');
    });

    it('should throw error for negative values', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      await expect(
        ModuleAccessService.updateProgress(access._id.toString(), -1, 10)
      ).rejects.toThrow('Progress values must be non-negative');
    });
  });

  describe('markCompleted()', () => {
    it('should mark module as completed', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const result = await ModuleAccessService.markCompleted(access._id.toString());

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should set hasStartedLearningUnit to true when completing', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      expect(access.hasStartedLearningUnit).toBe(false);

      const result = await ModuleAccessService.markCompleted(access._id.toString());

      expect(result.hasStartedLearningUnit).toBe(true);
    });

    it('should not overwrite completedAt on subsequent calls', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      const firstResult = await ModuleAccessService.markCompleted(access._id.toString());
      const firstCompletedTime = firstResult.completedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const secondResult = await ModuleAccessService.markCompleted(access._id.toString());

      expect(secondResult.completedAt.getTime()).toBe(firstCompletedTime.getTime());
    });

    it('should throw error for invalid moduleAccessId', async () => {
      await expect(
        ModuleAccessService.markCompleted('invalid-id')
      ).rejects.toThrow('Module access record not found');
    });

    it('should throw error for non-existent moduleAccessId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        ModuleAccessService.markCompleted(nonExistentId)
      ).rejects.toThrow('Module access record not found');
    });
  });

  describe('Status transitions', () => {
    it('should transition from accessed to in_progress', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );
      expect(access.status).toBe('accessed');

      const result = await ModuleAccessService.markLearningUnitStarted(access._id.toString());
      expect(result.status).toBe('in_progress');
    });

    it('should transition from in_progress to completed', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );

      await ModuleAccessService.markLearningUnitStarted(access._id.toString());
      const result = await ModuleAccessService.markCompleted(access._id.toString());

      expect(result.status).toBe('completed');
    });

    it('should allow direct transition from accessed to completed', async () => {
      const learnerId = new mongoose.Types.ObjectId().toString();
      const moduleId = new mongoose.Types.ObjectId().toString();
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();

      const access = await ModuleAccessService.recordAccess(
        learnerId,
        moduleId,
        enrollmentId,
        courseId
      );
      expect(access.status).toBe('accessed');

      const result = await ModuleAccessService.markCompleted(access._id.toString());
      expect(result.status).toBe('completed');
    });
  });
});
