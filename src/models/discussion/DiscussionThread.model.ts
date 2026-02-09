import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscussionThread extends Document {
  courseId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorType: 'learner' | 'staff';
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastReplyAt: Date | null;
  lastReplyBy: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const discussionThreadSchema = new Schema<IDiscussionThread>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required']
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module'
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'LearningUnit'
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required']
    },
    authorType: {
      type: String,
      required: [true, 'Author type is required'],
      enum: {
        values: ['learner', 'staff'],
        message: '{VALUE} is not a valid author type'
      }
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters']
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [10000, 'Body cannot exceed 10000 characters']
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    replyCount: {
      type: Number,
      default: 0,
      min: [0, 'Reply count cannot be negative']
    },
    lastReplyAt: {
      type: Date,
      default: null
    },
    lastReplyBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Primary listing: pinned first, then by last reply
discussionThreadSchema.index({ courseId: 1, isDeleted: 1, isPinned: -1, lastReplyAt: -1 });
// Module-scoped listings
discussionThreadSchema.index({ courseId: 1, moduleId: 1, isDeleted: 1 });
// Own-thread lookups
discussionThreadSchema.index({ authorId: 1, isDeleted: 1 });
// Text search
discussionThreadSchema.index({ title: 'text', body: 'text' });

const DiscussionThread = mongoose.model<IDiscussionThread>('DiscussionThread', discussionThreadSchema);

export default DiscussionThread;
