import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import NotificationPreferences from '@/models/notification/NotificationPreferences.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('NotificationPreferences Model', () => {
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
    await NotificationPreferences.deleteMany({});
  });

  const validData = () => ({
    userId: new mongoose.Types.ObjectId()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without userId', async () => {
      await expect(NotificationPreferences.create({})).rejects.toThrow(/userId/);
    });
  });

  describe('Default Values', () => {
    it('should default emailNotifications to true', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.emailNotifications).toBe(true);
    });

    it('should default inAppNotifications to true', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.inAppNotifications).toBe(true);
    });

    it('should default preferences map with all notification types set to true', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.preferences).toBeDefined();
      expect(doc.preferences.get('access_expiring')).toBe(true);
      expect(doc.preferences.get('access_expired')).toBe(true);
      expect(doc.preferences.get('new_version_available')).toBe(true);
      expect(doc.preferences.get('certificate_upgrade_available')).toBe(true);
      expect(doc.preferences.get('certificate_issued')).toBe(true);
      expect(doc.preferences.get('certificate_expiring')).toBe(true);
      expect(doc.preferences.get('extension_approved')).toBe(true);
      expect(doc.preferences.get('extension_denied')).toBe(true);
    });

    it('should default quietHours.enabled to false', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.quietHours.enabled).toBe(false);
    });

    it('should default quietHours.start to 22:00', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.quietHours.start).toBe('22:00');
    });

    it('should default quietHours.end to 08:00', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.quietHours.end).toBe('08:00');
    });
  });

  describe('Preferences Map', () => {
    it('should allow updating individual preferences', async () => {
      const doc = await NotificationPreferences.create(validData());
      doc.preferences.set('access_expiring', false);
      await doc.save();

      const retrieved = await NotificationPreferences.findById(doc._id);
      expect(retrieved!.preferences.get('access_expiring')).toBe(false);
      expect(retrieved!.preferences.get('access_expired')).toBe(true);
    });

    it('should allow adding new preference keys', async () => {
      const doc = await NotificationPreferences.create(validData());
      doc.preferences.set('custom_notification', true);
      await doc.save();

      const retrieved = await NotificationPreferences.findById(doc._id);
      expect(retrieved!.preferences.get('custom_notification')).toBe(true);
    });
  });

  describe('Quiet Hours', () => {
    it('should accept custom quiet hours', async () => {
      const doc = await NotificationPreferences.create({
        ...validData(),
        quietHours: { enabled: true, start: '23:00', end: '07:00' }
      });
      expect(doc.quietHours.enabled).toBe(true);
      expect(doc.quietHours.start).toBe('23:00');
      expect(doc.quietHours.end).toBe('07:00');
    });
  });

  describe('Boolean Fields', () => {
    it('should accept emailNotifications set to false', async () => {
      const doc = await NotificationPreferences.create({
        ...validData(),
        emailNotifications: false
      });
      expect(doc.emailNotifications).toBe(false);
    });

    it('should accept inAppNotifications set to false', async () => {
      const doc = await NotificationPreferences.create({
        ...validData(),
        inAppNotifications: false
      });
      expect(doc.inAppNotifications).toBe(false);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique userId', async () => {
      const userId = new mongoose.Types.ObjectId();
      await NotificationPreferences.create({ userId });
      await expect(
        NotificationPreferences.create({ userId })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different userIds', async () => {
      await NotificationPreferences.create({ userId: new mongoose.Types.ObjectId() });
      const doc2 = await NotificationPreferences.create({ userId: new mongoose.Types.ObjectId() });
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await NotificationPreferences.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
