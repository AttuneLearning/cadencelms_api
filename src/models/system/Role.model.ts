import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: 'built-in' | 'custom';
  level: number;
  permissions: string[];
  departmentId?: mongoose.Types.ObjectId;
  inheritsFrom?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    type: {
      type: String,
      required: true,
      enum: ['built-in', 'custom'],
      default: 'custom',
    },
    level: {
      type: Number,
      required: true,
      min: 10,
      max: 100,
      index: true,
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    inheritsFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for name-department combination (name is unique globally for built-in, or per department for custom)
roleSchema.index({ name: 1, departmentId: 1 }, { unique: true });

// Index for type and isActive for efficient filtering
roleSchema.index({ type: 1, isActive: 1 });

const Role = mongoose.model<IRole>('Role', roleSchema);

export default Role;
