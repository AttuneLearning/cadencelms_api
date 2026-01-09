import mongoose, { Schema, Document } from 'mongoose';

export type TemplateType = 'master' | 'department' | 'custom';
export type TemplateStatus = 'active' | 'draft';

export interface ITemplate extends Document {
  name: string;
  type: TemplateType;
  status: TemplateStatus;
  css?: string;
  html?: string;
  departmentId?: mongoose.Types.ObjectId;
  isGlobal: boolean;
  createdBy: mongoose.Types.ObjectId;
  duplicatedFrom?: mongoose.Types.ObjectId;
  usageCount: number;
  isDeleted: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      minlength: [1, 'Template name must be at least 1 character'],
      maxlength: [200, 'Template name cannot exceed 200 characters']
    },
    type: {
      type: String,
      required: [true, 'Template type is required'],
      enum: {
        values: ['master', 'department', 'custom'],
        message: '{VALUE} is not a valid template type'
      }
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'draft'],
        message: '{VALUE} is not a valid template status'
      },
      default: 'draft'
    },
    css: {
      type: String,
      trim: true,
      maxlength: [50000, 'CSS content cannot exceed 50000 characters']
    },
    html: {
      type: String,
      trim: true,
      maxlength: [100000, 'HTML content cannot exceed 100000 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    isGlobal: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Created by is required']
    },
    duplicatedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Template'
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative']
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
templateSchema.index({ type: 1, isDeleted: 1 });
templateSchema.index({ departmentId: 1, isDeleted: 1 });
templateSchema.index({ status: 1, isDeleted: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ isGlobal: 1, isDeleted: 1 });
templateSchema.index({ name: 'text' }); // Text index for search
templateSchema.index({ createdAt: -1 });
templateSchema.index({ usageCount: -1 });

// Compound index for name uniqueness within scope
// Master templates: name must be unique globally
// Department templates: name must be unique within department
// Custom templates: name must be unique per creator
templateSchema.index(
  { name: 1, type: 1, departmentId: 1, createdBy: 1, isDeleted: 1 },
  { unique: true, sparse: true }
);

// Validation: department templates must have departmentId
templateSchema.pre('save', function (next) {
  if (this.type === 'department' && !this.departmentId) {
    return next(new Error('Department templates must have a departmentId'));
  }

  // Master templates should not have departmentId
  if (this.type === 'master' && this.departmentId) {
    this.departmentId = undefined;
  }

  // Only master templates can be global
  if (this.isGlobal && this.type !== 'master') {
    this.isGlobal = false;
  }

  next();
});

const Template = mongoose.model<ITemplate>('Template', templateSchema);

export default Template;
