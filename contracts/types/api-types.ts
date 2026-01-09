/**
 * API Types - Request/Response structures
 * Version: 1.0.0
 * 
 * These types define the structure of API requests and responses.
 */

// ============================================================================
// Generic API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'learner' | 'staff';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'learner' | 'staff';
  defaultDashboard?: string;
  permissions?: string[];
  departmentIds?: string[];
  lastLogin?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'learner' | 'staff';
  departmentIds?: string[];
  staffRoles?: StaffRoleInput[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
  departmentIds?: string[];
  staffRoles?: StaffRoleInput[];
}

export interface StaffRoleInput {
  roleType: 'instructor' | 'content-admin' | 'department-admin' | 'system-admin';
  departmentIds: string[];
}

// ============================================================================
// Course Types
// ============================================================================

export interface CreateCourseRequest {
  title: string;
  code: string;
  description?: string;
  departmentIds: string[];
  courseType: 'online' | 'classroom' | 'blended';
  creditHours?: number;
  estimatedDuration?: number;
  tags?: string[];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  departmentIds?: string[];
  courseType?: 'online' | 'classroom' | 'blended';
  status?: 'draft' | 'published' | 'archived';
  creditHours?: number;
  estimatedDuration?: number;
  tags?: string[];
  isActive?: boolean;
}

export interface CourseFilterParams extends PaginationParams {
  departmentId?: string;
  status?: 'draft' | 'published' | 'archived';
  courseType?: 'online' | 'classroom' | 'blended';
  search?: string;
  tags?: string[];
}

// ============================================================================
// Content Types
// ============================================================================

export interface CreateContentRequest {
  courseId: string;
  title: string;
  description?: string;
  contentType: 'video' | 'document' | 'scorm' | 'quiz' | 'assignment' | 'html';
  sequenceOrder: number;
  url?: string;
  duration?: number;
  isRequired?: boolean;
}

export interface UpdateContentRequest {
  title?: string;
  description?: string;
  sequenceOrder?: number;
  url?: string;
  duration?: number;
  isRequired?: boolean;
  isActive?: boolean;
}

// ============================================================================
// Enrollment Types
// ============================================================================

export interface CreateEnrollmentRequest {
  learnerId: string;
  courseId: string;
  classId?: string;
}

export interface UpdateEnrollmentRequest {
  status?: 'pending' | 'active' | 'completed' | 'withdrawn' | 'failed';
  progress?: number;
  grade?: number;
}

export interface EnrollmentFilterParams extends PaginationParams {
  learnerId?: string;
  courseId?: string;
  classId?: string;
  status?: 'pending' | 'active' | 'completed' | 'withdrawn' | 'failed';
}

export interface BulkEnrollmentRequest {
  learnerIds: string[];
  courseId: string;
  classId?: string;
}

// ============================================================================
// Program Types
// ============================================================================

export interface CreateProgramRequest {
  title: string;
  code: string;
  description?: string;
  programType: 'certificate' | 'degree' | 'training' | 'compliance';
  departmentIds: string[];
  courseIds: string[];
  totalCredits?: number;
  estimatedDuration?: number;
}

export interface UpdateProgramRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  departmentIds?: string[];
  courseIds?: string[];
  totalCredits?: number;
  estimatedDuration?: number;
  isActive?: boolean;
}

// ============================================================================
// Class Types
// ============================================================================

export interface CreateClassRequest {
  courseId: string;
  termId: string;
  title: string;
  deliveryMethod: 'online' | 'classroom' | 'virtual' | 'hybrid';
  instructorIds: string[];
  startDate: string;
  endDate: string;
  enrollmentLimit?: number;
  location?: string;
  meetingUrl?: string;
}

export interface UpdateClassRequest {
  title?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  deliveryMethod?: 'online' | 'classroom' | 'virtual' | 'hybrid';
  instructorIds?: string[];
  startDate?: string;
  endDate?: string;
  enrollmentLimit?: number;
  location?: string;
  meetingUrl?: string;
}

// ============================================================================
// Assessment Types
// ============================================================================

export interface CreateExamRequest {
  courseId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  maxAttempts?: number;
  isRandomized?: boolean;
}

export interface CreateQuestionRequest {
  examId: string;
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';
  points: number;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  sequenceOrder: number;
}

export interface SubmitExamRequest {
  examId: string;
  answers: {
    questionId: string;
    selectedOption?: string;
    textAnswer?: string;
  }[];
}

export interface ExamResultResponse {
  attemptId: string;
  examId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: string;
  answers?: {
    questionId: string;
    isCorrect: boolean;
    points: number;
    explanation?: string;
  }[];
}

// ============================================================================
// Activity Types
// ============================================================================

export interface TrackProgressRequest {
  contentId: string;
  enrollmentId: string;
  progress: number;
  timeSpent: number;
}

export interface ContentProgressResponse {
  contentId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  timeSpent: number;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// SCORM Types
// ============================================================================

export interface ScormInitRequest {
  contentId: string;
  enrollmentId: string;
  scormVersion: '1.2' | '2004';
}

export interface ScormSetValueRequest {
  attemptId: string;
  element: string;
  value: string;
}

export interface ScormCommitRequest {
  attemptId: string;
  cmiData: Record<string, unknown>;
}

// ============================================================================
// Department Types
// ============================================================================

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

// ============================================================================
// System Types
// ============================================================================

export interface UpdateSettingRequest {
  value: unknown;
}

export interface AuditLogFilterParams extends PaginationParams {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}
