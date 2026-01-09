import mongoose, { Schema, Document } from 'mongoose';

export interface IProgramLevel extends Document {
  programId: mongoose.Types.ObjectId;
  name: string;
  levelNumber: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const programLevelSchema = new Schema<IProgramLevel>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Level name is required'],
      trim: true,
      maxlength: [200, 'Level name cannot exceed 200 characters']
    },
    levelNumber: {
      type: Number,
      required: [true, 'Level number is required'],
      min: [1, 'Level number must be at least 1']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to ensure level number uniqueness within a program
programLevelSchema.index({ programId: 1, levelNumber: 1 }, { unique: true });
programLevelSchema.index({ programId: 1, isActive: 1 });

const ProgramLevel = mongoose.model<IProgramLevel>('ProgramLevel', programLevelSchema);

export default ProgramLevel;
