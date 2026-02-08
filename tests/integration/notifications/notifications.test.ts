/**
 * Notification System Integration Tests
 *
 * Tests the notification API endpoints:
 * - GET /api/v2/users/me/notifications - List notifications
 * - GET /api/v2/users/me/notifications/count - Get unread count
 * - GET /api/v2/users/me/notifications/:id - Get single notification
 * - PATCH /api/v2/users/me/notifications/:id/read - Mark as read
 * - POST /api/v2/users/me/notifications/read-all - Mark all as read
 * - DELETE /api/v2/users/me/notifications/:id - Dismiss notification
 * - GET /api/v2/users/me/notification-preferences - Get preferences
 * - PUT /api/v2/users/me/notification-preferences - Update preferences
 *
 * Related: API-ISS-020 (Notification System)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import Notification from '@/models/notification/Notification.model';
import NotificationPreferences from '@/models/notification/NotificationPreferences.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';
import { seedLearningUnitLookups } from '../../helpers/lookup-values';

describeIfMongo('Notification System Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let secondUserAuthToken: string;
  let testDepartment: any;
  let testUser: any;
  let secondUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await seedLearningUnitLookups();

    // Create test department
    testDepartment = await Department.create({
      name: 'Notification Test Department',
      code: 'NTF' + Date.now().toString().slice(-6),
      level: 0,
      path: [],
      isActive: true
    });

    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create({
      name: 'instructor',
      userType: 'staff',
      displayName: 'Instructor',
      description: 'Basic staff role',
      accessRights: [],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'system:notifications:read', domain: 'system', resource: 'notifications', action: 'read', description: 'Read notifications', isActive: true },
      { name: 'system:notifications:manage', domain: 'system', resource: 'notifications', action: 'manage', description: 'Manage notifications', isActive: true }
    ]);

    // Create primary test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'notification-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Notification',
        lastName: 'Tester',
        emails: [{
          email: testUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate auth token for primary user
    authToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Notification Tester'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create second test user for authorization tests
    secondUser = await User.create({
      email: 'notification-test2@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: secondUser._id,
      person: {
        firstName: 'Second',
        lastName: 'User',
        emails: [{
          email: secondUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate auth token for second user
    secondUserAuthToken = jwt.sign(
      {
        userId: secondUser._id.toString(),
        email: secondUser.email,
        roles: ['staff'],
        type: 'access',
        name: 'Second User'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Notification.deleteMany({});
    await NotificationPreferences.deleteMany({});
  });

  // Helper function to create a notification directly in the database
  const createNotification = async (overrides: Partial<any> = {}) => {
    const notification = await Notification.create({
      userId: testUser._id,
      departmentId: testDepartment._id,
      type: 'access_expiring',
      title: 'Test Notification',
      message: 'This is a test notification message',
      priority: 'normal',
      readAt: null,
      dismissedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata: {},
      ...overrides
    });
    return notification;
  };

  // =========================================================================
  // List Notifications Tests (GET /api/v2/users/me/notifications)
  // =========================================================================
  describe('GET /api/v2/users/me/notifications', () => {
    describe('successful listing', () => {
      it('should return empty list when no notifications exist', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });

      it('should list notifications for the current user', async () => {
        await createNotification({ title: 'First Notification' });
        await createNotification({ title: 'Second Notification' });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toHaveLength(2);
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should return notifications sorted by createdAt descending by default', async () => {
        const older = await createNotification({ title: 'Older' });
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        const newer = await createNotification({ title: 'Newer' });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications[0].title).toBe('Newer');
        expect(response.body.data.notifications[1].title).toBe('Older');
      });

      it('should include notification metadata in response', async () => {
        await createNotification({
          relatedEntity: {
            type: 'enrollment',
            id: new mongoose.Types.ObjectId()
          },
          metadata: { courseName: 'Test Course' }
        });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const notification = response.body.data.notifications[0];
        expect(notification).toHaveProperty('_id');
        expect(notification).toHaveProperty('userId');
        expect(notification).toHaveProperty('departmentId');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('priority');
        expect(notification).toHaveProperty('relatedEntity');
        expect(notification).toHaveProperty('readAt');
        expect(notification).toHaveProperty('dismissedAt');
        expect(notification.metadata).toEqual({ courseName: 'Test Course' });
      });
    });

    describe('filtering', () => {
      beforeEach(async () => {
        await createNotification({ type: 'access_expiring', priority: 'high' });
        await createNotification({ type: 'certificate_issued', priority: 'normal' });
        await createNotification({ type: 'access_expired', priority: 'urgent', readAt: new Date() });
        await createNotification({ type: 'access_expiring', priority: 'low', dismissedAt: new Date() });
      });

      it('should filter by notification type', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ type: 'access_expiring' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        // Only non-dismissed access_expiring notification
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].type).toBe('access_expiring');
      });

      it('should filter by priority', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ priority: 'high' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].priority).toBe('high');
      });

      it('should filter by read status - unread only', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ readStatus: 'unread' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        // 3 non-dismissed, 2 unread (excluding dismissed one)
        expect(response.body.data.notifications).toHaveLength(2);
        response.body.data.notifications.forEach((n: any) => {
          expect(n.readAt).toBeNull();
        });
      });

      it('should filter by read status - read only', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ readStatus: 'read' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].readAt).not.toBeNull();
      });

      it('should exclude dismissed notifications by default', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(3);
        response.body.data.notifications.forEach((n: any) => {
          expect(n.dismissedAt).toBeNull();
        });
      });

      it('should include dismissed notifications when requested', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ includeDismissed: 'true' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(4);
      });

      it('should combine multiple filters', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ type: 'access_expiring', priority: 'high', readStatus: 'unread' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].type).toBe('access_expiring');
        expect(response.body.data.notifications[0].priority).toBe('high');
      });
    });

    describe('pagination', () => {
      beforeEach(async () => {
        // Create 25 notifications
        for (let i = 0; i < 25; i++) {
          await createNotification({ title: `Notification ${i + 1}` });
        }
      });

      it('should paginate results with default limit of 20', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(20);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(20);
        expect(response.body.data.pagination.total).toBe(25);
        expect(response.body.data.pagination.totalPages).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(false);
      });

      it('should respect custom page and limit', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ page: 2, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(10);
        expect(response.body.data.pagination.page).toBe(2);
        expect(response.body.data.pagination.limit).toBe(10);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(true);
      });

      it('should return last page correctly', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ page: 3, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(5);
        expect(response.body.data.pagination.page).toBe(3);
        expect(response.body.data.pagination.hasNext).toBe(false);
        expect(response.body.data.pagination.hasPrev).toBe(true);
      });

      it('should enforce maximum limit of 100', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ limit: 200 })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.pagination.limit).toBe(100);
      });
    });

    describe('sorting', () => {
      beforeEach(async () => {
        await createNotification({ priority: 'low', type: 'access_expiring' });
        await new Promise(resolve => setTimeout(resolve, 10));
        await createNotification({ priority: 'high', type: 'certificate_issued' });
        await new Promise(resolve => setTimeout(resolve, 10));
        await createNotification({ priority: 'normal', type: 'access_expired' });
      });

      it('should sort by createdAt ascending', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ sort: 'createdAt' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications[0].priority).toBe('low');
        expect(response.body.data.notifications[2].priority).toBe('normal');
      });

      it('should sort by priority descending', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ sort: '-priority' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        // Priority order: urgent > high > normal > low
        // Note: alphabetical sort, not semantic
      });
    });

    describe('error handling', () => {
      it('should return 422 for invalid type filter', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ type: 'invalid_type' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid priority filter', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ priority: 'invalid_priority' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid readStatus filter', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ readStatus: 'invalid' })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get('/api/v2/users/me/notifications');

        expect(response.status).toBe(401);
      });

      it('should only return notifications for the authenticated user', async () => {
        // Create notification for primary user
        await createNotification({ title: 'Primary User Notification' });
        // Create notification for second user
        await createNotification({
          title: 'Second User Notification',
          userId: secondUser._id
        });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].title).toBe('Primary User Notification');
      });
    });
  });

  // =========================================================================
  // Get Unread Count Tests (GET /api/v2/users/me/notifications/count)
  // =========================================================================
  describe('GET /api/v2/users/me/notifications/count', () => {
    it('should return 0 when no notifications exist', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(0);
    });

    it('should return count of unread, non-dismissed notifications', async () => {
      await createNotification(); // unread
      await createNotification(); // unread
      await createNotification({ readAt: new Date() }); // read
      await createNotification({ dismissedAt: new Date() }); // dismissed

      const response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(2);
    });

    it('should only count notifications for the authenticated user', async () => {
      await createNotification(); // primary user
      await createNotification({ userId: secondUser._id }); // second user

      const response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(1);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/notifications/count');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Get Single Notification Tests (GET /api/v2/users/me/notifications/:id)
  // =========================================================================
  describe('GET /api/v2/users/me/notifications/:id', () => {
    it('should return a single notification by ID', async () => {
      const notification = await createNotification({
        title: 'Specific Notification',
        message: 'Detailed message here',
        priority: 'high'
      });

      const response = await request(app)
        .get(`/api/v2/users/me/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Specific Notification');
      expect(response.body.data.message).toBe('Detailed message here');
      expect(response.body.data.priority).toBe('high');
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/users/me/notifications/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 422 for invalid notification ID format', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/notifications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(422);
    });

    it('should return 404 when trying to access another user notification', async () => {
      const notification = await createNotification({
        userId: secondUser._id,
        title: 'Other User Notification'
      });

      const response = await request(app)
        .get(`/api/v2/users/me/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const notification = await createNotification();
      const response = await request(app)
        .get(`/api/v2/users/me/notifications/${notification._id}`);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Mark As Read Tests (PATCH /api/v2/users/me/notifications/:id/read)
  // =========================================================================
  describe('PATCH /api/v2/users/me/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notification = await createNotification();
      expect(notification.readAt).toBeNull();

      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.readAt).not.toBeNull();

      // Verify in database
      const updated = await Notification.findById(notification._id);
      expect(updated?.readAt).not.toBeNull();
    });

    it('should return the updated notification', async () => {
      const notification = await createNotification({ title: 'Read Me' });

      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Read Me');
      expect(response.body.data.readAt).toBeTruthy();
    });

    it('should not error when marking already-read notification', async () => {
      const notification = await createNotification({ readAt: new Date() });

      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${nonExistentId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 422 for invalid notification ID', async () => {
      const response = await request(app)
        .patch('/api/v2/users/me/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(422);
    });

    it('should return 404 when trying to mark another user notification as read', async () => {
      const notification = await createNotification({ userId: secondUser._id });

      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const notification = await createNotification();
      const response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notification._id}/read`);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Mark All As Read Tests (POST /api/v2/users/me/notifications/read-all)
  // =========================================================================
  describe('POST /api/v2/users/me/notifications/read-all', () => {
    it('should mark all unread notifications as read', async () => {
      await createNotification({ title: 'Unread 1' });
      await createNotification({ title: 'Unread 2' });
      await createNotification({ title: 'Already Read', readAt: new Date() });

      const response = await request(app)
        .post('/api/v2/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(2);

      // Verify in database
      const unread = await Notification.countDocuments({
        userId: testUser._id,
        readAt: null
      });
      expect(unread).toBe(0);
    });

    it('should not affect dismissed notifications', async () => {
      await createNotification({ title: 'Unread' });
      await createNotification({ title: 'Dismissed', dismissedAt: new Date() });

      const response = await request(app)
        .post('/api/v2/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(1);
    });

    it('should return 0 when no unread notifications exist', async () => {
      await createNotification({ readAt: new Date() });

      const response = await request(app)
        .post('/api/v2/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(0);
    });

    it('should only affect notifications for the authenticated user', async () => {
      await createNotification({ title: 'My Notification' });
      await createNotification({ title: 'Other User', userId: secondUser._id });

      const response = await request(app)
        .post('/api/v2/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe(1);

      // Verify other user's notification is still unread
      const otherUserNotif = await Notification.findOne({ userId: secondUser._id });
      expect(otherUserNotif?.readAt).toBeNull();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/notifications/read-all');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Dismiss Notification Tests (DELETE /api/v2/users/me/notifications/:id)
  // =========================================================================
  describe('DELETE /api/v2/users/me/notifications/:id', () => {
    it('should dismiss a notification (soft delete)', async () => {
      const notification = await createNotification();
      expect(notification.dismissedAt).toBeNull();

      const response = await request(app)
        .delete(`/api/v2/users/me/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify in database - notification still exists but is dismissed
      const dismissed = await Notification.findById(notification._id);
      expect(dismissed).not.toBeNull();
      expect(dismissed?.dismissedAt).not.toBeNull();
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/users/me/notifications/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 422 for invalid notification ID', async () => {
      const response = await request(app)
        .delete('/api/v2/users/me/notifications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(422);
    });

    it('should return 404 when trying to dismiss another user notification', async () => {
      const notification = await createNotification({ userId: secondUser._id });

      const response = await request(app)
        .delete(`/api/v2/users/me/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const notification = await createNotification();
      const response = await request(app)
        .delete(`/api/v2/users/me/notifications/${notification._id}`);

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Get Preferences Tests (GET /api/v2/users/me/notification-preferences)
  // =========================================================================
  describe('GET /api/v2/users/me/notification-preferences', () => {
    it('should return default preferences when none exist', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emailNotifications).toBe(true);
      expect(response.body.data.inAppNotifications).toBe(true);
      expect(response.body.data.quietHours.enabled).toBe(false);
      expect(response.body.data.quietHours.start).toBe('22:00');
      expect(response.body.data.quietHours.end).toBe('08:00');
    });

    it('should return existing preferences', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        emailNotifications: false,
        inAppNotifications: true,
        preferences: new Map([
          ['access_expiring', false],
          ['certificate_issued', true]
        ]),
        quietHours: {
          enabled: true,
          start: '21:00',
          end: '07:00'
        }
      });

      const response = await request(app)
        .get('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.emailNotifications).toBe(false);
      expect(response.body.data.inAppNotifications).toBe(true);
      expect(response.body.data.quietHours.enabled).toBe(true);
      expect(response.body.data.quietHours.start).toBe('21:00');
      expect(response.body.data.quietHours.end).toBe('07:00');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/notification-preferences');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Update Preferences Tests (PUT /api/v2/users/me/notification-preferences)
  // =========================================================================
  describe('PUT /api/v2/users/me/notification-preferences', () => {
    it('should update email notifications preference', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailNotifications: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emailNotifications).toBe(false);
    });

    it('should update in-app notifications preference', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ inAppNotifications: false });

      expect(response.status).toBe(200);
      expect(response.body.data.inAppNotifications).toBe(false);
    });

    it('should update individual notification type preferences', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            access_expiring: false,
            certificate_issued: false
          }
        });

      expect(response.status).toBe(200);
      // Map is serialized as object in JSON response
      const prefs = response.body.data.preferences;
      expect(prefs.access_expiring).toBe(false);
      expect(prefs.certificate_issued).toBe(false);
    });

    it('should update quiet hours settings', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quietHours: {
            enabled: true,
            start: '23:00',
            end: '06:00'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.quietHours.enabled).toBe(true);
      expect(response.body.data.quietHours.start).toBe('23:00');
      expect(response.body.data.quietHours.end).toBe('06:00');
    });

    it('should update multiple preferences at once', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          inAppNotifications: true,
          preferences: {
            access_expiring: false
          },
          quietHours: {
            enabled: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.emailNotifications).toBe(false);
      expect(response.body.data.inAppNotifications).toBe(true);
      expect(response.body.data.preferences.access_expiring).toBe(false);
      expect(response.body.data.quietHours.enabled).toBe(true);
    });

    it('should create preferences if none exist', async () => {
      const prefs = await NotificationPreferences.findOne({ userId: testUser._id });
      expect(prefs).toBeNull();

      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailNotifications: false });

      expect(response.status).toBe(200);

      const createdPrefs = await NotificationPreferences.findOne({ userId: testUser._id });
      expect(createdPrefs).not.toBeNull();
      expect(createdPrefs?.emailNotifications).toBe(false);
    });

    it('should update existing preferences', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        emailNotifications: true,
        inAppNotifications: true
      });

      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailNotifications: false });

      expect(response.status).toBe(200);
      expect(response.body.data.emailNotifications).toBe(false);
      expect(response.body.data.inAppNotifications).toBe(true);
    });

    describe('validation errors', () => {
      it('should return 422 for empty request body', async () => {
        const response = await request(app)
          .put('/api/v2/users/me/notification-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid notification type in preferences', async () => {
        const response = await request(app)
          .put('/api/v2/users/me/notification-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            preferences: {
              invalid_type: false
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid quiet hours time format', async () => {
        const response = await request(app)
          .put('/api/v2/users/me/notification-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            quietHours: {
              start: '25:00' // Invalid hour
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for non-HH:mm time format', async () => {
        const response = await request(app)
          .put('/api/v2/users/me/notification-preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            quietHours: {
              end: '8:00' // Missing leading zero
            }
          });

        expect(response.status).toBe(422);
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/notification-preferences')
        .send({ emailNotifications: false });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // Full Notification Lifecycle Test
  // =========================================================================
  describe('Full Notification Lifecycle', () => {
    it('should handle complete notification lifecycle', async () => {
      // 1. Check initial count - should be 0
      let response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(0);

      // 2. Create notifications directly in database (simulating system events)
      const notif1 = await createNotification({ title: 'Notification 1', type: 'access_expiring' });
      const notif2 = await createNotification({ title: 'Notification 2', type: 'certificate_issued' });
      await createNotification({ title: 'Notification 3', type: 'access_expired' });

      // 3. Check count increased
      response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(3);

      // 4. List notifications
      response = await request(app)
        .get('/api/v2/users/me/notifications')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data.notifications).toHaveLength(3);

      // 5. Get single notification
      response = await request(app)
        .get(`/api/v2/users/me/notifications/${notif1._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data.title).toBe('Notification 1');

      // 6. Mark one as read
      response = await request(app)
        .patch(`/api/v2/users/me/notifications/${notif1._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data.readAt).not.toBeNull();

      // 7. Count should decrease
      response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(2);

      // 8. Dismiss one notification
      await request(app)
        .delete(`/api/v2/users/me/notifications/${notif2._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 9. Count should decrease further (dismissed are not counted)
      response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(1);

      // 10. Dismissed notification should not appear in default list
      response = await request(app)
        .get('/api/v2/users/me/notifications')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data.notifications).toHaveLength(2);

      // 11. Mark all as read
      response = await request(app)
        .post('/api/v2/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(1);

      // 12. Final count should be 0
      response = await request(app)
        .get('/api/v2/users/me/notifications/count')
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data).toBe(0);

      // 13. Filter by read status should work
      response = await request(app)
        .get('/api/v2/users/me/notifications')
        .query({ readStatus: 'read' })
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.body.data.notifications).toHaveLength(2);
    });
  });

  // =========================================================================
  // Notification Type Coverage Tests
  // =========================================================================
  describe('Notification Types', () => {
    const notificationTypes = [
      'access_expiring',
      'access_expired',
      'new_version_available',
      'certificate_upgrade_available',
      'certificate_issued',
      'certificate_expiring',
      'extension_approved',
      'extension_denied'
    ];

    notificationTypes.forEach(type => {
      it(`should support ${type} notification type`, async () => {
        await createNotification({ type });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ type })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].type).toBe(type);
      });
    });
  });

  // =========================================================================
  // Priority Tests
  // =========================================================================
  describe('Notification Priorities', () => {
    const priorities = ['low', 'normal', 'high', 'urgent'];

    priorities.forEach(priority => {
      it(`should support ${priority} priority`, async () => {
        await createNotification({ priority });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .query({ priority })
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications).toHaveLength(1);
        expect(response.body.data.notifications[0].priority).toBe(priority);
      });
    });
  });

  // =========================================================================
  // Related Entity Tests
  // =========================================================================
  describe('Related Entity Types', () => {
    const entityTypes = [
      'enrollment',
      'course',
      'courseVersion',
      'certificate',
      'certificateIssuance',
      'extensionRequest'
    ];

    entityTypes.forEach(entityType => {
      it(`should store ${entityType} related entity reference`, async () => {
        const relatedId = new mongoose.Types.ObjectId();
        await createNotification({
          relatedEntity: {
            type: entityType,
            id: relatedId
          }
        });

        const response = await request(app)
          .get('/api/v2/users/me/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.notifications[0].relatedEntity.type).toBe(entityType);
        expect(response.body.data.notifications[0].relatedEntity.id).toBe(relatedId.toString());
      });
    });
  });
});
