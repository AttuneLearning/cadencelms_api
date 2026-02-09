import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LearnerException from '@/models/exception/LearnerException.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('LearnerException Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await LearnerException.deleteMany({});
  });

  const validData = () => ({
    enrollmentId: new mongoose.Types.ObjectId(),
    learnerId: new mongoose.Types.ObjectId(),
    departmentId: new mongoose.Types.ObjectId(),
    type: 'extra_attempts' as const,
    reason: 'Learner needs additional time due to medical condition',
    grantedBy: new mongoose.Types.ObjectId(),
    metadata: {
      assessmentId: new mongoose.Types.ObjectId(),
      additionalAttempts: 3
    }
  });

  // ──────────────────────────────────────────────────
  // Required Fields
  // ──────────────────────────────────────────────────
  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without enrollmentId', async () => {
      const data = validData();
      delete (data as any).enrollmentId;
      await expect(LearnerException.create(data)).rejects.toThrow(/Enrollment ID is required/);
    });

    it('should fail without learnerId', async () => {
      const data = validData();
      delete (data as any).learnerId;
      await expect(LearnerException.create(data)).rejects.toThrow(/Learner ID is required/);
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(LearnerException.create(data)).rejects.toThrow(/Department ID is required/);
    });

    it('should fail without type', async () => {
      const data = validData();
      delete (data as any).type;
      await expect(LearnerException.create(data)).rejects.toThrow(/Exception type is required/);
    });

    it('should fail without reason', async () => {
      const data = validData();
      delete (data as any).reason;
      await expect(LearnerException.create(data)).rejects.toThrow(/Reason is required/);
    });

    it('should fail without grantedBy', async () => {
      const data = validData();
      delete (data as any).grantedBy;
      await expect(LearnerException.create(data)).rejects.toThrow(/Granted by is required/);
    });
  });

  // ──────────────────────────────────────────────────
  // Enum Validation
  // ──────────────────────────────────────────────────
  describe('Schema Validation - Enums', () => {
    it('should accept all valid exception types', async () => {
      const types = ['extra_attempts', 'extended_access', 'module_unlock', 'grade_override', 'excuse_content'] as const;
      for (const type of types) {
        const data = { ...validData(), type };
        const doc = await LearnerException.create(data);
        expect(doc.type).toBe(type);
      }
    });

    it('should reject invalid exception type', async () => {
      const data = { ...validData(), type: 'invalid_type' };
      await expect(LearnerException.create(data)).rejects.toThrow(/is not a valid exception type/);
    });
  });

  // ──────────────────────────────────────────────────
  // Defaults
  // ──────────────────────────────────────────────────
  describe('Schema Validation - Defaults', () => {
    it('should default isActive to true', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.isActive).toBe(true);
    });

    it('should default grantedAt to approximately now', async () => {
      const before = Date.now();
      const doc = await LearnerException.create(validData());
      const after = Date.now();
      expect(doc.grantedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(doc.grantedAt.getTime()).toBeLessThanOrEqual(after + 1000);
    });

    it('should default expiresAt to null', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.expiresAt).toBeNull();
    });

    it('should default revokedAt to null', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.revokedAt).toBeNull();
    });

    it('should default revokedBy to null', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.revokedBy).toBeNull();
    });

    it('should default revokeReason to null', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.revokeReason).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────
  // Field Constraints
  // ──────────────────────────────────────────────────
  describe('Schema Validation - Field Constraints', () => {
    it('should reject reason exceeding 2000 characters', async () => {
      const data = { ...validData(), reason: 'x'.repeat(2001) };
      await expect(LearnerException.create(data)).rejects.toThrow(/Reason cannot exceed 2000 characters/);
    });

    it('should accept reason at exactly 2000 characters', async () => {
      const data = { ...validData(), reason: 'x'.repeat(2000) };
      const doc = await LearnerException.create(data);
      expect(doc.reason).toHaveLength(2000);
    });

    it('should reject revokeReason exceeding 2000 characters', async () => {
      const data = { ...validData(), revokeReason: 'x'.repeat(2001) };
      await expect(LearnerException.create(data)).rejects.toThrow(/Revoke reason cannot exceed 2000 characters/);
    });
  });

  // ──────────────────────────────────────────────────
  // Metadata
  // ──────────────────────────────────────────────────
  describe('Schema Validation - Metadata', () => {
    it('should accept extra_attempts metadata', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.metadata.assessmentId).toBeDefined();
      expect(doc.metadata.additionalAttempts).toBe(3);
    });

    it('should accept extended_access metadata', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const data = {
        ...validData(),
        type: 'extended_access',
        metadata: {
          newExpiryDate: futureDate,
          previousExpiryDate: new Date()
        }
      };
      const doc = await LearnerException.create(data);
      expect(doc.metadata.newExpiryDate).toBeDefined();
      expect(doc.metadata.previousExpiryDate).toBeDefined();
    });

    it('should accept module_unlock metadata', async () => {
      const data = {
        ...validData(),
        type: 'module_unlock',
        metadata: { moduleId: new mongoose.Types.ObjectId() }
      };
      const doc = await LearnerException.create(data);
      expect(doc.metadata.moduleId).toBeDefined();
    });

    it('should accept grade_override metadata', async () => {
      const data = {
        ...validData(),
        type: 'grade_override',
        metadata: {
          assessmentId: new mongoose.Types.ObjectId(),
          attemptId: new mongoose.Types.ObjectId(),
          previousGrade: 65,
          newGrade: 85
        }
      };
      const doc = await LearnerException.create(data);
      expect(doc.metadata.previousGrade).toBe(65);
      expect(doc.metadata.newGrade).toBe(85);
    });

    it('should accept excuse_content metadata', async () => {
      const data = {
        ...validData(),
        type: 'excuse_content',
        metadata: {
          contentId: new mongoose.Types.ObjectId(),
          contentType: 'lesson'
        }
      };
      const doc = await LearnerException.create(data);
      expect(doc.metadata.contentId).toBeDefined();
      expect(doc.metadata.contentType).toBe('lesson');
    });

    it('should reject invalid contentType in metadata', async () => {
      const data = {
        ...validData(),
        type: 'excuse_content',
        metadata: {
          contentId: new mongoose.Types.ObjectId(),
          contentType: 'invalid'
        }
      };
      await expect(LearnerException.create(data)).rejects.toThrow(/is not a valid content type/);
    });

    it('should reject additionalAttempts less than 1', async () => {
      const data = {
        ...validData(),
        metadata: {
          assessmentId: new mongoose.Types.ObjectId(),
          additionalAttempts: 0
        }
      };
      await expect(LearnerException.create(data)).rejects.toThrow(/Additional attempts must be at least 1/);
    });

    it('should reject additionalAttempts greater than 100', async () => {
      const data = {
        ...validData(),
        metadata: {
          assessmentId: new mongoose.Types.ObjectId(),
          additionalAttempts: 101
        }
      };
      await expect(LearnerException.create(data)).rejects.toThrow(/Additional attempts cannot exceed 100/);
    });
  });

  // ──────────────────────────────────────────────────
  // Indexes
  // ──────────────────────────────────────────────────
  describe('Indexes', () => {
    it('should have compound indexes defined', async () => {
      const indexes = LearnerException.schema.indexes();
      const indexKeys = indexes.map(([fields]) => JSON.stringify(fields));

      expect(indexKeys).toContainEqual(JSON.stringify({ enrollmentId: 1, type: 1, isActive: 1 }));
      expect(indexKeys).toContainEqual(JSON.stringify({ learnerId: 1, type: 1, isActive: 1 }));
      expect(indexKeys).toContainEqual(JSON.stringify({ departmentId: 1, isActive: 1, createdAt: -1 }));
      expect(indexKeys).toContainEqual(JSON.stringify({ grantedBy: 1 }));
    });
  });

  // ──────────────────────────────────────────────────
  // Timestamps
  // ──────────────────────────────────────────────────
  describe('Timestamps', () => {
    it('should include createdAt and updatedAt', async () => {
      const doc = await LearnerException.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────
  // Revocation Fields
  // ──────────────────────────────────────────────────
  describe('Revocation', () => {
    it('should allow setting revocation fields', async () => {
      const doc = await LearnerException.create(validData());
      const revokedById = new mongoose.Types.ObjectId();

      doc.isActive = false;
      doc.revokedAt = new Date();
      doc.revokedBy = revokedById;
      doc.revokeReason = 'No longer needed';
      await doc.save();

      const updated = await LearnerException.findById(doc._id);
      expect(updated!.isActive).toBe(false);
      expect(updated!.revokedAt).toBeDefined();
      expect(updated!.revokedBy!.toString()).toBe(revokedById.toString());
      expect(updated!.revokeReason).toBe('No longer needed');
    });
  });
});
