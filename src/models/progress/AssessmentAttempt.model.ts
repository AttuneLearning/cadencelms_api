import mongoose, { Schema, Document } from 'mongoose';

export type AssessmentAttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'abandoned';

export interface IQuestionAttempt {
  questionId: mongoose.Types.ObjectId;
  questionSnapshot: any;
  response?: any;
  isCorrect?: boolean;
  pointsEarned?: number;
  pointsPossible: number;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
  feedback?: string;
}

export interface IAttemptTiming {
  startedAt: Date;
  lastActivityAt: Date;
  submittedAt?: Date;
  timeSpentSeconds: number;
  timeLimitSeconds?: number;
}

export interface IAttemptScoring {
  rawScore?: number;
  percentageScore?: number;
  passed?: boolean;
  gradingComplete: boolean;
  requiresManualGrading: boolean;
}

export interface IAssessmentAttempt extends Document {
  assessmentId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  learningUnitId?: mongoose.Types.ObjectId;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  questions: IQuestionAttempt[];

  timing: IAttemptTiming;

  scoring: IAttemptScoring;

  createdAt: Date;
  updatedAt: Date;
}

const questionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required']
    },
    questionSnapshot: {
      type: Schema.Types.Mixed,
      required: [true, 'Question snapshot is required']
    },
    response: {
      type: Schema.Types.Mixed
    },
    isCorrect: {
      type: Boolean
    },
    pointsEarned: {
      type: Number,
      min: [0, 'Points earned cannot be negative']
    },
    pointsPossible: {
      type: Number,
      required: [true, 'Points possible is required'],
      min: [0, 'Points possible cannot be negative']
    },
    gradedAt: {
      type: Date
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    feedback: {
      type: String
    }
  },
  { _id: false }
);

const attemptTimingSchema = new Schema<IAttemptTiming>(
  {
    startedAt: {
      type: Date,
      required: [true, 'Started at is required']
    },
    lastActivityAt: {
      type: Date,
      required: [true, 'Last activity at is required']
    },
    submittedAt: {
      type: Date
    },
    timeSpentSeconds: {
      type: Number,
      required: [true, 'Time spent seconds is required'],
      min: [0, 'Time spent cannot be negative'],
      default: 0
    },
    timeLimitSeconds: {
      type: Number,
      min: [0, 'Time limit cannot be negative']
    }
  },
  { _id: false }
);

const attemptScoringSchema = new Schema<IAttemptScoring>(
  {
    rawScore: {
      type: Number,
      min: [0, 'Raw score cannot be negative']
    },
    percentageScore: {
      type: Number,
      min: [0, 'Percentage score cannot be less than 0'],
      max: [100, 'Percentage score cannot exceed 100']
    },
    passed: {
      type: Boolean
    },
    gradingComplete: {
      type: Boolean,
      required: [true, 'Grading complete is required']
    },
    requiresManualGrading: {
      type: Boolean,
      required: [true, 'Requires manual grading is required']
    }
  },
  { _id: false }
);

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>(
  {
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID is required']
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner ID is required']
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required']
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module'
    },
    learningUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'LearningUnit'
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: [1, 'Attempt number must be at least 1']
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['in_progress', 'submitted', 'graded', 'abandoned'],
        message: '{VALUE} is not a valid assessment attempt status'
      }
    },
    questions: {
      type: [questionAttemptSchema],
      default: []
    },
    timing: {
      type: attemptTimingSchema,
      required: [true, 'Timing is required']
    },
    scoring: {
      type: attemptScoringSchema,
      required: [true, 'Scoring is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
assessmentAttemptSchema.index({ assessmentId: 1, learnerId: 1, attemptNumber: 1 });
assessmentAttemptSchema.index({ learnerId: 1, status: 1 });
assessmentAttemptSchema.index({ assessmentId: 1, status: 1 });
assessmentAttemptSchema.index({ enrollmentId: 1 });

const AssessmentAttempt = mongoose.model<IAssessmentAttempt>(
  'AssessmentAttempt',
  assessmentAttemptSchema
);

export default AssessmentAttempt;
