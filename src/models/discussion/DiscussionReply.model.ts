import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscussionReply extends Document {
  threadId: mongoose.Types.ObjectId;
  parentReplyId: mongoose.Types.ObjectId | null;
  authorId: mongoose.Types.ObjectId;
  authorType: 'learner' | 'staff';
  body: string;
  isInstructorAnswer: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const discussionReplySchema = new Schema<IDiscussionReply>(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'DiscussionThread',
      required: [true, 'Thread ID is required']
    },
    parentReplyId: {
      type: Schema.Types.ObjectId,
      ref: 'DiscussionReply',
      default: null
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
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [10000, 'Body cannot exceed 10000 characters']
    },
    isInstructorAnswer: {
      type: Boolean,
      default: false
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

// Reply listing (chronological)
discussionReplySchema.index({ threadId: 1, isDeleted: 1, createdAt: 1 });
// Nested reply lookups
discussionReplySchema.index({ parentReplyId: 1, isDeleted: 1 });
// Instructor answer lookup
discussionReplySchema.index({ threadId: 1, isInstructorAnswer: 1, isDeleted: 1 });

const DiscussionReply = mongoose.model<IDiscussionReply>('DiscussionReply', discussionReplySchema);

export default DiscussionReply;
