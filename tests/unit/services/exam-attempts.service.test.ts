import mongoose from 'mongoose';

// Mock all models before importing the service
jest.mock('@/models/activity/ExamResult.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn()
  }
}));

jest.mock('@/models/assessment/Exercise.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('@/models/assessment/Question.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn()
  }
}));

jest.mock('@/models/auth/Learner.model', () => ({
  Learner: {
    find: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('@/models/auth/Staff.model', () => ({
  Staff: {
    findById: jest.fn()
  }
}));

jest.mock('@/models/auth/User.model', () => ({
  User: {
    findById: jest.fn()
  }
}));

jest.mock('@/models/auth/Person.types', () => ({
  getDisplayName: jest.fn().mockReturnValue('Test User'),
  getPrimaryEmail: jest.fn().mockReturnValue({ email: 'test@example.com' })
}));

import ExamResult from '@/models/activity/ExamResult.model';
import Exercise from '@/models/assessment/Exercise.model';
import { ExamAttemptsService } from '@/services/assessment/exam-attempts.service';

const ObjectId = mongoose.Types.ObjectId;

describe('ExamAttemptsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAttempt - maxAttempts enforcement', () => {
    const examId = new ObjectId().toString();
    const userId = new ObjectId().toString();

    const mockExercise = {
      _id: examId,
      title: 'Test Quiz',
      type: 'quiz',
      status: 'published',
      maxAttempts: 2,
      gradingPolicy: 'best',
      timeLimit: 0,
      passingScore: 70,
      totalPoints: 100,
      questionCount: 5,
      questions: [],
      shuffleQuestions: false,
      showFeedback: true,
      allowReview: true,
      instructions: ''
    };

    it('should reject when maxAttempts is reached', async () => {
      // Mock Exercise.findOne().populate().lean() chain
      const mockLean = jest.fn().mockResolvedValue({ ...mockExercise, maxAttempts: 2 });
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Exercise.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      // Mock ExamResult.findOne (no active attempt) with chain .sort().lean()
      const mockActiveLean = jest.fn().mockResolvedValue(null);
      const mockActiveSort = jest.fn().mockReturnValue({ lean: mockActiveLean });
      (ExamResult.findOne as jest.Mock).mockReturnValueOnce(Promise.resolve(null));

      // Mock ExamResult.countDocuments for maxAttempts check
      (ExamResult.countDocuments as jest.Mock).mockResolvedValue(2);

      await expect(
        ExamAttemptsService.createAttempt({ examId }, userId)
      ).rejects.toThrow('Maximum attempts reached');
    });

    it('should allow when under maxAttempts limit', async () => {
      // Mock Exercise.findOne().populate().lean() chain
      const mockLean = jest.fn().mockResolvedValue({ ...mockExercise, maxAttempts: 2 });
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Exercise.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      // Mock ExamResult.findOne for active attempt check (no active)
      (ExamResult.findOne as jest.Mock).mockImplementation((query: any) => {
        if (query?.status?.$in) {
          // Active attempt check
          return Promise.resolve(null);
        }
        // Last attempt number check
        const mockLastLean = jest.fn().mockResolvedValue(null);
        const mockLastSort = jest.fn().mockReturnValue({ lean: mockLastLean });
        return { sort: mockLastSort };
      });

      // Mock ExamResult.countDocuments for maxAttempts check (under limit)
      (ExamResult.countDocuments as jest.Mock).mockResolvedValue(1);

      // Mock Question.find().lean()
      const { default: Question } = require('@/models/assessment/Question.model');
      (Question.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      // Mock ExamResult.create
      const createdAttempt = {
        _id: new ObjectId(),
        examId,
        learnerId: userId,
        attemptNumber: 1,
        status: 'in-progress',
        score: 0,
        maxScore: 100,
        startedAt: new Date(),
        createdAt: new Date(),
        save: jest.fn()
      };
      (ExamResult.create as jest.Mock).mockResolvedValue(createdAttempt);

      const result = await ExamAttemptsService.createAttempt({ examId }, userId);

      expect(result).toBeDefined();
      expect(result.examId).toBe(examId);
      expect(result.maxAttempts).toBe(2);
      expect(result.gradingPolicy).toBe('best');
    });

    it('should allow unlimited attempts when maxAttempts is null', async () => {
      // Mock Exercise.findOne().populate().lean() chain
      const mockLean = jest.fn().mockResolvedValue({ ...mockExercise, maxAttempts: null });
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Exercise.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      // Mock ExamResult.findOne for active attempt check (no active)
      (ExamResult.findOne as jest.Mock).mockImplementation((query: any) => {
        if (query?.status?.$in) {
          return Promise.resolve(null);
        }
        const mockLastLean = jest.fn().mockResolvedValue(null);
        const mockLastSort = jest.fn().mockReturnValue({ lean: mockLastLean });
        return { sort: mockLastSort };
      });

      // Mock Question.find().lean()
      const { default: Question } = require('@/models/assessment/Question.model');
      (Question.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      // Mock ExamResult.create
      const createdAttempt = {
        _id: new ObjectId(),
        examId,
        learnerId: userId,
        attemptNumber: 1,
        status: 'in-progress',
        score: 0,
        maxScore: 100,
        startedAt: new Date(),
        createdAt: new Date(),
        save: jest.fn()
      };
      (ExamResult.create as jest.Mock).mockResolvedValue(createdAttempt);

      // Should NOT call countDocuments since maxAttempts is null
      const result = await ExamAttemptsService.createAttempt({ examId }, userId);

      expect(result).toBeDefined();
      expect(ExamResult.countDocuments).not.toHaveBeenCalled();
      expect(result.maxAttempts).toBeNull();
    });

    it('should allow unlimited attempts when maxAttempts is undefined', async () => {
      // Mock Exercise.findOne().populate().lean() chain with no maxAttempts field
      const exerciseNoMax = { ...mockExercise };
      delete (exerciseNoMax as any).maxAttempts;
      const mockLean = jest.fn().mockResolvedValue(exerciseNoMax);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      (Exercise.findOne as jest.Mock).mockReturnValue({ populate: mockPopulate });

      // Mock ExamResult.findOne for active attempt check (no active)
      (ExamResult.findOne as jest.Mock).mockImplementation((query: any) => {
        if (query?.status?.$in) {
          return Promise.resolve(null);
        }
        const mockLastLean = jest.fn().mockResolvedValue(null);
        const mockLastSort = jest.fn().mockReturnValue({ lean: mockLastLean });
        return { sort: mockLastSort };
      });

      // Mock Question.find().lean()
      const { default: Question } = require('@/models/assessment/Question.model');
      (Question.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      // Mock ExamResult.create
      const createdAttempt = {
        _id: new ObjectId(),
        examId,
        learnerId: userId,
        attemptNumber: 1,
        status: 'in-progress',
        score: 0,
        maxScore: 100,
        startedAt: new Date(),
        createdAt: new Date(),
        save: jest.fn()
      };
      (ExamResult.create as jest.Mock).mockResolvedValue(createdAttempt);

      const result = await ExamAttemptsService.createAttempt({ examId }, userId);

      expect(result).toBeDefined();
      expect(ExamResult.countDocuments).not.toHaveBeenCalled();
    });
  });

  describe('calculateOfficialGrade', () => {
    const examId = new ObjectId().toString();
    const learnerId = new ObjectId().toString();

    const mockGradedAttempts = [
      { score: 85, percentage: 85, status: 'graded', gradedAt: new Date('2026-02-08') },
      { score: 70, percentage: 70, status: 'graded', gradedAt: new Date('2026-02-07') },
      { score: 90, percentage: 90, status: 'graded', gradedAt: new Date('2026-02-06') }
    ];

    it('should return highest percentage for "best" policy', async () => {
      // Mock ExamResult.find().sort().lean()
      const mockLean = jest.fn().mockResolvedValue(mockGradedAttempts);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (ExamResult.find as jest.Mock).mockReturnValue({ sort: mockSort });

      // Mock Exercise.findById().lean()
      (Exercise.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ passingScore: 70 })
      });

      const result = await ExamAttemptsService.calculateOfficialGrade(examId, learnerId, 'best');

      expect(result).not.toBeNull();
      expect(result!.percentage).toBe(90);
      expect(result!.score).toBe(90);
      expect(result!.passed).toBe(true);
      expect(result!.gradeLetter).toBe('A');
    });

    it('should return most recent attempt for "last" policy', async () => {
      // Sorted by gradedAt desc, so first element is most recent
      const mockLean = jest.fn().mockResolvedValue(mockGradedAttempts);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (ExamResult.find as jest.Mock).mockReturnValue({ sort: mockSort });

      // Mock Exercise.findById().lean()
      (Exercise.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ passingScore: 70 })
      });

      const result = await ExamAttemptsService.calculateOfficialGrade(examId, learnerId, 'last');

      expect(result).not.toBeNull();
      expect(result!.score).toBe(85);
      expect(result!.percentage).toBe(85);
      expect(result!.passed).toBe(true);
      expect(result!.gradeLetter).toBe('B');
    });

    it('should return average of all attempts for "average" policy', async () => {
      const mockLean = jest.fn().mockResolvedValue(mockGradedAttempts);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (ExamResult.find as jest.Mock).mockReturnValue({ sort: mockSort });

      // Mock Exercise.findById().lean()
      (Exercise.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ passingScore: 70 })
      });

      const result = await ExamAttemptsService.calculateOfficialGrade(examId, learnerId, 'average');

      expect(result).not.toBeNull();
      // Average score: (85 + 70 + 90) / 3 = 81.666...
      expect(result!.score).toBeCloseTo(81.67, 1);
      // Average percentage: (85 + 70 + 90) / 3 = 81.666...
      expect(result!.percentage).toBeCloseTo(81.67, 1);
      expect(result!.passed).toBe(true);
      expect(result!.gradeLetter).toBe('B');
    });

    it('should return null when no graded attempts exist', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (ExamResult.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ExamAttemptsService.calculateOfficialGrade(examId, learnerId, 'best');

      expect(result).toBeNull();
    });
  });
});
