import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CertificateDefinition Model', () => {
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
    await CertificateDefinition.deleteMany({});
  });

  const validData = () => ({
    credentialGroupId: new mongoose.Types.ObjectId(),
    version: 1,
    title: 'AWS Solutions Architect v1',
    description: 'Version 1 of the AWS SA certification requirements.',
    createdBy: new mongoose.Types.ObjectId()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without credentialGroupId', async () => {
      const data = validData();
      delete (data as any).credentialGroupId;
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/Credential group is required/);
    });

    it('should fail without version', async () => {
      const data = validData();
      delete (data as any).version;
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/Version number is required/);
    });

    it('should fail without title', async () => {
      const data = validData();
      delete (data as any).title;
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/Title is required/);
    });

    it('should fail without description', async () => {
      const data = validData();
      delete (data as any).description;
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/Description is required/);
    });

    it('should fail without createdBy', async () => {
      const data = validData();
      delete (data as any).createdBy;
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/Creator is required/);
    });
  });

  describe('Default Values', () => {
    it('should default status to draft', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.status).toBe('draft');
    });

    it('should default isCompatible to true', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.isCompatible).toBe(true);
    });

    it('should default autoIssue to false', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.autoIssue).toBe(false);
    });

    it('should default parentDefinitionId to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.parentDefinitionId).toBeNull();
    });

    it('should default compatibilityBreakReason to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.compatibilityBreakReason).toBeNull();
    });

    it('should default deprecatedAt to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.deprecatedAt).toBeNull();
    });

    it('should default deprecatedReason to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.deprecatedReason).toBeNull();
    });

    it('should default supersededByDefinitionId to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.supersededByDefinitionId).toBeNull();
    });

    it('should default validFrom to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.validFrom).toBeNull();
    });

    it('should default validUntil to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.validUntil).toBeNull();
    });

    it('should default expiresAfterMonths to null', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.expiresAfterMonths).toBeNull();
    });
  });

  describe('Enum Validation', () => {
    it('should accept draft status', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), status: 'draft' });
      expect(doc.status).toBe('draft');
    });

    it('should accept active status', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), status: 'active' });
      expect(doc.status).toBe('active');
    });

    it('should accept deprecated status', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), status: 'deprecated' });
      expect(doc.status).toBe('deprecated');
    });

    it('should reject invalid status', async () => {
      await expect(
        CertificateDefinition.create({ ...validData(), status: 'invalid' })
      ).rejects.toThrow(/Status must be draft, active, or deprecated/);
    });
  });

  describe('Trim and Maxlength', () => {
    it('should trim title', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), title: '  Trimmed Title  ' });
      expect(doc.title).toBe('Trimmed Title');
    });

    it('should trim description', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), description: '  Trimmed Desc  ' });
      expect(doc.description).toBe('Trimmed Desc');
    });

    it('should enforce title maxlength of 200', async () => {
      const doc = new CertificateDefinition({ ...validData(), title: 'A'.repeat(201) });
      await expect(doc.validate()).rejects.toThrow(/Title cannot exceed 200 characters/);
    });

    it('should enforce description maxlength of 2000', async () => {
      const doc = new CertificateDefinition({ ...validData(), description: 'A'.repeat(2001) });
      await expect(doc.validate()).rejects.toThrow(/Description cannot exceed 2000 characters/);
    });

    it('should enforce compatibilityBreakReason maxlength of 500', async () => {
      const doc = new CertificateDefinition({ ...validData(), compatibilityBreakReason: 'A'.repeat(501) });
      await expect(doc.validate()).rejects.toThrow(/Compatibility break reason cannot exceed 500 characters/);
    });

    it('should enforce deprecatedReason maxlength of 500', async () => {
      const doc = new CertificateDefinition({ ...validData(), deprecatedReason: 'A'.repeat(501) });
      await expect(doc.validate()).rejects.toThrow(/Deprecation reason cannot exceed 500 characters/);
    });
  });

  describe('Min/Max Validation', () => {
    it('should accept version of 1', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), version: 1 });
      expect(doc.version).toBe(1);
    });

    it('should reject version less than 1', async () => {
      const doc = new CertificateDefinition({ ...validData(), version: 0 });
      await expect(doc.validate()).rejects.toThrow(/Version must be at least 1/);
    });

    it('should accept expiresAfterMonths of 1', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), expiresAfterMonths: 1 });
      expect(doc.expiresAfterMonths).toBe(1);
    });

    it('should accept expiresAfterMonths of 1200', async () => {
      const doc = await CertificateDefinition.create({ ...validData(), expiresAfterMonths: 1200 });
      expect(doc.expiresAfterMonths).toBe(1200);
    });

    it('should reject expiresAfterMonths less than 1', async () => {
      const doc = new CertificateDefinition({ ...validData(), expiresAfterMonths: 0 });
      await expect(doc.validate()).rejects.toThrow(/Expiry must be at least 1 month/);
    });

    it('should reject expiresAfterMonths greater than 1200', async () => {
      const doc = new CertificateDefinition({ ...validData(), expiresAfterMonths: 1201 });
      await expect(doc.validate()).rejects.toThrow(/Expiry cannot exceed 100 years/);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique compound index on credentialGroupId + version', async () => {
      const data = validData();
      await CertificateDefinition.create(data);
      await expect(CertificateDefinition.create(data)).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same version in different credential groups', async () => {
      await CertificateDefinition.create(validData());
      const data2 = { ...validData(), credentialGroupId: new mongoose.Types.ObjectId() };
      const doc2 = await CertificateDefinition.create(data2);
      expect(doc2).toBeDefined();
    });

    it('should allow different versions in same credential group', async () => {
      const groupId = new mongoose.Types.ObjectId();
      await CertificateDefinition.create({ ...validData(), credentialGroupId: groupId, version: 1 });
      const doc2 = await CertificateDefinition.create({ ...validData(), credentialGroupId: groupId, version: 2 });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await CertificateDefinition.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
