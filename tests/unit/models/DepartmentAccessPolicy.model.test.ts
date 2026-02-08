import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DepartmentAccessPolicy from '@/models/policy/DepartmentAccessPolicy.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('DepartmentAccessPolicy Model', () => {
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
    await DepartmentAccessPolicy.deleteMany({});
  });

  const validData = () => ({
    departmentId: new mongoose.Types.ObjectId(),
    defaultAccessDuration: {
      type: 'months' as const,
      value: 12
    }
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with valid data', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without departmentId', async () => {
      const data = validData();
      delete (data as any).departmentId;
      await expect(DepartmentAccessPolicy.create(data)).rejects.toThrow(/Department ID is required/);
    });

    it('should create with default perpetual access duration when no defaultAccessDuration specified', async () => {
      const doc = await DepartmentAccessPolicy.create({
        departmentId: new mongoose.Types.ObjectId()
      });
      expect(doc.defaultAccessDuration).toBeDefined();
      expect(doc.defaultAccessDuration.type).toBe('perpetual');
    });
  });

  describe('AccessDuration Subdocument', () => {
    it('should accept type months with value', async () => {
      const doc = await DepartmentAccessPolicy.create({
        ...validData(),
        defaultAccessDuration: { type: 'months', value: 6 }
      });
      expect(doc.defaultAccessDuration.type).toBe('months');
      expect(doc.defaultAccessDuration.value).toBe(6);
    });

    it('should accept type years with value', async () => {
      const doc = await DepartmentAccessPolicy.create({
        ...validData(),
        defaultAccessDuration: { type: 'years', value: 2 }
      });
      expect(doc.defaultAccessDuration.type).toBe('years');
      expect(doc.defaultAccessDuration.value).toBe(2);
    });

    it('should accept type perpetual without value', async () => {
      const doc = await DepartmentAccessPolicy.create({
        ...validData(),
        defaultAccessDuration: { type: 'perpetual' }
      });
      expect(doc.defaultAccessDuration.type).toBe('perpetual');
    });

    it('should accept type custom with value', async () => {
      const doc = await DepartmentAccessPolicy.create({
        ...validData(),
        defaultAccessDuration: { type: 'custom', value: 90 }
      });
      expect(doc.defaultAccessDuration.type).toBe('custom');
      expect(doc.defaultAccessDuration.value).toBe(90);
    });

    it('should reject invalid duration type', async () => {
      await expect(
        DepartmentAccessPolicy.create({
          ...validData(),
          defaultAccessDuration: { type: 'invalid' as any, value: 10 }
        })
      ).rejects.toThrow(/is not a valid access duration type/);
    });

    it('should fail when type is months with value explicitly set to null', async () => {
      const doc = new DepartmentAccessPolicy({
        ...validData(),
        defaultAccessDuration: { type: 'months', value: null }
      });
      doc.defaultAccessDuration.value = null as any;
      doc.markModified('defaultAccessDuration.value');
      await expect(doc.save()).rejects.toThrow(/Access duration value is required for non-perpetual types/);
    });

    it('should reject negative duration value', async () => {
      const doc = new DepartmentAccessPolicy({
        ...validData(),
        defaultAccessDuration: { type: 'months', value: -1 }
      });
      await expect(doc.validate()).rejects.toThrow(/Access duration value cannot be negative/);
    });

    it('should accept duration value of 0', async () => {
      const doc = await DepartmentAccessPolicy.create({
        ...validData(),
        defaultAccessDuration: { type: 'months', value: 0 }
      });
      expect(doc.defaultAccessDuration.value).toBe(0);
    });
  });

  describe('Default Values', () => {
    it('should default allowNewVersionAccess to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.allowNewVersionAccess).toBe(true);
    });

    it('should default allowCertificateUpgrade to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.allowCertificateUpgrade).toBe(true);
    });

    it('should default allowCourseRetakes to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.allowCourseRetakes).toBe(true);
    });

    it('should default retakeCooldownDays to 0', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.retakeCooldownDays).toBe(0);
    });

    it('should default isActive to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.isActive).toBe(true);
    });
  });

  describe('Notification Settings Defaults', () => {
    it('should default notifyBeforeExpiration to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.notifications.notifyBeforeExpiration).toBe(true);
    });

    it('should default daysBeforeExpirationNotification to 30', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.notifications.daysBeforeExpirationNotification).toBe(30);
    });

    it('should default notifyOnNewVersion to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.notifications.notifyOnNewVersion).toBe(true);
    });

    it('should default notifyOnCertificateUpgrade to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.notifications.notifyOnCertificateUpgrade).toBe(true);
    });

    it('should default notifyAdminOnExtensionRequest to true', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.notifications.notifyAdminOnExtensionRequest).toBe(true);
    });
  });

  describe('Min Validations', () => {
    it('should reject negative newVersionAccessWindow', async () => {
      const doc = new DepartmentAccessPolicy({ ...validData(), newVersionAccessWindow: -1 });
      await expect(doc.validate()).rejects.toThrow(/New version access window cannot be negative/);
    });

    it('should reject negative certificateUpgradeWindow', async () => {
      const doc = new DepartmentAccessPolicy({ ...validData(), certificateUpgradeWindow: -1 });
      await expect(doc.validate()).rejects.toThrow(/Certificate upgrade window cannot be negative/);
    });

    it('should reject negative maxRetakesPerCourse', async () => {
      const doc = new DepartmentAccessPolicy({ ...validData(), maxRetakesPerCourse: -1 });
      await expect(doc.validate()).rejects.toThrow(/Max retakes per course cannot be negative/);
    });

    it('should reject negative retakeCooldownDays', async () => {
      const doc = new DepartmentAccessPolicy({ ...validData(), retakeCooldownDays: -1 });
      await expect(doc.validate()).rejects.toThrow(/Retake cooldown days cannot be negative/);
    });

    it('should reject daysBeforeExpirationNotification less than 1', async () => {
      const doc = new DepartmentAccessPolicy({
        ...validData(),
        notifications: { daysBeforeExpirationNotification: 0 }
      });
      await expect(doc.validate()).rejects.toThrow(/Days before expiration notification must be at least 1/);
    });

    it('should accept newVersionAccessWindow of 0', async () => {
      const doc = await DepartmentAccessPolicy.create({ ...validData(), newVersionAccessWindow: 0 });
      expect(doc.newVersionAccessWindow).toBe(0);
    });

    it('should accept maxRetakesPerCourse of 0', async () => {
      const doc = await DepartmentAccessPolicy.create({ ...validData(), maxRetakesPerCourse: 0 });
      expect(doc.maxRetakesPerCourse).toBe(0);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique departmentId', async () => {
      const deptId = new mongoose.Types.ObjectId();
      await DepartmentAccessPolicy.create({ ...validData(), departmentId: deptId });
      await expect(
        DepartmentAccessPolicy.create({ ...validData(), departmentId: deptId })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different departmentIds', async () => {
      await DepartmentAccessPolicy.create(validData());
      const doc2 = await DepartmentAccessPolicy.create(validData());
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await DepartmentAccessPolicy.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
