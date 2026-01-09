/**
 * Domain Types - Shared between Backend and UI
 * Version: 1.0.0
 * 
 * These types represent the core domain entities in the LMS.
 */

// ============================================================================
// Base Types
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// User & Authentication
// ============================================================================

export type UserRole = 'learner' | 'staff';

export type DashboardType = 
  | 'learner'
  | 'instructor'
  | 'content-admin'
  | 'department-admin'
  | 'system-admin';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
}

export interface Staff extends User {
  role: 'staff';
  staffRoles: StaffRole[];
  defaultDashboard: DashboardType;
  departmentIds: string[];
  permissions: string[];
}

export interface Learner extends User {
  role: 'learner';
  enrollmentIds: string[];
  programEnrollmentIds: string[];
}

export interface StaffRole {
  roleType: 'instructor' | 'content-admin' | 'department-admin' | 'system-admin';
  departmentIds: string[];
}

// ============================================================================
// Organization
// ============================================================================

export interface Department extends AuditableEntity {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  isMaster: boolean;
}

export interface AcademicYear extends AuditableEntity {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isCurrent: boolean;
  terms: Term[];
}

export interface Term {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// ============================================================================
// Courses & Content
// ============================================================================

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseType = 'online' | 'classroom' | 'blended';
export type ContentType = 'video' | 'document' | 'scorm' | 'quiz' | 'assignment' | 'html';

export interface Course extends AuditableEntity {
  title: string;
  code: string;
  description?: string;
  departmentIds: string[];
  status: CourseStatus;
  courseType: CourseType;
  creditHours?: number;
  estimatedDuration?: number; // in minutes
  thumbnailUrl?: string;
  isActive: boolean;
  tags: string[];
}

export interface Content extends AuditableEntity {
  courseId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  sequenceOrder: number;
  url?: string;
  duration?: number; // in minutes
  isRequired: boolean;
  isActive: boolean;
}

export interface CourseSegment extends AuditableEntity {
  courseId: string;
  title: string;
  description?: string;
  sequenceOrder: number;
  contentIds: string[];
  isRequired: boolean;
}

// ============================================================================
// Programs
// ============================================================================

export type ProgramType = 'certificate' | 'degree' | 'training' | 'compliance';
export type ProgramStatus = 'draft' | 'active' | 'archived';

export interface Program extends AuditableEntity {
  title: string;
  code: string;
  description?: string;
  programType: ProgramType;
  status: ProgramStatus;
  departmentIds: string[];
  courseIds: string[];
  totalCredits?: number;
  estimatedDuration?: number; // in weeks
  isActive: boolean;
}

// ============================================================================
// Classes
// ============================================================================

export type ClassStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type DeliveryMethod = 'online' | 'classroom' | 'virtual' | 'hybrid';

export interface Class extends AuditableEntity {
  courseId: string;
  termId: string;
  title: string;
  status: ClassStatus;
  deliveryMethod: DeliveryMethod;
  instructorIds: string[];
  startDate: Date;
  endDate: Date;
  enrollmentLimit?: number;
  currentEnrollment: number;
  location?: string;
  meetingUrl?: string;
}

// ============================================================================
// Enrollments
// ============================================================================

export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'withdrawn' | 'failed';

export interface Enrollment extends AuditableEntity {
  learnerId: string;
  classId?: string;
  courseId: string;
  status: EnrollmentStatus;
  enrollmentDate: Date;
  completionDate?: Date;
  progress: number; // 0-100
  grade?: number;
  certificateId?: string;
}

export interface ProgramEnrollment extends AuditableEntity {
  learnerId: string;
  programId: string;
  status: EnrollmentStatus;
  enrollmentDate: Date;
  completionDate?: Date;
  progress: number; // 0-100
  courseEnrollmentIds: string[];
}

// ============================================================================
// Assessments
// ============================================================================

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';

export interface Exam extends AuditableEntity {
  courseId: string;
  title: string;
  description?: string;
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  maxAttempts?: number;
  isRandomized: boolean;
  isActive: boolean;
}

export interface Question extends AuditableEntity {
  examId: string;
  questionText: string;
  questionType: QuestionType;
  points: number;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  sequenceOrder: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ExamAttempt extends BaseEntity {
  examId: string;
  learnerId: string;
  enrollmentId: string;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  passed?: boolean;
  answers: AttemptAnswer[];
}

export interface AttemptAnswer {
  questionId: string;
  selectedOption?: string;
  textAnswer?: string;
  isCorrect?: boolean;
  points: number;
}

// ============================================================================
// Activity Tracking
// ============================================================================

export type ActivityType = 'view' | 'start' | 'progress' | 'complete' | 'submit';
export type ActivityStatus = 'not-started' | 'in-progress' | 'completed';

export interface ContentAttempt extends BaseEntity {
  contentId: string;
  learnerId: string;
  enrollmentId: string;
  status: ActivityStatus;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // in seconds
  progress: number; // 0-100
  score?: number;
}

export interface LearningEvent extends BaseEntity {
  learnerId: string;
  enrollmentId?: string;
  contentId?: string;
  eventType: ActivityType;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// SCORM
// ============================================================================

export type ScormVersion = '1.2' | '2004';
export type ScormStatus = 'not attempted' | 'incomplete' | 'completed' | 'passed' | 'failed';

export interface ScormAttempt extends BaseEntity {
  contentId: string;
  learnerId: string;
  enrollmentId: string;
  scormVersion: ScormVersion;
  status: ScormStatus;
  score?: number;
  totalTime?: string;
  suspendData?: string;
  cmiData?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// System
// ============================================================================

export interface SystemSetting extends BaseEntity {
  key: string;
  value: unknown;
  category: string;
  description?: string;
  isPublic: boolean;
}

export interface AuditLog extends BaseEntity {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
