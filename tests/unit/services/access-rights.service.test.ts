/**
 * Unit Tests: AccessRightsService (Task P3-1)
 *
 * Tests for the access rights service:
 * - Getting access rights for a single role
 * - Getting access rights for multiple roles (union)
 * - Expanding wildcards
 * - Checking access rights (exact and wildcard)
 * - Caching functionality
 */

import { AccessRightsService } from '@/services/auth/access-rights.service';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { Cache } from '@/config/redis';

// Mock the models and cache
jest.mock('@/models/RoleDefinition.model');
jest.mock('@/models/AccessRight.model');
jest.mock('@/config/redis', () => ({
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn()
  }
}));

describe('AccessRightsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessRightsForRole', () => {
    it('should return access rights for a valid role', async () => {
      const mockRole = {
        name: 'instructor',
        accessRights: ['content:courses:read', 'content:lessons:read', 'grades:own-classes:manage']
      };

      (Cache.get as jest.Mock).mockResolvedValue(null);
      (RoleDefinition.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockRole)
      });
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AccessRightsService.getAccessRightsForRole('instructor');

      expect(result).toEqual(mockRole.accessRights);
      expect(RoleDefinition.findOne).toHaveBeenCalledWith({
        name: 'instructor',
        isActive: true
      });
    });

    it('should return cached access rights if available', async () => {
      const cachedRights = ['content:courses:read', 'content:lessons:read'];

      (Cache.get as jest.Mock).mockResolvedValue(cachedRights);

      const result = await AccessRightsService.getAccessRightsForRole('instructor');

      expect(result).toEqual(cachedRights);
      expect(RoleDefinition.findOne).not.toHaveBeenCalled();
    });

    it('should return empty array for non-existent role', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(null);
      (RoleDefinition.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      const result = await AccessRightsService.getAccessRightsForRole('non-existent-role');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      (Cache.get as jest.Mock).mockRejectedValue(new Error('Cache error'));

      const result = await AccessRightsService.getAccessRightsForRole('instructor');

      expect(result).toEqual([]);
    });
  });

  describe('getAccessRightsForRoles', () => {
    it('should return union of access rights for multiple roles', async () => {
      const mockRoles = {
        'instructor': ['content:courses:read', 'content:lessons:read'],
        'content-admin': ['content:courses:manage', 'content:lessons:manage', 'content:courses:read']
      };

      (Cache.get as jest.Mock).mockResolvedValue(null);
      (RoleDefinition.findOne as jest.Mock).mockImplementation(({ name }) => ({
        select: jest.fn().mockResolvedValue({ name, accessRights: mockRoles[name] })
      }));
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AccessRightsService.getAccessRightsForRoles(['instructor', 'content-admin']);

      expect(result).toHaveLength(4); // Union should deduplicate content:courses:read
      expect(result).toContain('content:courses:read');
      expect(result).toContain('content:lessons:read');
      expect(result).toContain('content:courses:manage');
      expect(result).toContain('content:lessons:manage');
    });

    it('should return empty array for empty roles array', async () => {
      const result = await AccessRightsService.getAccessRightsForRoles([]);

      expect(result).toEqual([]);
      expect(RoleDefinition.findOne).not.toHaveBeenCalled();
    });

    it('should handle roles with no access rights', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(null);
      (RoleDefinition.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ name: 'empty-role', accessRights: [] })
      });

      const result = await AccessRightsService.getAccessRightsForRoles(['empty-role']);

      expect(result).toEqual([]);
    });
  });

  describe('expandWildcards', () => {
    it('should expand wildcard access rights', async () => {
      const allRights = [
        'content:courses:read',
        'content:courses:write',
        'content:lessons:read',
        'enrollment:students:read',
        'system:settings:read'
      ];

      (Cache.get as jest.Mock).mockResolvedValue(null);
      (AccessRight.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(allRights.map(name => ({ name })))
        })
      });
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AccessRightsService.expandWildcards(['content:*', 'enrollment:students:read']);

      expect(result).toContain('content:courses:read');
      expect(result).toContain('content:courses:write');
      expect(result).toContain('content:lessons:read');
      expect(result).toContain('enrollment:students:read');
      expect(result).not.toContain('system:settings:read');
    });

    it('should return original array if no wildcards present', async () => {
      const rights = ['content:courses:read', 'enrollment:students:read'];

      const result = await AccessRightsService.expandWildcards(rights);

      expect(result).toEqual(rights);
      expect(AccessRight.find).not.toHaveBeenCalled();
    });

    it('should return empty array for empty input', async () => {
      const result = await AccessRightsService.expandWildcards([]);

      expect(result).toEqual([]);
    });

    it('should handle system:* wildcard (matches everything)', async () => {
      const allRights = [
        'content:courses:read',
        'enrollment:students:read',
        'system:settings:read'
      ];

      (Cache.get as jest.Mock).mockResolvedValue(null);
      (AccessRight.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(allRights.map(name => ({ name })))
        })
      });
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AccessRightsService.expandWildcards(['system:*']);

      expect(result).toHaveLength(allRights.length);
      expect(result).toContain('content:courses:read');
      expect(result).toContain('enrollment:students:read');
      expect(result).toContain('system:settings:read');
    });
  });

  describe('hasAccessRight', () => {
    it('should return true for exact match', () => {
      const userRights = ['content:courses:read', 'enrollment:students:read'];
      const result = AccessRightsService.hasAccessRight(userRights, 'content:courses:read');

      expect(result).toBe(true);
    });

    it('should return false when right not present', () => {
      const userRights = ['content:courses:read'];
      const result = AccessRightsService.hasAccessRight(userRights, 'content:courses:write');

      expect(result).toBe(false);
    });

    it('should return true for wildcard match (domain:*)', () => {
      const userRights = ['content:*'];
      const result = AccessRightsService.hasAccessRight(userRights, 'content:courses:read');

      expect(result).toBe(true);
    });

    it('should return true for wildcard match (domain:resource:*)', () => {
      const userRights = ['content:courses:*'];
      const result = AccessRightsService.hasAccessRight(userRights, 'content:courses:read');

      expect(result).toBe(true);
    });

    it('should return true for system:* (matches everything)', () => {
      const userRights = ['system:*'];
      const result = AccessRightsService.hasAccessRight(userRights, 'content:courses:read');

      expect(result).toBe(true);
    });

    it('should return false for empty user rights', () => {
      const result = AccessRightsService.hasAccessRight([], 'content:courses:read');

      expect(result).toBe(false);
    });

    it('should return false for empty required right', () => {
      const result = AccessRightsService.hasAccessRight(['content:courses:read'], '');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyAccessRight', () => {
    it('should return true if user has at least one required right', () => {
      const userRights = ['content:courses:read', 'enrollment:students:read'];
      const required = ['content:courses:write', 'content:courses:read'];

      const result = AccessRightsService.hasAnyAccessRight(userRights, required);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the required rights', () => {
      const userRights = ['content:courses:read'];
      const required = ['content:courses:write', 'content:courses:delete'];

      const result = AccessRightsService.hasAnyAccessRight(userRights, required);

      expect(result).toBe(false);
    });

    it('should work with wildcards', () => {
      const userRights = ['content:*'];
      const required = ['enrollment:students:read', 'content:courses:read'];

      const result = AccessRightsService.hasAnyAccessRight(userRights, required);

      expect(result).toBe(true);
    });

    it('should return false for empty user rights', () => {
      const result = AccessRightsService.hasAnyAccessRight([], ['content:courses:read']);

      expect(result).toBe(false);
    });

    it('should return false for empty required rights', () => {
      const result = AccessRightsService.hasAnyAccessRight(['content:courses:read'], []);

      expect(result).toBe(false);
    });
  });

  describe('hasAllAccessRights', () => {
    it('should return true if user has all required rights', () => {
      const userRights = ['content:courses:read', 'content:courses:write', 'enrollment:students:read'];
      const required = ['content:courses:read', 'content:courses:write'];

      const result = AccessRightsService.hasAllAccessRights(userRights, required);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any required right', () => {
      const userRights = ['content:courses:read'];
      const required = ['content:courses:read', 'content:courses:write'];

      const result = AccessRightsService.hasAllAccessRights(userRights, required);

      expect(result).toBe(false);
    });

    it('should work with wildcards', () => {
      const userRights = ['content:*'];
      const required = ['content:courses:read', 'content:lessons:read'];

      const result = AccessRightsService.hasAllAccessRights(userRights, required);

      expect(result).toBe(true);
    });

    it('should return true for empty required rights', () => {
      const result = AccessRightsService.hasAllAccessRights(['content:courses:read'], []);

      expect(result).toBe(true);
    });

    it('should return false for empty user rights with non-empty required', () => {
      const result = AccessRightsService.hasAllAccessRights([], ['content:courses:read']);

      expect(result).toBe(false);
    });
  });

  describe('clearRoleCache', () => {
    it('should clear cache for specific role', async () => {
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await AccessRightsService.clearRoleCache('instructor');

      expect(Cache.del).toHaveBeenCalledWith('access_rights:role:instructor');
    });

    it('should handle errors gracefully', async () => {
      (Cache.del as jest.Mock).mockRejectedValue(new Error('Cache error'));

      await expect(AccessRightsService.clearRoleCache('instructor')).resolves.not.toThrow();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all role and access rights caches', async () => {
      (Cache.delPattern as jest.Mock).mockResolvedValue(undefined);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await AccessRightsService.clearAllCache();

      expect(Cache.delPattern).toHaveBeenCalledWith('access_rights:role:*');
      expect(Cache.del).toHaveBeenCalledWith('access_rights:all');
    });

    it('should handle errors gracefully', async () => {
      (Cache.delPattern as jest.Mock).mockRejectedValue(new Error('Cache error'));

      await expect(AccessRightsService.clearAllCache()).resolves.not.toThrow();
    });
  });
});
