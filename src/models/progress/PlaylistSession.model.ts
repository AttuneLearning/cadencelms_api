import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylistSession extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  session: Record<string, any>;
  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const playlistSessionSchema = new Schema<IPlaylistSession>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required'],
      index: true
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Learner is required'],
      index: true
    },
    session: {
      type: Schema.Types.Mixed,
      required: [true, 'Session data is required']
    },
    savedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// One session per enrollment + module
playlistSessionSchema.index({ enrollmentId: 1, moduleId: 1 }, { unique: true });
playlistSessionSchema.index({ learnerId: 1, enrollmentId: 1 });

const PlaylistSession = mongoose.model<IPlaylistSession>('PlaylistSession', playlistSessionSchema);

export default PlaylistSession;
