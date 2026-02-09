import { Request, Response, NextFunction } from 'express';
import { assertLearnerOwnership } from '@/middlewares/assertLearnerOwnership';
import { ApiError } from '@/utils/ApiError';

describe('assertLearnerOwnership', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {}
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('staff and admin bypass', () => {
    it('should pass through for staff users accessing any learnerId', () => {
      (mockReq as any).user = {
        userId: 'staff-user-1',
        userTypes: ['staff']
      };
      mockReq.params = { learnerId: 'some-other-learner-id' };

      const middleware = assertLearnerOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass through for global-admin users', () => {
      (mockReq as any).user = {
        userId: 'admin-user-1',
        userTypes: ['global-admin']
      };
      mockReq.params = { learnerId: 'any-learner-id' };

      const middleware = assertLearnerOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass through for user with both staff and global-admin types', () => {
      (mockReq as any).user = {
        userId: 'super-user-1',
        userTypes: ['staff', 'global-admin']
      };
      mockReq.params = { learnerId: 'any-learner-id' };

      const middleware = assertLearnerOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('learner ownership check', () => {
    it('should pass through when learner accesses their own data', () => {
      const userId = 'learner-abc-123';
      (mockReq as any).user = {
        userId,
        userTypes: ['learner']
      };
      mockReq.params = { learnerId: userId };

      const middleware = assertLearnerOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw 403 when learner accesses another user\'s data', () => {
      (mockReq as any).user = {
        userId: 'learner-abc-123',
        userTypes: ['learner']
      };
      mockReq.params = { learnerId: 'learner-xyz-456' };

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(403);
        expect((error as ApiError).message).toBe('You can only access your own data');
      }

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authentication check', () => {
    it('should throw 401 when no user on request', () => {
      // req.user is not set at all
      mockReq.params = { learnerId: 'some-id' };

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).message).toBe('Authentication required');
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw 401 when user is explicitly undefined', () => {
      (mockReq as any).user = undefined;
      mockReq.params = { learnerId: 'some-id' };

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(401);
      }
    });
  });

  describe('parameter validation', () => {
    it('should throw 400 when the default learnerId param is missing', () => {
      (mockReq as any).user = {
        userId: 'learner-abc',
        userTypes: ['learner']
      };
      mockReq.params = {}; // no learnerId

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).message).toBe('Missing required parameter: learnerId');
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw 400 when a custom param name is missing from params', () => {
      (mockReq as any).user = {
        userId: 'learner-abc',
        userTypes: ['learner']
      };
      mockReq.params = { learnerId: 'some-value' }; // has learnerId but not 'id'

      const middleware = assertLearnerOwnership('id');

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).message).toBe('Missing required parameter: id');
      }
    });
  });

  describe('custom param name', () => {
    it('should work with custom param name "id" when learner accesses own data', () => {
      const userId = 'learner-custom-123';
      (mockReq as any).user = {
        userId,
        userTypes: ['learner']
      };
      mockReq.params = { id: userId };

      const middleware = assertLearnerOwnership('id');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw 403 with custom param name "id" when learner accesses other data', () => {
      (mockReq as any).user = {
        userId: 'learner-custom-123',
        userTypes: ['learner']
      };
      mockReq.params = { id: 'learner-custom-456' };

      const middleware = assertLearnerOwnership('id');

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(403);
      }
    });

    it('should work with custom param name "userId"', () => {
      const userId = 'learner-uid-789';
      (mockReq as any).user = {
        userId,
        userTypes: ['learner']
      };
      mockReq.params = { userId };

      const middleware = assertLearnerOwnership('userId');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should allow staff through with custom param name', () => {
      (mockReq as any).user = {
        userId: 'staff-user-1',
        userTypes: ['staff']
      };
      mockReq.params = { id: 'any-learner-id' };

      const middleware = assertLearnerOwnership('id');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle user with empty userTypes array as a non-staff user', () => {
      (mockReq as any).user = {
        userId: 'user-no-types',
        userTypes: []
      };
      mockReq.params = { learnerId: 'different-user-id' };

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(403);
      }
    });

    it('should handle user with no userTypes property (defaults to empty array)', () => {
      (mockReq as any).user = {
        userId: 'user-no-types-prop'
      };
      // No userTypes at all - middleware uses `user.userTypes || []`
      mockReq.params = { learnerId: 'user-no-types-prop' };

      const middleware = assertLearnerOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should pass because userId matches learnerId
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle user with undefined userTypes accessing mismatched data', () => {
      (mockReq as any).user = {
        userId: 'user-no-types-prop'
      };
      mockReq.params = { learnerId: 'different-user-id' };

      const middleware = assertLearnerOwnership();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ApiError);

      try {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(403);
      }
    });
  });
});
