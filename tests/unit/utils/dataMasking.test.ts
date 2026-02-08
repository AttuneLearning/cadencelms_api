/**
 * Data Masking Utility Tests
 *
 * Tests FERPA-compliant data masking functionality
 */

import {
  maskLastName,
  maskUserList,
  shouldMaskData,
  maskEmail,
  maskPhone,
  maskUserPII,
  hasFullPiiAccess,
  hasDirectoryAccess,
  buildDisplayName,
  getIdSuffix,
  toDirectoryFormat,
  toDirectoryFormatList,
  maskLearnersForViewer
} from '@/utils/dataMasking';

describe('Data Masking Utility', () => {
  describe('maskLastName()', () => {
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      id: '123'
    };

    it('should NOT mask for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
      expect(result.firstName).toBe('John');
    });

    it('should NOT mask for system-admin', () => {
      const viewer = { roles: ['system-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
      expect(result.firstName).toBe('John');
    });

    it('should mask for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
      expect(result.firstName).toBe('John');
    });

    it('should mask for department-admin', () => {
      const viewer = { roles: ['department-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
      expect(result.firstName).toBe('John');
    });

    it('should handle viewer with role as string (not array)', () => {
      const viewer = { role: 'instructor' };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
    });

    it('should handle user without lastName', () => {
      const userWithoutLastName = { firstName: 'John' };
      const viewer = { roles: ['instructor'] };
      const result = maskLastName(userWithoutLastName, viewer);

      expect(result).toEqual(userWithoutLastName);
    });

    it('should handle case-insensitive role matching', () => {
      const viewer = { roles: ['INSTRUCTOR'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
    });

    it('should return unmasked for unknown roles', () => {
      const viewer = { roles: ['unknown-role'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
    });
  });

  describe('maskUserList()', () => {
    const testUsers = [
      { firstName: 'John', lastName: 'Doe', id: '1' },
      { firstName: 'Jane', lastName: 'Smith', id: '2' },
      { firstName: 'Bob', lastName: 'Johnson', id: '3' }
    ];

    it('should mask all users in list for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList(testUsers, viewer);

      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('D.');
      expect(result[1].lastName).toBe('S.');
      expect(result[2].lastName).toBe('J.');
    });

    it('should NOT mask any users for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskUserList(testUsers, viewer);

      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('Doe');
      expect(result[1].lastName).toBe('Smith');
      expect(result[2].lastName).toBe('Johnson');
    });

    it('should handle empty array', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList([], viewer);

      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList(null as any, viewer);

      expect(result).toBeNull();
    });
  });

  describe('shouldMaskData()', () => {
    it('should return true for instructor', () => {
      const viewer = { roles: ['instructor'] };
      expect(shouldMaskData(viewer)).toBe(true);
    });

    it('should return true for department-admin', () => {
      const viewer = { roles: ['department-admin'] };
      expect(shouldMaskData(viewer)).toBe(true);
    });

    it('should return false for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      expect(shouldMaskData(viewer)).toBe(false);
    });

    it('should return false for system-admin', () => {
      const viewer = { roles: ['system-admin'] };
      expect(shouldMaskData(viewer)).toBe(false);
    });

    it('should handle viewer with no roles', () => {
      const viewer = { roles: [] };
      expect(shouldMaskData(viewer)).toBe(false);
    });
  });

  describe('maskEmail()', () => {
    it('should mask email local part', () => {
      const result = maskEmail('john.doe@example.com');
      expect(result).toBe('j***@example.com');
    });

    it('should handle single character email', () => {
      const result = maskEmail('a@example.com');
      expect(result).toBe('a***@example.com');
    });

    it('should handle invalid email gracefully', () => {
      const result = maskEmail('not-an-email');
      expect(result).toBe('not-an-email');
    });

    it('should handle empty email', () => {
      const result = maskEmail('');
      expect(result).toBe('');
    });
  });

  describe('maskPhone()', () => {
    it('should mask phone number keeping last 4 digits', () => {
      const result = maskPhone('(555) 123-4567');
      expect(result).toBe('(XXX) XXX-4567');
    });

    it('should mask 10-digit phone', () => {
      const result = maskPhone('5551234567');
      expect(result).toBe('(XXX) XXX-4567');
    });

    it('should handle short phone numbers', () => {
      const result = maskPhone('123');
      expect(result).toBe('XXX-XXXX');
    });

    it('should handle empty phone', () => {
      const result = maskPhone('');
      expect(result).toBe('');
    });
  });

  describe('maskUserPII()', () => {
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567'
    };

    it('should mask lastName, email, and phone for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserPII(testUser, viewer, {
        maskEmail: true,
        maskPhone: true
      });

      expect(result.lastName).toBe('D.');
      expect(result.email).toBe('j***@example.com');
      expect(result.phone).toBe('(XXX) XXX-4567');
    });

    it('should only mask lastName when no options provided', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserPII(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('(555) 123-4567');
    });

    it('should NOT mask anything for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskUserPII(testUser, viewer, {
        maskEmail: true,
        maskPhone: true
      });

      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('(555) 123-4567');
    });
  });

  // ============================================
  // New Permission-Based Directory Functions
  // ============================================

  describe('hasFullPiiAccess()', () => {
    it('should return true when viewer has learner:pii:read permission', () => {
      const viewer = { permissions: ['learner:pii:read', 'other:permission'] };
      expect(hasFullPiiAccess(viewer)).toBe(true);
    });

    it('should return false when viewer only has learner:directory:read', () => {
      const viewer = { permissions: ['learner:directory:read'] };
      expect(hasFullPiiAccess(viewer)).toBe(false);
    });

    it('should return false when viewer has no permissions', () => {
      const viewer = { permissions: [] };
      expect(hasFullPiiAccess(viewer)).toBe(false);
    });

    it('should return false when viewer is null', () => {
      expect(hasFullPiiAccess(null)).toBe(false);
    });

    it('should return false when viewer has no permissions array', () => {
      const viewer = { roles: ['admin'] };
      expect(hasFullPiiAccess(viewer)).toBe(false);
    });
  });

  describe('hasDirectoryAccess()', () => {
    it('should return true when viewer has learner:pii:read', () => {
      const viewer = { permissions: ['learner:pii:read'] };
      expect(hasDirectoryAccess(viewer)).toBe(true);
    });

    it('should return true when viewer has learner:directory:read', () => {
      const viewer = { permissions: ['learner:directory:read'] };
      expect(hasDirectoryAccess(viewer)).toBe(true);
    });

    it('should return false when viewer has neither permission', () => {
      const viewer = { permissions: ['other:permission'] };
      expect(hasDirectoryAccess(viewer)).toBe(false);
    });

    it('should return false when viewer is null', () => {
      expect(hasDirectoryAccess(null)).toBe(false);
    });
  });

  describe('buildDisplayName()', () => {
    it('should format as "LastName, F."', () => {
      expect(buildDisplayName('John', 'Doe')).toBe('Doe, J.');
    });

    it('should handle lowercase names', () => {
      expect(buildDisplayName('john', 'doe')).toBe('doe, J.');
    });

    it('should handle missing firstName', () => {
      expect(buildDisplayName('', 'Doe')).toBe('Doe, ?.');
    });

    it('should handle missing lastName', () => {
      expect(buildDisplayName('John', '')).toBe('Unknown, J.');
    });

    it('should handle null values', () => {
      expect(buildDisplayName(null as any, null as any)).toBe('Unknown, ?.');
    });
  });

  describe('getIdSuffix()', () => {
    it('should return last 4 characters of ObjectId', () => {
      expect(getIdSuffix('507f1f77bcf86cd799439011')).toBe('9011');
    });

    it('should handle short IDs', () => {
      expect(getIdSuffix('abc')).toBe('????');
    });

    it('should handle empty ID', () => {
      expect(getIdSuffix('')).toBe('????');
    });

    it('should handle null ID', () => {
      expect(getIdSuffix(null as any)).toBe('????');
    });

    it('should return exact 4 chars for 4-char ID', () => {
      expect(getIdSuffix('abcd')).toBe('abcd');
    });
  });

  describe('toDirectoryFormat()', () => {
    const fullLearner = {
      id: '507f1f77bcf86cd799439011',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'active',
      isProgramEnrollee: true,
      programEnrollments: 2,
      courseEnrollments: 5,
      department: { id: '123', name: 'Test Dept' },
      createdAt: new Date()
    };

    it('should strip PII and return directory format', () => {
      const result = toDirectoryFormat(fullLearner);

      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result.displayName).toBe('Doe, J.');
      expect(result.idSuffix).toBe('9011');
      expect(result.status).toBe('active');
      expect(result.isProgramEnrollee).toBe(true);
      expect(result.programCount).toBe(2);
      expect(result.courseCount).toBe(5);

      // Should NOT include PII
      expect(result.email).toBeUndefined();
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.department).toBeUndefined();
      expect(result.createdAt).toBeUndefined();
    });

    it('should default isProgramEnrollee to false', () => {
      const learnerWithoutFlag = { ...fullLearner };
      delete (learnerWithoutFlag as any).isProgramEnrollee;

      const result = toDirectoryFormat(learnerWithoutFlag);
      expect(result.isProgramEnrollee).toBe(false);
    });
  });

  describe('toDirectoryFormatList()', () => {
    const learners = [
      { id: 'abc123456789def0', firstName: 'John', lastName: 'Doe', status: 'active', programEnrollments: 1, courseEnrollments: 2 },
      { id: 'xyz987654321abc0', firstName: 'Jane', lastName: 'Smith', status: 'active', programEnrollments: 0, courseEnrollments: 1 }
    ];

    it('should convert all learners to directory format', () => {
      const result = toDirectoryFormatList(learners);

      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('Doe, J.');
      expect(result[0].idSuffix).toBe('def0');
      expect(result[1].displayName).toBe('Smith, J.');
      expect(result[1].idSuffix).toBe('abc0');
    });

    it('should handle empty array', () => {
      const result = toDirectoryFormatList([]);
      expect(result).toEqual([]);
    });

    it('should handle non-array gracefully', () => {
      const result = toDirectoryFormatList(null as any);
      expect(result).toBeNull();
    });
  });

  describe('maskLearnersForViewer()', () => {
    const learners = [
      {
        id: '507f1f77bcf86cd799439011',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
        isProgramEnrollee: true,
        programEnrollments: 2,
        courseEnrollments: 5
      },
      {
        id: '507f1f77bcf86cd799430abc',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'active',
        isProgramEnrollee: false,
        programEnrollments: 0,
        courseEnrollments: 1
      }
    ];

    it('should return full data with displayName/idSuffix for learner:pii:read', () => {
      const viewer = { permissions: ['learner:pii:read'] };
      const result = maskLearnersForViewer(learners, viewer);

      expect(result).toHaveLength(2);

      // Should have full data plus display fields
      expect(result[0].email).toBe('john.doe@example.com');
      expect(result[0].firstName).toBe('John');
      expect(result[0].lastName).toBe('Doe');
      expect(result[0].displayName).toBe('Doe, J.');
      expect(result[0].idSuffix).toBe('9011');
    });

    it('should return directory format only for learner:directory:read', () => {
      const viewer = { permissions: ['learner:directory:read'] };
      const result = maskLearnersForViewer(learners, viewer);

      expect(result).toHaveLength(2);

      // Should have directory format only
      expect(result[0].displayName).toBe('Doe, J.');
      expect(result[0].idSuffix).toBe('9011');
      expect(result[0].status).toBe('active');
      expect(result[0].isProgramEnrollee).toBe(true);

      // Should NOT have PII
      expect(result[0].email).toBeUndefined();
      expect(result[0].firstName).toBeUndefined();
      expect(result[0].lastName).toBeUndefined();
    });

    it('should handle empty learners array', () => {
      const viewer = { permissions: ['learner:directory:read'] };
      const result = maskLearnersForViewer([], viewer);
      expect(result).toEqual([]);
    });

    it('should handle non-array gracefully', () => {
      const viewer = { permissions: ['learner:pii:read'] };
      const result = maskLearnersForViewer(null as any, viewer);
      expect(result).toBeNull();
    });
  });
});
