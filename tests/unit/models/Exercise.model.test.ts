import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Exercise from '@/models/assessment/Exercise.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Exercise Model', () => {
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
    await Exercise.deleteMany({});
  });

  const validExerciseData = () => ({
    title: 'Sample Quiz',
    type: 'quiz' as const,
    department: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId()
  });

  describe('Valid Exercise Creation', () => {
    it('should create a valid exercise with all required fields', async () => {
      const data = validExerciseData();
      const exercise = await Exercise.create(data);

      expect(exercise.title).toBe('Sample Quiz');
      expect(exercise.type).toBe('quiz');
      expect(exercise.department).toEqual(data.department);
      expect(exercise.createdBy).toEqual(data.createdBy);
      expect(exercise.status).toBe('draft');
      expect(exercise.timeLimit).toBe(0);
      expect(exercise.passingScore).toBe(70);
      expect(exercise.totalPoints).toBe(0);
      expect(exercise.questionCount).toBe(0);
    });
  });

  describe('maxAttempts Validation', () => {
    it('should accept undefined maxAttempts (default)', async () => {
      const data = validExerciseData();
      const exercise = await Exercise.create(data);

      expect(exercise.maxAttempts).toBeUndefined();
    });

    it('should accept null maxAttempts (unlimited)', async () => {
      const data = { ...validExerciseData(), maxAttempts: null };
      const exercise = await Exercise.create(data);

      expect(exercise.maxAttempts).toBeNull();
    });

    it('should accept positive numbers for maxAttempts', async () => {
      const data1 = { ...validExerciseData(), title: 'Quiz 1', maxAttempts: 1 };
      const exercise1 = await Exercise.create(data1);
      expect(exercise1.maxAttempts).toBe(1);

      const data3 = { ...validExerciseData(), title: 'Quiz 3', maxAttempts: 3 };
      const exercise3 = await Exercise.create(data3);
      expect(exercise3.maxAttempts).toBe(3);

      const data100 = { ...validExerciseData(), title: 'Quiz 100', maxAttempts: 100 };
      const exercise100 = await Exercise.create(data100);
      expect(exercise100.maxAttempts).toBe(100);
    });

    it('should reject 0 for maxAttempts', async () => {
      const data = { ...validExerciseData(), maxAttempts: 0 };
      const exercise = new Exercise(data);

      await expect(exercise.save()).rejects.toThrow(/maxAttempts/);
    });

    it('should reject negative numbers for maxAttempts', async () => {
      const data = { ...validExerciseData(), maxAttempts: -1 };
      const exercise = new Exercise(data);

      await expect(exercise.save()).rejects.toThrow(/maxAttempts/);
    });
  });

  describe('gradingPolicy Validation', () => {
    it('should default gradingPolicy to "best"', async () => {
      const data = validExerciseData();
      const exercise = await Exercise.create(data);

      expect(exercise.gradingPolicy).toBe('best');
    });

    it('should accept "last" as gradingPolicy', async () => {
      const data = { ...validExerciseData(), gradingPolicy: 'last' };
      const exercise = await Exercise.create(data);

      expect(exercise.gradingPolicy).toBe('last');
    });

    it('should accept "average" as gradingPolicy', async () => {
      const data = { ...validExerciseData(), gradingPolicy: 'average' };
      const exercise = await Exercise.create(data);

      expect(exercise.gradingPolicy).toBe('average');
    });

    it('should reject invalid gradingPolicy values', async () => {
      const data = { ...validExerciseData(), gradingPolicy: 'invalid' };
      const exercise = new Exercise(data);

      await expect(exercise.save()).rejects.toThrow();
    });
  });
});
