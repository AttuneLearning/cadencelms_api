import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CredentialGroup Model', () => {
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
    await CredentialGroup.deleteMany({});
  });

  const validData = () => ({
    name: 'AWS Solutions Architect',
    code: 'AWS-SA',
    description: 'Professional certification for cloud architecture.',
    type: 'certificate' as const,
    departmentId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without name', async () => {
      const data = validData();
      delete (data as any).name;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Credential group name is required/);
    });

    it('should fail without code', async () => {
      const data = validData();
      delete (data as any).code;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Credential code is required/);
    });

    it('should fail without description', async () => {
      const data = validData();
      delete (data as any).description;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Description is required/);
    });

    it('should fail without type', async () => {
      const data = validData();
      delete (data as any).type;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Credential type is required/);
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Department is required/);
    });

    it('should fail without createdBy', async () => {
      const data = validData();
      delete (data as any).createdBy;
      await expect(CredentialGroup.create(data)).rejects.toThrow(/Creator is required/);
    });
  });

  describe('Enum Validation', () => {
    it('should accept certificate type', async () => {
      const doc = await CredentialGroup.create({ ...validData(), type: 'certificate' });
      expect(doc.type).toBe('certificate');
    });

    it('should accept diploma type', async () => {
      const doc = await CredentialGroup.create({ ...validData(), type: 'diploma' });
      expect(doc.type).toBe('diploma');
    });

    it('should accept degree type', async () => {
      const doc = await CredentialGroup.create({ ...validData(), type: 'degree' });
      expect(doc.type).toBe('degree');
    });

    it('should accept badge type', async () => {
      const doc = await CredentialGroup.create({ ...validData(), type: 'badge' });
      expect(doc.type).toBe('badge');
    });

    it('should reject invalid type', async () => {
      await expect(
        CredentialGroup.create({ ...validData(), type: 'invalid' })
      ).rejects.toThrow(/is not a valid credential type/);
    });
  });

  describe('Default Values', () => {
    it('should default isActive to true', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc.isActive).toBe(true);
    });

    it('should default badgeImageUrl to null', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc.badgeImageUrl).toBeNull();
    });

    it('should default badgeColor to null', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc.badgeColor).toBeNull();
    });

    it('should default programId to null', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc.programId).toBeNull();
    });
  });

  describe('Trim and Uppercase', () => {
    it('should trim name', async () => {
      const doc = await CredentialGroup.create({ ...validData(), name: '  AWS SA  ' });
      expect(doc.name).toBe('AWS SA');
    });

    it('should trim and uppercase code', async () => {
      const doc = await CredentialGroup.create({ ...validData(), code: '  aws-sa  ' });
      expect(doc.code).toBe('AWS-SA');
    });

    it('should trim description', async () => {
      const doc = await CredentialGroup.create({ ...validData(), description: '  Some desc  ' });
      expect(doc.description).toBe('Some desc');
    });
  });

  describe('Maxlength Validation', () => {
    it('should enforce name maxlength of 200', async () => {
      const doc = new CredentialGroup({ ...validData(), name: 'A'.repeat(201) });
      await expect(doc.validate()).rejects.toThrow(/Credential group name cannot exceed 200 characters/);
    });

    it('should enforce code maxlength of 50', async () => {
      const doc = new CredentialGroup({ ...validData(), code: 'A'.repeat(51) });
      await expect(doc.validate()).rejects.toThrow(/Credential code cannot exceed 50 characters/);
    });

    it('should enforce description maxlength of 2000', async () => {
      const doc = new CredentialGroup({ ...validData(), description: 'A'.repeat(2001) });
      await expect(doc.validate()).rejects.toThrow(/Description cannot exceed 2000 characters/);
    });

    it('should enforce badgeImageUrl maxlength of 500', async () => {
      const doc = new CredentialGroup({ ...validData(), badgeImageUrl: 'A'.repeat(501) });
      await expect(doc.validate()).rejects.toThrow(/Badge image URL cannot exceed 500 characters/);
    });
  });

  describe('Badge Color Validation', () => {
    it('should accept valid hex color', async () => {
      const doc = await CredentialGroup.create({ ...validData(), badgeColor: '#FF5733' });
      expect(doc.badgeColor).toBe('#FF5733');
    });

    it('should accept null badge color', async () => {
      const doc = await CredentialGroup.create({ ...validData(), badgeColor: null });
      expect(doc.badgeColor).toBeNull();
    });

    it('should accept lowercase hex color', async () => {
      const doc = await CredentialGroup.create({ ...validData(), badgeColor: '#ff5733' });
      expect(doc.badgeColor).toBe('#ff5733');
    });

    it('should reject invalid hex color (no hash)', async () => {
      const doc = new CredentialGroup({ ...validData(), badgeColor: 'FF5733' });
      await expect(doc.validate()).rejects.toThrow(/Badge color must be a valid hex color/);
    });

    it('should reject invalid hex color (3-char shorthand)', async () => {
      const doc = new CredentialGroup({ ...validData(), badgeColor: '#F53' });
      await expect(doc.validate()).rejects.toThrow(/Badge color must be a valid hex color/);
    });

    it('should reject invalid hex color (non-hex chars)', async () => {
      const doc = new CredentialGroup({ ...validData(), badgeColor: '#GGGGGG' });
      await expect(doc.validate()).rejects.toThrow(/Badge color must be a valid hex color/);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique compound index on departmentId + code', async () => {
      const data = validData();
      await CredentialGroup.create(data);
      await expect(CredentialGroup.create(data)).rejects.toThrow(/duplicate key/i);
    });

    it('should allow same code in different departments', async () => {
      await CredentialGroup.create(validData());
      const data2 = { ...validData(), departmentId: new mongoose.Types.ObjectId() };
      const doc2 = await CredentialGroup.create(data2);
      expect(doc2).toBeDefined();
    });

    it('should allow different codes in same department', async () => {
      const deptId = new mongoose.Types.ObjectId();
      await CredentialGroup.create({ ...validData(), departmentId: deptId, code: 'CODE-A' });
      const doc2 = await CredentialGroup.create({ ...validData(), departmentId: deptId, code: 'CODE-B' });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await CredentialGroup.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
