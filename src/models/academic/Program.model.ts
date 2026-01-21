import mongoose, { Schema, Document } from 'mongoose';

export type ProgramType = 
  | 'certificate' 
  | 'diploma' 
  | 'associates' 
  | 'bachelors' 
  | 'masters' 
  | 'doctorate' 
  | 'professional' 
  | 'continuing-education';

export interface ICertificateConfig {
  enabled: boolean;
  templateId?: mongoose.Types.ObjectId;
  title?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  validityPeriod?: number;  // months, 0 = no expiry
  autoIssue: boolean;
}

export interface IProgram extends Document {
  name: string;
  code: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  type: ProgramType;
  parentProgramId?: mongoose.Types.ObjectId;
  level: number;
  path: mongoose.Types.ObjectId[];
  durationYears?: number;
  requiredCredits?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  certificate?: ICertificateConfig;
  createdAt: Date;
  updatedAt: Date;
}

const programSchema = new Schema<IProgram>(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      maxlength: [200, 'Program name cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Program code cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    type: {
      type: String,
      required: [true, 'Program type is required'],
      enum: {
        values: ['certificate', 'diploma', 'associates', 'bachelors', 'masters', 'doctorate', 'professional', 'continuing-education'],
        message: '{VALUE} is not a valid program type'
      }
    },
    parentProgramId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      default: undefined
    },
    level: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Level cannot be negative']
    },
    path: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    durationYears: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    requiredCredits: {
      type: Number,
      min: [0, 'Required credits cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    },
    certificate: {
      enabled: {
        type: Boolean,
        default: false
      },
      templateId: {
        type: Schema.Types.ObjectId,
        ref: 'Template'
      },
      title: {
        type: String,
        maxlength: [200, 'Certificate title cannot exceed 200 characters']
      },
      signatoryName: {
        type: String,
        maxlength: [100, 'Signatory name cannot exceed 100 characters']
      },
      signatoryTitle: {
        type: String,
        maxlength: [100, 'Signatory title cannot exceed 100 characters']
      },
      validityPeriod: {
        type: Number,
        min: [0, 'Validity period cannot be negative']
      },
      autoIssue: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique code within department
programSchema.index({ departmentId: 1, code: 1 }, { unique: true });
programSchema.index({ type: 1 });
programSchema.index({ isActive: 1 });
programSchema.index({ parentProgramId: 1 });
programSchema.index({ path: 1 });

// Pre-save hook to calculate level and path
programSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('parentProgramId')) {
    if (!this.parentProgramId) {
      // Root program
      this.level = 0;
      this.path = [this._id];
    } else {
      // Sub-program - find parent
      const parent = await mongoose.model<IProgram>('Program').findById(this.parentProgramId);
      
      if (!parent) {
        throw new Error('Parent program not found');
      }

      this.level = parent.level + 1;
      this.path = [...parent.path, this._id];
    }
  }
  
  next();
});

const Program = mongoose.model<IProgram>('Program', programSchema);

export default Program;
