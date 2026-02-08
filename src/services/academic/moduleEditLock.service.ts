/**
 * ModuleEditLock Service
 *
 * Handles business logic for module edit locking:
 * - Acquiring locks (optimistic locking)
 * - Releasing locks
 * - Checking lock status
 * - Heartbeat to extend lock expiry
 * - Access request handling
 */

import mongoose from 'mongoose';
import ModuleEditLock, { IModuleEditLock } from '@/models/academic/ModuleEditLock.model';
import Module from '@/models/academic/Module.model';
import { ApiError } from '@/utils/ApiError';

// Lock duration in milliseconds (30 minutes)
const LOCK_DURATION_MS = 30 * 60 * 1000;

/**
 * Response shape for lock status
 */
export interface ModuleEditLockResponse {
  moduleId: string;
  isLocked: boolean;
  lock: {
    userId: string;
    userName: string;
    acquiredAt: string;
    expiresAt: string;
  } | null;
  accessRequest: {
    userId: string;
    userName: string;
    requestedAt: string;
  } | null;
}

export class ModuleEditLockService {
  /**
   * Acquire a lock on a module for editing
   *
   * @param moduleId - The module to lock
   * @param userId - The user acquiring the lock
   * @param userName - Display name of the user
   * @returns Lock response or throws if already locked by another user
   */
  static async acquireLock(
    moduleId: string,
    userId: string,
    userName: string
  ): Promise<ModuleEditLockResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    // Check for existing active lock
    const existingLock = await ModuleEditLock.findActiveByModuleId(moduleId);

    if (existingLock) {
      // If same user already holds the lock, refresh it
      if (existingLock.userId.toString() === userId) {
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

        existingLock.expiresAt = newExpiresAt;
        existingLock.lastHeartbeat = now;
        await existingLock.save();

        return this.formatLockResponse(existingLock);
      }

      // Lock held by another user - return conflict error with lock info
      const error = new ApiError(
        409,
        `This module is currently being edited by ${existingLock.userName}`,
        true,
        undefined,
        'MODULE_LOCKED'
      );
      // Attach lock data to the error for the controller to use
      (error as any).lockData = this.formatLockResponse(existingLock);
      throw error;
    }

    // No active lock - delete any expired lock first (TTL may not have run yet)
    // and create new lock
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

    // Delete any expired lock for this module
    await ModuleEditLock.deleteMany({
      moduleId,
      expiresAt: { $lte: now }
    });

    const newLock = new ModuleEditLock({
      moduleId,
      userId,
      userName,
      acquiredAt: now,
      expiresAt,
      lastHeartbeat: now,
      accessRequest: null
    });

    await newLock.save();

    return this.formatLockResponse(newLock);
  }

  /**
   * Release a lock on a module
   *
   * @param moduleId - The module to unlock
   * @param userId - The user releasing the lock (must be the lock holder)
   */
  static async releaseLock(moduleId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const lock = await ModuleEditLock.findActiveByModuleId(moduleId);

    if (!lock) {
      // No active lock - operation is successful (idempotent)
      return;
    }

    // Verify the user is the lock holder
    if (lock.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not hold the lock on this module');
    }

    // Delete the lock
    await ModuleEditLock.deleteOne({ _id: lock._id });
  }

  /**
   * Get the current lock status for a module
   *
   * @param moduleId - The module to check
   * @returns Lock status response
   */
  static async getLockStatus(moduleId: string): Promise<ModuleEditLockResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    const lock = await ModuleEditLock.findActiveByModuleId(moduleId);

    if (!lock) {
      return {
        moduleId,
        isLocked: false,
        lock: null,
        accessRequest: null
      };
    }

    return this.formatLockResponse(lock);
  }

  /**
   * Send heartbeat to extend lock expiry
   *
   * @param moduleId - The module with the lock
   * @param userId - The user sending heartbeat (must be the lock holder)
   * @returns Updated lock response
   */
  static async heartbeat(
    moduleId: string,
    userId: string
  ): Promise<ModuleEditLockResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    const lock = await ModuleEditLock.findActiveByModuleId(moduleId);

    if (!lock) {
      throw ApiError.notFound('No active lock found for this module', 'LOCK_NOT_FOUND');
    }

    // Verify the user is the lock holder
    if (lock.userId.toString() !== userId) {
      throw ApiError.forbidden('You do not hold the lock on this module');
    }

    // Extend the lock
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

    lock.expiresAt = newExpiresAt;
    lock.lastHeartbeat = now;
    await lock.save();

    return this.formatLockResponse(lock);
  }

  /**
   * Request access to a locked module
   * Stores the most recent access request (no queue)
   *
   * @param moduleId - The module to request access to
   * @param userId - The user requesting access
   * @param userName - Display name of the user
   * @returns Lock status response with access request included
   */
  static async requestAccess(
    moduleId: string,
    userId: string,
    userName: string
  ): Promise<ModuleEditLockResponse> {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid module ID');
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    const lock = await ModuleEditLock.findActiveByModuleId(moduleId);

    if (!lock) {
      throw ApiError.badRequest('Module is not currently locked');
    }

    // Can't request access to your own lock
    if (lock.userId.toString() === userId) {
      throw ApiError.badRequest('You already hold the lock on this module');
    }

    // Store the access request (replaces any existing request)
    lock.accessRequest = {
      userId: new mongoose.Types.ObjectId(userId),
      userName,
      requestedAt: new Date()
    };

    await lock.save();

    return this.formatLockResponse(lock);
  }

  /**
   * Format a lock document into the response shape
   */
  private static formatLockResponse(lock: IModuleEditLock): ModuleEditLockResponse {
    return {
      moduleId: lock.moduleId.toString(),
      isLocked: true,
      lock: {
        userId: lock.userId.toString(),
        userName: lock.userName,
        acquiredAt: lock.acquiredAt.toISOString(),
        expiresAt: lock.expiresAt.toISOString()
      },
      accessRequest: lock.accessRequest
        ? {
            userId: lock.accessRequest.userId.toString(),
            userName: lock.accessRequest.userName,
            requestedAt: lock.accessRequest.requestedAt.toISOString()
          }
        : null
    };
  }
}
