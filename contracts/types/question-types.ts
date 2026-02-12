/**
 * Question Types - Monolithic Question Design
 * Version: 2.0.0
 *
 * A single Question document contains all knowledge needed to assess a concept
 * and can be RENDERED as multiple question types (multiple_choice, flashcard,
 * matching, etc.) depending on context.
 *
 * Design Principle: One Row → Multiple Presentations
 *
 * See: ai_team_config/memory_store/entities/question-system.md
 */

import { MediaAttachment } from './media-types';

// ============================================================================
// Question Type Enum
// ============================================================================

export type QuestionType =
  | 'multiple_choice'    // Single correct answer from options
  | 'multiple_select'    // Multiple correct answers from options
  | 'true_false'         // True/False statement
  | 'short_answer'       // Brief text response (auto-graded)
  | 'long_answer'        // Extended text response (human/AI graded)
  | 'matching'           // Match items from two columns
  | 'flashcard'          // Front/back card for memorization
  | 'fill_in_blank';     // Complete the sentence

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// ============================================================================
// Core Question Interface (Monolithic)
// ============================================================================

export interface IQuestion {
  id: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIVERSAL FIELDS (used by all/most question types)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The question stem / prompt / front-of-card
   * - multiple_choice: "What is the powerhouse of the cell?"
   * - flashcard: Front of card
   * - matching: Column A item
   */
  questionText: string;

  /**
   * The correct answer(s)
   * - Index 0 = primary correct answer
   * - Multiple entries = multiple correct (for multiple_select)
   * - flashcard: Back of card (index 0)
   * - matching: Column B correct match (index 0)
   */
  correctAnswers: string[];

  /**
   * Wrong answers / distractors
   * - multiple_choice: Wrong options shown to learner
   * - matching: N/A (wrong matches come from other questions)
   * - flashcard: N/A
   */
  distractors: string[];

  /**
   * Explanation shown after answering (all types)
   */
  explanation?: string;

  /**
   * Progressive hints (all types)
   */
  hints?: string[];

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION TYPE SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Array of types this question supports
   * Validation ensures required fields exist for each type listed
   * Example: ['multiple_choice', 'flashcard', 'matching']
   */
  questionTypes: QuestionType[];

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIZATION & METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  departmentId: string;
  questionBankIds: string[];
  tags?: string[];
  difficulty?: DifficultyLevel;
  points: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE-SPECIFIC DATA
  // ═══════════════════════════════════════════════════════════════════════════

  flashcardData?: FlashcardTypeData;
  matchingData?: MatchingTypeData;
  trueFalseData?: TrueFalseTypeData;
  shortAnswerData?: ShortAnswerTypeData;
  longAnswerData?: LongAnswerTypeData;
  fillBlankData?: FillBlankTypeData;

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTIVE LEARNING (optional)
  // ═══════════════════════════════════════════════════════════════════════════

  knowledgeNodeId?: string;
  cognitiveDepth?: string;
  hierarchy?: QuestionHierarchy;
}

// ============================================================================
// Type-Specific Data Interfaces
// ============================================================================

/**
 * Flashcard-specific data
 * Enhances rendering when questionTypes includes 'flashcard'
 */
export interface FlashcardTypeData {
  /**
   * Alternative prompts for the same answer
   * Allows variety in how the card is presented
   * If empty/undefined, questionText is used as the only prompt
   */
  prompts: FlashcardPrompt[];

  /**
   * Media to show on back of card (with correctAnswers[0])
   */
  backMedia?: MediaAttachment;

  /**
   * Override front media (if different from prompts[].media)
   */
  frontMedia?: MediaAttachment;
}

export interface FlashcardPrompt {
  text: string;
  media?: MediaAttachment;
}

/**
 * Matching-specific data
 * Enhances rendering when questionTypes includes 'matching'
 */
export interface MatchingTypeData {
  /**
   * Media for Column A (the prompt side)
   */
  columnAMedia?: MediaAttachment;

  /**
   * Media for Column B (the answer side)
   */
  columnBMedia?: MediaAttachment;

  /**
   * Per-pair explanation (shown after matching)
   */
  pairExplanation?: string;
}

/**
 * True/False-specific data
 * Required when questionTypes includes 'true_false'
 */
export interface TrueFalseTypeData {
  /**
   * The correct answer: true or false
   */
  correctValue: boolean;

  /**
   * Explanation shown if the statement is false
   */
  falseExplanation?: string;

  /**
   * Explanation shown if the statement is true
   */
  trueExplanation?: string;
}

/**
 * Short Answer-specific data
 * Enhances grading when questionTypes includes 'short_answer'
 */
export interface ShortAnswerTypeData {
  /**
   * Additional accepted answers beyond correctAnswers[]
   * For spelling variations, abbreviations, etc.
   */
  alternateAccepted?: string[];

  /**
   * Fuzzy match threshold (0-100)
   * 100 = exact match required
   * 80 = allow minor typos
   */
  matchThreshold: number;

  /**
   * Case sensitive matching?
   */
  caseSensitive: boolean;
}

/**
 * Long Answer-specific data
 * Required when questionTypes includes 'long_answer'
 */
export interface LongAnswerTypeData {
  /**
   * Grading rubric for human graders
   */
  rubric?: string;

  /**
   * Model/sample answer for reference
   */
  sampleAnswer?: string;

  /**
   * Maximum word count (0 = unlimited)
   */
  maxWordCount?: number;

  /**
   * Minimum word count
   */
  minWordCount?: number;

  /**
   * Requires human grading?
   */
  requiresHumanGrading: boolean;

  /**
   * AI scoring enabled? (stub for future)
   */
  aiScoringEnabled: boolean;
}

/**
 * Fill in the Blank-specific data
 * Required when questionTypes includes 'fill_in_blank'
 */
export interface FillBlankTypeData {
  /**
   * The text with blanks marked as {{1}}, {{2}}, etc.
   * Example: "The {{1}} is the powerhouse of the {{2}}"
   */
  textWithBlanks: string;

  /**
   * Definition for each blank
   */
  blanks: BlankDefinition[];
}

export interface BlankDefinition {
  /**
   * Matches {{n}} in textWithBlanks
   */
  blankId: number;

  /**
   * Valid answers for this blank
   */
  acceptedAnswers: string[];

  /**
   * Case sensitive matching?
   */
  caseSensitive: boolean;

  /**
   * Fuzzy match threshold (0-100)
   */
  matchThreshold: number;
}

/**
 * Question hierarchy for adaptive learning
 */
export interface QuestionHierarchy {
  parentQuestionId?: string;
  relatedQuestionIds: string[];
  prerequisiteQuestionIds: string[];
  conceptTag?: string;
  difficultyProgression?: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request to create a question
 */
export interface CreateQuestionRequest {
  questionText: string;
  correctAnswers: string[];
  distractors?: string[];
  explanation?: string;
  hints?: string[];
  questionTypes: QuestionType[];
  departmentId: string;
  questionBankIds?: string[];
  tags?: string[];
  difficulty?: DifficultyLevel;
  points: number;
  flashcardData?: FlashcardTypeData;
  matchingData?: MatchingTypeData;
  trueFalseData?: TrueFalseTypeData;
  shortAnswerData?: ShortAnswerTypeData;
  longAnswerData?: LongAnswerTypeData;
  fillBlankData?: FillBlankTypeData;
  knowledgeNodeId?: string;
  cognitiveDepth?: string;
}

/**
 * Request to update a question
 */
export interface UpdateQuestionRequest {
  questionText?: string;
  correctAnswers?: string[];
  distractors?: string[];
  explanation?: string;
  hints?: string[];
  questionTypes?: QuestionType[];
  questionBankIds?: string[];
  tags?: string[];
  difficulty?: DifficultyLevel;
  points?: number;
  isActive?: boolean;
  flashcardData?: FlashcardTypeData;
  matchingData?: MatchingTypeData;
  trueFalseData?: TrueFalseTypeData;
  shortAnswerData?: ShortAnswerTypeData;
  longAnswerData?: LongAnswerTypeData;
  fillBlankData?: FillBlankTypeData;
  knowledgeNodeId?: string;
  cognitiveDepth?: string;
}

/**
 * Filter parameters for listing questions
 */
export interface QuestionFilterParams {
  departmentId?: string;
  questionBankId?: string;
  questionTypes?: QuestionType[];          // Filter by supported types
  questionTypesAll?: QuestionType[];       // Must support ALL these types
  tags?: string[];
  difficulty?: DifficultyLevel;
  knowledgeNodeId?: string;
  cognitiveDepth?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// ============================================================================
// Rendering Types (How questions are presented)
// ============================================================================

/**
 * Question rendered for multiple choice
 */
export interface MultipleChoiceRendered {
  questionId: string;
  stem: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;  // Only included for staff/after submission
  }[];
  hints?: string[];
  points: number;
}

/**
 * Question rendered as flashcard
 */
export interface FlashcardRendered {
  questionId: string;
  cardIndex: number;            // Which prompt variant
  front: {
    text: string;
    media?: MediaAttachment;
  };
  back: {
    text: string;               // correctAnswers[0]
    media?: MediaAttachment;
  };
  explanation?: string;
  hints?: string[];
  difficulty?: DifficultyLevel;
}

/**
 * Question rendered for matching (single pair from one question)
 */
export interface MatchingPairRendered {
  questionId: string;
  columnA: {
    id: string;
    text: string;               // questionText
    media?: MediaAttachment;
  };
  columnB: {
    id: string;
    text: string;               // correctAnswers[0]
    media?: MediaAttachment;
  };
  explanation?: string;
}

/**
 * Complete matching exercise (combines multiple questions)
 */
export interface MatchingExerciseRendered {
  exerciseId: string;
  columnALabel?: string;
  columnBLabel?: string;
  columnA: {
    id: string;
    text: string;
    media?: MediaAttachment;
  }[];
  columnB: {
    id: string;                  // Shuffled, learner must match to columnA
    text: string;
    media?: MediaAttachment;
  }[];
  // Note: columnA[i].id should match columnB[j].id for correct pairs
}

// ============================================================================
// Validation Rules
// ============================================================================

export const QuestionValidationRules = {
  universal: {
    questionText: { required: true, minLength: 1, maxLength: 5000 },
    correctAnswers: { required: true, minItems: 1 },
    points: { required: true, min: 0 }
  },

  byType: {
    multiple_choice: {
      distractors: { required: true, minItems: 1, maxItems: 9 }
    },
    multiple_select: {
      distractors: { required: true, minItems: 1 },
      correctAnswers: { minItems: 1 }  // Can have multiple
    },
    true_false: {
      trueFalseData: { required: true },
      'trueFalseData.correctValue': { required: true }
    },
    flashcard: {
      // flashcardData optional - can use questionText as sole prompt
    },
    matching: {
      // matchingData optional - can use questionText + correctAnswers[0]
    },
    short_answer: {
      // shortAnswerData optional - defaults to exact match
    },
    long_answer: {
      longAnswerData: { required: false },
      'longAnswerData.requiresHumanGrading': { default: true }
    },
    fill_in_blank: {
      fillBlankData: { required: true },
      'fillBlankData.textWithBlanks': { required: true },
      'fillBlankData.blanks': { required: true, minItems: 1 }
    }
  }
} as const;
