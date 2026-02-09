/**
 * AssessmentAttemptsService Tests
 * Tests the startAttempt method with learner exception support for additional attempts
 */

import mongoose from 'mongoose';

// Mock models and dependencies
jest.mock('@/models/progress/AssessmentAttempt.model');
jest.mock('@/models/content/Assessment.model');
jest.mock('@/models/assessment/Question.model');
jest.mock('@/services/exception/learnerException.service');

import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';
import { LearnerExceptionService } from '@/services/exception/learnerException.service';
import Assessment from '@/models/content/Assessment.model';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import { ApiError } from '@/utils/ApiError';

describe('AssessmentAttemptsService', () => {
  const validAssessmentId = new mongoose.Types.ObjectId().toString();
  const validLearnerId = 'learner-1';
  const validEnrollmentId = 'enrollment-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startAttempt - learner exception support', () => {
    const mockAssessment = {
      _id: validAssessmentId,
      isPublished: true,
      isArchived: false,
      attempts: {
        maxAttempts: 3,
      },
      timing: {
        timeLimit: null,
      },
      questionBanks: [],
      settings: {},
    };

    it('should allow attempt when learner has exceptions that increase max attempts', async () => {
      // Assessment allows 3 attempts, learner has used 3 but has exception for 2 more
      (Assessment.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAssessment),
      });

      (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null); // no in-progress
      (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(3); // 3 used

      (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(2);

      // Mock the rest of startAttempt's internals so it doesn't crash
      // We're testing the attempt-limit logic, not question selection
      const selectQuestionsSpy = jest
        .spyOn(AssessmentAttemptsService as any, 'selectQuestions')
        .mockResolvedValue([]);

      (AssessmentAttempt.create as jest.Mock).mockResolvedValue({
        _id: 'new-attempt',
        assessmentId: validAssessmentId,
        learnerId: validLearnerId,
        status: 'in_progress',
      });

      // Should NOT throw because 3 < 3 + 2 = 5
      await expect(
        AssessmentAttemptsService.startAttempt(
          validAssessmentId,
          validLearnerId,
          validEnrollmentId
        )
      ).resolves.toBeDefined();

      expect(LearnerExceptionService.getAdditionalAttempts).toHaveBeenCalledWith(
        validLearnerId,
        validAssessmentId
      );

      selectQuestionsSpy.mockRestore();
    });

    it('should reject attempt when max reached even with exceptions', async () => {
      // Assessment allows 3 attempts, learner has used 5, exception gives 2 more (total 5)
      (Assessment.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAssessment),
      });

      (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null); // no in-progress
      (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(5); // 5 used

      (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(2);

      // Should throw because 5 >= 3 + 2 = 5
      await expect(
        AssessmentAttemptsService.startAttempt(
          validAssessmentId,
          validLearnerId,
          validEnrollmentId
        )
      ).rejects.toThrow('Maximum attempts reached');

      expect(LearnerExceptionService.getAdditionalAttempts).toHaveBeenCalled();
    });

    it('should not check exceptions when maxAttempts is null (unlimited)', async () => {
      const unlimitedAssessment = {
        ...mockAssessment,
        attempts: { maxAttempts: null },
      };

      (Assessment.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(unlimitedAssessment),
      });

      (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);
      (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(100);

      const selectQuestionsSpy = jest
        .spyOn(AssessmentAttemptsService as any, 'selectQuestions')
        .mockResolvedValue([]);

      (AssessmentAttempt.create as jest.Mock).mockResolvedValue({
        _id: 'new-attempt',
        status: 'in_progress',
      });

      // Should not throw - unlimited attempts
      await expect(
        AssessmentAttemptsService.startAttempt(
          validAssessmentId,
          validLearnerId,
          validEnrollmentId
        )
      ).resolves.toBeDefined();

      // Should not call getAdditionalAttempts since maxAttempts is null
      expect(LearnerExceptionService.getAdditionalAttempts).not.toHaveBeenCalled();

      selectQuestionsSpy.mockRestore();
    });

    it('should reject attempt when no exceptions and max reached', async () => {
      (Assessment.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockAssessment),
      });

      (AssessmentAttempt.findOne as jest.Mock).mockResolvedValue(null);
      (AssessmentAttempt.countDocuments as jest.Mock).mockResolvedValue(3); // 3 used, max is 3

      (LearnerExceptionService.getAdditionalAttempts as jest.Mock).mockResolvedValue(0);

      await expect(
        AssessmentAttemptsService.startAttempt(
          validAssessmentId,
          validLearnerId,
          validEnrollmentId
        )
      ).rejects.toThrow('Maximum attempts reached');
    });
  });
});
