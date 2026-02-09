/**
 * Unit Tests: AssessmentAttemptsService — Exception Integration
 *
 * Tests that the extra_attempts exception integrates correctly
 * with the assessment attempt max attempts check.
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

describe('AssessmentAttemptsService - Exception Integration', () => {
  const mockAssessmentId = new mongoose.Types.ObjectId().toString();
  const mockLearnerId = new mongoose.Types.ObjectId().toString();
  const mockEnrollmentId = new mongoose.Types.ObjectId().toString();

  const mockAssessment = {
    _id: mockAssessmentId,
    isPublished: true,
    isArchived: false,
    attempts: {
      maxAttempts: 3,
      showResultsAfterSubmission: true
    },
    questionSelection: {
      questionBankIds: [new mongoose.Types.ObjectId()],
      questionCount: 2,
      selectionMode: 'sequential',
      filterByTags: [],
      filterByDifficulty: []
    },
    timing: {
      timeLimit: null
    },
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showCorrectAnswers: false,
      timeLimitMinutes: null,
      passingScore: 70,
      autoGrade: true
    }
  };

  const mockQuestions = [
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q1',
      questionTypes: ['multiple_choice'],
      options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
      correctAnswer: 'A'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      questionText: 'Q2',
      questionTypes: ['multiple_choice'],
      options: [{ text: 'C', isCorrect: true }, { text: 'D', isCorrect: false }],
      correctAnswer: 'C'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: assessment found
    const mockLean = jest.fn().mockResolvedValue(mockAssessment);
    (Assessment.findOne as jest.Mock).mockReturnValue({ lean: mockLean });

    // Default: no existing in-progress attempt
    (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);

    // Default: mock question selection
    const mockQLean = jest.fn().mockResolvedValue(mockQuestions);
    (Question.find as jest.Mock).mockReturnValue({ lean: mockQLean });

    // Default: mock create for creating attempts
    (AssessmentAttempt.create as jest.Mock).mockImplementation((data: any) =>
      Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
    );
  });

  it('should allow attempt when exception grants additional attempts beyond max', async () => {
    // 3 previous attempts (at max), but exception grants 2 more
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(3);
    (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(2);

    const result = await AssessmentAttemptsService.startAttempt(
      mockAssessmentId,
      mockLearnerId,
      mockEnrollmentId
    );

    expect(result).toBeDefined();
    expect(LearnerExceptionService.getAdditionalAttempts).toHaveBeenCalledWith(
      mockLearnerId,
      mockAssessmentId
    );
  });

  it('should still reject when exception + maxAttempts exhausted', async () => {
    // 5 previous attempts, max=3, exception grants 2 → effective max=5, so 5 >= 5 → reject
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(5);
    (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(2);

    await expect(
      AssessmentAttemptsService.startAttempt(
        mockAssessmentId,
        mockLearnerId,
        mockEnrollmentId
      )
    ).rejects.toThrow(/Maximum attempts reached/);
  });

  it('should work normally when no exceptions exist', async () => {
    // 1 previous attempt, max=3, no exceptions
    (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(1);
    (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(0);

    const result = await AssessmentAttemptsService.startAttempt(
      mockAssessmentId,
      mockLearnerId,
      mockEnrollmentId
    );

    expect(result).toBeDefined();
  });
});
