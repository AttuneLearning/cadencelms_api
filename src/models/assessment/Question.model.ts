import mongoose, { Schema, Document } from 'mongoose';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'matching'
  | 'flashcard'
  | 'fill_in_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// ============================================
// MEDIA ATTACHMENT REFERENCE
// ============================================

/**
 * Reference to a media attachment (image, video, audio, etc.)
 * Can reference a MediaAttachment document by ID or use a direct URL
 */
export interface IMediaAttachmentRef {
  mediaId?: mongoose.Types.ObjectId;  // Reference to MediaAttachment document
  url?: string;                       // Direct URL (for migration or external media)
  altText?: string;                   // Accessibility text
}

// ============================================
// TYPE-SPECIFIC DATA INTERFACES
// ============================================

/**
 * Legacy flashcard interface (for backward compatibility)
 * @deprecated Use IFlashcardData instead
 */
export interface IFlashcard {
  front: string;
  back: string;
  hint?: string;
}

/**
 * Flashcard prompt variation
 */
export interface IFlashcardPrompt {
  text: string;
  media?: IMediaAttachmentRef;
}

/**
 * Enhanced flashcard data for the monolithic question design
 * Allows one question to have multiple prompt variations for the front of the card
 */
export interface IFlashcardData {
  prompts: IFlashcardPrompt[];        // Alternative front-of-card variations
  frontMedia?: IMediaAttachmentRef;   // Media for card front
  backMedia?: IMediaAttachmentRef;    // Media for card back
}

/**
 * Enhanced matching data for the monolithic question design
 * Additional media and explanation fields for matching pairs
 */
export interface IMatchingData {
  columnAMedia?: IMediaAttachmentRef; // Media for column A (left side)
  columnBMedia?: IMediaAttachmentRef; // Media for column B (right side)
  pairExplanation?: string;           // Explanation for why items match
}

/**
 * True/false specific data
 */
export interface ITrueFalseData {
  correctValue: boolean;              // The correct answer (true or false)
  trueExplanation?: string;           // Explanation shown if learner selects true
  falseExplanation?: string;          // Explanation shown if learner selects false
}

/**
 * Short answer specific data
 * Consolidates existing acceptedAnswers and matchThreshold fields
 */
export interface IShortAnswerData {
  alternateAccepted: string[];        // Other accepted answers beyond correctAnswer
  matchThreshold: number;             // 0-100 for fuzzy matching (100 = exact match)
  caseSensitive: boolean;             // Whether matching is case-sensitive
}

/**
 * Long answer (essay) specific data
 * Consolidates existing rubric, sampleAnswer, and maxWordCount fields
 */
export interface ILongAnswerData {
  rubric?: string;                    // Grading rubric for instructors
  sampleAnswer?: string;              // Example of a good answer
  minWords?: number;                  // Minimum word count
  maxWords?: number;                  // Maximum word count
  requiresHumanGrading: boolean;      // Whether auto-grading is disabled
}

/**
 * Fill-in-the-blank specific data
 * Enhanced structure with placeholder-based blanks
 */
export interface IFillBlankBlank {
  id: string;                         // Unique ID matching {{blank_id}} placeholder
  acceptedAnswers: string[];          // Accepted answers for this blank
  matchThreshold: number;             // 0-100 for fuzzy matching
}

export interface IFillBlankData {
  textWithBlanks: string;             // Text with {{blank_id}} placeholders
  blanks: IFillBlankBlank[];          // Blank definitions
}

/**
 * Legacy blank interface (for backward compatibility)
 * @deprecated Use IFillBlankData instead
 */
export interface IBlank {
  position: number;
  acceptedAnswers: string[];
  matchThreshold: number;
}

export interface IQuestionHierarchy {
  parentQuestionId?: mongoose.Types.ObjectId;
  relatedQuestionIds: mongoose.Types.ObjectId[];
  prerequisiteQuestionIds: mongoose.Types.ObjectId[];
  conceptTag?: string;
  difficultyProgression?: number;
}

export interface IQuestion extends Document {
  questionText: string;
  questionTypes: QuestionType[];
  departmentId: mongoose.Types.ObjectId;
  points: number;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  modelAnswer?: string;
  matchingPairs?: Record<string, string>;
  maxWordCount?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
  hints?: string[];
  isActive: boolean;
  questionBankIds: string[];
  metadata?: Record<string, any>;

  // ============================================
  // NEW MONOLITHIC DESIGN FIELDS
  // ============================================

  /**
   * Distractors (wrong answers) - separate from options
   * Used for multiple_choice and multiple_select types
   * Combined with correctAnswer/correctAnswers to build options array at render time
   */
  distractors?: string[];

  /**
   * Type-specific sub-documents
   * These provide enhanced data for each question type in the monolithic design
   */
  flashcardData?: IFlashcardData;
  matchingData?: IMatchingData;
  trueFalseData?: ITrueFalseData;
  shortAnswerData?: IShortAnswerData;
  longAnswerData?: ILongAnswerData;
  fillBlankData?: IFillBlankData;

  // ============================================
  // LEGACY FIELDS (maintained for backward compatibility)
  // ============================================

  // short_answer fields (legacy - use shortAnswerData instead)
  acceptedAnswers?: string[];
  matchThreshold?: number;
  // long_answer fields (legacy - use longAnswerData instead)
  sampleAnswer?: string;
  rubric?: string;
  // flashcard fields (legacy - use flashcardData instead)
  cards?: IFlashcard[];
  // fill_in_blank fields (legacy - use fillBlankData instead)
  blanks?: IBlank[];

  // ============================================
  // HIERARCHY AND ADAPTIVE LEARNING
  // ============================================

  // hierarchy for adaptive testing
  hierarchy?: IQuestionHierarchy;
  // Adaptive learning fields (optional)
  knowledgeNodeId?: mongoose.Types.ObjectId;
  cognitiveDepth?: string; // slug, validated against CognitiveDepthLevel

  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    hint: { type: String }
  },
  { _id: false }
);

const BlankSchema = new Schema<IBlank>(
  {
    position: { type: Number, required: true },
    acceptedAnswers: { type: [String], required: true },
    matchThreshold: { type: Number, required: true, min: 0, max: 100 }
  },
  { _id: false }
);

const HierarchySchema = new Schema<IQuestionHierarchy>(
  {
    parentQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    relatedQuestionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    prerequisiteQuestionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    conceptTag: { type: String },
    difficultyProgression: { type: Number }
  },
  { _id: false }
);

// ============================================
// NEW MONOLITHIC DESIGN SUB-SCHEMAS
// ============================================

/**
 * Schema for media attachment references
 */
const MediaAttachmentRefSchema = new Schema<IMediaAttachmentRef>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'MediaAttachment' },
    url: { type: String, trim: true },
    altText: { type: String, trim: true, maxlength: 500 }
  },
  { _id: false }
);

/**
 * Schema for flashcard prompt variations
 */
const FlashcardPromptSchema = new Schema<IFlashcardPrompt>(
  {
    text: { type: String, required: true, trim: true },
    media: MediaAttachmentRefSchema
  },
  { _id: false }
);

/**
 * Enhanced flashcard data schema
 */
const FlashcardDataSchema = new Schema<IFlashcardData>(
  {
    prompts: {
      type: [FlashcardPromptSchema],
      default: [],
      validate: {
        validator: function(v: IFlashcardPrompt[]) {
          return !v || v.length >= 0; // Allow empty array, will validate in pre-save if flashcard type
        },
        message: 'flashcardData.prompts must be an array'
      }
    },
    frontMedia: MediaAttachmentRefSchema,
    backMedia: MediaAttachmentRefSchema
  },
  { _id: false }
);

/**
 * Enhanced matching data schema
 */
const MatchingDataSchema = new Schema<IMatchingData>(
  {
    columnAMedia: MediaAttachmentRefSchema,
    columnBMedia: MediaAttachmentRefSchema,
    pairExplanation: { type: String, trim: true }
  },
  { _id: false }
);

/**
 * True/false data schema
 */
const TrueFalseDataSchema = new Schema<ITrueFalseData>(
  {
    correctValue: { type: Boolean, required: true },
    trueExplanation: { type: String, trim: true },
    falseExplanation: { type: String, trim: true }
  },
  { _id: false }
);

/**
 * Short answer data schema
 */
const ShortAnswerDataSchema = new Schema<IShortAnswerData>(
  {
    alternateAccepted: { type: [String], default: [] },
    matchThreshold: {
      type: Number,
      min: [0, 'matchThreshold must be at least 0'],
      max: [100, 'matchThreshold must be at most 100'],
      default: 80
    },
    caseSensitive: { type: Boolean, default: false }
  },
  { _id: false }
);

/**
 * Long answer data schema
 */
const LongAnswerDataSchema = new Schema<ILongAnswerData>(
  {
    rubric: { type: String, trim: true },
    sampleAnswer: { type: String, trim: true },
    minWords: { type: Number, min: [0, 'minWords must be at least 0'] },
    maxWords: { type: Number, min: [1, 'maxWords must be at least 1'] },
    requiresHumanGrading: { type: Boolean, default: true }
  },
  { _id: false }
);

/**
 * Fill-in-blank blank definition schema
 */
const FillBlankBlankSchema = new Schema<IFillBlankBlank>(
  {
    id: { type: String, required: true, trim: true },
    acceptedAnswers: {
      type: [String],
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length >= 1;
        },
        message: 'Each blank must have at least one accepted answer'
      }
    },
    matchThreshold: {
      type: Number,
      min: [0, 'matchThreshold must be at least 0'],
      max: [100, 'matchThreshold must be at most 100'],
      default: 80
    }
  },
  { _id: false }
);

/**
 * Fill-in-blank data schema
 */
const FillBlankDataSchema = new Schema<IFillBlankData>(
  {
    textWithBlanks: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Must contain at least one {{blank_id}} placeholder
          return /\{\{[a-zA-Z0-9_]+\}\}/.test(v);
        },
        message: 'textWithBlanks must contain at least one {{blank_id}} placeholder'
      }
    },
    blanks: {
      type: [FillBlankBlankSchema],
      required: true,
      validate: {
        validator: function(v: IFillBlankBlank[]) {
          return v && v.length >= 1;
        },
        message: 'fillBlankData must have at least one blank definition'
      }
    }
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, 'questionText is required'],
      trim: true
    },
    questionTypes: {
      type: [String],
      required: [true, 'questionTypes is required'],
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'questionTypes must contain at least one type'
      },
      enum: {
        values: ['multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'matching', 'flashcard', 'fill_in_blank'],
        message: '{VALUE} is not a valid question type'
      },
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
    points: {
      type: Number,
      required: [true, 'points is required'],
      min: [1, 'points must be at least 1']
    },
    options: [String],
    correctAnswer: {
      type: String,
      trim: true
    },
    correctAnswers: [String],
    modelAnswer: {
      type: String,
      trim: true
    },
    matchingPairs: {
      type: Schema.Types.Mixed
    },
    maxWordCount: {
      type: Number,
      min: [1, 'maxWordCount must be at least 1']
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level'
      },
      index: true
    },
    tags: [String],
    explanation: {
      type: String,
      trim: true
    },
    hints: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    questionBankIds: {
      type: [String],
      default: [],
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    // short_answer fields
    acceptedAnswers: [String],
    matchThreshold: {
      type: Number,
      min: [0, 'matchThreshold must be at least 0'],
      max: [100, 'matchThreshold must be at most 100']
    },
    // long_answer fields
    sampleAnswer: {
      type: String,
      trim: true
    },
    rubric: {
      type: String,
      trim: true
    },
    // flashcard fields (legacy)
    cards: [FlashcardSchema],
    // fill_in_blank fields (legacy)
    blanks: [BlankSchema],

    // ============================================
    // NEW MONOLITHIC DESIGN FIELDS
    // ============================================

    /**
     * Distractors (wrong answers) - separate from options
     * For multiple_choice and multiple_select types
     */
    distractors: {
      type: [String],
      default: undefined
    },

    /**
     * Type-specific sub-documents for the monolithic design
     */
    flashcardData: FlashcardDataSchema,
    matchingData: MatchingDataSchema,
    trueFalseData: TrueFalseDataSchema,
    shortAnswerData: ShortAnswerDataSchema,
    longAnswerData: LongAnswerDataSchema,
    fillBlankData: FillBlankDataSchema,

    // ============================================
    // HIERARCHY AND ADAPTIVE LEARNING
    // ============================================

    // hierarchy for adaptive testing
    hierarchy: HierarchySchema,
    // Adaptive learning fields (optional)
    knowledgeNodeId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      index: true
    },
    cognitiveDepth: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
QuestionSchema.index({ departmentId: 1, questionTypes: 1 });
QuestionSchema.index({ departmentId: 1, difficulty: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ isActive: 1, departmentId: 1 });

// Hierarchy indexes for adaptive testing
QuestionSchema.index({ 'hierarchy.parentQuestionId': 1 });
QuestionSchema.index({ 'hierarchy.conceptTag': 1 });

// Adaptive learning indexes
QuestionSchema.index({ knowledgeNodeId: 1, cognitiveDepth: 1 });
QuestionSchema.index({ departmentId: 1, knowledgeNodeId: 1 });
QuestionSchema.index({ departmentId: 1, cognitiveDepth: 1 });

// Indexes for new monolithic design fields
QuestionSchema.index({ 'trueFalseData.correctValue': 1 });
QuestionSchema.index({ 'fillBlankData.blanks.id': 1 });
QuestionSchema.index({ 'flashcardData.prompts.text': 'text' }, { sparse: true }); // Text index for search

// ============================================
// PRE-SAVE VALIDATION HOOKS
// ============================================

/**
 * Pre-save validation for question type requirements
 * Validates that required data exists for each question type
 */
QuestionSchema.pre('save', function(next) {
  const questionTypes = this.questionTypes || [];
  const errors: string[] = [];

  for (const type of questionTypes) {
    switch (type) {
      case 'multiple_choice':
      case 'multiple_select':
        // Requires either distractors (new design) or options (legacy)
        const hasDistractors = this.distractors && this.distractors.length >= 1;
        const hasOptions = this.options && this.options.length >= 2;
        if (!hasDistractors && !hasOptions) {
          errors.push(`${type} requires at least 1 distractor or at least 2 options`);
        }
        break;

      case 'true_false':
        // Requires trueFalseData.correctValue to be defined (new design) or options (legacy)
        const hasTrueFalseData = this.trueFalseData && typeof this.trueFalseData.correctValue === 'boolean';
        const hasTrueFalseOptions = this.options && this.options.length === 2;
        if (!hasTrueFalseData && !hasTrueFalseOptions) {
          errors.push('true_false requires trueFalseData.correctValue or exactly 2 options');
        }
        break;

      case 'fill_in_blank':
        // Requires fillBlankData.blanks (new design) or blanks (legacy)
        const hasFillBlankData = this.fillBlankData && this.fillBlankData.blanks && this.fillBlankData.blanks.length >= 1;
        const hasLegacyBlanks = this.blanks && this.blanks.length >= 1;
        if (!hasFillBlankData && !hasLegacyBlanks) {
          errors.push('fill_in_blank requires at least 1 blank definition');
        }
        break;

      case 'long_answer':
        // Set default requiresHumanGrading if longAnswerData exists but requiresHumanGrading is not set
        if (this.longAnswerData && typeof this.longAnswerData.requiresHumanGrading !== 'boolean') {
          this.longAnswerData.requiresHumanGrading = true;
        }
        break;

      case 'flashcard':
        // Flashcard can use either flashcardData (new) or cards (legacy)
        // No strict requirement - can use questionText as the answer
        break;

      case 'matching':
        // Matching can use matchingPairs (legacy) or matchingData (new)
        // No strict requirement - pairs can be constructed from related questions
        break;

      case 'short_answer':
        // Short answer can use shortAnswerData (new), acceptedAnswers (legacy), or correctAnswer
        // No strict requirement - can be manually graded
        break;
    }
  }

  if (errors.length > 0) {
    return next(new Error(errors.join('; ')));
  }

  next();
});

// Pre-save validation to prevent circular dependencies in hierarchy
QuestionSchema.pre('save', async function(next) {
  if (!this.hierarchy?.parentQuestionId) {
    return next();
  }

  const parentId = this.hierarchy.parentQuestionId;
  const currentId = this._id;

  // A question cannot be its own parent
  if (parentId.equals(currentId)) {
    const error = new Error('A question cannot be its own parent');
    return next(error);
  }

  // Check for cycles: ensure parent doesn't have this question as its parent
  try {
    const Question = mongoose.model<IQuestion>('Question');
    const visited = new Set<string>();
    let currentParentId: mongoose.Types.ObjectId | undefined = parentId;

    while (currentParentId) {
      const parentIdStr = currentParentId.toString();

      // If we've seen this parent before, there's a cycle
      if (visited.has(parentIdStr)) {
        const error = new Error('Circular dependency detected in question hierarchy');
        return next(error);
      }

      // If the parent points back to current question, there's a cycle
      if (currentParentId.equals(currentId)) {
        const error = new Error('Circular dependency detected in question hierarchy');
        return next(error);
      }

      visited.add(parentIdStr);

      const parentQuestion: { hierarchy?: { parentQuestionId?: mongoose.Types.ObjectId } } | null =
        await Question.findById(currentParentId).select('hierarchy.parentQuestionId').lean();
      currentParentId = parentQuestion?.hierarchy?.parentQuestionId;
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);
