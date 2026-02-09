/**
 * Unit Tests: AssessmentAttemptsService — Exception-based attempt limits
 *
 * Tests for the LearnerExceptionService integration that allows
 * additional attempts beyond the configured max.
 */

import mongoose from 'mongoose';
import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import Assessment from '@/models/content/Assessment.model';
import Question from '@/models/assessment/Question.model';
import { LearnerExceptionService } from '@/services/exception/learnerException.service';

jest.mock('@/models/progress/AssessmentAttempt.model');
jest.mock('@/models/content/Assessment.model');
jest.mock('@/models/assessment/Question.model');
jest.mock('@/services/exception/learnerException.service');

const mockAssessmentId = new mongoose.Types.ObjectId().toString();
const mockLearnerId = new mongoose.Types.ObjectId().toString();
const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

const createMockAssessment = (maxAttempts: number | null) => ({
  _id: mockAssessmentId,
  isPublished: true,
  isArchived: false,
  attempts: { maxAttempts },
  timing: { timeLimit: null },
  questionSelection: {
    questionBankIds: [new mongoose.Types.ObjectId()],
    questionCount: 1,
    selectionMode: 'sequential',
    filterByTags: [],
    filterByDifficulty: []
  },
  scoring: { passingScore: 70, showCorrectAnswers: 'never' },
  feedback: {}
});

describe('AssessmentAttemptsService — exception-based attempt limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow attempts beyond max when learner has exception', async () => {
    const assessment = createMockAssessment(2); // max 2 attempts

    // Assessment lookup
    (Assessment.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(assessment)
    });

    // No in-progress attempt
    (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);

    // Already used 2 attempts
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(2);

    // Exception grants 1 additional attempt
    (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(1);

    // Questions
    (Question.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([{
        _id: new mongoose.Types.ObjectId(),
        questionText: 'Test?',
        questionTypes: ['multiple_choice'],
        options: ['A', 'B'],
        correctAnswer: 'A',
        points: 10
      }])
    });

    // Create attempt
    (AssessmentAttempt.create as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      assessmentId: mockAssessmentId,
      learnerId: mockLearnerId,
      attemptNumber: 3,
      status: 'in_progress'
    });

    const result = await AssessmentAttemptsService.startAttempt(
      mockAssessmentId,
      mockLearnerId,
      mockEnrollmentId
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('in_progress');
    expect(LearnerExceptionService.getAdditionalAttempts).toHaveBeenCalledWith(
      mockLearnerId,
      mockAssessmentId
    );
  });

  it('should reject when max attempts reached even with exceptions', async () => {
    const assessment = createMockAssessment(2); // max 2 attempts

    (Assessment.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(assessment)
    });

    (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);

    // Already used 3 attempts
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(3);

    // Exception grants 1 additional (total effective max = 3)
    (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(1);

    await expect(
      AssessmentAttemptsService.startAttempt(
        mockAssessmentId,
        mockLearnerId,
        mockEnrollmentId
      )
    ).rejects.toThrow('Maximum attempts reached');
  });

  it('should not check exceptions when maxAttempts is null (unlimited)', async () => {
    const assessment = createMockAssessment(null); // unlimited

    (Assessment.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(assessment)
    });

    (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(50);

    (Question.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([{
        _id: new mongoose.Types.ObjectId(),
        questionText: 'Test?',
        questionTypes: ['multiple_choice'],
        options: ['A', 'B'],
        correctAnswer: 'A',
        points: 10
      }])
    });

    (AssessmentAttempt.create as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      status: 'in_progress'
    });

    await AssessmentAttemptsService.startAttempt(
      mockAssessmentId,
      mockLearnerId,
      mockEnrollmentId
    );

    // Should NOT have checked for exceptions since maxAttempts is null
    expect(LearnerExceptionService.getAdditionalAttempts).not.toHaveBeenCalled();
  });
});
