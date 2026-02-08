import mongoose from 'mongoose';
import { ModuleEditLockService } from '@/services/academic/moduleEditLock.service';
import ModuleEditLock from '@/models/academic/ModuleEditLock.model';
import Module from '@/models/academic/Module.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/academic/ModuleEditLock.model');
jest.mock('@/models/academic/Module.model');

describe('ModuleEditLockService', () => {
  const mockModuleId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockOtherUserId = new mongoose.Types.ObjectId().toString();
  const mockUserName = 'John Doe';

  const createMockLock = (overrides: any = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    moduleId: new mongoose.Types.ObjectId(mockModuleId),
    userId: new mongoose.Types.ObjectId(mockUserId),
    userName: mockUserName,
    acquiredAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    lastHeartbeat: new Date(),
    accessRequest: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should throw on invalid module ID', async () => {
      await expect(
        ModuleEditLockService.acquireLock('invalid', mockUserId, mockUserName)
      ).rejects.toThrow(ApiError);
    });

    it('should throw if module not found', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.acquireLock(mockModuleId, mockUserId, mockUserName)
      ).rejects.toThrow(/Module not found/);
    });

    it('should create new lock when none exists', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(null);
      (ModuleEditLock.deleteMany as jest.Mock).mockResolvedValue({});

      const mockSave = jest.fn().mockResolvedValue(true);
      (ModuleEditLock as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave
      }));

      const result = await ModuleEditLockService.acquireLock(mockModuleId, mockUserId, mockUserName);

      expect(result.isLocked).toBe(true);
      expect(result.moduleId).toBe(mockModuleId);
      expect(result.lock).toBeDefined();
      expect(result.lock!.userId).toBe(mockUserId);
      expect(result.lock!.userName).toBe(mockUserName);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should refresh lock if same user already holds it', async () => {
      const existingLock = createMockLock();
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(existingLock);

      const result = await ModuleEditLockService.acquireLock(mockModuleId, mockUserId, mockUserName);

      expect(existingLock.save).toHaveBeenCalled();
      expect(result.isLocked).toBe(true);
    });

    it('should throw 409 if another user holds the lock', async () => {
      const existingLock = createMockLock({
        userId: new mongoose.Types.ObjectId(mockOtherUserId),
        userName: 'Jane Smith'
      });
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(existingLock);

      try {
        await ModuleEditLockService.acquireLock(mockModuleId, mockUserId, mockUserName);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.statusCode).toBe(409);
        expect(error.message).toContain('Jane Smith');
      }
    });
  });

  describe('releaseLock', () => {
    it('should throw on invalid module ID', async () => {
      await expect(
        ModuleEditLockService.releaseLock('invalid', mockUserId)
      ).rejects.toThrow(ApiError);
    });

    it('should succeed silently if no active lock', async () => {
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.releaseLock(mockModuleId, mockUserId)
      ).resolves.toBeUndefined();
    });

    it('should throw if user does not hold the lock', async () => {
      const lock = createMockLock({
        userId: new mongoose.Types.ObjectId(mockOtherUserId)
      });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      await expect(
        ModuleEditLockService.releaseLock(mockModuleId, mockUserId)
      ).rejects.toThrow(/do not hold the lock/);
    });

    it('should delete the lock if user is the holder', async () => {
      const lock = createMockLock();
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);
      (ModuleEditLock.deleteOne as jest.Mock).mockResolvedValue({});

      await ModuleEditLockService.releaseLock(mockModuleId, mockUserId);

      expect(ModuleEditLock.deleteOne).toHaveBeenCalledWith({ _id: lock._id });
    });
  });

  describe('getLockStatus', () => {
    it('should throw on invalid module ID', async () => {
      await expect(
        ModuleEditLockService.getLockStatus('invalid')
      ).rejects.toThrow(ApiError);
    });

    it('should throw if module not found', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.getLockStatus(mockModuleId)
      ).rejects.toThrow(/Module not found/);
    });

    it('should return unlocked status when no lock exists', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(null);

      const result = await ModuleEditLockService.getLockStatus(mockModuleId);

      expect(result.isLocked).toBe(false);
      expect(result.lock).toBeNull();
      expect(result.accessRequest).toBeNull();
    });

    it('should return locked status with lock info', async () => {
      const lock = createMockLock();
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      const result = await ModuleEditLockService.getLockStatus(mockModuleId);

      expect(result.isLocked).toBe(true);
      expect(result.lock).toBeDefined();
      expect(result.lock!.userId).toBe(mockUserId);
    });
  });

  describe('heartbeat', () => {
    it('should throw on invalid module ID', async () => {
      await expect(
        ModuleEditLockService.heartbeat('invalid', mockUserId)
      ).rejects.toThrow(ApiError);
    });

    it('should throw if no active lock', async () => {
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.heartbeat(mockModuleId, mockUserId)
      ).rejects.toThrow(/No active lock/);
    });

    it('should throw if user does not hold the lock', async () => {
      const lock = createMockLock({
        userId: new mongoose.Types.ObjectId(mockOtherUserId)
      });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      await expect(
        ModuleEditLockService.heartbeat(mockModuleId, mockUserId)
      ).rejects.toThrow(/do not hold the lock/);
    });

    it('should extend the lock expiry', async () => {
      const lock = createMockLock();
      const originalExpiry = lock.expiresAt;
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      const result = await ModuleEditLockService.heartbeat(mockModuleId, mockUserId);

      expect(lock.save).toHaveBeenCalled();
      expect(result.isLocked).toBe(true);
      // New expiry should be later than original
      expect(new Date(result.lock!.expiresAt).getTime()).toBeGreaterThanOrEqual(originalExpiry.getTime());
    });
  });

  describe('requestAccess', () => {
    it('should throw on invalid module ID', async () => {
      await expect(
        ModuleEditLockService.requestAccess('invalid', mockUserId, mockUserName)
      ).rejects.toThrow(ApiError);
    });

    it('should throw if module not found', async () => {
      (Module.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.requestAccess(mockModuleId, mockUserId, mockUserName)
      ).rejects.toThrow(/Module not found/);
    });

    it('should throw if module is not locked', async () => {
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(null);

      await expect(
        ModuleEditLockService.requestAccess(mockModuleId, mockUserId, mockUserName)
      ).rejects.toThrow(/not currently locked/);
    });

    it('should throw if requesting access to own lock', async () => {
      const lock = createMockLock();
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      await expect(
        ModuleEditLockService.requestAccess(mockModuleId, mockUserId, mockUserName)
      ).rejects.toThrow(/already hold the lock/);
    });

    it('should store access request on the lock', async () => {
      const lock = createMockLock();
      (Module.findById as jest.Mock).mockResolvedValue({ _id: mockModuleId });
      (ModuleEditLock.findActiveByModuleId as jest.Mock).mockResolvedValue(lock);

      const result = await ModuleEditLockService.requestAccess(
        mockModuleId,
        mockOtherUserId,
        'Jane Smith'
      );

      expect(lock.save).toHaveBeenCalled();
      expect(lock.accessRequest).toBeDefined();
      expect(lock.accessRequest.userName).toBe('Jane Smith');
      expect(result.isLocked).toBe(true);
    });
  });
});
