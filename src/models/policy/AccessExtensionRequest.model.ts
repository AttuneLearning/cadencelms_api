import mongoose, { Schema, Document } from 'mongoose';

/**
 * Extension Request Status
 */
export type ExtensionRequestStatus = 'pending' | 'approved' | 'denied';

/**
 * Requested Extension Details
 */
export interface IRequestedExtension {
  /** Type of extension requested */
  type: 'days' | 'months' | 'perpetual';
  /** Value (required for days/months) */
  value?: number;
}

/**
 * Access Extension Request Interface
 *
 * Represents a learner's request to extend their access to an enrollment
 * beyond the standard expiration date.
 */
export interface IAccessExtensionRequest extends Document {
  /** The enrollment this request is for */
  enrollmentId: mongoose.Types.ObjectId;

  /** The learner making the request */
  learnerId: mongoose.Types.ObjectId;

  /** The department the enrollment belongs to */
  departmentId: mongoose.Types.ObjectId;

  /** When the request was submitted */
  requestedAt: Date;

  /** The extension being requested */
  requestedExtension: IRequestedExtension;

  /** Reason provided by learner for the extension request */
  requestReason?: string;

  /** Current status of the request */
  status: ExtensionRequestStatus;

  /** Who reviewed the request (if reviewed) */
  reviewedBy?: mongoose.Types.ObjectId;

  /** When the request was reviewed */
  reviewedAt?: Date;

  /** Notes from the reviewer */
  reviewNotes?: string;

  /** The actual extension granted (may differ from requested) */
  grantedExtension?: IRequestedExtension;

  /** The new expiration date if approved */
  newExpirationDate?: Date;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

const RequestedExtensionSchema = new Schema<IRequestedExtension>(
  {
    type: {
      type: String,
      required: [true, 'Extension type is required'],
      enum: {
        values: ['days', 'months', 'perpetual'],
        message: '{VALUE} is not a valid extension type'
      }
    },
    value: {
      type: Number,
      min: [1, 'Extension value must be at least 1'],
      validate: {
        validator: function(this: IRequestedExtension, v: number | undefined) {
          // Value is required for non-perpetual types
          if (this.type !== 'perpetual' && (v === undefined || v === null)) {
            return false;
          }
          return true;
        },
        message: 'Extension value is required for non-perpetual types'
      }
    }
  },
  { _id: false }
);

const AccessExtensionRequestSchema = new Schema<IAccessExtensionRequest>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Learner ID is required'],
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true
    },
    requestedAt: {
      type: Date,
      required: [true, 'Request date is required'],
      default: Date.now
    },
    requestedExtension: {
      type: RequestedExtensionSchema,
      required: [true, 'Requested extension is required']
    },
    requestReason: {
      type: String,
      trim: true,
      maxlength: [2000, 'Request reason cannot exceed 2000 characters']
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'approved', 'denied'],
        message: '{VALUE} is not a valid request status'
      },
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review notes cannot exceed 2000 characters']
    },
    grantedExtension: {
      type: RequestedExtensionSchema
    },
    newExpirationDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
AccessExtensionRequestSchema.index({ departmentId: 1, status: 1 });
AccessExtensionRequestSchema.index({ learnerId: 1, status: 1 });
AccessExtensionRequestSchema.index({ enrollmentId: 1, status: 1 });
AccessExtensionRequestSchema.index({ requestedAt: -1 });

const AccessExtensionRequest = mongoose.model<IAccessExtensionRequest>(
  'AccessExtensionRequest',
  AccessExtensionRequestSchema
);

export default AccessExtensionRequest;
