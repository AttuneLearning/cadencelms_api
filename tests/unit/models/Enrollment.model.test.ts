import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Enrollment Model', () => {
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
    await Enrollment.deleteMany({});
  });

  const createEnrollment = (overrides: any = {}) => {
    return Enrollment.create({
      learnerId: new mongoose.Types.ObjectId(),
      programId: new mongoose.Types.ObjectId(),
      academicYearId: new mongoose.Types.ObjectId(),
      status: 'active',
      enrollmentDate: new Date(),
      ...overrides
    });
  };

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid enrollment with required fields', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const programId = new mongoose.Types.ObjectId();
      const academicYearId = new mongoose.Types.ObjectId();
      const enrollmentDate = new Date();

      const enrollment = await createEnrollment({
        learnerId,
        programId,
        academicYearId,
        status: 'active',
        enrollmentDate
      });

      expect(enrollment.learnerId).toEqual(learnerId);
      expect(enrollment.programId).toEqual(programId);
      expect(enrollment.academicYearId).toEqual(academicYearId);
      expect(enrollment.status).toBe('active');
      expect(enrollment.enrollmentDate.getTime()).toBe(enrollmentDate.getTime());
    });

    it('should require learnerId', async () => {
      const doc = new Enrollment({
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(doc.save()).rejects.toThrow(/learnerId is required/);
    });

    it('should require programId', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(doc.save()).rejects.toThrow(/programId is required/);
    });

    it('should require academicYearId', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(doc.save()).rejects.toThrow(/academicYearId is required/);
    });

    it('should require status', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        enrollmentDate: new Date()
      });

      await expect(doc.save()).rejects.toThrow(/status is required/);
    });

    it('should require enrollmentDate', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active'
      });

      await expect(doc.save()).rejects.toThrow(/enrollmentDate is required/);
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'active', 'suspended', 'withdrawn', 'completed', 'graduated', 'expired'];

      for (const status of statuses) {
        const enrollment = await createEnrollment({ status });
        expect(enrollment.status).toBe(status);
      }
    });

    it('should reject invalid status', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'cancelled' as any,
        enrollmentDate: new Date()
      });

      await expect(doc.validate()).rejects.toThrow(/is not a valid enrollment status/);
    });
  });

  describe('Field Constraints', () => {
    it('should enforce cumulativeGPA minimum of 0', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        cumulativeGPA: -0.1
      });

      await expect(doc.validate()).rejects.toThrow(/cumulativeGPA must be at least 0/);
    });

    it('should enforce cumulativeGPA maximum of 4', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        cumulativeGPA: 4.1
      });

      await expect(doc.validate()).rejects.toThrow(/cumulativeGPA cannot exceed 4/);
    });

    it('should accept cumulativeGPA at 0', async () => {
      const enrollment = await createEnrollment({ cumulativeGPA: 0 });
      expect(enrollment.cumulativeGPA).toBe(0);
    });

    it('should accept cumulativeGPA at 4', async () => {
      const enrollment = await createEnrollment({ cumulativeGPA: 4 });
      expect(enrollment.cumulativeGPA).toBe(4);
    });

    it('should accept cumulativeGPA at 3.5', async () => {
      const enrollment = await createEnrollment({ cumulativeGPA: 3.5 });
      expect(enrollment.cumulativeGPA).toBe(3.5);
    });

    it('should enforce totalCreditsEarned minimum of 0', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        totalCreditsEarned: -1
      });

      await expect(doc.validate()).rejects.toThrow(/totalCreditsEarned cannot be negative/);
    });

    it('should accept totalCreditsEarned at 0', async () => {
      const enrollment = await createEnrollment({ totalCreditsEarned: 0 });
      expect(enrollment.totalCreditsEarned).toBe(0);
    });

    it('should accept totalCreditsEarned at positive value', async () => {
      const enrollment = await createEnrollment({ totalCreditsEarned: 120 });
      expect(enrollment.totalCreditsEarned).toBe(120);
    });

    it('should enforce accessExtensionCount minimum of 0', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        accessExtensionCount: -1
      });

      await expect(doc.validate()).rejects.toThrow(/Access extension count cannot be negative/);
    });

    it('should accept accessExtensionCount at 0', async () => {
      const enrollment = await createEnrollment({ accessExtensionCount: 0 });
      expect(enrollment.accessExtensionCount).toBe(0);
    });

    it('should accept accessExtensionCount at positive value', async () => {
      const enrollment = await createEnrollment({ accessExtensionCount: 3 });
      expect(enrollment.accessExtensionCount).toBe(3);
    });

    it('should enforce accessExtensionReason maxlength of 500', async () => {
      const doc = new Enrollment({
        learnerId: new mongoose.Types.ObjectId(),
        programId: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        accessExtensionReason: 'A'.repeat(501)
      });

      await expect(doc.validate()).rejects.toThrow(/Access extension reason cannot exceed 500 characters/);
    });

    it('should accept accessExtensionReason at exactly 500 characters', async () => {
      const enrollment = await createEnrollment({ accessExtensionReason: 'A'.repeat(500) });
      expect(enrollment.accessExtensionReason).toHaveLength(500);
    });
  });

  describe('Default Values', () => {
    it('should default totalCreditsEarned to 0', async () => {
      const enrollment = await createEnrollment();
      expect(enrollment.totalCreditsEarned).toBe(0);
    });

    it('should default accessExtensionCount to 0', async () => {
      const enrollment = await createEnrollment();
      expect(enrollment.accessExtensionCount).toBe(0);
    });
  });

  describe('Optional Fields', () => {
    it('should store startDate', async () => {
      const startDate = new Date();
      const enrollment = await createEnrollment({ startDate });
      expect(enrollment.startDate!.getTime()).toBe(startDate.getTime());
    });

    it('should store completionDate', async () => {
      const completionDate = new Date();
      const enrollment = await createEnrollment({ completionDate });
      expect(enrollment.completionDate!.getTime()).toBe(completionDate.getTime());
    });

    it('should store graduationDate', async () => {
      const graduationDate = new Date();
      const enrollment = await createEnrollment({ graduationDate });
      expect(enrollment.graduationDate!.getTime()).toBe(graduationDate.getTime());
    });

    it('should store withdrawalDate', async () => {
      const withdrawalDate = new Date();
      const enrollment = await createEnrollment({ status: 'withdrawn', withdrawalDate });
      expect(enrollment.withdrawalDate!.getTime()).toBe(withdrawalDate.getTime());
    });

    it('should store withdrawalReason', async () => {
      const enrollment = await createEnrollment({
        status: 'withdrawn',
        withdrawalReason: 'Personal reasons'
      });
      expect(enrollment.withdrawalReason).toBe('Personal reasons');
    });

    it('should trim withdrawalReason', async () => {
      const enrollment = await createEnrollment({
        withdrawalReason: '  Trimmed reason  '
      });
      expect(enrollment.withdrawalReason).toBe('Trimmed reason');
    });

    it('should store currentTerm', async () => {
      const enrollment = await createEnrollment({ currentTerm: 'Fall 2026' });
      expect(enrollment.currentTerm).toBe('Fall 2026');
    });

    it('should trim currentTerm', async () => {
      const enrollment = await createEnrollment({ currentTerm: '  Spring 2026  ' });
      expect(enrollment.currentTerm).toBe('Spring 2026');
    });

    it('should store accessExpiresAt', async () => {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const enrollment = await createEnrollment({ accessExpiresAt: expiresAt });
      expect(enrollment.accessExpiresAt!.getTime()).toBe(expiresAt.getTime());
    });

    it('should store accessExtendedAt', async () => {
      const extendedAt = new Date();
      const enrollment = await createEnrollment({ accessExtendedAt: extendedAt });
      expect(enrollment.accessExtendedAt!.getTime()).toBe(extendedAt.getTime());
    });

    it('should store accessExtensionReason', async () => {
      const enrollment = await createEnrollment({
        accessExtensionReason: 'Extension request approved'
      });
      expect(enrollment.accessExtensionReason).toBe('Extension request approved');
    });

    it('should trim accessExtensionReason', async () => {
      const enrollment = await createEnrollment({
        accessExtensionReason: '  Approved by admin  '
      });
      expect(enrollment.accessExtensionReason).toBe('Approved by admin');
    });

    it('should store metadata', async () => {
      const enrollment = await createEnrollment({
        metadata: { source: 'bulk-import', batchId: 'batch-001' }
      });
      expect(enrollment.metadata!.source).toBe('bulk-import');
      expect(enrollment.metadata!.batchId).toBe('batch-001');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const enrollment = await createEnrollment();
      expect(enrollment.createdAt).toBeDefined();
      expect(enrollment.createdAt).toBeInstanceOf(Date);
      expect(enrollment.updatedAt).toBeDefined();
      expect(enrollment.updatedAt).toBeInstanceOf(Date);
    });

    it('should have timestamps close to current time', async () => {
      const before = new Date();
      const enrollment = await createEnrollment();
      const after = new Date();

      expect(enrollment.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(enrollment.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Compound Unique Index (learnerId + programId + academicYearId)', () => {
    it('should reject duplicate enrollment for same learner, program, and academic year', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const programId = new mongoose.Types.ObjectId();
      const academicYearId = new mongoose.Types.ObjectId();

      await createEnrollment({ learnerId, programId, academicYearId });

      await expect(
        createEnrollment({ learnerId, programId, academicYearId })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same learner in different programs', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const academicYearId = new mongoose.Types.ObjectId();

      await createEnrollment({ learnerId, programId: new mongoose.Types.ObjectId(), academicYearId });
      const enrollment2 = await createEnrollment({ learnerId, programId: new mongoose.Types.ObjectId(), academicYearId });

      expect(enrollment2.learnerId).toEqual(learnerId);
    });

    it('should allow same learner in same program but different academic years', async () => {
      const learnerId = new mongoose.Types.ObjectId();
      const programId = new mongoose.Types.ObjectId();

      await createEnrollment({ learnerId, programId, academicYearId: new mongoose.Types.ObjectId() });
      const enrollment2 = await createEnrollment({ learnerId, programId, academicYearId: new mongoose.Types.ObjectId() });

      expect(enrollment2.programId).toEqual(programId);
    });

    it('should allow different learners in same program and academic year', async () => {
      const programId = new mongoose.Types.ObjectId();
      const academicYearId = new mongoose.Types.ObjectId();

      await createEnrollment({ learnerId: new mongoose.Types.ObjectId(), programId, academicYearId });
      const enrollment2 = await createEnrollment({ learnerId: new mongoose.Types.ObjectId(), programId, academicYearId });

      expect(enrollment2.programId).toEqual(programId);
    });
  });

  describe('Queries', () => {
    it('should find enrollments by learnerId', async () => {
      const learnerId = new mongoose.Types.ObjectId();

      await createEnrollment({ learnerId, programId: new mongoose.Types.ObjectId() });
      await createEnrollment({ learnerId, programId: new mongoose.Types.ObjectId() });
      await createEnrollment({ learnerId: new mongoose.Types.ObjectId() });

      const enrollments = await Enrollment.find({ learnerId });
      expect(enrollments).toHaveLength(2);
    });

    it('should find enrollments by status', async () => {
      await createEnrollment({ status: 'active' });
      await createEnrollment({ status: 'active' });
      await createEnrollment({ status: 'pending' });

      const activeEnrollments = await Enrollment.find({ status: 'active' });
      expect(activeEnrollments).toHaveLength(2);
    });

    it('should find enrollments by programId and academicYearId', async () => {
      const programId = new mongoose.Types.ObjectId();
      const academicYearId = new mongoose.Types.ObjectId();

      await createEnrollment({ programId, academicYearId });
      await createEnrollment({ programId, academicYearId });
      await createEnrollment({ programId, academicYearId: new mongoose.Types.ObjectId() });

      const enrollments = await Enrollment.find({ programId, academicYearId });
      expect(enrollments).toHaveLength(2);
    });
  });
});
