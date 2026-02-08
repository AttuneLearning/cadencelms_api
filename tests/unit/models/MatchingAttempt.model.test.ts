import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MatchingAttempt from '@/models/activity/MatchingAttempt.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('MatchingAttempt Model', () => {
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
    await MatchingAttempt.deleteMany({});
  });

  const validAttemptData = () => {
    const colAId = new mongoose.Types.ObjectId();
    const colBId = new mongoose.Types.ObjectId();
    const correctBId = new mongoose.Types.ObjectId();

    return {
      exerciseId: new mongoose.Types.ObjectId(),
      learnerId: new mongoose.Types.ObjectId(),
      sessionId: new mongoose.Types.ObjectId(),
      attemptNumber: 1,
      submittedMatches: [
        { columnAId: colAId, columnBId: colBId }
      ],
      results: [
        {
          columnAId: colAId,
          matchedColumnBId: colBId,
          correctColumnBId: correctBId,
          correct: false,
          columnAText: 'Term A',
          matchedText: 'Definition B',
          correctText: 'Definition C'
        }
      ],
      score: 75,
      correctCount: 3,
      totalPairs: 4,
      passed: true,
      startedAt: new Date(Date.now() - 60000),
      submittedAt: new Date(),
      timeSpent: 60,
      allowPartialCredit: true,
      passingScore: 70
    };
  };

  describe('Schema Validation - Required Fields', () => {
    it('should create a valid matching attempt with all required fields', async () => {
      const data = validAttemptData();
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.exerciseId).toEqual(data.exerciseId);
      expect(attempt.learnerId).toEqual(data.learnerId);
      expect(attempt.sessionId).toEqual(data.sessionId);
      expect(attempt.attemptNumber).toBe(1);
      expect(attempt.submittedMatches).toHaveLength(1);
      expect(attempt.results).toHaveLength(1);
      expect(attempt.score).toBe(75);
      expect(attempt.correctCount).toBe(3);
      expect(attempt.totalPairs).toBe(4);
      expect(attempt.passed).toBe(true);
      expect(attempt.timeSpent).toBe(60);
      expect(attempt.allowPartialCredit).toBe(true);
      expect(attempt.passingScore).toBe(70);
    });

    it('should require exerciseId field', async () => {
      const data = validAttemptData();
      delete (data as any).exerciseId;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/exerciseId/);
    });

    it('should require learnerId field', async () => {
      const data = validAttemptData();
      delete (data as any).learnerId;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/learnerId/);
    });

    it('should require sessionId field', async () => {
      const data = validAttemptData();
      delete (data as any).sessionId;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/sessionId/);
    });

    it('should require attemptNumber field', async () => {
      const data = validAttemptData();
      delete (data as any).attemptNumber;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should require score field', async () => {
      const data = validAttemptData();
      delete (data as any).score;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/score/);
    });

    it('should require passed field', async () => {
      const data = validAttemptData();
      delete (data as any).passed;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/passed/);
    });

    it('should require startedAt field', async () => {
      const data = validAttemptData();
      delete (data as any).startedAt;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/startedAt/);
    });

    it('should require timeSpent field', async () => {
      const data = validAttemptData();
      delete (data as any).timeSpent;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/timeSpent/);
    });

    it('should require allowPartialCredit field', async () => {
      const data = validAttemptData();
      delete (data as any).allowPartialCredit;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/allowPartialCredit/);
    });

    it('should require passingScore field', async () => {
      const data = validAttemptData();
      delete (data as any).passingScore;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.save()).rejects.toThrow(/passingScore/);
    });
  });

  describe('Schema Validation - Field Constraints', () => {
    it('should reject attemptNumber less than 1', async () => {
      const data = validAttemptData();
      data.attemptNumber = 0;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/attemptNumber/);
    });

    it('should accept attemptNumber of 1', async () => {
      const data = validAttemptData();
      data.attemptNumber = 1;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.attemptNumber).toBe(1);
    });

    it('should reject score less than 0', async () => {
      const data = validAttemptData();
      data.score = -1;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/score/);
    });

    it('should reject score greater than 100', async () => {
      const data = validAttemptData();
      data.score = 101;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/score/);
    });

    it('should accept score of 0', async () => {
      const data = validAttemptData();
      data.score = 0;
      data.passed = false;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.score).toBe(0);
    });

    it('should accept score of 100', async () => {
      const data = validAttemptData();
      data.score = 100;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.score).toBe(100);
    });

    it('should reject correctCount less than 0', async () => {
      const data = validAttemptData();
      data.correctCount = -1;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/correctCount/);
    });

    it('should accept correctCount of 0', async () => {
      const data = validAttemptData();
      data.correctCount = 0;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.correctCount).toBe(0);
    });

    it('should reject totalPairs less than 1', async () => {
      const data = validAttemptData();
      data.totalPairs = 0;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/totalPairs/);
    });

    it('should accept totalPairs of 1', async () => {
      const data = validAttemptData();
      data.totalPairs = 1;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.totalPairs).toBe(1);
    });

    it('should reject timeSpent less than 0', async () => {
      const data = validAttemptData();
      data.timeSpent = -1;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/timeSpent/);
    });

    it('should accept timeSpent of 0', async () => {
      const data = validAttemptData();
      data.timeSpent = 0;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.timeSpent).toBe(0);
    });

    it('should reject passingScore less than 0', async () => {
      const data = validAttemptData();
      data.passingScore = -1;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/passingScore/);
    });

    it('should reject passingScore greater than 100', async () => {
      const data = validAttemptData();
      data.passingScore = 101;
      const attempt = new MatchingAttempt(data);

      await expect(attempt.validate()).rejects.toThrow(/passingScore/);
    });

    it('should accept passingScore of 0', async () => {
      const data = validAttemptData();
      data.passingScore = 0;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.passingScore).toBe(0);
    });

    it('should accept passingScore of 100', async () => {
      const data = validAttemptData();
      data.passingScore = 100;
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.passingScore).toBe(100);
    });
  });

  describe('Default Values', () => {
    it('should auto-generate timestamps', async () => {
      const data = validAttemptData();
      const attempt = await MatchingAttempt.create(data);

      expect(attempt.createdAt).toBeDefined();
      expect(attempt.updatedAt).toBeDefined();
    });

    it('should default submittedAt to current date if not provided', async () => {
      const data = validAttemptData();
      delete (data as any).submittedAt;
      const before = new Date();
      const attempt = await MatchingAttempt.create(data);
      const after = new Date();

      expect(attempt.submittedAt).toBeDefined();
      expect(attempt.submittedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(attempt.submittedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have compound index on exerciseId, learnerId, attemptNumber', async () => {
      const indexes = await MatchingAttempt.collection.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx.key?.exerciseId === 1 && idx.key?.learnerId === 1 && idx.key?.attemptNumber === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have compound index on learnerId, submittedAt', async () => {
      const indexes = await MatchingAttempt.collection.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx.key?.learnerId === 1 && idx.key?.submittedAt === -1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have compound index on exerciseId, passed', async () => {
      const indexes = await MatchingAttempt.collection.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx.key?.exerciseId === 1 && idx.key?.passed === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on sessionId', async () => {
      const indexes = await MatchingAttempt.collection.indexes();
      const sessionIndex = indexes.find(
        (idx: any) => idx.key?.sessionId === 1
      );
      expect(sessionIndex).toBeDefined();
    });

    it('should find attempts by exerciseId and learnerId', async () => {
      const exerciseId = new mongoose.Types.ObjectId();
      const learnerId = new mongoose.Types.ObjectId();

      const data1 = validAttemptData();
      data1.exerciseId = exerciseId;
      data1.learnerId = learnerId;
      data1.attemptNumber = 1;
      await MatchingAttempt.create(data1);

      const data2 = validAttemptData();
      data2.exerciseId = exerciseId;
      data2.learnerId = learnerId;
      data2.attemptNumber = 2;
      await MatchingAttempt.create(data2);

      const attempts = await MatchingAttempt.find({ exerciseId, learnerId }).sort({ attemptNumber: 1 });
      expect(attempts).toHaveLength(2);
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[1].attemptNumber).toBe(2);
    });

    it('should find attempts by sessionId', async () => {
      const sessionId = new mongoose.Types.ObjectId();

      const data = validAttemptData();
      data.sessionId = sessionId;
      await MatchingAttempt.create(data);

      const attempts = await MatchingAttempt.find({ sessionId });
      expect(attempts).toHaveLength(1);
      expect(attempts[0].sessionId).toEqual(sessionId);
    });
  });
});
