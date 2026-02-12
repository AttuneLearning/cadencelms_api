import mongoose from 'mongoose';
import { FlashcardService } from '@/services/assessment/flashcard.service';
import { RetentionCheckService } from '@/services/assessment/retention-check.service';
import CourseFlashcardConfig from '@/models/content/CourseFlashcardConfig.model';
import Question from '@/models/assessment/Question.model';
import FlashcardProgress from '@/models/activity/FlashcardProgress.model';
import {
  resolveFlashcardQuestionProvenance
} from '@/services/assessment/lib/canonical-flashcard-selection';

jest.mock('@/models/content/CourseFlashcardConfig.model');
jest.mock('@/models/assessment/Question.model');
jest.mock('@/models/activity/FlashcardProgress.model');
jest.mock('@/models/activity/RetentionCheck.model');
jest.mock('@/models/activity/Remediation.model');
jest.mock('@/services/assessment/lib/canonical-flashcard-selection');

describe('Flashcard/Retention canonical selection', () => {
  const courseId = new mongoose.Types.ObjectId().toString();
  const learnerId = new mongoose.Types.ObjectId().toString();
  const moduleId = new mongoose.Types.ObjectId().toString();
  const questionId = new mongoose.Types.ObjectId().toString();
  const learningUnitId = new mongoose.Types.ObjectId().toString();
  const learningUnitQuestionId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('FlashcardService.getFlashcardSession uses canonical provenance and returns source fields', async () => {
    (CourseFlashcardConfig.findOne as jest.Mock).mockResolvedValue(null);
    (resolveFlashcardQuestionProvenance as jest.Mock).mockResolvedValue([
      {
        questionId,
        learningUnitId,
        learningUnitQuestionId,
        sourceModuleId: moduleId
      }
    ]);

    (Question.find as jest.Mock).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(questionId),
        questionText: 'What is CBT?',
        questionTypes: ['flashcard'],
        isActive: true,
        correctAnswers: ['Cognitive Behavioral Therapy'],
        flashcardData: {
          prompts: [{ text: 'Define CBT' }]
        }
      }
    ]);

    (FlashcardProgress.find as jest.Mock).mockResolvedValue([]);

    const result = await FlashcardService.getFlashcardSession(courseId, learnerId, {
      moduleId,
      sessionSize: 5
    });

    expect(resolveFlashcardQuestionProvenance).toHaveBeenCalledWith(courseId, moduleId);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      questionId,
      learningUnitId,
      learningUnitQuestionId,
      sourceModuleId: moduleId
    });
  });

  it('RetentionCheckService.selectRetentionCheckCards uses canonical provenance pool', async () => {
    (resolveFlashcardQuestionProvenance as jest.Mock).mockResolvedValue([
      {
        questionId,
        learningUnitId,
        learningUnitQuestionId,
        sourceModuleId: moduleId
      }
    ]);

    (Question.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(questionId)
        }
      ])
    });

    (FlashcardProgress.find as jest.Mock).mockResolvedValue([]);

    const selected = await RetentionCheckService.selectRetentionCheckCards(
      courseId,
      moduleId,
      learnerId,
      5,
      'sm2_priority'
    );

    expect(resolveFlashcardQuestionProvenance).toHaveBeenCalledWith(courseId, moduleId);
    expect(Question.find).toHaveBeenCalledWith({
      _id: { $in: [expect.any(mongoose.Types.ObjectId)] },
      questionTypes: 'flashcard',
      isActive: true
    });
    expect(selected).toEqual([
      {
        questionId,
        learningUnitId,
        learningUnitQuestionId,
        sourceModuleId: moduleId
      }
    ]);
  });
});
