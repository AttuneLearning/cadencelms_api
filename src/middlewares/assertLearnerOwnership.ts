import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';

/**
 * Middleware factory that verifies learner endpoint ownership.
 *
 * For learner-role users: asserts the route param matches their own userId.
 * For staff/admin users: passes through (they have elevated access).
 *
 * @param paramName - The route parameter name containing the learner ID (e.g., 'id', 'learnerId')
 */
export function assertLearnerOwnership(paramName: string = 'learnerId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const targetLearnerId = req.params[paramName];

    if (!targetLearnerId) {
      throw ApiError.badRequest(`Missing required parameter: ${paramName}`);
    }

    // Staff and admin users bypass ownership check
    const userTypes: string[] = user.userTypes || [];
    const isStaffOrAdmin = userTypes.includes('staff') || userTypes.includes('global-admin');

    if (isStaffOrAdmin) {
      return next();
    }

    // For learners, verify they're accessing their own data
    if (targetLearnerId !== user.userId) {
      throw ApiError.forbidden('You can only access your own data');
    }

    next();
  };
}
