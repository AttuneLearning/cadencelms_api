import mongoose, { Schema, Document } from 'mongoose';

export type CompletionCriteriaType = 'all_required' | 'percentage' | 'gate_learning_unit' | 'points';
export type PresentationMode = 'prescribed' | 'learner_choice' | 'random';
export type RepetitionMode = 'none' | 'until_passed' | 'until_mastery' | 'spaced';
export type LearningUnitCategory = 'exposition' | 'practice' | 'assessment';

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
  courseId: mongoose.Types.ObjectId;
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
      enum: ['exposition', 'practice', 'assessment'],
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
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required']
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

// Index for listing modules by course
moduleSchema.index({ courseId: 1 });

// Compound index for ordered listing within a course
moduleSchema.index({ courseId: 1, order: 1 });

// Index for filtering published modules
moduleSchema.index({ isPublished: 1 });

const Module = mongoose.model<IModule>('Module', moduleSchema);

export default Module;
