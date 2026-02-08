import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CertificateRequirement Model', () => {
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
    await CertificateRequirement.deleteMany({});
  });

  const validData = () => ({
    certificateDefinitionId: new mongoose.Types.ObjectId(),
    courseVersionId: new mongoose.Types.ObjectId()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without certificateDefinitionId', async () => {
      const data = validData();
      delete (data as any).certificateDefinitionId;
      await expect(CertificateRequirement.create(data)).rejects.toThrow(/Certificate definition is required/);
    });

    it('should fail without courseVersionId', async () => {
      const data = validData();
      delete (data as any).courseVersionId;
      await expect(CertificateRequirement.create(data)).rejects.toThrow(/Course version is required/);
    });
  });

  describe('Default Values', () => {
    it('should default isRequired to true', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.isRequired).toBe(true);
    });

    it('should default minimumScore to null', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.minimumScore).toBeNull();
    });

    it('should default order to 0', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.order).toBe(0);
    });

    it('should default electiveGroupId to null', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.electiveGroupId).toBeNull();
    });

    it('should default electiveGroupName to null', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.electiveGroupName).toBeNull();
    });

    it('should default electiveMinCount to null', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.electiveMinCount).toBeNull();
    });
  });

  describe('Min/Max Validation', () => {
    it('should accept minimumScore of 0', async () => {
      const doc = await CertificateRequirement.create({ ...validData(), minimumScore: 0 });
      expect(doc.minimumScore).toBe(0);
    });

    it('should accept minimumScore of 100', async () => {
      const doc = await CertificateRequirement.create({ ...validData(), minimumScore: 100 });
      expect(doc.minimumScore).toBe(100);
    });

    it('should reject minimumScore below 0', async () => {
      const doc = new CertificateRequirement({ ...validData(), minimumScore: -1 });
      await expect(doc.validate()).rejects.toThrow(/Minimum score cannot be negative/);
    });

    it('should reject minimumScore above 100', async () => {
      const doc = new CertificateRequirement({ ...validData(), minimumScore: 101 });
      await expect(doc.validate()).rejects.toThrow(/Minimum score cannot exceed 100/);
    });

    it('should accept order of 0', async () => {
      const doc = await CertificateRequirement.create({ ...validData(), order: 0 });
      expect(doc.order).toBe(0);
    });

    it('should reject negative order', async () => {
      const doc = new CertificateRequirement({ ...validData(), order: -1 });
      await expect(doc.validate()).rejects.toThrow(/Order cannot be negative/);
    });

    it('should reject electiveMinCount less than 1', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: 'elective-tech',
        electiveGroupName: 'Technical Electives',
        electiveMinCount: 0
      });
      await expect(doc.validate()).rejects.toThrow(/Elective minimum count must be at least 1/);
    });
  });

  describe('Maxlength Validation', () => {
    it('should enforce electiveGroupId maxlength of 50', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: 'A'.repeat(51),
        electiveGroupName: 'Group',
        electiveMinCount: 1
      });
      await expect(doc.validate()).rejects.toThrow(/Elective group ID cannot exceed 50 characters/);
    });

    it('should enforce electiveGroupName maxlength of 100', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: 'group-1',
        electiveGroupName: 'A'.repeat(101),
        electiveMinCount: 1
      });
      await expect(doc.validate()).rejects.toThrow(/Elective group name cannot exceed 100 characters/);
    });
  });

  describe('Pre-save Hook - Elective Group Validation', () => {
    it('should accept all elective fields set together with isRequired=false', async () => {
      const doc = await CertificateRequirement.create({
        ...validData(),
        isRequired: false,
        electiveGroupId: 'elective-tech',
        electiveGroupName: 'Technical Electives',
        electiveMinCount: 2
      });
      expect(doc.electiveGroupId).toBe('elective-tech');
      expect(doc.electiveGroupName).toBe('Technical Electives');
      expect(doc.electiveMinCount).toBe(2);
    });

    it('should accept all elective fields as null', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.electiveGroupId).toBeNull();
      expect(doc.electiveGroupName).toBeNull();
      expect(doc.electiveMinCount).toBeNull();
    });

    it('should fail if only electiveGroupId is set', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: 'elective-tech',
        electiveGroupName: null,
        electiveMinCount: null
      });
      await expect(doc.save()).rejects.toThrow(/Elective group settings must all be set together/);
    });

    it('should fail if only electiveGroupName is set', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: null,
        electiveGroupName: 'Technical Electives',
        electiveMinCount: null
      });
      await expect(doc.save()).rejects.toThrow(/Elective group settings must all be set together/);
    });

    it('should fail if only electiveMinCount is set', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: false,
        electiveGroupId: null,
        electiveGroupName: null,
        electiveMinCount: 2
      });
      await expect(doc.save()).rejects.toThrow(/Elective group settings must all be set together/);
    });

    it('should fail if elective fields set with isRequired=true', async () => {
      const doc = new CertificateRequirement({
        ...validData(),
        isRequired: true,
        electiveGroupId: 'elective-tech',
        electiveGroupName: 'Technical Electives',
        electiveMinCount: 2
      });
      await expect(doc.save()).rejects.toThrow(/Elective courses cannot be marked as required/);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique compound index on certificateDefinitionId + courseVersionId', async () => {
      const data = validData();
      await CertificateRequirement.create(data);
      await expect(CertificateRequirement.create(data)).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same courseVersionId in different definitions', async () => {
      const courseVersionId = new mongoose.Types.ObjectId();
      await CertificateRequirement.create({ ...validData(), courseVersionId });
      const doc2 = await CertificateRequirement.create({
        certificateDefinitionId: new mongoose.Types.ObjectId(),
        courseVersionId
      });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await CertificateRequirement.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
