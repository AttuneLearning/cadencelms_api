import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'login_failed'
  | 'enroll' | 'withdraw' | 'complete'
  | 'grade' | 'publish' | 'unpublish'
  | 'archive' | 'restore'
  | 'upload' | 'download' | 'export'
  | 'permission_change' | 'role_change'
  | 'password_reset' | 'password_change'
  | 'start_content' | 'complete_content'
  | 'submit_assessment' | 'grade_assessment';

export type AuditEntityType =
  | 'user' | 'staff' | 'learner'
  | 'course' | 'class' | 'program'
  | 'enrollment' | 'class-enrollment'
  | 'content' | 'scorm' | 'exercise'
  | 'assessment' | 'exam-result'
  | 'department' | 'academic-year'
  | 'setting' | 'permission';

export interface IAuditLog extends Document {
  timestamp: Date;
  userId: mongoose.Types.ObjectId | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: mongoose.Types.ObjectId | null;
  entityName: string | null;
  description: string;
  success: boolean;
  statusCode: number | null;
  ipAddress: string;
  userAgent: string;
  sessionId: string | null;
  departmentId: mongoose.Types.ObjectId | null;
  departmentName: string | null;
  request: {
    method: string;
    path: string;
    query: any;
    body: any;
    headers?: any;
  };
  changes: {
    before: any;
    after: any;
  };
  metadata: any;
  errorMessage: string | null;
  errorStack: string | null;
  geo: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  } | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    userName: {
      type: String,
      default: null
    },
    userEmail: {
      type: String,
      default: null
    },
    userRole: {
      type: String,
      default: null
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create', 'read', 'update', 'delete',
        'login', 'logout', 'login_failed',
        'enroll', 'withdraw', 'complete',
        'grade', 'publish', 'unpublish',
        'archive', 'restore',
        'upload', 'download', 'export',
        'permission_change', 'role_change',
        'password_reset', 'password_change',
        'start_content', 'complete_content',
        'submit_assessment', 'grade_assessment'
      ],
      index: true
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'user', 'staff', 'learner',
        'course', 'class', 'program',
        'enrollment', 'class-enrollment',
        'content', 'scorm', 'exercise',
        'assessment', 'exam-result',
        'department', 'academic-year',
        'setting', 'permission'
      ],
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true
    },
    entityName: {
      type: String,
      default: null
    },
    description: {
      type: String,
      required: true
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    statusCode: {
      type: Number,
      default: null
    },
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      required: true
    },
    sessionId: {
      type: String,
      default: null,
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
    },
    departmentName: {
      type: String,
      default: null
    },
    request: {
      method: {
        type: String,
        required: true,
        uppercase: true
      },
      path: {
        type: String,
        required: true
      },
      query: {
        type: Schema.Types.Mixed,
        default: null
      },
      body: {
        type: Schema.Types.Mixed,
        default: null
      },
      headers: {
        type: Schema.Types.Mixed,
        default: null
      }
    },
    changes: {
      before: {
        type: Schema.Types.Mixed,
        default: null
      },
      after: {
        type: Schema.Types.Mixed,
        default: null
      }
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    errorStack: {
      type: String,
      default: null
    },
    geo: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_logs'
  }
);

// Compound indexes for efficient audit log queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ departmentId: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
