/**
 * Unit Tests: NotificationService
 *
 * Tests for the notification service:
 * - Creating notifications (with preference checks)
 * - Getting notifications (paginated, filtered)
 * - Getting single notification by ID
 * - Marking as read (single and all)
 * - Dismissing notifications
 * - Unread count
 * - Preferences CRUD (get/create/update)
 * - Deleting expired notifications
 * - Silent notification creation
 */

import mongoose from 'mongoose';
import { NotificationService } from '@/services/notification/notification.service';
import Notification from '@/models/notification/Notification.model';
import NotificationPreferences from '@/models/notification/NotificationPreferences.model';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/models/notification/Notification.model');
jest.mock('@/models/notification/NotificationPreferences.model');

describe('NotificationService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockDepartmentId = new mongoose.Types.ObjectId().toString();
  const mockNotificationId = new mongoose.Types.ObjectId().toString();

  const createMockPreferences = (overrides: any = {}) => ({
    userId: mockUserId,
    emailNotifications: true,
    inAppNotifications: true,
    preferences: new Map([
      ['access_expiring', true],
      ['access_expired', true],
      ['new_version_available', true],
      ['certificate_upgrade_available', true],
      ['certificate_issued', true],
      ['certificate_expiring', true],
      ['extension_approved', true],
      ['extension_denied', true],
    ]),
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  const createMockNotificationInput = (overrides: any = {}) => ({
    userId: mockUserId,
    departmentId: mockDepartmentId,
    type: 'access_expiring' as const,
    title: 'Test Notification',
    message: 'This is a test notification',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────
  // createNotification
  // ──────────────────────────────────────────────────
  describe('createNotification', () => {
    it('should create a notification when preferences allow it', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave,
      }));

      const input = createMockNotificationInput();
      const result = await NotificationService.createNotification(input);

      expect(result).toBeDefined();
      expect(result.type).toBe('access_expiring');
      expect(result.title).toBe('Test Notification');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should set default 30-day expiration when expiresAt is not provided', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedData = data;
        return { ...data, _id: new mongoose.Types.ObjectId(), save: mockSave };
      });

      const input = createMockNotificationInput();
      await NotificationService.createNotification(input);

      expect(capturedData.expiresAt).toBeDefined();
      // Should be approximately 30 days from now
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const diff = Math.abs(capturedData.expiresAt.getTime() - thirtyDaysFromNow);
      expect(diff).toBeLessThan(5000); // within 5 seconds
    });

    it('should use provided expiresAt when given', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedData = data;
        return { ...data, _id: new mongoose.Types.ObjectId(), save: mockSave };
      });

      const customExpiry = new Date('2026-12-31');
      const input = createMockNotificationInput({ expiresAt: customExpiry });
      await NotificationService.createNotification(input);

      expect(capturedData.expiresAt).toEqual(customExpiry);
    });

    it('should allow null expiresAt', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedData = data;
        return { ...data, _id: new mongoose.Types.ObjectId(), save: mockSave };
      });

      const input = createMockNotificationInput({ expiresAt: null });
      await NotificationService.createNotification(input);

      expect(capturedData.expiresAt).toBeNull();
    });

    it('should throw when user has disabled in-app notifications', async () => {
      const mockPrefs = createMockPreferences({ inAppNotifications: false });
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const input = createMockNotificationInput();
      await expect(NotificationService.createNotification(input)).rejects.toThrow(
        'User has disabled in-app notifications'
      );
    });

    it('should throw when notification type is disabled in preferences', async () => {
      const prefs = new Map([
        ['access_expiring', false],
        ['access_expired', true],
      ]);
      const mockPrefs = createMockPreferences({ preferences: prefs });
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const input = createMockNotificationInput({ type: 'access_expiring' });
      await expect(NotificationService.createNotification(input)).rejects.toThrow(
        'User has disabled access_expiring notifications'
      );
    });

    it('should set priority to normal by default', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedData = data;
        return { ...data, _id: new mongoose.Types.ObjectId(), save: mockSave };
      });

      const input = createMockNotificationInput();
      await NotificationService.createNotification(input);

      expect(capturedData.priority).toBe('normal');
    });

    it('should use provided priority when given', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      let capturedData: any;
      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => {
        capturedData = data;
        return { ...data, _id: new mongoose.Types.ObjectId(), save: mockSave };
      });

      const input = createMockNotificationInput({ priority: 'urgent' });
      await NotificationService.createNotification(input);

      expect(capturedData.priority).toBe('urgent');
    });

    it('should create new preferences if none exist for user', async () => {
      // getOrCreatePreferences will be called internally
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(null);

      const mockPrefsSave = jest.fn().mockResolvedValue(true);
      (NotificationPreferences as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        inAppNotifications: true,
        preferences: new Map([
          ['access_expiring', true],
          ['access_expired', true],
        ]),
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        save: mockPrefsSave,
      }));

      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave,
      }));

      const input = createMockNotificationInput();
      await NotificationService.createNotification(input);

      expect(mockPrefsSave).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // getNotifications
  // ──────────────────────────────────────────────────
  describe('getNotifications', () => {
    it('should throw on invalid user ID', async () => {
      await expect(
        NotificationService.getNotifications('invalid', {})
      ).rejects.toThrow('Invalid user ID');
    });

    it('should return paginated notifications with default params', async () => {
      const mockNotifications = [
        { _id: new mongoose.Types.ObjectId(), title: 'N1' },
        { _id: new mongoose.Types.ObjectId(), title: 'N2' },
      ];

      const mockLean = jest.fn().mockResolvedValue(mockNotifications);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await NotificationService.getNotifications(mockUserId, {});

      expect(result.notifications).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should apply type filter', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        type: 'access_expiring',
      });

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.type).toBe('access_expiring');
    });

    it('should apply priority filter', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        priority: 'urgent',
      });

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.priority).toBe('urgent');
    });

    it('should filter by read status = unread', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        readStatus: 'unread',
      });

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.readAt).toBeNull();
    });

    it('should filter by read status = read', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        readStatus: 'read',
      });

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.readAt).toEqual({ $ne: null });
    });

    it('should exclude dismissed by default', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {});

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.dismissedAt).toBeNull();
    });

    it('should include dismissed when requested', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        includeDismissed: true,
      });

      const findQuery = (Notification.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.dismissedAt).toBeUndefined();
    });

    it('should handle custom sort order', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        sort: '-priority',
      });

      expect(mockSort).toHaveBeenCalledWith({ priority: -1 });
    });

    it('should handle ascending sort order', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, {
        sort: 'createdAt',
      });

      expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it('should clamp limit to max 100', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, { limit: 500 });

      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should clamp page to minimum 1', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Notification.find as jest.Mock).mockReturnValue({ sort: mockSort });
      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      await NotificationService.getNotifications(mockUserId, { page: -5 });

      expect(mockSkip).toHaveBeenCalledWith(0);
    });
  });

  // ──────────────────────────────────────────────────
  // getNotificationById
  // ──────────────────────────────────────────────────
  describe('getNotificationById', () => {
    it('should throw on invalid notification ID', async () => {
      await expect(
        NotificationService.getNotificationById(mockUserId, 'invalid')
      ).rejects.toThrow('Invalid notification ID');
    });

    it('should return notification when found', async () => {
      const mockNotification = {
        _id: mockNotificationId,
        userId: mockUserId,
        title: 'Test',
      };
      (Notification.findOne as jest.Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.getNotificationById(
        mockUserId,
        mockNotificationId
      );

      expect(result).toEqual(mockNotification);
      expect(Notification.findOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should throw not found when notification does not exist', async () => {
      (Notification.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.getNotificationById(mockUserId, mockNotificationId)
      ).rejects.toThrow('Notification not found');
    });
  });

  // ──────────────────────────────────────────────────
  // markAsRead
  // ──────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('should throw on invalid notification ID', async () => {
      await expect(
        NotificationService.markAsRead(mockUserId, 'invalid')
      ).rejects.toThrow('Invalid notification ID');
    });

    it('should update notification with readAt', async () => {
      const mockUpdated = {
        _id: mockNotificationId,
        readAt: new Date(),
      };
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await NotificationService.markAsRead(
        mockUserId,
        mockNotificationId
      );

      expect(result).toEqual(mockUpdated);
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { readAt: expect.any(Date) },
        { new: true }
      );
    });

    it('should throw not found when notification does not exist', async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead(mockUserId, mockNotificationId)
      ).rejects.toThrow('Notification not found');
    });
  });

  // ──────────────────────────────────────────────────
  // markAllAsRead
  // ──────────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('should throw on invalid user ID', async () => {
      await expect(
        NotificationService.markAllAsRead('invalid')
      ).rejects.toThrow('Invalid user ID');
    });

    it('should update all unread, non-dismissed notifications', async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({
        modifiedCount: 5,
      });

      const result = await NotificationService.markAllAsRead(mockUserId);

      expect(result).toBe(5);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          userId: expect.any(mongoose.Types.ObjectId),
          readAt: null,
          dismissedAt: null,
        },
        { readAt: expect.any(Date) }
      );
    });

    it('should return 0 when no unread notifications exist', async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({
        modifiedCount: 0,
      });

      const result = await NotificationService.markAllAsRead(mockUserId);

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // dismissNotification
  // ──────────────────────────────────────────────────
  describe('dismissNotification', () => {
    it('should throw on invalid notification ID', async () => {
      await expect(
        NotificationService.dismissNotification(mockUserId, 'invalid')
      ).rejects.toThrow('Invalid notification ID');
    });

    it('should update notification with dismissedAt', async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: mockNotificationId,
      });

      await NotificationService.dismissNotification(
        mockUserId,
        mockNotificationId
      );

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { dismissedAt: expect.any(Date) }
      );
    });

    it('should throw not found when notification does not exist', async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.dismissNotification(mockUserId, mockNotificationId)
      ).rejects.toThrow('Notification not found');
    });
  });

  // ──────────────────────────────────────────────────
  // getUnreadCount
  // ──────────────────────────────────────────────────
  describe('getUnreadCount', () => {
    it('should throw on invalid user ID', async () => {
      await expect(
        NotificationService.getUnreadCount('invalid')
      ).rejects.toThrow('Invalid user ID');
    });

    it('should return count of unread, non-dismissed notifications', async () => {
      (Notification.countDocuments as jest.Mock).mockResolvedValue(7);

      const result = await NotificationService.getUnreadCount(mockUserId);

      expect(result).toBe(7);
      expect(Notification.countDocuments).toHaveBeenCalledWith({
        userId: expect.any(mongoose.Types.ObjectId),
        readAt: null,
        dismissedAt: null,
      });
    });
  });

  // ──────────────────────────────────────────────────
  // getOrCreatePreferences
  // ──────────────────────────────────────────────────
  describe('getOrCreatePreferences', () => {
    it('should throw on invalid user ID', async () => {
      await expect(
        NotificationService.getOrCreatePreferences('invalid')
      ).rejects.toThrow('Invalid user ID');
    });

    it('should return existing preferences', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const result = await NotificationService.getOrCreatePreferences(mockUserId);

      expect(result).toEqual(mockPrefs);
      expect(NotificationPreferences.findOne).toHaveBeenCalledWith({
        userId: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should create new preferences when none exist', async () => {
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      (NotificationPreferences as unknown as jest.Mock).mockImplementation(
        (data: any) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          inAppNotifications: true,
          preferences: new Map(),
          quietHours: { enabled: false, start: '22:00', end: '08:00' },
          save: mockSave,
        })
      );

      const result = await NotificationService.getOrCreatePreferences(mockUserId);

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────
  // updatePreferences
  // ──────────────────────────────────────────────────
  describe('updatePreferences', () => {
    it('should update emailNotifications', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const result = await NotificationService.updatePreferences(mockUserId, {
        emailNotifications: false,
      });

      expect(result.emailNotifications).toBe(false);
      expect(mockPrefs.save).toHaveBeenCalled();
    });

    it('should update inAppNotifications', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const result = await NotificationService.updatePreferences(mockUserId, {
        inAppNotifications: false,
      });

      expect(result.inAppNotifications).toBe(false);
      expect(mockPrefs.save).toHaveBeenCalled();
    });

    it('should update individual preference type settings', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      await NotificationService.updatePreferences(mockUserId, {
        preferences: { access_expiring: false },
      });

      expect(mockPrefs.preferences.get('access_expiring')).toBe(false);
      expect(mockPrefs.save).toHaveBeenCalled();
    });

    it('should update quietHours fields', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      await NotificationService.updatePreferences(mockUserId, {
        quietHours: { enabled: true, start: '20:00', end: '07:00' },
      });

      expect(mockPrefs.quietHours.enabled).toBe(true);
      expect(mockPrefs.quietHours.start).toBe('20:00');
      expect(mockPrefs.quietHours.end).toBe('07:00');
      expect(mockPrefs.save).toHaveBeenCalled();
    });

    it('should partially update quietHours', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      await NotificationService.updatePreferences(mockUserId, {
        quietHours: { enabled: true },
      });

      expect(mockPrefs.quietHours.enabled).toBe(true);
      // start and end should remain unchanged
      expect(mockPrefs.quietHours.start).toBe('22:00');
      expect(mockPrefs.quietHours.end).toBe('08:00');
    });
  });

  // ──────────────────────────────────────────────────
  // deleteExpiredNotifications
  // ──────────────────────────────────────────────────
  describe('deleteExpiredNotifications', () => {
    it('should delete notifications where expiresAt is in the past', async () => {
      (Notification.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 3,
      });

      const result = await NotificationService.deleteExpiredNotifications();

      expect(result).toBe(3);
      expect(Notification.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lte: expect.any(Date) },
      });
    });

    it('should return 0 when no expired notifications exist', async () => {
      (Notification.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });

      const result = await NotificationService.deleteExpiredNotifications();

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // createNotificationSilent
  // ──────────────────────────────────────────────────
  describe('createNotificationSilent', () => {
    it('should return notification on success', async () => {
      const mockPrefs = createMockPreferences();
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const mockSave = jest.fn().mockResolvedValue(true);
      (Notification as unknown as jest.Mock).mockImplementation((data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        save: mockSave,
      }));

      const input = createMockNotificationInput();
      const result = await NotificationService.createNotificationSilent(input);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should return null when user has opted out', async () => {
      const mockPrefs = createMockPreferences({ inAppNotifications: false });
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const input = createMockNotificationInput();
      const result = await NotificationService.createNotificationSilent(input);

      expect(result).toBeNull();
    });

    it('should return null when notification type is disabled', async () => {
      const prefs = new Map([['access_expiring', false]]);
      const mockPrefs = createMockPreferences({ preferences: prefs });
      (NotificationPreferences.findOne as jest.Mock).mockResolvedValue(mockPrefs);

      const input = createMockNotificationInput({ type: 'access_expiring' });
      const result = await NotificationService.createNotificationSilent(input);

      expect(result).toBeNull();
    });
  });
});
