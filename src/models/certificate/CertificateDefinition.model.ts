import mongoose, { Schema, Document } from 'mongoose';

/**
 * Status lifecycle for certificate definitions
 */
export type CertificateDefinitionStatus = 'draft' | 'active' | 'deprecated';

/**
 * CertificateDefinition - A versioned snapshot of requirements for a credential.
 *
 * Each definition represents a specific version of the credential's requirements.
 * When course versions change, new definitions can be auto-created to track
 * which course versions are required.
 *
 * Compatibility:
 * - isCompatible=true: Completing this version grants the same credential as other versions
 * - isCompatible=false: This is a breaking change; existing holders need to recertify
 *
 * Related: CredentialGroup, CertificateRequirement, CourseVersion
 */
export interface ICertificateDefinition extends Document {
  credentialGroupId: mongoose.Types.ObjectId;
  version: number;                              // 1, 2, 3...
  parentDefinitionId: mongoose.Types.ObjectId | null;  // Previous version this was derived from

  // Content
  title: string;                                // Version-specific title
  description: string;

  // Lifecycle
  status: CertificateDefinitionStatus;
  isCompatible: boolean;                        // Same credential as other versions?
  compatibilityBreakReason: string | null;      // Why this version is incompatible

  // Deprecation
  deprecatedAt: Date | null;
  deprecatedReason: string | null;
  supersededByDefinitionId: mongoose.Types.ObjectId | null;

  // Validity
  validFrom: Date | null;                       // When this definition becomes effective
  validUntil: Date | null;                      // When this definition expires
  expiresAfterMonths: number | null;            // How long after earning the credential expires

  // Auto-issue settings
  autoIssue: boolean;                           // Automatically issue when requirements met

  // Audit
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const certificateDefinitionSchema = new Schema<ICertificateDefinition>(
  {
    credentialGroupId: {
      type: Schema.Types.ObjectId,
      ref: 'CredentialGroup',
      required: [true, 'Credential group is required']
    },
    version: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version must be at least 1']
    },
    parentDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateDefinition',
      default: null
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['draft', 'active', 'deprecated'],
        message: 'Status must be draft, active, or deprecated'
      },
      default: 'draft'
    },
    isCompatible: {
      type: Boolean,
      default: true
    },
    compatibilityBreakReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Compatibility break reason cannot exceed 500 characters']
    },
    deprecatedAt: {
      type: Date,
      default: null
    },
    deprecatedReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Deprecation reason cannot exceed 500 characters']
    },
    supersededByDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateDefinition',
      default: null
    },
    validFrom: {
      type: Date,
      default: null
    },
    validUntil: {
      type: Date,
      default: null
    },
    expiresAfterMonths: {
      type: Number,
      default: null,
      min: [1, 'Expiry must be at least 1 month'],
      max: [1200, 'Expiry cannot exceed 100 years (1200 months)']
    },
    autoIssue: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique version within credential group
certificateDefinitionSchema.index({ credentialGroupId: 1, version: 1 }, { unique: true });
certificateDefinitionSchema.index({ credentialGroupId: 1, status: 1 });
certificateDefinitionSchema.index({ status: 1 });
certificateDefinitionSchema.index({ parentDefinitionId: 1 });
certificateDefinitionSchema.index({ supersededByDefinitionId: 1 });
certificateDefinitionSchema.index({ createdBy: 1 });
certificateDefinitionSchema.index({ validFrom: 1 });
certificateDefinitionSchema.index({ validUntil: 1 });

const CertificateDefinition = mongoose.model<ICertificateDefinition>(
  'CertificateDefinition',
  certificateDefinitionSchema
);

export default CertificateDefinition;
