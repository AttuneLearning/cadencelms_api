import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CertificateIssuance from '@/models/certificate/CertificateIssuance.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CertificateIssuance Model', () => {
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
    await CertificateIssuance.deleteMany({});
  });

  const validCompletedRequirement = () => ({
    courseVersionId: new mongoose.Types.ObjectId(),
    courseTitle: 'Introduction to Cloud Computing',
    completedAt: new Date(),
    finalScore: 85,
    enrollmentId: new mongoose.Types.ObjectId()
  });

  const validData = () => ({
    certificateDefinitionId: new mongoose.Types.ObjectId(),
    credentialGroupId: new mongoose.Types.ObjectId(),
    learnerId: new mongoose.Types.ObjectId(),
    completedRequirements: [validCompletedRequirement()],
    verificationCode: 'ABCDEFGHJKLM'  // 12 chars, no I/O/0/1
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without certificateDefinitionId', async () => {
      const data = validData();
      delete (data as any).certificateDefinitionId;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Certificate definition is required/);
    });

    it('should fail without credentialGroupId', async () => {
      const data = validData();
      delete (data as any).credentialGroupId;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Credential group is required/);
    });

    it('should fail without learnerId', async () => {
      const data = validData();
      delete (data as any).learnerId;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Learner is required/);
    });

    it('should fail without completedRequirements', async () => {
      const data = validData();
      delete (data as any).completedRequirements;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/completed requirement/i);
    });

    it('should fail with empty completedRequirements array', async () => {
      const data = { ...validData(), completedRequirements: [] };
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/At least one completed requirement is required/);
    });

    it('should fail without verificationCode', async () => {
      const data = validData();
      delete (data as any).verificationCode;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Verification code is required/);
    });
  });

  describe('CompletedRequirements Subdocument', () => {
    it('should fail without courseVersionId in requirement', async () => {
      const data = validData();
      delete (data.completedRequirements[0] as any).courseVersionId;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Course version is required/);
    });

    it('should fail without courseTitle in requirement', async () => {
      const data = validData();
      delete (data.completedRequirements[0] as any).courseTitle;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Course title is required/);
    });

    it('should fail without completedAt in requirement', async () => {
      const data = validData();
      delete (data.completedRequirements[0] as any).completedAt;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Completion date is required/);
    });

    it('should fail without enrollmentId in requirement', async () => {
      const data = validData();
      delete (data.completedRequirements[0] as any).enrollmentId;
      await expect(CertificateIssuance.create(data)).rejects.toThrow(/Enrollment ID is required/);
    });

    it('should enforce courseTitle maxlength of 200', async () => {
      const data = validData();
      data.completedRequirements[0].courseTitle = 'A'.repeat(201);
      const doc = new CertificateIssuance(data);
      await expect(doc.validate()).rejects.toThrow(/Course title cannot exceed 200 characters/);
    });

    it('should accept finalScore of 0', async () => {
      const data = validData();
      data.completedRequirements[0].finalScore = 0;
      const doc = await CertificateIssuance.create(data);
      expect(doc.completedRequirements[0].finalScore).toBe(0);
    });

    it('should accept finalScore of 100', async () => {
      const data = validData();
      data.completedRequirements[0].finalScore = 100;
      const doc = await CertificateIssuance.create(data);
      expect(doc.completedRequirements[0].finalScore).toBe(100);
    });

    it('should reject finalScore below 0', async () => {
      const data = validData();
      data.completedRequirements[0].finalScore = -1;
      const doc = new CertificateIssuance(data);
      await expect(doc.validate()).rejects.toThrow(/Score cannot be negative/);
    });

    it('should reject finalScore above 100', async () => {
      const data = validData();
      data.completedRequirements[0].finalScore = 101;
      const doc = new CertificateIssuance(data);
      await expect(doc.validate()).rejects.toThrow(/Score cannot exceed 100/);
    });

    it('should default finalScore to null', async () => {
      const data = validData();
      delete (data.completedRequirements[0] as any).finalScore;
      const doc = await CertificateIssuance.create(data);
      expect(doc.completedRequirements[0].finalScore).toBeNull();
    });

    it('should accept multiple completed requirements', async () => {
      const data = validData();
      data.completedRequirements.push(validCompletedRequirement());
      const doc = await CertificateIssuance.create(data);
      expect(doc.completedRequirements).toHaveLength(2);
    });
  });

  describe('VerificationCode Validation', () => {
    it('should uppercase the verification code', async () => {
      const data = { ...validData(), verificationCode: 'abcdefghjklm' };
      const doc = await CertificateIssuance.create(data);
      expect(doc.verificationCode).toBe('ABCDEFGHJKLM');
    });

    it('should reject verification code shorter than 12 characters', async () => {
      const data = { ...validData(), verificationCode: 'ABCDEFGHJKL' }; // 11 chars
      const doc = new CertificateIssuance(data);
      await expect(doc.validate()).rejects.toThrow(/Verification code must be 12 characters/);
    });

    it('should reject verification code longer than 12 characters', async () => {
      const data = { ...validData(), verificationCode: 'ABCDEFGHJKLMN' }; // 13 chars
      const doc = new CertificateIssuance(data);
      await expect(doc.validate()).rejects.toThrow(/Verification code must be 12 characters/);
    });

    it('should enforce unique verification code', async () => {
      await CertificateIssuance.create(validData());
      const data2 = { ...validData(), learnerId: new mongoose.Types.ObjectId() };
      await expect(CertificateIssuance.create(data2)).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('Default Values', () => {
    it('should default issuedAt to a date', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.issuedAt).toBeDefined();
      expect(doc.issuedAt).toBeInstanceOf(Date);
    });

    it('should default issuedBy to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.issuedBy).toBeNull();
    });

    it('should default pdfUrl to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.pdfUrl).toBeNull();
    });

    it('should default expiresAt to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.expiresAt).toBeNull();
    });

    it('should default revokedAt to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.revokedAt).toBeNull();
    });

    it('should default revokedBy to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.revokedBy).toBeNull();
    });

    it('should default revokedReason to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.revokedReason).toBeNull();
    });

    it('should default upgradedToIssuanceId to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.upgradedToIssuanceId).toBeNull();
    });

    it('should default upgradedFromIssuanceId to null', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.upgradedFromIssuanceId).toBeNull();
    });

    it('should default metadata to empty object', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.metadata).toEqual({});
    });
  });

  describe('Maxlength Validation', () => {
    it('should enforce pdfUrl maxlength of 500', async () => {
      const doc = new CertificateIssuance({ ...validData(), pdfUrl: 'A'.repeat(501) });
      await expect(doc.validate()).rejects.toThrow(/PDF URL cannot exceed 500 characters/);
    });

    it('should enforce revokedReason maxlength of 500', async () => {
      const doc = new CertificateIssuance({ ...validData(), revokedReason: 'A'.repeat(501) });
      await expect(doc.validate()).rejects.toThrow(/Revocation reason cannot exceed 500 characters/);
    });
  });

  describe('Indexes', () => {
    it('should find issuances by learnerId and credentialGroupId', async () => {
      const data = validData();
      await CertificateIssuance.create(data);
      const results = await CertificateIssuance.find({
        learnerId: data.learnerId,
        credentialGroupId: data.credentialGroupId
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await CertificateIssuance.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
