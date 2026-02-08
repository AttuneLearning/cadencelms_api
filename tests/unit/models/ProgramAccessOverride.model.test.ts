import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ProgramAccessOverride from '@/models/policy/ProgramAccessOverride.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ProgramAccessOverride Model', () => {
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
    await ProgramAccessOverride.deleteMany({});
  });

  const validData = () => ({
    programId: new mongoose.Types.ObjectId()
  });

  describe('Schema Validation - Required Fields', () => {
    it('should create with only programId', async () => {
      const doc = await ProgramAccessOverride.create(validData());
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
    });

    it('should fail without programId', async () => {
      await expect(ProgramAccessOverride.create({})).rejects.toThrow(/Program ID is required/);
    });
  });

  describe('Default Values', () => {
    it('should default requireSequentialCompletion to false', async () => {
      const doc = await ProgramAccessOverride.create(validData());
      expect(doc.requireSequentialCompletion).toBe(false);
    });

    it('should default isActive to true', async () => {
      const doc = await ProgramAccessOverride.create(validData());
      expect(doc.isActive).toBe(true);
    });
  });

  describe('Optional Override Fields', () => {
    it('should store accessDuration override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        accessDuration: { type: 'months', value: 18 }
      });
      expect(doc.accessDuration!.type).toBe('months');
      expect(doc.accessDuration!.value).toBe(18);
    });

    it('should store perpetual accessDuration override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        accessDuration: { type: 'perpetual' }
      });
      expect(doc.accessDuration!.type).toBe('perpetual');
    });

    it('should store allowNewVersionAccess override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        allowNewVersionAccess: false
      });
      expect(doc.allowNewVersionAccess).toBe(false);
    });

    it('should store newVersionAccessWindow override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        newVersionAccessWindow: 90
      });
      expect(doc.newVersionAccessWindow).toBe(90);
    });

    it('should store allowCertificateUpgrade override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        allowCertificateUpgrade: false
      });
      expect(doc.allowCertificateUpgrade).toBe(false);
    });

    it('should store certificateUpgradeWindow override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        certificateUpgradeWindow: 60
      });
      expect(doc.certificateUpgradeWindow).toBe(60);
    });

    it('should store allowCourseRetakes override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        allowCourseRetakes: false
      });
      expect(doc.allowCourseRetakes).toBe(false);
    });

    it('should store maxRetakesPerCourse override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        maxRetakesPerCourse: 3
      });
      expect(doc.maxRetakesPerCourse).toBe(3);
    });

    it('should store retakeCooldownDays override', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        retakeCooldownDays: 14
      });
      expect(doc.retakeCooldownDays).toBe(14);
    });

    it('should store requireSequentialCompletion as true', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        requireSequentialCompletion: true
      });
      expect(doc.requireSequentialCompletion).toBe(true);
    });
  });

  describe('Notification Override', () => {
    it('should store notification overrides', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        notifications: {
          notifyBeforeExpiration: false,
          daysBeforeExpirationNotification: 14,
          notifyOnNewVersion: false,
          notifyOnCertificateUpgrade: true,
          notifyAdminOnExtensionRequest: false
        }
      });
      expect(doc.notifications!.notifyBeforeExpiration).toBe(false);
      expect(doc.notifications!.daysBeforeExpirationNotification).toBe(14);
      expect(doc.notifications!.notifyOnNewVersion).toBe(false);
      expect(doc.notifications!.notifyOnCertificateUpgrade).toBe(true);
      expect(doc.notifications!.notifyAdminOnExtensionRequest).toBe(false);
    });

    it('should store partial notification overrides', async () => {
      const doc = await ProgramAccessOverride.create({
        ...validData(),
        notifications: {
          notifyBeforeExpiration: false
        }
      });
      expect(doc.notifications!.notifyBeforeExpiration).toBe(false);
    });
  });

  describe('AccessDuration Override Enum', () => {
    const validTypes = ['months', 'years', 'perpetual', 'custom'];

    validTypes.forEach(durationType => {
      it(`should accept accessDuration type '${durationType}'`, async () => {
        const data: any = { ...validData(), accessDuration: { type: durationType } };
        if (durationType !== 'perpetual') {
          data.accessDuration.value = 10;
        }
        const doc = await ProgramAccessOverride.create(data);
        expect(doc.accessDuration!.type).toBe(durationType);
      });
    });

    it('should reject invalid accessDuration type', async () => {
      await expect(
        ProgramAccessOverride.create({
          ...validData(),
          accessDuration: { type: 'invalid' as any, value: 10 }
        })
      ).rejects.toThrow(/is not a valid access duration type/);
    });
  });

  describe('Min Validations', () => {
    it('should reject negative newVersionAccessWindow', async () => {
      const doc = new ProgramAccessOverride({ ...validData(), newVersionAccessWindow: -1 });
      await expect(doc.validate()).rejects.toThrow(/New version access window cannot be negative/);
    });

    it('should reject negative certificateUpgradeWindow', async () => {
      const doc = new ProgramAccessOverride({ ...validData(), certificateUpgradeWindow: -1 });
      await expect(doc.validate()).rejects.toThrow(/Certificate upgrade window cannot be negative/);
    });

    it('should reject negative maxRetakesPerCourse', async () => {
      const doc = new ProgramAccessOverride({ ...validData(), maxRetakesPerCourse: -1 });
      await expect(doc.validate()).rejects.toThrow(/Max retakes per course cannot be negative/);
    });

    it('should reject negative retakeCooldownDays', async () => {
      const doc = new ProgramAccessOverride({ ...validData(), retakeCooldownDays: -1 });
      await expect(doc.validate()).rejects.toThrow(/Retake cooldown days cannot be negative/);
    });

    it('should reject negative accessDuration value', async () => {
      const doc = new ProgramAccessOverride({
        ...validData(),
        accessDuration: { type: 'months', value: -1 }
      });
      await expect(doc.validate()).rejects.toThrow(/Access duration value cannot be negative/);
    });

    it('should reject daysBeforeExpirationNotification less than 1', async () => {
      const doc = new ProgramAccessOverride({
        ...validData(),
        notifications: { daysBeforeExpirationNotification: 0 }
      });
      await expect(doc.validate()).rejects.toThrow(/Days before expiration notification must be at least 1/);
    });

    it('should accept newVersionAccessWindow of 0', async () => {
      const doc = await ProgramAccessOverride.create({ ...validData(), newVersionAccessWindow: 0 });
      expect(doc.newVersionAccessWindow).toBe(0);
    });

    it('should accept retakeCooldownDays of 0', async () => {
      const doc = await ProgramAccessOverride.create({ ...validData(), retakeCooldownDays: 0 });
      expect(doc.retakeCooldownDays).toBe(0);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique programId', async () => {
      const programId = new mongoose.Types.ObjectId();
      await ProgramAccessOverride.create({ programId });
      await expect(
        ProgramAccessOverride.create({ programId })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should allow different programIds', async () => {
      await ProgramAccessOverride.create(validData());
      const doc2 = await ProgramAccessOverride.create(validData());
      expect(doc2).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const doc = await ProgramAccessOverride.create(validData());
      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });
  });
});
