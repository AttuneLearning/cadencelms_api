import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

export interface ILearningEvent extends Document {
  learnerId: mongoose.Types.ObjectId;
  eventType: string;
  contentId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;

  // Denormalized fields for efficient aggregation
  courseId?: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  contentType?: 'scorm' | 'video' | 'document' | 'quiz' | 'assignment' | 'text' | 'html' | 'other';

  timestamp: Date;
  data?: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  score?: number;
  metadata?: Record<string, any>;

  // Date aggregation fields for efficient reporting
  eventDate?: Date;
  eventWeek?: string;
  eventMonth?: string;

  createdAt: Date;
  updatedAt: Date;

  // Helper method for ISO week calculation
  getISOWeek(date: Date): string;
}

const LearningEventSchema = new Schema<ILearningEvent>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      // Note: Validation done via pre-save hook against LookupValue table
      // This allows runtime extensibility of event types without code changes
      index: true
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      index: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassEnrollment',
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true
    },
    contentType: {
      type: String,
      enum: ['scorm', 'video', 'document', 'quiz', 'assignment', 'text', 'html', 'other']
    },
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
      index: true
    },
    data: {
      type: Schema.Types.Mixed
    },
    sessionId: {
      type: String,
      trim: true,
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    duration: {
      type: Number,
      min: [0, 'duration cannot be negative']
    },
    score: {
      type: Number,
      min: [0, 'score cannot be negative'],
      max: [100, 'score cannot exceed 100']
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    eventDate: {
      type: Date,
      index: true
    },
    eventWeek: {
      type: String,
      index: true
    },
    eventMonth: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
LearningEventSchema.index({ learnerId: 1, timestamp: -1 });
LearningEventSchema.index({ contentId: 1, eventType: 1, timestamp: -1 });
LearningEventSchema.index({ classId: 1, timestamp: -1 });
LearningEventSchema.index({ eventType: 1, timestamp: -1 });

// New indexes for reporting queries
LearningEventSchema.index({ departmentId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ courseId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ classId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ learnerId: 1, courseId: 1, eventType: 1 });
LearningEventSchema.index({ eventMonth: 1, eventType: 1, departmentId: 1 });
LearningEventSchema.index({ eventWeek: 1, eventType: 1, departmentId: 1 });

/**
 * Helper method: Calculate ISO week number
 *
 * @param date - Date to calculate week for
 * @returns ISO week string in format 'YYYY-WNN'
 */
LearningEventSchema.methods.getISOWeek = function (date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

/**
 * Pre-save validation hook
 *
 * Validates that eventType exists as an active LookupValue in the 'activity-event' category.
 * This ensures only registered event types can be stored, while maintaining runtime extensibility.
 *
 * @throws Error if eventType is not a valid activity-event in LookupValue
 */
LearningEventSchema.pre('save', async function (next) {
  // Only validate eventType if it's been modified
  if (!this.isModified('eventType')) {
    return next();
  }

  try {
    const isValid = await validateLookupValue('activity-event', this.eventType);

    if (!isValid) {
      throw new Error(
        `Invalid eventType: "${this.eventType}". Must be a registered activity-event in LookupValue. ` +
        `Please add this event type via the LookupValue API or seed script.`
      );
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Pre-save denormalization hook
 *
 * Populates denormalized fields for efficient aggregation queries:
 * - Sets date aggregation fields (eventDate, eventWeek, eventMonth)
 *
 * Note: courseId, departmentId, enrollmentId should be provided at creation time
 * for best performance. This hook is a fallback for cases where they're missing.
 */
LearningEventSchema.pre('save', function (next) {
  try {
    // Set date aggregation fields
    const date = this.timestamp || this.createdAt || new Date();

    // eventDate: Date at midnight UTC
    this.eventDate = new Date(date.toISOString().split('T')[0]);

    // eventWeek: ISO week format (YYYY-WNN)
    this.eventWeek = this.getISOWeek(date);

    // eventMonth: YYYY-MM format
    this.eventMonth = date.toISOString().slice(0, 7);

    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model<ILearningEvent>('LearningEvent', LearningEventSchema);
