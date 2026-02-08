import mongoose, { Schema, Document } from 'mongoose';

/**
 * CertificateRequirement - A course requirement for a certificate definition.
 *
 * Each requirement links a certificate definition to a specific course version.
 * Requirements can be:
 * - Required: Must be completed to earn the credential
 * - Elective: Part of a group where a minimum number must be completed
 *
 * Elective Groups:
 * When electiveGroupId is set, learners must complete electiveMinCount courses
 * from that group instead of all courses in the group.
 *
 * Related: CertificateDefinition, CourseVersion
 */
export interface ICertificateRequirement extends Document {
  certificateDefinitionId: mongoose.Types.ObjectId;
  courseVersionId: mongoose.Types.ObjectId;    // Points to specific course version

  // Requirement settings
  isRequired: boolean;                         // false = elective
  minimumScore: number | null;                 // Minimum passing score (null = use course default)
  order: number;                               // Display/completion order

  // Elective group settings
  electiveGroupId: string | null;              // Groups electives together (e.g., "elective-tech")
  electiveGroupName: string | null;            // Human-readable group name
  electiveMinCount: number | null;             // Min courses to complete from this group

  createdAt: Date;
  updatedAt: Date;
}

const certificateRequirementSchema = new Schema<ICertificateRequirement>(
  {
    certificateDefinitionId: {
      type: Schema.Types.ObjectId,
      ref: 'CertificateDefinition',
      required: [true, 'Certificate definition is required']
    },
    courseVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseVersion',
      required: [true, 'Course version is required']
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    minimumScore: {
      type: Number,
      default: null,
      min: [0, 'Minimum score cannot be negative'],
      max: [100, 'Minimum score cannot exceed 100']
    },
    order: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Order cannot be negative']
    },
    electiveGroupId: {
      type: String,
      trim: true,
      default: null,
      maxlength: [50, 'Elective group ID cannot exceed 50 characters']
    },
    electiveGroupName: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'Elective group name cannot exceed 100 characters']
    },
    electiveMinCount: {
      type: Number,
      default: null,
      min: [1, 'Elective minimum count must be at least 1']
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate course requirements in a definition
certificateRequirementSchema.index(
  { certificateDefinitionId: 1, courseVersionId: 1 },
  { unique: true }
);
certificateRequirementSchema.index({ certificateDefinitionId: 1, order: 1 });
certificateRequirementSchema.index({ certificateDefinitionId: 1, isRequired: 1 });
certificateRequirementSchema.index({ certificateDefinitionId: 1, electiveGroupId: 1 });
certificateRequirementSchema.index({ courseVersionId: 1 });

// Validation: electiveGroupId, electiveGroupName, and electiveMinCount must all be set or all be null
certificateRequirementSchema.pre('save', function(next) {
  const hasGroupId = this.electiveGroupId !== null;
  const hasGroupName = this.electiveGroupName !== null;
  const hasMinCount = this.electiveMinCount !== null;

  // If any elective field is set, all must be set
  if (hasGroupId || hasGroupName || hasMinCount) {
    if (!(hasGroupId && hasGroupName && hasMinCount)) {
      return next(new Error('Elective group settings must all be set together: electiveGroupId, electiveGroupName, and electiveMinCount'));
    }
    // Electives cannot also be required
    if (this.isRequired) {
      return next(new Error('Elective courses cannot be marked as required'));
    }
  }

  next();
});

const CertificateRequirement = mongoose.model<ICertificateRequirement>(
  'CertificateRequirement',
  certificateRequirementSchema
);

export default CertificateRequirement;
