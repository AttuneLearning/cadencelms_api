/**
 * ModuleEditLock Model
 *
 * Implements optimistic locking at the module level to prevent simultaneous edits.
 * When a user begins editing a module, they acquire a lock. The lock expires
 * automatically after 30 minutes via TTL index, or can be extended via heartbeat.
 *
 * Only one user can hold a lock on a module at a time. Other users can request
 * access, which notifies the lock holder.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Access request from a user who wants to edit a locked module
 */
export interface IAccessRequest {
  userId: mongoose.Types.ObjectId;
  userName: string;
  requestedAt: Date;
}

/**
 * ModuleEditLock interface
 */
export interface IModuleEditLock extends Document {
  _id: mongoose.Types.ObjectId;

  /** The module being locked */
  moduleId: mongoose.Types.ObjectId;

  /** User who holds the lock */
  userId: mongoose.Types.ObjectId;

  /** Display name of the lock holder */
  userName: string;

  /** When the lock was acquired */
  acquiredAt: Date;

  /** When the lock expires (acquiredAt + 30 minutes, updated by heartbeat) */
  expiresAt: Date;

  /** Last heartbeat timestamp */
  lastHeartbeat: Date;

  /** Most recent access request (only stores one) */
  accessRequest: IAccessRequest | null;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ModuleEditLock static methods
 */
export interface IModuleEditLockModel extends Model<IModuleEditLock> {
  /**
   * Find active lock for a module
   */
  findActiveByModuleId(moduleId: string): Promise<IModuleEditLock | null>;
}

const accessRequestSchema = new Schema<IAccessRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'User name cannot exceed 200 characters']
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  { _id: false }
);

const moduleEditLockSchema = new Schema<IModuleEditLock>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Module ID is required'],
      ref: 'Module',
      unique: true,
      index: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User'
    },

    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [200, 'User name cannot exceed 200 characters']
    },

    acquiredAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required']
    },

    lastHeartbeat: {
      type: Date,
      required: true,
      default: Date.now
    },

    accessRequest: {
      type: accessRequestSchema,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'module_edit_locks'
  }
);

// TTL index - automatically delete documents when expiresAt is reached
// expireAfterSeconds: 0 means delete at the exact expiresAt time
moduleEditLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for user lookups
moduleEditLockSchema.index({ userId: 1 });

// Static methods
moduleEditLockSchema.statics.findActiveByModuleId = async function (
  moduleId: string
): Promise<IModuleEditLock | null> {
  return this.findOne({
    moduleId,
    expiresAt: { $gt: new Date() }
  });
};

const ModuleEditLock = mongoose.model<IModuleEditLock, IModuleEditLockModel>(
  'ModuleEditLock',
  moduleEditLockSchema
);

export default ModuleEditLock;
