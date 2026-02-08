/**
 * Unit Tests: LearningUnitQuestionsService
 *
 * Tests for the learning-unit-questions service:
 * - listLinked: listing questions linked to a learning unit
 * - linkQuestion: linking a single question
 * - bulkLink: bulk linking questions
 * - updateLink: updating link settings
 * - unlinkQuestion: removing a link
 * - validateLearningUnitType: type validation
 * - getBulkLimit: settings retrieval
 */

import mongoose from 'mongoose';
import { LearningUnitQuestionsService } from '@/services/content/learning-unit-questions.service';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import Question from '@/models/assessment/Question.model';
import Module from '@/models/academic/Module.model';
import Setting from '@/models/system/Setting.model';
import { ApiError } from '@/utils/ApiError';

// Mock the models
jest.mock('@/models/content/LearningUnitQuestion.model');
jest.mock('@/models/content/LearningUnit.model');
jest.mock('@/models/assessment/Question.model');
jest.mock('@/models/academic/Module.model');
jest.mock('@/models/system/Setting.model');

describe('LearningUnitQuestionsService', () => {
  const mockLearningUnitId = new mongoose.Types.ObjectId().toString();
  const mockQuestionId = new mongoose.Types.ObjectId().toString();
  const mockQuestionId2 = new mongoose.Types.ObjectId().toString();
  const mockLinkId = new mongoose.Types.ObjectId().toString();
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId();
  const mockBankId = new mongoose.Types.ObjectId().toString();

  const mockLearningUnit = {
    _id: new mongoose.Types.ObjectId(mockLearningUnitId),
    moduleId: new mongoose.Types.ObjectId(mockModuleId),
    title: 'Test Exercise',
    type: 'exercise',
    toString() { return mockLearningUnitId; }
  };

  const mockQuestion = {
    _id: new mongoose.Types.ObjectId(mockQuestionId),
    questionText: 'What is 2 + 2?',
    questionTypes: ['multiple_choice'],
    difficulty: 'easy',
    points: 10,
    tags: ['math'],
    options: [{ text: '4', isCorrect: true }],
    isActive: true,
    departmentId: mockDepartmentId,
    questionBankIds: [mockBankId]
  };

  const mockModule = {
    _id: new mongoose.Types.ObjectId(mockModuleId),
    ownerDepartmentId: mockDepartmentId
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // listLinked
  // --------------------------------------------------------------------------
  describe('listLinked()', () => {
    it('should return linked questions with totalPoints', async () => {
      const linkDoc = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        sequence: 0,
        pointsOverride: null
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockLean = jest.fn().mockResolvedValue([linkDoc]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (LearningUnitQuestion.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockQuestionsLean = jest.fn().mockResolvedValue([mockQuestion]);
      (Question.find as jest.Mock).mockReturnValue({ lean: mockQuestionsLean });

      const result = await LearningUnitQuestionsService.listLinked(mockLearningUnitId);

      expect(result.learningUnitId).toBe(mockLearningUnitId);
      expect(result.learningUnitTitle).toBe('Test Exercise');
      expect(result.totalQuestions).toBe(1);
      // pointsOverride is null, so uses question.points = 10
      expect(result.totalPoints).toBe(10);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBeDefined();
      expect(result.questions[0].question!.text).toBe('What is 2 + 2?');
      expect(result.questions[0].question!.points).toBe(10);
    });

    it('should use pointsOverride when set', async () => {
      const linkDoc = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        sequence: 0,
        pointsOverride: 25
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockLean = jest.fn().mockResolvedValue([linkDoc]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (LearningUnitQuestion.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockQuestionsLean = jest.fn().mockResolvedValue([mockQuestion]);
      (Question.find as jest.Mock).mockReturnValue({ lean: mockQuestionsLean });

      const result = await LearningUnitQuestionsService.listLinked(mockLearningUnitId);

      expect(result.totalPoints).toBe(25);
      expect(result.questions[0].pointsOverride).toBe(25);
    });

    it('should return empty questions array when no links exist', async () => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockLean = jest.fn().mockResolvedValue([]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (LearningUnitQuestion.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const mockQuestionsLean = jest.fn().mockResolvedValue([]);
      (Question.find as jest.Mock).mockReturnValue({ lean: mockQuestionsLean });

      const result = await LearningUnitQuestionsService.listLinked(mockLearningUnitId);

      expect(result.totalQuestions).toBe(0);
      expect(result.totalPoints).toBe(0);
      expect(result.questions).toEqual([]);
    });

    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        LearningUnitQuestionsService.listLinked('invalid-id')
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 when learning unit does not exist', async () => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearningUnitQuestionsService.listLinked(mockLearningUnitId)
      ).rejects.toThrow('Learning unit not found');
    });

    it('should handle question not found in map (inactive/deleted)', async () => {
      const linkDoc = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        sequence: 0,
        pointsOverride: null
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockLean = jest.fn().mockResolvedValue([linkDoc]);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (LearningUnitQuestion.find as jest.Mock).mockReturnValue({ sort: mockSort });

      // Return empty array - question not found (inactive)
      const mockQuestionsLean = jest.fn().mockResolvedValue([]);
      (Question.find as jest.Mock).mockReturnValue({ lean: mockQuestionsLean });

      const result = await LearningUnitQuestionsService.listLinked(mockLearningUnitId);

      expect(result.totalQuestions).toBe(1);
      // No question found, pointsOverride is null, so points = 0
      expect(result.totalPoints).toBe(0);
      expect(result.questions[0].question).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // linkQuestion
  // --------------------------------------------------------------------------
  describe('linkQuestion()', () => {
    it('should link a question successfully', async () => {
      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: null
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

      // Mock Module.findById for getLearningUnitDepartment
      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      // No existing link (duplicate check)
      (LearningUnitQuestion.findOne as jest.Mock).mockResolvedValueOnce(null);

      // Max sequence query (auto-assign)
      (LearningUnitQuestion.findOne as jest.Mock).mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null)
          })
        })
      });

      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, {
        questionId: mockQuestionId
      });

      expect(result.id).toBe(mockLinkId);
      expect(result.questionId).toBe(mockQuestionId);
      expect(result.learningUnitId).toBe(mockLearningUnitId);
      expect(result.sequence).toBe(0);
      expect(result.pointsOverride).toBeNull();
    });

    it('should auto-assign sequence as max + 1', async () => {
      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 3,
        pointsOverride: null
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      // No duplicate
      (LearningUnitQuestion.findOne as jest.Mock).mockResolvedValueOnce(null);

      // Existing max sequence = 2
      (LearningUnitQuestion.findOne as jest.Mock).mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ sequence: 2 })
          })
        })
      });

      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, {
        questionId: mockQuestionId
      });

      expect(result.sequence).toBe(3);
    });

    it('should use provided sequence when given', async () => {
      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 5,
        pointsOverride: null
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      (LearningUnitQuestion.findOne as jest.Mock).mockResolvedValueOnce(null);
      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, {
        questionId: mockQuestionId,
        sequence: 5
      });

      expect(result.sequence).toBe(5);
    });

    it('should use provided pointsOverride', async () => {
      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: 20
      };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      (LearningUnitQuestion.findOne as jest.Mock).mockResolvedValueOnce(null);
      (LearningUnitQuestion.findOne as jest.Mock).mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null)
          })
        })
      });

      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, {
        questionId: mockQuestionId,
        pointsOverride: 20
      });

      expect(result.pointsOverride).toBe(20);
    });

    it('should throw 404 for invalid learning unit ObjectId', async () => {
      await expect(
        LearningUnitQuestionsService.linkQuestion('invalid-id', { questionId: mockQuestionId })
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for invalid question ObjectId', async () => {
      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: 'invalid-id' })
      ).rejects.toThrow('Question not found');
    });

    it('should throw error for unsupported learning unit type', async () => {
      const lessonUnit = { ...mockLearningUnit, type: 'lesson' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(lessonUnit);

      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: mockQuestionId })
      ).rejects.toThrow("does not support questions");
    });

    it('should throw 404 when question does not exist', async () => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      (Question.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: mockQuestionId })
      ).rejects.toThrow('Question not found');
    });

    it('should throw 404 when question is inactive', async () => {
      const inactiveQuestion = { ...mockQuestion, isActive: false };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      (Question.findById as jest.Mock).mockResolvedValue(inactiveQuestion);

      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: mockQuestionId })
      ).rejects.toThrow('Question not found');
    });

    it('should throw error when question is from different department', async () => {
      const differentDeptId = new mongoose.Types.ObjectId();
      const questionDifferentDept = { ...mockQuestion, departmentId: differentDeptId };

      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(questionDifferentDept);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: mockQuestionId })
      ).rejects.toThrow('Question must be from the same department');
    });

    it('should throw error when question is already linked', async () => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      // Existing link found (duplicate)
      (LearningUnitQuestion.findOne as jest.Mock).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId()
      });

      await expect(
        LearningUnitQuestionsService.linkQuestion(mockLearningUnitId, { questionId: mockQuestionId })
      ).rejects.toThrow('Question already linked to this learning unit');
    });
  });

  // --------------------------------------------------------------------------
  // bulkLink
  // --------------------------------------------------------------------------
  describe('bulkLink()', () => {
    const setupBulkMocks = (opts: {
      replaceExisting?: boolean;
      existingLinks?: any[];
      maxSequenceDoc?: any;
      questions?: any[];
      deletedCount?: number;
    } = {}) => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mockLearningUnit);

      const mockModuleSelect = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockModule)
      });
      (Module.findById as jest.Mock).mockReturnValue({ select: mockModuleSelect });

      // Setting for bulk limit
      (Setting.findOne as jest.Mock).mockResolvedValue({ value: 500 });

      if (opts.replaceExisting) {
        (LearningUnitQuestion.deleteMany as jest.Mock).mockResolvedValue({
          deletedCount: opts.deletedCount ?? 0
        });
      }

      if (!opts.replaceExisting) {
        // Existing links query
        const existingLinksLean = jest.fn().mockResolvedValue(opts.existingLinks ?? []);
        const existingLinksSelect = jest.fn().mockReturnValue({ lean: existingLinksLean });
        (LearningUnitQuestion.find as jest.Mock).mockReturnValue({ select: existingLinksSelect });

        // Max sequence query
        (LearningUnitQuestion.findOne as jest.Mock).mockReturnValue({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(opts.maxSequenceDoc ?? null)
            })
          })
        });
      }

      // Questions lookup
      const mockQuestionsLean = jest.fn().mockResolvedValue(opts.questions ?? [mockQuestion]);
      (Question.find as jest.Mock).mockReturnValue({ lean: mockQuestionsLean });
    };

    it('should bulk link questions successfully', async () => {
      setupBulkMocks();

      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0
      };
      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }]
      });

      expect(result.linked).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.removed).toBe(0);
      expect(result.links).toHaveLength(1);
    });

    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        LearningUnitQuestionsService.bulkLink('invalid-id', {
          questions: [{ questionId: mockQuestionId }]
        })
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw error when questions array is empty', async () => {
      await expect(
        LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
          questions: []
        })
      ).rejects.toThrow('Questions array cannot be empty');
    });

    it('should throw error when exceeding bulk limit', async () => {
      // Setting returns a low limit
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({ value: 2 });
      // Second findOne call for nested structure
      (Setting.findOne as jest.Mock).mockResolvedValueOnce(null);

      // Actually the service calls getBulkLimit which tries two findOne calls
      // Let's re-mock properly for the first call returning value: 2
      jest.clearAllMocks();
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({ value: 2 });

      await expect(
        LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
          questions: [
            { questionId: mockQuestionId },
            { questionId: mockQuestionId2 },
            { questionId: new mongoose.Types.ObjectId().toString() }
          ]
        })
      ).rejects.toThrow('Bulk operation limit is 2 questions');
    });

    it('should skip duplicate questions when not replacing', async () => {
      setupBulkMocks({
        existingLinks: [{ questionId: new mongoose.Types.ObjectId(mockQuestionId) }]
      });

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }]
      });

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should skip questions that do not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      setupBulkMocks({ questions: [] }); // No questions found

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: nonExistentId }]
      });

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should delete existing links when replaceExisting is true', async () => {
      setupBulkMocks({ replaceExisting: true, deletedCount: 3 });

      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0
      };
      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }],
        replaceExisting: true
      });

      expect(result.removed).toBe(3);
      expect(result.linked).toBe(1);
      expect(LearningUnitQuestion.deleteMany).toHaveBeenCalled();
    });

    it('should skip questions from different departments', async () => {
      const differentDeptId = new mongoose.Types.ObjectId();
      const questionDiffDept = { ...mockQuestion, departmentId: differentDeptId };
      setupBulkMocks({ questions: [questionDiffDept] });

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }]
      });

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should handle duplicate key errors during create gracefully', async () => {
      setupBulkMocks();

      const duplicateKeyError = new Error('duplicate key') as any;
      duplicateKeyError.code = 11000;
      (LearningUnitQuestion.create as jest.Mock).mockRejectedValue(duplicateKeyError);

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }]
      });

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should re-throw non-duplicate-key errors during create', async () => {
      setupBulkMocks();

      const genericError = new Error('database error');
      (LearningUnitQuestion.create as jest.Mock).mockRejectedValue(genericError);

      await expect(
        LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
          questions: [{ questionId: mockQuestionId }]
        })
      ).rejects.toThrow('database error');
    });

    it('should auto-assign sequence starting from max + 1', async () => {
      setupBulkMocks({ maxSequenceDoc: { sequence: 5 } });

      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 6
      };
      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      const result = await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId }]
      });

      expect(result.linked).toBe(1);
      expect(LearningUnitQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({ sequence: 6 })
      );
    });

    it('should use provided sequence when given', async () => {
      setupBulkMocks();

      const createdLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 10
      };
      (LearningUnitQuestion.create as jest.Mock).mockResolvedValue(createdLink);

      await LearningUnitQuestionsService.bulkLink(mockLearningUnitId, {
        questions: [{ questionId: mockQuestionId, sequence: 10 }]
      });

      expect(LearningUnitQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({ sequence: 10 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // updateLink
  // --------------------------------------------------------------------------
  describe('updateLink()', () => {
    it('should update sequence on a link', async () => {
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: null,
        save: jest.fn().mockResolvedValue(true)
      };
      // Make toString() on learningUnitId return the correct string
      mockLink.learningUnitId.toString = () => mockLearningUnitId;

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      const result = await LearningUnitQuestionsService.updateLink(
        mockLearningUnitId,
        mockLinkId,
        { sequence: 5 }
      );

      expect(mockLink.save).toHaveBeenCalled();
      expect(result.sequence).toBe(5);
    });

    it('should update pointsOverride on a link', async () => {
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: null,
        save: jest.fn().mockResolvedValue(true)
      };
      mockLink.learningUnitId.toString = () => mockLearningUnitId;

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      const result = await LearningUnitQuestionsService.updateLink(
        mockLearningUnitId,
        mockLinkId,
        { pointsOverride: 15 }
      );

      expect(mockLink.save).toHaveBeenCalled();
      expect(result.pointsOverride).toBe(15);
    });

    it('should update both sequence and pointsOverride', async () => {
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: null,
        save: jest.fn().mockResolvedValue(true)
      };
      mockLink.learningUnitId.toString = () => mockLearningUnitId;

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      const result = await LearningUnitQuestionsService.updateLink(
        mockLearningUnitId,
        mockLinkId,
        { sequence: 3, pointsOverride: 20 }
      );

      expect(result.sequence).toBe(3);
      expect(result.pointsOverride).toBe(20);
    });

    it('should allow setting pointsOverride to null', async () => {
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: 10,
        save: jest.fn().mockResolvedValue(true)
      };
      mockLink.learningUnitId.toString = () => mockLearningUnitId;

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      const result = await LearningUnitQuestionsService.updateLink(
        mockLearningUnitId,
        mockLinkId,
        { pointsOverride: null }
      );

      expect(result.pointsOverride).toBeNull();
    });

    it('should throw 404 for invalid learningUnitId', async () => {
      await expect(
        LearningUnitQuestionsService.updateLink('invalid-id', mockLinkId, { sequence: 1 })
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for invalid linkId', async () => {
      await expect(
        LearningUnitQuestionsService.updateLink(mockLearningUnitId, 'invalid-id', { sequence: 1 })
      ).rejects.toThrow('Link not found');
    });

    it('should throw 404 when link does not exist', async () => {
      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearningUnitQuestionsService.updateLink(mockLearningUnitId, mockLinkId, { sequence: 1 })
      ).rejects.toThrow('Link not found');
    });

    it('should throw 404 when link belongs to different learning unit', async () => {
      const differentLuId = new mongoose.Types.ObjectId();
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: differentLuId,
        questionId: new mongoose.Types.ObjectId(mockQuestionId),
        sequence: 0,
        pointsOverride: null,
        save: jest.fn()
      };

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      await expect(
        LearningUnitQuestionsService.updateLink(mockLearningUnitId, mockLinkId, { sequence: 1 })
      ).rejects.toThrow('Link not found');
    });
  });

  // --------------------------------------------------------------------------
  // unlinkQuestion
  // --------------------------------------------------------------------------
  describe('unlinkQuestion()', () => {
    it('should delete a link successfully', async () => {
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: new mongoose.Types.ObjectId(mockLearningUnitId),
        questionId: new mongoose.Types.ObjectId(mockQuestionId)
      };
      mockLink.learningUnitId.toString = () => mockLearningUnitId;

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);
      (LearningUnitQuestion.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await LearningUnitQuestionsService.unlinkQuestion(mockLearningUnitId, mockLinkId);

      expect(LearningUnitQuestion.deleteOne).toHaveBeenCalledWith({ _id: mockLink._id });
    });

    it('should throw 404 for invalid learningUnitId', async () => {
      await expect(
        LearningUnitQuestionsService.unlinkQuestion('invalid-id', mockLinkId)
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 for invalid linkId', async () => {
      await expect(
        LearningUnitQuestionsService.unlinkQuestion(mockLearningUnitId, 'invalid-id')
      ).rejects.toThrow('Link not found');
    });

    it('should throw 404 when link does not exist', async () => {
      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearningUnitQuestionsService.unlinkQuestion(mockLearningUnitId, mockLinkId)
      ).rejects.toThrow('Link not found');
    });

    it('should throw 404 when link belongs to different learning unit', async () => {
      const differentLuId = new mongoose.Types.ObjectId();
      const mockLink = {
        _id: new mongoose.Types.ObjectId(mockLinkId),
        learningUnitId: differentLuId,
        questionId: new mongoose.Types.ObjectId(mockQuestionId)
      };

      (LearningUnitQuestion.findById as jest.Mock).mockResolvedValue(mockLink);

      await expect(
        LearningUnitQuestionsService.unlinkQuestion(mockLearningUnitId, mockLinkId)
      ).rejects.toThrow('Link not found');
    });
  });

  // --------------------------------------------------------------------------
  // validateLearningUnitType
  // --------------------------------------------------------------------------
  describe('validateLearningUnitType()', () => {
    it('should return learning unit for exercise type', async () => {
      const exerciseUnit = { ...mockLearningUnit, type: 'exercise' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(exerciseUnit);

      const result = await LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId);

      expect(result.type).toBe('exercise');
    });

    it('should return learning unit for assessment type', async () => {
      const assessmentUnit = { ...mockLearningUnit, type: 'assessment' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(assessmentUnit);

      const result = await LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId);

      expect(result.type).toBe('assessment');
    });

    it('should throw error for lesson type', async () => {
      const lessonUnit = { ...mockLearningUnit, type: 'lesson' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(lessonUnit);

      await expect(
        LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId)
      ).rejects.toThrow("Learning unit type 'lesson' does not support questions");
    });

    it('should throw error for video type', async () => {
      const videoUnit = { ...mockLearningUnit, type: 'video' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(videoUnit);

      await expect(
        LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId)
      ).rejects.toThrow("Learning unit type 'video' does not support questions");
    });

    it('should throw error for media type', async () => {
      const mediaUnit = { ...mockLearningUnit, type: 'media' };
      (LearningUnit.findById as jest.Mock).mockResolvedValue(mediaUnit);

      await expect(
        LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId)
      ).rejects.toThrow("Learning unit type 'media' does not support questions");
    });

    it('should throw 404 for invalid ObjectId', async () => {
      await expect(
        LearningUnitQuestionsService.validateLearningUnitType('invalid-id')
      ).rejects.toThrow('Learning unit not found');
    });

    it('should throw 404 when learning unit does not exist', async () => {
      (LearningUnit.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        LearningUnitQuestionsService.validateLearningUnitType(mockLearningUnitId)
      ).rejects.toThrow('Learning unit not found');
    });
  });

  // --------------------------------------------------------------------------
  // getBulkLimit
  // --------------------------------------------------------------------------
  describe('getBulkLimit()', () => {
    it('should return limit from direct value setting', async () => {
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({ value: 100 });

      const limit = await LearningUnitQuestionsService.getBulkLimit();

      expect(limit).toBe(100);
      expect(Setting.findOne).toHaveBeenCalledWith({
        category: 'question',
        key: 'bulkOperations.maxItems'
      });
    });

    it('should return limit from nested object setting', async () => {
      // First call (direct key) returns no number value
      (Setting.findOne as jest.Mock).mockResolvedValueOnce(null);
      // Second call (nested structure) returns object
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({
        value: { maxItems: 250 }
      });

      const limit = await LearningUnitQuestionsService.getBulkLimit();

      expect(limit).toBe(250);
    });

    it('should return default 500 when no settings found', async () => {
      (Setting.findOne as jest.Mock).mockResolvedValue(null);

      const limit = await LearningUnitQuestionsService.getBulkLimit();

      expect(limit).toBe(500);
    });

    it('should return default 500 when setting value is not a number', async () => {
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({ value: 'not-a-number' });
      (Setting.findOne as jest.Mock).mockResolvedValueOnce(null);

      const limit = await LearningUnitQuestionsService.getBulkLimit();

      expect(limit).toBe(500);
    });

    it('should return default 500 on error', async () => {
      (Setting.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      const limit = await LearningUnitQuestionsService.getBulkLimit();

      expect(limit).toBe(500);
    });
  });
});
