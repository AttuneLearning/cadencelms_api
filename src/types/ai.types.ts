/**
 * AI-Friendly API Type Definitions
 * Defines input types for AI-driven course creation
 */

import { Types } from 'mongoose';

/**
 * Full course structure input for AI course creation
 */
export interface AICourseInput {
  course: AICourseData;
  modules?: AIModuleInput[];
}

/**
 * Course data for AI course creation
 */
export interface AICourseData {
  title: string;
  code: string;
  department: string; // Name or ObjectId
  program?: string; // Name or ObjectId
  credits: number;
  instructors?: string[]; // Names, emails, or ObjectIds
  prerequisites?: string[]; // Course codes, names, or ObjectIds
  publish?: boolean;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
}

/**
 * Module input for AI module creation
 */
export interface AIModuleInput {
  title: string;
  description?: string;
  type: 'custom' | 'scorm' | 'video' | 'document' | 'exercise';
  orderIndex?: number; // Optional - will be auto-assigned if not provided
  content?: AIModuleContent;
  exercise?: AIExerciseInput;
}

/**
 * Module content structure
 */
export interface AIModuleContent {
  text?: string;
  scormPackage?: string; // URL to SCORM package
  videoUrl?: string;
  documentUrl?: string;
  attachments?: AIAttachment[];
}

/**
 * Attachment structure
 */
export interface AIAttachment {
  type: string;
  url: string;
  title: string;
  description?: string;
}

/**
 * Exercise/Quiz input for AI exercise creation
 */
export interface AIExerciseInput {
  title: string;
  type: 'quiz' | 'exam' | 'practice' | 'assessment';
  passingScore: number; // 0-100
  timeLimit?: number; // in minutes
  questions: AIQuestionInput[];
  description?: string;
  allowMultipleAttempts?: boolean;
  shuffleQuestions?: boolean;
}

/**
 * Question input for AI question creation
 */
export interface AIQuestionInput {
  type: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' | 'fill_blank';
  questionText: string;
  points: number;

  // For multiple_choice
  options?: AIQuestionOption[];

  // For true_false
  correctAnswer?: string | boolean;

  // For essay and short_answer
  sampleAnswer?: string;

  // Additional properties
  explanation?: string;
  hints?: string[];
}

/**
 * Question option for multiple choice questions
 */
export interface AIQuestionOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  resolutions: Record<string, Types.ObjectId>; // Successful name resolutions
}

/**
 * Validation error interface
 */
export interface ValidationError {
  path: string; // JSONPath to the field (e.g., "modules[0].exercise.questions[2]")
  field?: string; // Field name
  message: string;
  code: string;
  severity: 'error' | 'warning';
  value?: any; // The invalid value
  suggestions?: string[];
}

/**
 * Validation warning interface (non-blocking issues)
 */
export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  suggestions?: string[];
  impact?: string;
}

/**
 * Validation context for validating individual components
 */
export interface ValidationContext {
  courseId?: string;
  departmentId?: string;
  moduleId?: string;
  existingModules?: number; // Number of existing modules for order validation
}
