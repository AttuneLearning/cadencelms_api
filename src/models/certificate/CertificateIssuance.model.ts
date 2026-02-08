import mongoose, { Schema, Document } from 'mongoose';

/**
 * CompletedRequirement - A record of a completed course for certificate issuance.
 *
 * Captures the snapshot of the learner's completion at issuance time,
 * including which course version they completed and their final score.
 */
export interface ICompletedRequirement {
  courseVersionId: mongoose.Types.ObjectId;
  courseTitle: string;                    // Snapshot at time of issuance
  completedAt: Date;
  finalScore: number | null;              // Percentage score (0-100), null if ungraded
  enrollmentId: mongoose.Types.ObjectId;
}

/**
 * CertificateIssuance - A certificate issued to a learner.
 *
 * Represents a single issuance of a certificate based on a CertificateDefinition.
 * Each issuance:
 * - Links to the learner who earned it
 * - Records which requirements were completed
 * - Has a unique verification code for public verification
 * - Can be revoked if needed
 * - Can be upgraded to a newer definition version
 *
 * Verification Code:
 * - 12 characters using safe alphabet (no I, O, 0, 1 to avoid confusion)
 * - URL-safe for verification links
 *
 * Related: CertificateDefinition, CredentialGroup, Learner, Enrollment
 */
export interface ICertificateIssuance extends Document {
  certificateDefinitionId: mongoose.Types.ObjectId;
  credentialGroupId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;

  // Completion snapshot
  completedRequirements: ICompletedRequirement[];

  // Issuance details
  issuedAt: Date;
  issuedBy: mongoose.Types.ObjectId | null;  // null = auto-issued

  // Verification
  verificationCode: string;                   // Unique, URL-safe 12 char code

  // PDF (for future use)
  pdfUrl: string | null;

  // Validity
  expiresAt: Date | null;

  // Revocation
  revokedAt: Date | null;
  revokedBy: mongoose.Types.ObjectId | null;
  revokedReason: string | null;

  // Upgrade tracking
  upgradedToIssuanceId: mongoose.Types.ObjectId | null;
  upgradedFromIssuanceId: mongoose.Types.ObjectId | null;

  // Flexible metadata
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const completedRequirementSchema = new Schema<ICompletedRequirement>(
  {
    courseVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      required: [true, 'Course version is required']
    },
    courseTitle: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Course title cannot exceed 200 characters']
    },
    completedAt: {
      type: Date,
      required: [true, 'Completion date is required']
    },
    finalScore: {
      type: Number,
      default: null,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100']
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required']
    }
  },
  {
    _id: false
  }
);

const certificateIssuanceSchema = new Schema<ICertificateIssuance>(
  {
    certificateDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateDefinition',
      required: [true, 'Certificate definition is required']
    },
    credentialGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'CredentialGroup',
      required: [true, 'Credential group is required']
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner is required']
    },
    completedRequirements: {
      type: [completedRequirementSchema],
      required: [true, 'Completed requirements are required'],
      validate: {
        validator: function(v: ICompletedRequirement[]) {
          return v && v.length > 0;
        },
        message: 'At least one completed requirement is required'
      }
    },
    issuedAt: {
      type: Date,
      required: [true, 'Issuance date is required'],
      default: Date.now
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verificationCode: {
      type: String,
      required: [true, 'Verification code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [12, 'Verification code must be 12 characters'],
      maxlength: [12, 'Verification code must be 12 characters']
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'PDF URL cannot exceed 500 characters']
    },
    expiresAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    revokedReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters']
    },
    upgradedToIssuanceId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateIssuance',
      default: null
    },
    upgradedFromIssuanceId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateIssuance',
      default: null
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
certificateIssuanceSchema.index({ learnerId: 1, credentialGroupId: 1 });
certificateIssuanceSchema.index({ learnerId: 1, certificateDefinitionId: 1 });
certificateIssuanceSchema.index({ verificationCode: 1 }, { unique: true });
certificateIssuanceSchema.index({ credentialGroupId: 1, issuedAt: -1 });
certificateIssuanceSchema.index({ certificateDefinitionId: 1 });
certificateIssuanceSchema.index({ learnerId: 1, issuedAt: -1 });
certificateIssuanceSchema.index({ learnerId: 1, revokedAt: 1 });
certificateIssuanceSchema.index({ expiresAt: 1 }, { sparse: true });
certificateIssuanceSchema.index({ upgradedToIssuanceId: 1 }, { sparse: true });
certificateIssuanceSchema.index({ upgradedFromIssuanceId: 1 }, { sparse: true });
certificateIssuanceSchema.index({ issuedBy: 1 }, { sparse: true });

// Compound index for preventing duplicate active issuances
// (same learner + same credential group + not revoked + not upgraded)
// Note: This is handled in the service layer for more complex logic

const CertificateIssuance = mongoose.model<ICertificateIssuance>(
  'CertificateIssuance',
  certificateIssuanceSchema
);

export default CertificateIssuance;
