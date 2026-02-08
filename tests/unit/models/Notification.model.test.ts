import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '@/models/notification/Notification.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Notification Model', () => {
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
    await Notification.deleteMany({});
  });

  const validData = () => ({
    userId: new mongoose.Types.ObjectId(),
    departmentId: new mongoose.Types.ObjectId(),
    type: 'access_expiring' as const,
    title: 'Your access is expiring soon',
    message: 'Your access to Course XYZ will expire in 7 days.'
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await Notification.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without userId', async () => {
      const data = validData();
      delete (data as any).userId;
      await expect(Notification.create(data)).rejects.toThrow(/userId/);
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(Notification.create(data)).rejects.toThrow(/departmentId/);
    });

    it('should fail without type', async () => {
      const data = validData();
      delete (data as any).type;
      await expect(Notification.create(data)).rejects.toThrow(/type/);
    });

    it('should fail without title', async () => {
      const data = validData();
      delete (data as any).title;
      await expect(Notification.create(data)).rejects.toThrow(/title/);
    });

    it('should fail without message', async () => {
      const data = validData();
      delete (data as any).message;
      await expect(Notification.create(data)).rejects.toThrow(/message/);
    });
  });

  describe('Enum Validation - type', () => {
    const validTypes = [
      'access_expiring',
      'access_expired',
      'new_version_available',
      'certificate_upgrade_available',
      'certificate_issued',
      'certificate_expiring',
      'extension_approved',
      'extension_denied'
    ];

    validTypes.forEach(notifType => {
      it(`should accept type '${notifType}'`, async () => {
        const doc = await Notification.create({ ...validData(), type: notifType });
        expect(doc.type).toBe(notifType);
      });
    });

    it('should reject invalid type', async () => {
      await expect(
        Notification.create({ ...validData(), type: 'invalid_type' })
      ).rejects.toThrow();
    });
  });

  describe('Enum Validation - priority', () => {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    validPriorities.forEach(priority => {
      it(`should accept priority '${priority}'`, async () => {
        const doc = await Notification.create({ ...validData(), priority });
        expect(doc.priority).toBe(priority);
      });
    });

    it('should reject invalid priority', async () => {
      await expect(
        Notification.create({ ...validData(), priority: 'critical' })
      ).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should default priority to normal', async () => {
      const doc = await Notification.create(validData());
      expect(doc.priority).toBe('normal');
    });

    it('should default readAt to null', async () => {
      const doc = await Notification.create(validData());
      expect(doc.readAt).toBeNull();
    });

    it('should default dismissedAt to null', async () => {
      const doc = await Notification.create(validData());
      expect(doc.dismissedAt).toBeNull();
    });

    it('should default expiresAt to null', async () => {
      const doc = await Notification.create(validData());
      expect(doc.expiresAt).toBeNull();
    });

    it('should default metadata to empty object', async () => {
      const doc = await Notification.create(validData());
      expect(doc.metadata).toEqual({});
    });
  });

  describe('Maxlength Validation', () => {
    it('should enforce title maxlength of 200', async () => {
      const doc = new Notification({ ...validData(), title: 'A'.repeat(201) });
      await expect(doc.validate()).rejects.toThrow();
    });

    it('should accept title at maxlength of 200', async () => {
      const doc = await Notification.create({ ...validData(), title: 'A'.repeat(200) });
      expect(doc.title).toHaveLength(200);
    });

    it('should enforce message maxlength of 2000', async () => {
      const doc = new Notification({ ...validData(), message: 'A'.repeat(2001) });
      await expect(doc.validate()).rejects.toThrow();
    });

    it('should accept message at maxlength of 2000', async () => {
      const doc = await Notification.create({ ...validData(), message: 'A'.repeat(2000) });
      expect(doc.message).toHaveLength(2000);
    });
  });

  describe('Related Entity', () => {
    it('should accept a valid relatedEntity', async () => {
      const entityId = new mongoose.Types.ObjectId();
      const doc = await Notification.create({
        ...validData(),
        relatedEntity: { type: 'enrollment', id: entityId }
      });
      expect(doc.relatedEntity).toBeDefined();
      expect(doc.relatedEntity!.type).toBe('enrollment');
      expect(doc.relatedEntity!.id).toEqual(entityId);
    });

    const relatedEntityTypes = [
      'enrollment',
      'course',
      'courseVersion',
      'certificate',
      'certificateIssuance',
      'extensionRequest'
    ];

    relatedEntityTypes.forEach(entityType => {
      it(`should accept relatedEntity type '${entityType}'`, async () => {
        const doc = await Notification.create({
          ...validData(),
          relatedEntity: { type: entityType, id: new mongoose.Types.ObjectId() }
        });
        expect(doc.relatedEntity!.type).toBe(entityType);
      });
    });

    it('should create without relatedEntity', async () => {
      const doc = await Notification.create(validData());
      expect(doc).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should find notifications by userId', async () => {
      const data = validData();
      await Notification.create(data);
      const results = await Notification.find({ userId: data.userId });
      expect(results).toHaveLength(1);
    });

    it('should find notifications by departmentId', async () => {
      const data = validData();
      await Notification.create(data);
      const results = await Notification.find({ departmentId: data.departmentId });
      expect(results).toHaveLength(1);
    });

    it('should find notifications by type', async () => {
      await Notification.create(validData());
      const results = await Notification.find({ type: 'access_expiring' });
      expect(results).toHaveLength(1);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await Notification.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
