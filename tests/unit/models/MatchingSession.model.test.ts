import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MatchingSession from '@/models/activity/MatchingSession.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('MatchingSession Model', () => {
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
    await MatchingSession.deleteMany({});
  });

  const validSessionData = () => {
    const questionIdA = new mongoose.Types.ObjectId();
    const questionIdB = new mongoose.Types.ObjectId();

    return {
      exerciseId: new mongoose.Types.ObjectId(),
      learnerId: new mongoose.Types.ObjectId(),
      status: 'active' as const,
      columnA: [
        { questionId: questionIdA, text: 'Term A' }
      ],
      columnB: [
        { questionId: questionIdB, text: 'Definition B' }
      ],
      shuffleOrder: [questionIdB],
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      attemptNumber: 1
    };
  };

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid matching session with all required fields', async () => {
      const data = validSessionData();
      const session = await MatchingSession.create(data);

      expect(session.exerciseId).toEqual(data.exerciseId);
      expect(session.learnerId).toEqual(data.learnerId);
      expect(session.status).toBe('active');
      expect(session.columnA).toHaveLength(1);
      expect(session.columnA[0].text).toBe('Term A');
      expect(session.columnB).toHaveLength(1);
      expect(session.columnB[0].text).toBe('Definition B');
      expect(session.shuffleOrder).toHaveLength(1);
      expect(session.startedAt).toBeDefined();
      expect(session.expiresAt).toBeDefined();
      expect(session.attemptNumber).toBe(1);
    });

    it('should require exerciseId field', async () => {
      const data = validSessionData();
      delete (data as any).exerciseId;
      const session = new MatchingSession(data);

      await expect(session.save()).rejects.toThrow(/exerciseId/);
    });

    it('should require learnerId field', async () => {
      const data = validSessionData();
      delete (data as any).learnerId;
      const session = new MatchingSession(data);

      await expect(session.save()).rejects.toThrow(/learnerId/);
    });

    it('should require expiresAt field', async () => {
      const data = validSessionData();
      delete (data as any).expiresAt;
      const session = new MatchingSession(data);

      await expect(session.save()).rejects.toThrow(/expiresAt/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should accept status value "active"', async () => {
      const data = validSessionData();
      data.status = 'active';
      const session = await MatchingSession.create(data);

      expect(session.status).toBe('active');
    });

    it('should accept status value "completed"', async () => {
      const data = validSessionData();
      data.status = 'completed' as any;
      const session = await MatchingSession.create(data);

      expect(session.status).toBe('completed');
    });

    it('should accept status value "expired"', async () => {
      const data = validSessionData();
      data.status = 'expired' as any;
      const session = await MatchingSession.create(data);

      expect(session.status).toBe('expired');
    });

    it('should accept status value "abandoned"', async () => {
      const data = validSessionData();
      data.status = 'abandoned' as any;
      const session = await MatchingSession.create(data);

      expect(session.status).toBe('abandoned');
    });

    it('should reject invalid status value', async () => {
      const data = validSessionData();
      (data as any).status = 'invalid_status';
      const session = new MatchingSession(data);

      await expect(session.validate()).rejects.toThrow(/is not a valid session status/);
    });

    it('should reject attemptNumber less than 1', async () => {
      const data = validSessionData();
      data.attemptNumber = 0;
      const session = new MatchingSession(data);

      await expect(session.validate()).rejects.toThrow(/attemptNumber/);
    });

    it('should accept attemptNumber of 1', async () => {
      const data = validSessionData();
      data.attemptNumber = 1;
      const session = await MatchingSession.create(data);

      expect(session.attemptNumber).toBe(1);
    });

    it('should accept attemptNumber greater than 1', async () => {
      const data = validSessionData();
      data.attemptNumber = 5;
      const session = await MatchingSession.create(data);

      expect(session.attemptNumber).toBe(5);
    });

    it('should store column items with media', async () => {
      const mediaId = new mongoose.Types.ObjectId();
      const data = validSessionData();
      data.columnA = [
        {
          questionId: new mongoose.Types.ObjectId(),
          text: 'Term with media',
          media: {
            mediaId,
            url: 'https://example.com/image.png',
            altText: 'An example image'
          }
        } as any
      ];

      const session = await MatchingSession.create(data);
      expect(session.columnA[0].media?.mediaId).toEqual(mediaId);
      expect(session.columnA[0].media?.url).toBe('https://example.com/image.png');
      expect(session.columnA[0].media?.altText).toBe('An example image');
    });
  });

  describe('Default Values', () => {
    it('should default status to "active"', async () => {
      const data = validSessionData();
      delete (data as any).status;
      const session = await MatchingSession.create(data);

      expect(session.status).toBe('active');
    });

    it('should default attemptNumber to 1', async () => {
      const data = validSessionData();
      delete (data as any).attemptNumber;
      const session = await MatchingSession.create(data);

      expect(session.attemptNumber).toBe(1);
    });

    it('should default startedAt to current date if not provided', async () => {
      const data = validSessionData();
      delete (data as any).startedAt;
      const before = new Date();
      const session = await MatchingSession.create(data);
      const after = new Date();

      expect(session.startedAt).toBeDefined();
      expect(session.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should auto-generate timestamps', async () => {
      const data = validSessionData();
      const session = await MatchingSession.create(data);

      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it('should allow optional completedAt field', async () => {
      const data = validSessionData();
      const session = await MatchingSession.create(data);

      expect(session.completedAt).toBeUndefined();
    });

    it('should store completedAt when provided', async () => {
      const completedAt = new Date();
      const data = { ...validSessionData(), completedAt };
      const session = await MatchingSession.create(data);

      expect(session.completedAt?.getTime()).toBe(completedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have compound index on exerciseId, learnerId, status', async () => {
      const indexes = await MatchingSession.collection.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx.key?.exerciseId === 1 && idx.key?.learnerId === 1 && idx.key?.status === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have compound index on learnerId, status, createdAt', async () => {
      const indexes = await MatchingSession.collection.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx.key?.learnerId === 1 && idx.key?.status === 1 && idx.key?.createdAt === -1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have TTL index on expiresAt with 86400 seconds', async () => {
      const indexes = await MatchingSession.collection.indexes();
      const ttlIndex = indexes.find(
        (idx: any) => idx.key?.expiresAt === 1 && idx.expireAfterSeconds === 86400
      );
      expect(ttlIndex).toBeDefined();
    });

    it('should find active sessions by exerciseId and learnerId', async () => {
      const exerciseId = new mongoose.Types.ObjectId();
      const learnerId = new mongoose.Types.ObjectId();

      const data1 = validSessionData();
      data1.exerciseId = exerciseId;
      data1.learnerId = learnerId;
      data1.status = 'active';
      await MatchingSession.create(data1);

      const data2 = validSessionData();
      data2.exerciseId = exerciseId;
      data2.learnerId = learnerId;
      data2.status = 'completed' as any;
      await MatchingSession.create(data2);

      const activeSessions = await MatchingSession.find({ exerciseId, learnerId, status: 'active' });
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].status).toBe('active');
    });

    it('should find sessions by learnerId and status', async () => {
      const learnerId = new mongoose.Types.ObjectId();

      const data1 = validSessionData();
      data1.learnerId = learnerId;
      data1.status = 'active';
      await MatchingSession.create(data1);

      const data2 = validSessionData();
      data2.learnerId = learnerId;
      data2.status = 'active';
      await MatchingSession.create(data2);

      const data3 = validSessionData();
      data3.learnerId = learnerId;
      data3.status = 'completed' as any;
      await MatchingSession.create(data3);

      const activeSessions = await MatchingSession.find({ learnerId, status: 'active' });
      expect(activeSessions).toHaveLength(2);
    });
  });
});
