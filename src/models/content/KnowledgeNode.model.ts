import mongoose, { Schema, Document } from 'mongoose';

/**
 * KnowledgeNode Model
 *
 * Represents a conceptual topic/knowledge area for adaptive learning.
 * Knowledge Nodes organize questions by concept (separate from Question Banks which are administrative).
 *
 * Graph Relationships:
 * - parentNodeId: Hierarchical parent (for tree structure)
 * - prerequisiteNodeIds: Nodes that should be mastered before this one
 * - relatedNodeIds: Related but not prerequisite nodes
 *
 * Depth Range:
 * - min/max: Cognitive depth slugs indicating expected question depth range
 * - Used for content planning and adaptive selection
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

export interface IDepthRange {
  min: string; // cognitive depth slug
  max: string; // cognitive depth slug
}

export interface IKnowledgeNode extends Document {
  departmentId: mongoose.Types.ObjectId;

  // Identity
  name: string;
  slug: string;
  description?: string;

  // Graph relationships
  parentNodeId?: mongoose.Types.ObjectId;
  prerequisiteNodeIds: mongoose.Types.ObjectId[];
  relatedNodeIds: mongoose.Types.ObjectId[];

  // Depth range for questions
  depthRange: IDepthRange;

  // Metadata
  tags: string[];
  isActive: boolean;

  // Audit
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const depthRangeSchema = new Schema<IDepthRange>(
  {
    min: {
      type: String,
      required: [true, 'Minimum depth is required'],
      lowercase: true,
      trim: true,
      default: 'exposure'
    },
    max: {
      type: String,
      required: [true, 'Maximum depth is required'],
      lowercase: true,
      trim: true,
      default: 'mastery'
    }
  },
  { _id: false }
);

const knowledgeNodeSchema = new Schema<IKnowledgeNode>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [200, 'Name must not exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      maxlength: [100, 'Slug must not exceed 100 characters'],
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters']
    },
    parentNodeId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      default: null,
      index: true
    },
    prerequisiteNodeIds: {
      type: [Schema.Types.ObjectId],
      ref: 'KnowledgeNode',
      default: [],
      index: true
    },
    relatedNodeIds: {
      type: [Schema.Types.ObjectId],
      ref: 'KnowledgeNode',
      default: []
    },
    depthRange: {
      type: depthRangeSchema,
      default: () => ({ min: 'exposure', max: 'mastery' })
    },
    tags: {
      type: [String],
      default: [],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updated by is required']
    }
  },
  {
    timestamps: true,
    collection: 'knowledgenodes'
  }
);

// Compound unique index: slug + departmentId
// Ensures unique slugs within each department
knowledgeNodeSchema.index({ departmentId: 1, slug: 1 }, { unique: true });

// Index for department queries with active filter
knowledgeNodeSchema.index({ departmentId: 1, isActive: 1 });

// Index for finding children of a parent
knowledgeNodeSchema.index({ parentNodeId: 1, isActive: 1 });

// Index for finding dependents (nodes that require a specific prerequisite)
knowledgeNodeSchema.index({ prerequisiteNodeIds: 1 });

// Index for tag-based queries
knowledgeNodeSchema.index({ departmentId: 1, tags: 1 });

// Text index for search
knowledgeNodeSchema.index({ name: 'text', description: 'text', tags: 'text' });

const KnowledgeNode = mongoose.model<IKnowledgeNode>('KnowledgeNode', knowledgeNodeSchema);

export default KnowledgeNode;
