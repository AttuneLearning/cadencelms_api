import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AccessExtensionRequest from '@/models/policy/AccessExtensionRequest.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('AccessExtensionRequest Model', () => {
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
    await AccessExtensionRequest.deleteMany({});
  });

  const validData = () => ({
    enrollmentId: new mongoose.Types.ObjectId(),
    learnerId: new mongoose.Types.ObjectId(),
    departmentId: new mongoose.Types.ObjectId(),
    requestedExtension: {
      type: 'days' as const,
      value: 30
    }
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await AccessExtensionRequest.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without enrollmentId', async () => {
      const data = validData();
      delete (data as any).enrollmentId;
      await expect(AccessExtensionRequest.create(data)).rejects.toThrow(/Enrollment ID is required/);
    });

    it('should fail without learnerId', async () => {
      const data = validData();
      delete (data as any).learnerId;
      await expect(AccessExtensionRequest.create(data)).rejects.toThrow(/Learner ID is required/);
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(AccessExtensionRequest.create(data)).rejects.toThrow(/Department ID is required/);
    });

    it('should fail without requestedExtension', async () => {
      const data = validData();
      delete (data as any).requestedExtension;
      await expect(AccessExtensionRequest.create(data)).rejects.toThrow(/Requested extension is required/);
    });
  });

  describe('RequestedExtension Subdocument', () => {
    it('should accept type days with value', async () => {
      const doc = await AccessExtensionRequest.create({
        ...validData(),
        requestedExtension: { type: 'days', value: 30 }
      });
      expect(doc.requestedExtension.type).toBe('days');
      expect(doc.requestedExtension.value).toBe(30);
    });

    it('should accept type months with value', async () => {
      const doc = await AccessExtensionRequest.create({
        ...validData(),
        requestedExtension: { type: 'months', value: 6 }
      });
      expect(doc.requestedExtension.type).toBe('months');
      expect(doc.requestedExtension.value).toBe(6);
    });

    it('should accept type perpetual without value', async () => {
      const doc = await AccessExtensionRequest.create({
        ...validData(),
        requestedExtension: { type: 'perpetual' }
      });
      expect(doc.requestedExtension.type).toBe('perpetual');
    });

    it('should reject invalid extension type', async () => {
      await expect(
        AccessExtensionRequest.create({
          ...validData(),
          requestedExtension: { type: 'invalid' as any, value: 10 }
        })
      ).rejects.toThrow(/is not a valid extension type/);
    });

    it('should fail when type is days with value explicitly set to null', async () => {
      const doc = new AccessExtensionRequest({
        ...validData(),
        requestedExtension: { type: 'days', value: null }
      });
      // Access the subdocument and set value to trigger validation
      doc.requestedExtension.value = null as any;
      doc.markModified('requestedExtension.value');
      await expect(doc.save()).rejects.toThrow(/Extension value is required for non-perpetual types/);
    });

    it('should fail when type is months with value explicitly set to null', async () => {
      const doc = new AccessExtensionRequest({
        ...validData(),
        requestedExtension: { type: 'months', value: null }
      });
      doc.requestedExtension.value = null as any;
      doc.markModified('requestedExtension.value');
      await expect(doc.save()).rejects.toThrow(/Extension value is required for non-perpetual types/);
    });

    it('should reject value less than 1', async () => {
      const doc = new AccessExtensionRequest({
        ...validData(),
        requestedExtension: { type: 'days', value: 0 }
      });
      await expect(doc.validate()).rejects.toThrow(/Extension value must be at least 1/);
    });
  });

  describe('Default Values', () => {
    it('should default status to pending', async () => {
      const doc = await AccessExtensionRequest.create(validData());
      expect(doc.status).toBe('pending');
    });

    it('should default requestedAt to a date', async () => {
      const doc = await AccessExtensionRequest.create(validData());
      expect(doc.requestedAt).toBeDefined();
      expect(doc.requestedAt).toBeInstanceOf(Date);
    });
  });

  describe('Enum Validation - status', () => {
    it('should accept pending status', async () => {
      const doc = await AccessExtensionRequest.create({ ...validData(), status: 'pending' });
      expect(doc.status).toBe('pending');
    });

    it('should accept approved status', async () => {
      const doc = await AccessExtensionRequest.create({ ...validData(), status: 'approved' });
      expect(doc.status).toBe('approved');
    });

    it('should accept denied status', async () => {
      const doc = await AccessExtensionRequest.create({ ...validData(), status: 'denied' });
      expect(doc.status).toBe('denied');
    });

    it('should reject invalid status', async () => {
      await expect(
        AccessExtensionRequest.create({ ...validData(), status: 'invalid' })
      ).rejects.toThrow(/is not a valid request status/);
    });
  });

  describe('Maxlength Validation', () => {
    it('should enforce requestReason maxlength of 2000', async () => {
      const doc = new AccessExtensionRequest({ ...validData(), requestReason: 'A'.repeat(2001) });
      await expect(doc.validate()).rejects.toThrow(/Request reason cannot exceed 2000 characters/);
    });

    it('should accept requestReason within maxlength', async () => {
      const doc = await AccessExtensionRequest.create({ ...validData(), requestReason: 'A'.repeat(2000) });
      expect(doc.requestReason).toHaveLength(2000);
    });

    it('should enforce reviewNotes maxlength of 2000', async () => {
      const doc = new AccessExtensionRequest({ ...validData(), reviewNotes: 'A'.repeat(2001) });
      await expect(doc.validate()).rejects.toThrow(/Review notes cannot exceed 2000 characters/);
    });
  });

  describe('Optional Fields', () => {
    it('should store reviewedBy', async () => {
      const reviewerId = new mongoose.Types.ObjectId();
      const doc = await AccessExtensionRequest.create({ ...validData(), reviewedBy: reviewerId });
      expect(doc.reviewedBy).toEqual(reviewerId);
    });

    it('should store reviewedAt', async () => {
      const now = new Date();
      const doc = await AccessExtensionRequest.create({ ...validData(), reviewedAt: now });
      expect(doc.reviewedAt!.getTime()).toBe(now.getTime());
    });

    it('should store grantedExtension', async () => {
      const doc = await AccessExtensionRequest.create({
        ...validData(),
        grantedExtension: { type: 'months', value: 3 }
      });
      expect(doc.grantedExtension!.type).toBe('months');
      expect(doc.grantedExtension!.value).toBe(3);
    });

    it('should store newExpirationDate', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30);
      const doc = await AccessExtensionRequest.create({ ...validData(), newExpirationDate: futureDate });
      expect(doc.newExpirationDate!.getTime()).toBe(futureDate.getTime());
    });
  });

  describe('Indexes', () => {
    it('should find requests by departmentId and status', async () => {
      const data = validData();
      await AccessExtensionRequest.create(data);
      const results = await AccessExtensionRequest.find({
        departmentId: data.departmentId,
        status: 'pending'
      });
      expect(results).toHaveLength(1);
    });

    it('should find requests by learnerId and status', async () => {
      const data = validData();
      await AccessExtensionRequest.create(data);
      const results = await AccessExtensionRequest.find({
        learnerId: data.learnerId,
        status: 'pending'
      });
      expect(results).toHaveLength(1);
    });

    it('should find requests by enrollmentId and status', async () => {
      const data = validData();
      await AccessExtensionRequest.create(data);
      const results = await AccessExtensionRequest.find({
        enrollmentId: data.enrollmentId,
        status: 'pending'
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await AccessExtensionRequest.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
