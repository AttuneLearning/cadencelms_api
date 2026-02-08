import mongoose, { Schema, Document } from 'mongoose';

/**
 * Matching Session Model
 *
 * Tracks active matching exercise sessions. Stores the shuffled order
 * of Column B so grading can be consistent even if the session spans
 * multiple requests.
 *
 * Sessions expire after a configurable time (TTL index) and are cleaned
 * up automatically by MongoDB.
 */

export type MatchingSessionStatus = 'active' | 'completed' | 'expired' | 'abandoned';

/**
 * Column item in the session (tracks both columns)
 */
export interface IMatchingColumnItem {
  questionId: mongoose.Types.ObjectId;
  text: string;
  media?: {
    mediaId?: mongoose.Types.ObjectId;
    url?: string;
    altText?: string;
  };
}

export interface IMatchingSession extends Document {
  exerciseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  status: MatchingSessionStatus;

  // Column data (stored to ensure consistent grading)
  columnA: IMatchingColumnItem[];
  columnB: IMatchingColumnItem[];

  // Shuffle tracking
  shuffleOrder: mongoose.Types.ObjectId[]; // Order of columnB questionIds after shuffle

  // Timing
  startedAt: Date;
  expiresAt: Date;
  completedAt?: Date;

  // Attempt tracking
  attemptNumber: number;

  createdAt: Date;
  updatedAt: Date;
}

const MatchingColumnItemSchema = new Schema<IMatchingColumnItem>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question'
    },
    text: {
      type: String,
      required: true
    },
    media: {
      mediaId: { type: Schema.Types.ObjectId, ref: 'MediaAttachment' },
      url: { type: String },
      altText: { type: String }
    }
  },
  { _id: false }
);

const MatchingSessionSchema = new Schema<IMatchingSession>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'exerciseId is required'],
      ref: 'Exercise',
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['active', 'completed', 'expired', 'abandoned'],
        message: '{VALUE} is not a valid session status'
      },
      default: 'active',
      index: true
    },
    columnA: {
      type: [MatchingColumnItemSchema],
      required: true
    },
    columnB: {
      type: [MatchingColumnItemSchema],
      required: true
    },
    shuffleOrder: {
      type: [Schema.Types.ObjectId],
      required: true,
      ref: 'Question'
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: [1, 'attemptNumber must be at least 1'],
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
MatchingSessionSchema.index({ exerciseId: 1, learnerId: 1, status: 1 });
MatchingSessionSchema.index({ learnerId: 1, status: 1, createdAt: -1 });

// TTL index to automatically remove expired sessions after 24 hours past expiration
// Note: MongoDB TTL indexes run approximately every 60 seconds
MatchingSessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 86400 // 24 hours after expiresAt
  }
);

export default mongoose.model<IMatchingSession>('MatchingSession', MatchingSessionSchema);
