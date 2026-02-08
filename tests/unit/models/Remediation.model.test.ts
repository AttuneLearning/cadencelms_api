import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Remediation from '@/models/activity/Remediation.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Remediation Model', () => {
  let mongoServer: MongoMemoryServer;

  const makeIds = () => ({
    learnerId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    moduleId: new mongoose.Types.ObjectId(),
    triggeredByCheckId: new mongoose.Types.ObjectId()
  });

  const validData = () => ({
    ...makeIds(),
    triggeredAt: new Date()
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Remediation.deleteMany({});
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid remediation with required fields', async () => {
      const data = validData();
      const remediation = await Remediation.create(data);

      expect(remediation.learnerId).toEqual(data.learnerId);
      expect(remediation.courseId).toEqual(data.courseId);
      expect(remediation.moduleId).toEqual(data.moduleId);
      expect(remediation.triggeredByCheckId).toEqual(data.triggeredByCheckId);
      expect(remediation.triggeredAt).toBeDefined();
    });

    it('should require learnerId field', async () => {
      const data = validData();
      delete (data as any).learnerId;
      const remediation = new Remediation(data);

      await expect(remediation.save()).rejects.toThrow(/learnerId/);
    });

    it('should require courseId field', async () => {
      const data = validData();
      delete (data as any).courseId;
      const remediation = new Remediation(data);

      await expect(remediation.save()).rejects.toThrow(/courseId/);
    });

    it('should require moduleId field', async () => {
      const data = validData();
      delete (data as any).moduleId;
      const remediation = new Remediation(data);

      await expect(remediation.save()).rejects.toThrow(/moduleId/);
    });

    it('should require triggeredByCheckId field', async () => {
      const data = validData();
      delete (data as any).triggeredByCheckId;
      const remediation = new Remediation(data);

      await expect(remediation.save()).rejects.toThrow(/triggeredByCheckId/);
    });

    it('should require triggeredAt field', async () => {
      const ids = makeIds();
      const remediation = new Remediation({
        ...ids,
        triggeredAt: undefined
      });
      // triggeredAt has default: Date.now, so removing it still gives a value
      // We need to explicitly unset it after construction
      remediation.triggeredAt = undefined as any;

      await expect(remediation.save()).rejects.toThrow(/triggeredAt/);
    });
  });

  describe('Default Values', () => {
    it('should default requireContentReview to true', async () => {
      const remediation = await Remediation.create(validData());

      expect(remediation.requireContentReview).toBe(true);
    });

    it('should default requireFinalRetake to false', async () => {
      const remediation = await Remediation.create(validData());

      expect(remediation.requireFinalRetake).toBe(false);
    });

    it('should default status to pending', async () => {
      const remediation = await Remediation.create(validData());

      expect(remediation.status).toBe('pending');
    });

    it('should auto-generate timestamps', async () => {
      const remediation = await Remediation.create(validData());

      expect(remediation.createdAt).toBeDefined();
      expect(remediation.updatedAt).toBeDefined();
    });
  });

  describe('Status Enum', () => {
    it('should accept pending status', async () => {
      const remediation = await Remediation.create({ ...validData(), status: 'pending' });

      expect(remediation.status).toBe('pending');
    });

    it('should accept content_reviewed status', async () => {
      const remediation = await Remediation.create({ ...validData(), status: 'content_reviewed' });

      expect(remediation.status).toBe('content_reviewed');
    });

    it('should accept final_retaken status', async () => {
      const remediation = await Remediation.create({ ...validData(), status: 'final_retaken' });

      expect(remediation.status).toBe('final_retaken');
    });

    it('should accept completed status', async () => {
      const remediation = await Remediation.create({ ...validData(), status: 'completed' });

      expect(remediation.status).toBe('completed');
    });

    it('should reject invalid status', async () => {
      const remediation = new Remediation({ ...validData(), status: 'invalid_status' });

      await expect(remediation.validate()).rejects.toThrow(/is not a valid remediation status/);
    });
  });

  describe('Optional Fields', () => {
    it('should store contentReviewedAt date', async () => {
      const now = new Date();
      const remediation = await Remediation.create({ ...validData(), contentReviewedAt: now });

      expect(remediation.contentReviewedAt?.getTime()).toBe(now.getTime());
    });

    it('should store contentItemsViewed array', async () => {
      const items = ['item-1', 'item-2', 'item-3'];
      const remediation = await Remediation.create({ ...validData(), contentItemsViewed: items });

      expect(remediation.contentItemsViewed).toHaveLength(3);
      expect(remediation.contentItemsViewed).toContain('item-1');
    });

    it('should store finalRetakeAttemptId', async () => {
      const attemptId = new mongoose.Types.ObjectId();
      const remediation = await Remediation.create({ ...validData(), finalRetakeAttemptId: attemptId });

      expect(remediation.finalRetakeAttemptId).toEqual(attemptId);
    });

    it('should store finalRetakenAt date', async () => {
      const now = new Date();
      const remediation = await Remediation.create({ ...validData(), finalRetakenAt: now });

      expect(remediation.finalRetakenAt?.getTime()).toBe(now.getTime());
    });

    it('should store finalPassed boolean', async () => {
      const remediation = await Remediation.create({ ...validData(), finalPassed: true });

      expect(remediation.finalPassed).toBe(true);
    });

    it('should store completedAt date', async () => {
      const now = new Date();
      const remediation = await Remediation.create({ ...validData(), completedAt: now });

      expect(remediation.completedAt?.getTime()).toBe(now.getTime());
    });
  });

  describe('Virtuals - isContentReviewComplete', () => {
    it('should return true when content review is not required', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false
      });

      expect(remediation.toObject().isContentReviewComplete).toBe(true);
    });

    it('should return false when content review is required but not completed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true
      });

      expect(remediation.toObject().isContentReviewComplete).toBe(false);
    });

    it('should return true when content review is required and contentReviewedAt is set', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        contentReviewedAt: new Date()
      });

      expect(remediation.toObject().isContentReviewComplete).toBe(true);
    });
  });

  describe('Virtuals - isFinalRetakeComplete', () => {
    it('should return true when final retake is not required', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireFinalRetake: false
      });

      expect(remediation.toObject().isFinalRetakeComplete).toBe(true);
    });

    it('should return false when final retake is required but not attempted', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireFinalRetake: true
      });

      expect(remediation.toObject().isFinalRetakeComplete).toBe(false);
    });

    it('should return false when final retake is required and attempted but failed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: false
      });

      expect(remediation.toObject().isFinalRetakeComplete).toBe(false);
    });

    it('should return true when final retake is required and attempted and passed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: true
      });

      expect(remediation.toObject().isFinalRetakeComplete).toBe(true);
    });
  });

  describe('Virtuals - allRequirementsMet', () => {
    it('should return true when neither requirement is active', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: false
      });

      expect(remediation.toObject().allRequirementsMet).toBe(true);
    });

    it('should return false when content review is required but not done', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: false
      });

      expect(remediation.toObject().allRequirementsMet).toBe(false);
    });

    it('should return false when final retake is required but not done', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true
      });

      expect(remediation.toObject().allRequirementsMet).toBe(false);
    });

    it('should return false when final retake is required and attempted but failed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: false
      });

      expect(remediation.toObject().allRequirementsMet).toBe(false);
    });

    it('should return true when both requirements are met', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: true,
        contentReviewedAt: new Date(),
        finalRetakenAt: new Date(),
        finalPassed: true
      });

      expect(remediation.toObject().allRequirementsMet).toBe(true);
    });
  });

  describe('Virtuals - nextStep', () => {
    it('should return null when status is completed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        status: 'completed',
        requireContentReview: true,
        requireFinalRetake: true
      });

      expect(remediation.toObject().nextStep).toBeNull();
    });

    it('should return content_review when content review is required and not done', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: false
      });

      expect(remediation.toObject().nextStep).toBe('content_review');
    });

    it('should return final_retake when content is done and final retake is required but not attempted', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        contentReviewedAt: new Date(),
        requireFinalRetake: true
      });

      expect(remediation.toObject().nextStep).toBe('final_retake');
    });

    it('should return final_retake when content review not required and final retake not attempted', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true
      });

      expect(remediation.toObject().nextStep).toBe('final_retake');
    });

    it('should return retake_again when final was attempted but failed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: false
      });

      expect(remediation.toObject().nextStep).toBe('retake_again');
    });

    it('should return null when all requirements are met but status not yet completed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        contentReviewedAt: new Date(),
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: true
      });

      expect(remediation.toObject().nextStep).toBeNull();
    });

    it('should return null when neither requirement is active', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: false
      });

      expect(remediation.toObject().nextStep).toBeNull();
    });
  });

  describe('Virtuals - isBlocking', () => {
    it('should return true when status is pending', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        status: 'pending'
      });

      expect(remediation.toObject().isBlocking).toBe(true);
    });

    it('should return true when status is content_reviewed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        status: 'content_reviewed'
      });

      expect(remediation.toObject().isBlocking).toBe(true);
    });

    it('should return true when status is final_retaken', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        status: 'final_retaken'
      });

      expect(remediation.toObject().isBlocking).toBe(true);
    });

    it('should return false when status is completed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        status: 'completed'
      });

      expect(remediation.toObject().isBlocking).toBe(false);
    });
  });

  describe('Virtuals - toJSON/toObject', () => {
    it('should include virtuals in toJSON output', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: false
      });

      const json = remediation.toJSON();
      expect(json).toHaveProperty('isContentReviewComplete');
      expect(json).toHaveProperty('isFinalRetakeComplete');
      expect(json).toHaveProperty('allRequirementsMet');
      expect(json).toHaveProperty('nextStep');
      expect(json).toHaveProperty('isBlocking');
    });

    it('should include virtuals in toObject output', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: false
      });

      const obj = remediation.toObject();
      expect(obj).toHaveProperty('isContentReviewComplete');
      expect(obj).toHaveProperty('isFinalRetakeComplete');
      expect(obj).toHaveProperty('allRequirementsMet');
      expect(obj).toHaveProperty('nextStep');
      expect(obj).toHaveProperty('isBlocking');
    });
  });

  describe('Method - updateStatus', () => {
    it('should set status to pending when nothing is completed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: true
      });

      const status = remediation.updateStatus();

      expect(status).toBe('pending');
      expect(remediation.status).toBe('pending');
    });

    it('should set status to content_reviewed when only content is reviewed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: true,
        contentReviewedAt: new Date()
      });

      const status = remediation.updateStatus();

      expect(status).toBe('content_reviewed');
      expect(remediation.status).toBe('content_reviewed');
    });

    it('should set status to final_retaken when final is retaken but not passed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: false
      });

      const status = remediation.updateStatus();

      expect(status).toBe('final_retaken');
      expect(remediation.status).toBe('final_retaken');
    });

    it('should set status to completed when all requirements are met', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: true,
        contentReviewedAt: new Date(),
        finalRetakenAt: new Date(),
        finalPassed: true
      });

      const status = remediation.updateStatus();

      expect(status).toBe('completed');
      expect(remediation.status).toBe('completed');
      expect(remediation.completedAt).toBeDefined();
    });

    it('should set status to completed when content review not required and final passed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: true,
        finalRetakenAt: new Date(),
        finalPassed: true
      });

      const status = remediation.updateStatus();

      expect(status).toBe('completed');
      expect(remediation.status).toBe('completed');
    });

    it('should set status to completed when final retake not required and content reviewed', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: false,
        contentReviewedAt: new Date()
      });

      const status = remediation.updateStatus();

      expect(status).toBe('completed');
      expect(remediation.status).toBe('completed');
    });

    it('should set status to completed when neither is required', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: false
      });

      const status = remediation.updateStatus();

      expect(status).toBe('completed');
      expect(remediation.status).toBe('completed');
    });

    it('should not overwrite existing completedAt when already set', async () => {
      const originalCompletedAt = new Date('2025-01-01');
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: false,
        requireFinalRetake: false,
        completedAt: originalCompletedAt
      });

      remediation.updateStatus();

      expect(remediation.completedAt?.getTime()).toBe(originalCompletedAt.getTime());
    });

    it('should set completedAt when transitioning to completed for the first time', async () => {
      const remediation = await Remediation.create({
        ...validData(),
        requireContentReview: true,
        requireFinalRetake: false
      });

      expect(remediation.completedAt).toBeUndefined();

      remediation.contentReviewedAt = new Date();
      remediation.updateStatus();

      expect(remediation.status).toBe('completed');
      expect(remediation.completedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should enforce unique triggeredByCheckId', async () => {
      const checkId = new mongoose.Types.ObjectId();
      await Remediation.create({ ...validData(), triggeredByCheckId: checkId });

      await expect(
        Remediation.create({ ...validData(), triggeredByCheckId: checkId })
      ).rejects.toThrow();
    });

    it('should find remediations by learnerId and courseId and status', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();

      await Remediation.create({
        ...validData(),
        learnerId,
        courseId,
        status: 'pending'
      });

      await Remediation.create({
        ...validData(),
        learnerId,
        courseId,
        status: 'completed'
      });

      const pending = await Remediation.find({ learnerId, courseId, status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
    });

    it('should find remediations by learnerId, courseId, moduleId, and status', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const moduleId = new mongoose.Types.ObjectId();

      await Remediation.create({
        ...validData(),
        learnerId,
        courseId,
        moduleId,
        status: 'pending'
      });

      const results = await Remediation.find({
        learnerId,
        courseId,
        moduleId,
        status: 'pending'
      });
      expect(results).toHaveLength(1);
    });
  });
});
