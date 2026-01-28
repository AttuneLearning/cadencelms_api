import mongoose, { Schema, Document } from 'mongoose';

/**
 * CognitiveDepthLevel Model
 *
 * Stores configurable cognitive depth levels for adaptive learning.
 * System defaults have departmentId: null and isDefault: true.
 * Departments can override defaults or create custom levels.
 *
 * Level Resolution:
 * 1. Check for department-specific level with matching slug
 * 2. Fall back to system default (departmentId: null)
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

export interface ICognitiveDepthLevel extends Document {
  departmentId: mongoose.Types.ObjectId | null;
  slug: string;
  name: string;
  description?: string;
  order: number;
  advanceThreshold: number;
  minAttempts: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cognitiveDepthLevelSchema = new Schema<ICognitiveDepthLevel>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      maxlength: [50, 'Slug must not exceed 50 characters'],
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters']
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: [0.1, 'Order must be at least 0.1']
    },
    advanceThreshold: {
      type: Number,
      required: [true, 'Advance threshold is required'],
      min: [0, 'Advance threshold must be at least 0'],
      max: [1, 'Advance threshold must not exceed 1'],
      default: 0.8
    },
    minAttempts: {
      type: Number,
      required: [true, 'Minimum attempts is required'],
      min: [1, 'Minimum attempts must be at least 1'],
      max: [100, 'Minimum attempts must not exceed 100'],
      default: 3
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'cognitivedepthlevels'
  }
);

// Compound unique index: slug + departmentId
// Allows same slug for system default (null) AND department override
cognitiveDepthLevelSchema.index({ slug: 1, departmentId: 1 }, { unique: true });

// Index for department lookups with ordering
cognitiveDepthLevelSchema.index({ departmentId: 1, order: 1 });

// Index for finding system defaults
cognitiveDepthLevelSchema.index({ departmentId: 1, isDefault: 1 });

const CognitiveDepthLevel = mongoose.model<ICognitiveDepthLevel>(
  'CognitiveDepthLevel',
  cognitiveDepthLevelSchema
);

export default CognitiveDepthLevel;
