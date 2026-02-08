import mongoose, { Schema, Document } from 'mongoose';

/**
 * Type of credential/achievement represented by this group
 */
export type CredentialType = 'certificate' | 'diploma' | 'degree' | 'badge';

/**
 * CredentialGroup - A named credential that can have multiple versioned definitions.
 *
 * Examples:
 * - "AWS Solutions Architect" (code: AWS-SA)
 * - "OSHA Safety Certification" (code: OSHA-SAFE)
 * - "Project Management Professional" (code: PMP)
 *
 * Each credential group can have multiple CertificateDefinitions, which are
 * versioned snapshots of the requirements needed to earn this credential.
 */
export interface ICredentialGroup extends Document {
  name: string;                              // e.g., "AWS Solutions Architect"
  code: string;                              // e.g., "AWS-SA"
  description: string;
  type: CredentialType;
  badgeImageUrl: string | null;
  badgeColor: string | null;                 // Hex color for badge display
  departmentId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId | null; // Optional link to academic program
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const credentialGroupSchema = new Schema<ICredentialGroup>(
  {
    name: {
      type: String,
      required: [true, 'Credential group name is required'],
      trim: true,
      maxlength: [200, 'Credential group name cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Credential code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Credential code cannot exceed 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      required: [true, 'Credential type is required'],
      enum: {
        values: ['certificate', 'diploma', 'degree', 'badge'],
        message: '{VALUE} is not a valid credential type'
      }
    },
    badgeImageUrl: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Badge image URL cannot exceed 500 characters']
    },
    badgeColor: {
      type: String,
      trim: true,
      default: null,
      maxlength: [7, 'Badge color must be a valid hex color'],
      validate: {
        validator: function(v: string | null) {
          if (v === null) return true;
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: 'Badge color must be a valid hex color (e.g., #FF5733)'
      }
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
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

// Compound index for unique code within department
credentialGroupSchema.index({ departmentId: 1, code: 1 }, { unique: true });
credentialGroupSchema.index({ departmentId: 1, isActive: 1 });
credentialGroupSchema.index({ type: 1 });
credentialGroupSchema.index({ programId: 1 });
credentialGroupSchema.index({ createdBy: 1 });

const CredentialGroup = mongoose.model<ICredentialGroup>('CredentialGroup', credentialGroupSchema);

export default CredentialGroup;
