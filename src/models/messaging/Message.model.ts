import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'direct' | 'announcement' | 'reminder' | 'system';
export type MessageStatus = 'unread' | 'read' | 'archived';

export interface IRelatedEntity {
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityName?: string;
}

export interface IMessage extends Document {
  type: MessageType;
  subject: string;
  body: string;
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: MessageStatus;
  isImportant: boolean;
  relatedEntity?: IRelatedEntity;
  readAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const relatedEntitySchema = new Schema({
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityName: { type: String }
}, { _id: false });

const messageSchema = new Schema<IMessage>({
  type: {
    type: String,
    required: true,
    enum: ['direct', 'announcement', 'reminder', 'system'],
    default: 'direct'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  body: {
    type: String,
    required: true,
    maxlength: 10000
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  relatedEntity: relatedEntitySchema,
  readAt: { type: Date },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
messageSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, type: 1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);
export default Message;
