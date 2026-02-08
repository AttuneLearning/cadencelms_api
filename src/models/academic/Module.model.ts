import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

export type CompletionCriteriaType = 'all_required' | 'percentage' | 'gate_learning_unit' | 'points';
export type PresentationMode = 'prescribed' | 'learner_choice' | 'random';
export type RepetitionMode = 'none' | 'until_passed' | 'until_mastery' | 'spaced';
export type LearningUnitCategory = string;

export interface ICompletionCriteria {
  type: CompletionCriteriaType;
  percentageRequired?: number;
  pointsRequired?: number;
  gateLearningUnitScore?: number;
  requireAllExpositions?: boolean;
}

export interface IRepeatOn {
  failedAttempt: boolean;
  belowMastery: boolean;
  learnerRequest: boolean;
}

export interface IPresentationRules {
  presentationMode: PresentationMode;
  prescribedOrder?: mongoose.Types.ObjectId[];
  repetitionMode: RepetitionMode;
  masteryThreshold?: number;
  maxRepetitions?: number | null;
  cooldownBetweenRepetitions?: number;
  repeatOn: IRepeatOn;
  repeatableCategories: LearningUnitCategory[];
  showAllAvailable: boolean;
  allowSkip: boolean;
}

export interface IModule extends Document {
  ownerDepartmentId: mongoose.Types.ObjectId;
  isShared: boolean;
  title: string;
  description?: string;
  prerequisites: mongoose.Types.ObjectId[];
  completionCriteria: ICompletionCriteria;
  gateLearningUnitId?: mongoose.Types.ObjectId;
  presentationRules: IPresentationRules;
  isPublished: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  estimatedDuration: number;
  objectives?: string[];
  order: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const repeatOnSchema = new Schema<IRepeatOn>(
  {
    failedAttempt: {
      type: Boolean,
      required: true
    },
    belowMastery: {
      type: Boolean,
      required: true
    },
    learnerRequest: {
      type: Boolean,
      required: true
    }
  },
  { _id: false }
);

const presentationRulesSchema = new Schema<IPresentationRules>(
  {
    presentationMode: {
      type: String,
      enum: ['prescribed', 'learner_choice', 'random'],
      required: true
    },
    prescribedOrder: {
      type: [Schema.Types.ObjectId],
      ref: 'LearningUnit',
      default: undefined
    },
    repetitionMode: {
      type: String,
      enum: ['none', 'until_passed', 'until_mastery', 'spaced'],
      required: true
    },
    masteryThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: undefined
    },
    maxRepetitions: {
      type: Number,
      min: 0,
      default: undefined
    },
    cooldownBetweenRepetitions: {
      type: Number,
      min: 0,
      default: undefined
    },
    repeatOn: {
      type: repeatOnSchema,
      required: true
    },
    repeatableCategories: {
      type: [String],
      required: true
    },
    showAllAvailable: {
      type: Boolean,
      required: true
    },
    allowSkip: {
      type: Boolean,
      required: true
    }
  },
  { _id: false }
);

const completionCriteriaSchema = new Schema<ICompletionCriteria>(
  {
    type: {
      type: String,
      enum: ['all_required', 'percentage', 'gate_learning_unit', 'points'],
      required: true
    },
    percentageRequired: {
      type: Number,
      min: 0,
      max: 100,
      default: undefined
    },
    pointsRequired: {
      type: Number,
      min: 0,
      default: undefined
    },
    gateLearningUnitScore: {
      type: Number,
      min: 0,
      max: 100,
      default: undefined
    },
    requireAllExpositions: {
      type: Boolean,
      default: undefined
    }
  },
  { _id: false }
);

const moduleSchema = new Schema<IModule>(
  {
    ownerDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Owner department ID is required']
    },
    isShared: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: [200, 'Module title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: undefined
    },
    prerequisites: {
      type: [Schema.Types.ObjectId],
      ref: 'Module',
      default: []
    },
    completionCriteria: {
      type: completionCriteriaSchema,
      required: true
    },
    gateLearningUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'LearningUnit',
      default: undefined
    },
    presentationRules: {
      type: presentationRulesSchema,
      required: true
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    availableFrom: {
      type: Date,
      default: undefined
    },
    availableUntil: {
      type: Date,
      default: undefined
    },
    estimatedDuration: {
      type: Number,
      min: 0,
      default: 0
    },
    objectives: {
      type: [String],
      default: undefined
    },
    order: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy is required']
    }
  },
  {
    timestamps: true
  }
);

// Index for listing modules by owner department
moduleSchema.index({ ownerDepartmentId: 1 });

// Index for finding shared modules
moduleSchema.index({ isShared: 1 });

// Compound index for department modules with sharing status
moduleSchema.index({ ownerDepartmentId: 1, isShared: 1 });

// Index for filtering published modules
moduleSchema.index({ isPublished: 1 });

const LEARNING_UNIT_CATEGORY_LOOKUP = 'learning-unit-category';

moduleSchema.pre('validate', async function(next) {
  try {
    const categories = this.presentationRules?.repeatableCategories || [];
    for (const category of categories) {
      const isValid = await validateLookupValue(LEARNING_UNIT_CATEGORY_LOOKUP, category);
      if (!isValid) {
        throw new Error(
          `Invalid repeatableCategory: "${category}". Must be a registered learning-unit-category in LookupValue.`
        );
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

const Module = mongoose.model<IModule>('Module', moduleSchema);

export default Module;
