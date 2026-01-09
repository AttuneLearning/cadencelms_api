import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemHealth extends Document {
  maintenanceMode: boolean;
  message?: string;
  allowedIPs: string[];
  scheduledEnd?: Date;
  enabledAt?: Date;
  enabledBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemHealthSchema = new Schema<ISystemHealth>(
  {
    maintenanceMode: {
      type: Boolean,
      required: true,
      default: false,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    allowedIPs: {
      type: [String],
      default: [],
    },
    scheduledEnd: {
      type: Date,
    },
    enabledAt: {
      type: Date,
    },
    enabledBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
  },
  {
    timestamps: true,
  }
);

const SystemHealth = mongoose.model<ISystemHealth>('SystemHealth', systemHealthSchema);

export default SystemHealth;
