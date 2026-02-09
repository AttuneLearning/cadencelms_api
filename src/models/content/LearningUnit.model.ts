import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

export interface IGateConfig {
  masteryThreshold: number;   // 0-1, required mastery to pass gate
  minQuestions: number;        // Minimum questions in gate challenge
  maxRetries: number;          // Max retry attempts (-1 = unlimited)
  failStrategy: 'allow-continue' | 'hold' | 'inject-practice' | 'prescribe-review';
}

export interface ILearningUnitAdaptive {
  teachesNodes?: mongoose.Types.ObjectId[];   // Knowledge node IDs this LU teaches
  assessesNodes?: mongoose.Types.ObjectId[];  // Knowledge node IDs this LU assesses
  isGate?: boolean;                           // Whether this LU acts as a gate checkpoint
  isSkippable?: boolean;                      // Whether engine can skip if nodes already mastered
  gateConfig?: IGateConfig;
}

export interface ILearningUnit extends Document {
  moduleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;

  type: string;
  contentId?: mongoose.Types.ObjectId;

  // New fields from UI spec
  category: string;
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;

  sequence: number;
  availableFrom?: Date;
  availableUntil?: Date;
  isActive: boolean;

  settings?: {
    allowMultipleAttempts?: boolean;
    maxAttempts?: number | null;
    timeLimit?: number | null;
    showFeedback?: boolean;
    shuffleQuestions?: boolean;
    passingScore?: number;
  };

  adaptive?: ILearningUnitAdaptive;

  estimatedDuration?: number;

  metadata?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const learningUnitSchema = new Schema<ILearningUnit>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      index: true
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content'
    },
    category: {
      type: String,
      required: [true, 'Category is required']
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    isReplayable: {
      type: Boolean,
      default: false
    },
    weight: {
      type: Number,
      min: [0, 'Weight must be at least 0'],
      max: [100, 'Weight must not exceed 100'],
      default: 0
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence is required'],
      min: [1, 'Sequence must be at least 1']
    },
    availableFrom: {
      type: Date
    },
    availableUntil: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    settings: {
      allowMultipleAttempts: { type: Boolean },
      maxAttempts: { type: Number },
      timeLimit: { type: Number },
      showFeedback: { type: Boolean },
      shuffleQuestions: { type: Boolean },
      passingScore: { type: Number }
    },
    adaptive: {
      teachesNodes: {
        type: [Schema.Types.ObjectId],
        ref: 'KnowledgeNode',
        default: undefined
      },
      assessesNodes: {
        type: [Schema.Types.ObjectId],
        ref: 'KnowledgeNode',
        default: undefined
      },
      isGate: {
        type: Boolean,
        default: false
      },
      isSkippable: {
        type: Boolean,
        default: false
      },
      gateConfig: {
        masteryThreshold: {
          type: Number,
          min: [0, 'masteryThreshold must be at least 0'],
          max: [1, 'masteryThreshold cannot exceed 1'],
          default: 0.8
        },
        minQuestions: {
          type: Number,
          min: [1, 'minQuestions must be at least 1'],
          default: 3
        },
        maxRetries: {
          type: Number,
          min: [-1, 'maxRetries must be at least -1 (unlimited)'],
          default: -1
        },
        failStrategy: {
          type: String,
          enum: {
            values: ['allow-continue', 'hold', 'inject-practice', 'prescribe-review'],
            message: '{VALUE} is not a valid fail strategy'
          },
          default: 'hold'
        }
      }
    },
    estimatedDuration: {
      type: Number
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient querying
learningUnitSchema.index({ moduleId: 1, sequence: 1 });
learningUnitSchema.index({ moduleId: 1, category: 1 });

const LEARNING_UNIT_CATEGORY_LOOKUP = 'learning-unit-category';
const LEARNING_UNIT_TYPE_LOOKUP = 'learning-unit-type';

learningUnitSchema.pre('validate', async function(next) {
  try {
    if (this.category) {
      const isValid = await validateLookupValue(LEARNING_UNIT_CATEGORY_LOOKUP, this.category);
      if (!isValid) {
        throw new Error(
          `Invalid category: "${this.category}". Must be a registered learning-unit-category in LookupValue.`
        );
      }
    }
    if (this.type) {
      const isValid = await validateLookupValue(LEARNING_UNIT_TYPE_LOOKUP, this.type);
      if (!isValid) {
        throw new Error(
          `Invalid type: "${this.type}". Must be a registered learning-unit-type in LookupValue.`
        );
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

const LearningUnit = mongoose.model<ILearningUnit>('LearningUnit', learningUnitSchema);

export default LearningUnit;
