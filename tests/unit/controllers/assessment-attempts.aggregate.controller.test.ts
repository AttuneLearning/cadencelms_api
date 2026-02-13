import { Request, Response } from 'express';
import {
  listAttemptSummaries,
  getAttemptById,
  gradeAttemptById
} from '@/controllers/progress/assessment-attempts.controller';
import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';

jest.mock('@/services/progress/assessment-attempts.service');

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AssessmentAttempts Aggregate Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists aggregate attempts for staff users', async () => {
    const req = {
      query: {
        status: 'submitted',
        search: 'emdr',
        page: '2',
        limit: '10'
      },
      user: {
        userId: 'staff-1',
        userTypes: ['staff']
      }
    } as unknown as Request;
    const res = mockResponse();

    (AssessmentAttemptsService.listAttemptSummaries as jest.Mock).mockResolvedValue({
      attempts: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: true }
    });

    await listAttemptSummaries(req, res, jest.fn());

    expect(AssessmentAttemptsService.listAttemptSummaries).toHaveBeenCalledWith({
      status: 'submitted',
      search: 'emdr',
      assessmentId: undefined,
      learnerId: undefined,
      enrollmentId: undefined,
      sort: undefined,
      page: 2,
      limit: 10
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects aggregate list for non-staff users', async () => {
    const req = {
      query: {},
      user: {
        userId: 'learner-1',
        userTypes: ['learner']
      }
    } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    await listAttemptSummaries(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('gets attempt detail by attemptId for staff users', async () => {
    const req = {
      params: { attemptId: 'attempt-1' },
      user: {
        userId: 'staff-1',
        userTypes: ['global-admin']
      }
    } as unknown as Request;
    const res = mockResponse();

    (AssessmentAttemptsService.getAttemptById as jest.Mock).mockResolvedValue({ _id: 'attempt-1' });

    await getAttemptById(req, res, jest.fn());

    expect(AssessmentAttemptsService.getAttemptById).toHaveBeenCalledWith('attempt-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('grades attempt by attemptId for staff users', async () => {
    const req = {
      params: { attemptId: 'attempt-1' },
      body: { questionIndex: 0, score: 8, feedback: 'Good work' },
      user: {
        userId: 'staff-1',
        userTypes: ['staff']
      }
    } as unknown as Request;
    const res = mockResponse();

    (AssessmentAttemptsService.gradeQuestion as jest.Mock).mockResolvedValue({
      _id: 'attempt-1',
      questions: [
        {
          pointsEarned: 8,
          pointsPossible: 10,
          gradedAt: new Date('2026-02-13T00:00:00.000Z'),
          gradedBy: 'staff-1'
        }
      ],
      scoring: {
        rawScore: 88,
        percentageScore: 88,
        passed: true,
        gradingComplete: true
      }
    });

    await gradeAttemptById(req, res, jest.fn());

    expect(AssessmentAttemptsService.gradeQuestion).toHaveBeenCalledWith(
      'attempt-1',
      0,
      8,
      'Good work',
      'staff-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
