/**
 * Unit Tests: QuestionsService
 *
 * Tests for the questions service:
 * - Bank filtering in listQuestions
 * - getQuestionsByBankIds with various filters
 * - addToBank and removeFromBank operations
 * - questionBankIds in create/update
 */

import mongoose from 'mongoose';
import { QuestionsService } from '@/services/content/questions.service';
import Question from '@/models/assessment/Question.model';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import { ApiError } from '@/utils/ApiError';

// Mock the models
jest.mock('@/models/assessment/Question.model');
jest.mock('@/models/assessment/QuestionBank.model');

describe('QuestionsService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockQuestionId = new mongoose.Types.ObjectId().toString();
  const mockBankId = new mongoose.Types.ObjectId().toString();
  const mockBankId2 = new mongoose.Types.ObjectId().toString();

  const mockQuestion = {
    _id: mockQuestionId,
    questionText: 'What is 2 + 2?',
    questionType: 'multiple-choice',
    departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
    points: 10,
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    difficulty: 'easy',
    tags: ['math', 'arithmetic'],
    explanation: 'Basic addition',
    isActive: true,
    questionBankIds: [mockBankId],
    metadata: { createdBy: mockUserId },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this)
  };

  const mockQuestionBank = {
    _id: mockBankId,
    name: 'Math Questions',
    departmentId: new mongoose.Types.ObjectId(mockDepartmentId),
    questionIds: [new mongoose.Types.ObjectId(mockQuestionId)],
    isActive: true,
    save: jest.fn().mockResolvedValue(this)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listQuestions - Bank Filtering', () => {
    it('should filter questions by single bankId', async () => {
      const questions = [mockQuestion];

      (Question.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(questions)
          })
        })
      });
      (Question.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await QuestionsService.listQuestions(
        { bankId: mockBankId },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(result.questions).toHaveLength(1);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          questionBankIds: mockBankId
        })
      );
    });

    it('should filter questions by multiple bankIds', async () => {
      const questions = [mockQuestion];

      (Question.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(questions)
          })
        })
      });
      (Question.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await QuestionsService.listQuestions(
        { bankIds: [mockBankId, mockBankId2] },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(result.questions).toHaveLength(1);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          questionBankIds: { $in: [mockBankId, mockBankId2] }
        })
      );
    });

    it('should combine bankId filter with other filters', async () => {
      const questions = [mockQuestion];

      (Question.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(questions)
          })
        })
      });
      (Question.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await QuestionsService.listQuestions(
        { bankId: mockBankId, difficulty: 'easy', tag: 'math' },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(result.questions).toHaveLength(1);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          questionBankIds: mockBankId,
          difficulty: 'easy',
          tags: 'math'
        })
      );
    });
  });

  describe('getQuestionsByBankIds', () => {
    it('should return empty array when no bankIds provided', async () => {
      const result = await QuestionsService.getQuestionsByBankIds([]);
      expect(result).toEqual([]);
    });

    it('should return questions from specified banks', async () => {
      const questions = [mockQuestion];

      // Mock find to return array directly when no limit is specified
      (Question.find as jest.Mock).mockResolvedValue(questions);

      const result = await QuestionsService.getQuestionsByBankIds([mockBankId]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockQuestionId);
      expect(result[0].questionBankIds).toContain(mockBankId);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          questionBankIds: { $in: [mockBankId] }
        })
      );
    });

    it('should filter by tags', async () => {
      const questions = [mockQuestion];

      // Mock find to return array directly when no limit is specified
      (Question.find as jest.Mock).mockResolvedValue(questions);

      const result = await QuestionsService.getQuestionsByBankIds(
        [mockBankId],
        { tags: ['math', 'algebra'] }
      );

      expect(result).toHaveLength(1);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          questionBankIds: { $in: [mockBankId] },
          tags: { $in: ['math', 'algebra'] }
        })
      );
    });

    it('should filter by difficulty levels', async () => {
      const questions = [mockQuestion];

      // Mock find to return array directly when no limit is specified
      (Question.find as jest.Mock).mockResolvedValue(questions);

      const result = await QuestionsService.getQuestionsByBankIds(
        [mockBankId],
        { difficulty: ['beginner', 'intermediate'] }
      );

      expect(result).toHaveLength(1);
      // beginner -> easy, intermediate -> medium
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: { $in: ['easy', 'intermediate'] }
        })
      );
    });

    it('should filter by question type', async () => {
      const questions = [mockQuestion];

      // Mock find to return array directly when no limit is specified
      (Question.find as jest.Mock).mockResolvedValue(questions);

      const result = await QuestionsService.getQuestionsByBankIds(
        [mockBankId],
        { questionType: 'multiple_choice' }
      );

      expect(result).toHaveLength(1);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: 'multiple-choice'
        })
      );
    });

    it('should apply limit when specified', async () => {
      const mockLimit = jest.fn().mockResolvedValue([mockQuestion]);

      (Question.find as jest.Mock).mockReturnValue({
        limit: mockLimit
      });

      await QuestionsService.getQuestionsByBankIds(
        [mockBankId],
        { limit: 5 }
      );

      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should use aggregation for random selection', async () => {
      const mockAggregate = jest.fn().mockResolvedValue([{
        ...mockQuestion,
        _id: new mongoose.Types.ObjectId(mockQuestionId)
      }]);

      (Question.aggregate as jest.Mock) = mockAggregate;

      const result = await QuestionsService.getQuestionsByBankIds(
        [mockBankId],
        { limit: 5, random: true }
      );

      expect(result).toHaveLength(1);
      expect(mockAggregate).toHaveBeenCalledWith([
        { $match: expect.objectContaining({ isActive: true }) },
        { $sample: { size: 5 } }
      ]);
    });

    it('should return questions from multiple banks', async () => {
      const question1 = { ...mockQuestion, _id: mockQuestionId, questionBankIds: [mockBankId] };
      const question2 = {
        ...mockQuestion,
        _id: new mongoose.Types.ObjectId().toString(),
        questionBankIds: [mockBankId2]
      };

      // Mock find to return array directly when no limit is specified
      (Question.find as jest.Mock).mockResolvedValue([question1, question2]);

      const result = await QuestionsService.getQuestionsByBankIds([mockBankId, mockBankId2]);

      expect(result).toHaveLength(2);
      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          questionBankIds: { $in: [mockBankId, mockBankId2] }
        })
      );
    });
  });

  describe('addToBank', () => {
    it('should add question to a bank successfully', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const bank = {
        ...mockQuestionBank,
        questionIds: [],
        save: jest.fn().mockResolvedValue(true)
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(bank);

      const result = await QuestionsService.addToBank(
        mockQuestionId,
        mockBankId,
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(result.questionBankIds).toContain(mockBankId);
      expect(question.save).toHaveBeenCalled();
      expect(bank.save).toHaveBeenCalled();
    });

    it('should throw error for invalid question ID', async () => {
      await expect(
        QuestionsService.addToBank(
          'invalid-id',
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error for invalid bank ID', async () => {
      await expect(
        QuestionsService.addToBank(
          mockQuestionId,
          'invalid-id',
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if question not found', async () => {
      (Question.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        QuestionsService.addToBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if bank not found', async () => {
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        QuestionsService.addToBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if question already in bank', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [mockBankId]
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(mockQuestionBank);

      await expect(
        QuestionsService.addToBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow('Question is already in this bank');
    });

    it('should check department access for non-admin users', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [],
        departmentId: new mongoose.Types.ObjectId() // Different department
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);

      await expect(
        QuestionsService.addToBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'instructor',
          [mockDepartmentId]
        )
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('removeFromBank', () => {
    it('should remove question from a bank successfully', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [mockBankId],
        save: jest.fn().mockResolvedValue(true)
      };

      const bank = {
        ...mockQuestionBank,
        questionIds: [new mongoose.Types.ObjectId(mockQuestionId)],
        save: jest.fn().mockResolvedValue(true)
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(bank);

      const result = await QuestionsService.removeFromBank(
        mockQuestionId,
        mockBankId,
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(result.questionBankIds).not.toContain(mockBankId);
      expect(question.save).toHaveBeenCalled();
      expect(bank.save).toHaveBeenCalled();
    });

    it('should throw error for invalid question ID', async () => {
      await expect(
        QuestionsService.removeFromBank(
          'invalid-id',
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error for invalid bank ID', async () => {
      await expect(
        QuestionsService.removeFromBank(
          mockQuestionId,
          'invalid-id',
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if question not found', async () => {
      (Question.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        QuestionsService.removeFromBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if bank not found', async () => {
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        QuestionsService.removeFromBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if question not in bank', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: []
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.findById as jest.Mock).mockResolvedValue(mockQuestionBank);

      await expect(
        QuestionsService.removeFromBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'admin',
          [mockDepartmentId]
        )
      ).rejects.toThrow('Question is not in this bank');
    });

    it('should check department access for non-admin users', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [mockBankId],
        departmentId: new mongoose.Types.ObjectId() // Different department
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);

      await expect(
        QuestionsService.removeFromBank(
          mockQuestionId,
          mockBankId,
          mockUserId,
          'instructor',
          [mockDepartmentId]
        )
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('createQuestion - questionBankIds', () => {
    it('should create question with questionBankIds', async () => {
      const questionData = {
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice' as any,
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false }
        ],
        points: 10,
        difficulty: 'easy' as any,
        tags: ['math'],
        createdBy: mockUserId,
        questionBankIds: [mockBankId, mockBankId2]
      };

      const createdQuestion = {
        _id: mockQuestionId,
        ...mockQuestion,
        questionBankIds: [mockBankId, mockBankId2]
      };

      (Question.create as jest.Mock).mockResolvedValue(createdQuestion);

      const result = await QuestionsService.createQuestion(questionData);

      expect(Question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          questionBankIds: [mockBankId, mockBankId2]
        })
      );
      expect(result.id).toBe(mockQuestionId);
    });

    it('should create question with empty questionBankIds if not provided', async () => {
      const questionData = {
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice' as any,
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false }
        ],
        points: 10,
        createdBy: mockUserId
      };

      const createdQuestion = {
        _id: mockQuestionId,
        ...mockQuestion,
        questionBankIds: []
      };

      (Question.create as jest.Mock).mockResolvedValue(createdQuestion);

      await QuestionsService.createQuestion(questionData);

      expect(Question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          questionBankIds: []
        })
      );
    });
  });

  describe('updateQuestion - questionBankIds', () => {
    it('should update question with new questionBankIds', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [mockBankId],
        save: jest.fn().mockResolvedValue(true)
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await QuestionsService.updateQuestion(
        mockQuestionId,
        { questionBankIds: [mockBankId, mockBankId2] },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(question.questionBankIds).toEqual([mockBankId, mockBankId2]);
      expect(question.save).toHaveBeenCalled();
    });

    it('should clear questionBankIds when empty array provided', async () => {
      const question = {
        ...mockQuestion,
        questionBankIds: [mockBankId],
        save: jest.fn().mockResolvedValue(true)
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.countDocuments as jest.Mock).mockResolvedValue(0);

      await QuestionsService.updateQuestion(
        mockQuestionId,
        { questionBankIds: [] },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(question.questionBankIds).toEqual([]);
      expect(question.save).toHaveBeenCalled();
    });

    it('should not modify questionBankIds if not provided in update', async () => {
      const originalBankIds = [mockBankId];
      const question = {
        ...mockQuestion,
        questionBankIds: originalBankIds,
        save: jest.fn().mockResolvedValue(true)
      };

      (Question.findById as jest.Mock).mockResolvedValue(question);
      (QuestionBank.countDocuments as jest.Mock).mockResolvedValue(0);

      await QuestionsService.updateQuestion(
        mockQuestionId,
        { points: 20 },
        mockUserId,
        'admin',
        [mockDepartmentId]
      );

      expect(question.questionBankIds).toEqual(originalBankIds);
      expect(question.save).toHaveBeenCalled();
    });
  });
});
