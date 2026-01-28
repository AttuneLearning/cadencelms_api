import mongoose, { Schema, Document } from 'mongoose';

/**
 * LearnerKnowledgeProgress Model
 *
 * Tracks a learner's progress through a knowledge node in the adaptive learning system.
 * Maintains per-depth statistics and mastery calculations.
 *
 * One record per learner per knowledge node.
 * Progress is tracked separately for each cognitive depth level.
 *
 * Mastery Calculation:
 * - masteryScore = (correctAttempts / totalAttempts) * 100
 * - Level advancement when: score >= threshold AND attempts >= minAttempts
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

/**
 * Progress for a single cognitive depth level
 */
export interface IDepthProgress {
  attempts: number;
  correct: number;
  mastered: boolean;
  masteredAt?: Date;
  lastAttemptAt?: Date;
}

export interface ILearnerKnowledgeProgress extends Document {
  learnerId: mongoose.Types.ObjectId;
  knowledgeNodeId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;

  // Current state
  currentDepth: string; // slug of current cognitive depth level
  masteryScore: number; // 0-100 overall mastery percentage

  // Aggregate statistics
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt?: Date;
  lastCorrectAt?: Date;

  // Per-depth level progress (keyed by depth slug)
  depthProgress: Map<string, IDepthProgress>;

  // Flags
  isComplete: boolean; // true when highest depth level is mastered
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const DepthProgressSchema = new Schema<IDepthProgress>(
  {
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    correct: {
      type: Number,
      default: 0,
      min: 0
    },
    mastered: {
      type: Boolean,
      default: false
    },
    masteredAt: {
      type: Date
    },
    lastAttemptAt: {
      type: Date
    }
  },
  { _id: false }
);

const learnerKnowledgeProgressSchema = new Schema<ILearnerKnowledgeProgress>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner ID is required'],
      index: true
    },
    knowledgeNodeId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      required: [true, 'Knowledge node ID is required'],
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true
    },
    currentDepth: {
      type: String,
      required: [true, 'Current depth is required'],
      lowercase: true,
      trim: true,
      default: 'exposure'
    },
    masteryScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    correctAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAttemptAt: {
      type: Date
    },
    lastCorrectAt: {
      type: Date
    },
    depthProgress: {
      type: Map,
      of: DepthProgressSchema,
      default: () => new Map()
    },
    isComplete: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'learnerknowledgeprogress'
  }
);

// Compound unique index: one progress record per learner per node
learnerKnowledgeProgressSchema.index(
  { learnerId: 1, knowledgeNodeId: 1 },
  { unique: true }
);

// Index for querying learner progress in a department
learnerKnowledgeProgressSchema.index({ learnerId: 1, departmentId: 1 });

// Index for finding all learners' progress on a specific node
learnerKnowledgeProgressSchema.index({ knowledgeNodeId: 1, isActive: 1 });

// Index for finding progress by current depth (for analytics)
learnerKnowledgeProgressSchema.index({ departmentId: 1, currentDepth: 1 });

// Index for mastery score analytics
learnerKnowledgeProgressSchema.index({ departmentId: 1, masteryScore: 1 });

// Index for completion queries
learnerKnowledgeProgressSchema.index({ learnerId: 1, isComplete: 1 });

// Index for recent activity
learnerKnowledgeProgressSchema.index({ lastAttemptAt: -1 });

const LearnerKnowledgeProgress = mongoose.model<ILearnerKnowledgeProgress>(
  'LearnerKnowledgeProgress',
  learnerKnowledgeProgressSchema
);

export default LearnerKnowledgeProgress;
