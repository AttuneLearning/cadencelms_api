# Flashcard Flow Specification

**Version:** 1.1.0
**Status:** Approved
**Date:** 2026-01-28
**Updated:** 2026-01-28 - Integrated with monolithic Question design
**Author:** API Team (in coordination with UI Team)

---

## 1. Overview

### 1.1 Purpose

This specification defines the flashcard system for CadenceLMS, which provides spaced-repetition learning reinforcement integrated into the course module choreography. Flashcards serve two distinct purposes:

1. **In-Module Practice**: Active learning during module progression
2. **Post-Completion Retention**: Knowledge verification after module completion

### 1.2 Key Design Principles

- Flashcards are **authored at the module level** but **tracked at the course level**
- Post-completion flashcards are **choreographed into the course flow**, not a separate review area
- **Instructor-configurable** thresholds determine remediation requirements
- **SM-2 spaced repetition algorithm** optimizes review scheduling

---

## 2. Flashcard Lifecycle

### 2.1 Phase 1: In-Module Practice (Pre-Completion)

During module progression, flashcards appear as learning activities:

```
Module 3: Photosynthesis
├── Lesson 1: Light Reactions (Video)
├── Lesson 2: Calvin Cycle (Reading)
├── 🃏 Flashcard Practice (Learning Unit)
│   └── Learner practices module flashcards
│   └── Helps reinforce concepts while learning
│   └── Not graded, formative feedback only
├── Lesson 3: Summary
└── 📝 Final Event: Module Quiz
    └── Must PASS to complete module
```

**Behavior:**
- Flashcards are presented within the normal module flow
- Learner can practice as many times as desired
- No progress tracking required at this phase
- Once learner **passes the final event**, Phase 1 ends for this module

### 2.2 Phase 2: Post-Completion Retention Checks

After a module is completed, flashcards from that module become eligible for retention checks:

```
Learner has completed Modules 1, 2, 3
Currently in Module 5...

Course Choreography:
├── Module 5: Lesson 1
├── Module 5: Lesson 2
├── 🃏 RETENTION CHECK: Module 2 (Injected)
│   └── 3 random cards from Module 2
│   └── Graded: tracks correct/incorrect
├── Module 5: Lesson 3
├── Module 5: Final Quiz
├── 🃏 RETENTION CHECK: Module 3 (Injected)
│   └── 3 random cards from Module 3
└── ...continues...
```

**Behavior:**
- System injects retention checks into the course choreography
- Cards are randomly selected from the completed module's flashcard pool
- Number of cards determined by instructor configuration
- Results are tracked for remediation logic

### 2.3 Phase 3: Handling Results

#### Scenario A: Learner Passes (< X incorrect)

```
Retention Check: Module 2
├── Card 1: ✓ Correct
├── Card 2: ✗ Incorrect
├── Card 3: ✓ Correct
└── Result: 1 incorrect (threshold X = 2)

→ PASSED: Continue normal flow
→ Missed card(s) may be added to future retention checks
```

#### Scenario B: Learner Fails (≥ X incorrect)

```
Retention Check: Module 2
├── Card 1: ✗ Incorrect
├── Card 2: ✗ Incorrect
├── Card 3: ✓ Correct
└── Result: 2 incorrect (threshold X = 2)

→ FAILED: Remediation triggered
→ Learner must:
   1. Re-review Module 2 exposition (lessons/content)
   2. Retake Module 2 final quiz/exam
```

### 2.4 Phase 4: Threshold = 0 (No Retention Checks)

If instructor sets `flashcardsPerCheck = 0`:
- No post-completion flashcards are ever shown
- Flashcards only matter during in-module practice
- Once module is complete, those flashcards are done

---

## 3. Data Model

### 3.1 Flashcards from Questions (Monolithic Design)

Flashcards are **NOT a separate entity**. They are rendered from Questions that have `'flashcard'` in their `questionTypes` array. This enables content reuse across multiple exercise types.

```typescript
// Questions with 'flashcard' in questionTypes become flashcards:
interface IQuestion {
  id: string;
  moduleId: ObjectId;            // Parent module
  courseId: ObjectId;            // Parent course (denormalized)

  // UNIVERSAL FIELDS (used by all types)
  questionText: string;          // Primary prompt → flashcard front
  correctAnswers: string[];      // Right answers → correctAnswers[0] = flashcard back
  distractors: string[];         // Wrong answers (for multiple choice, matching)

  // TYPE SUPPORT
  questionTypes: QuestionType[]; // Must include 'flashcard'

  // FLASHCARD-SPECIFIC EXTENSION
  flashcardData?: {
    prompts: FlashcardPrompt[];  // Alternative front-of-card variations
    frontMedia?: MediaAttachment; // Media for card front
    backMedia?: MediaAttachment;  // Media for card back
  };

  // Shared metadata
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;          // Shown after answer reveal
  hints?: string[];
  tags?: string[];

  // Authoring
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Flashcard prompt variant (for rotation)
interface FlashcardPrompt {
  text: string;
  media?: MediaAttachment;
}
```

**Key Design Points:**
- `questionText` → Card front (primary prompt)
- `correctAnswers[0]` → Card back (primary answer)
- `flashcardData.prompts[]` → Alternative card fronts for varied practice
- Same Question can also be rendered as multiple_choice, matching, etc.

### 3.2 CourseFlashcardConfig

Course-level configuration for flashcard behavior.

```typescript
interface CourseFlashcardConfig {
  courseId: ObjectId;

  // Retention check settings
  enabled: boolean;              // Master toggle
  flashcardsPerCheck: number;    // Cards per retention check (0 = disabled)
  failureThreshold: number;      // Incorrect answers before remediation

  // Check scheduling
  checkFrequency: 'every_module' | 'every_n_modules' | 'custom';
  checkFrequencyValue?: number;  // For 'every_n_modules'

  // Remediation settings
  requireContentReview: boolean; // Must re-review module content
  requireFinalRetake: boolean;   // Must retake final event

  // Card selection
  selectionMethod: 'random' | 'weighted_by_difficulty' | 'sm2_priority';
  includeOnlyCompletedModules: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 FlashcardProgress

Per-learner, per-question progress tracking with SM-2 algorithm fields.

```typescript
interface FlashcardProgress {
  id: string;
  learnerId: ObjectId;
  courseId: ObjectId;
  questionId: ObjectId;          // Reference to Question document
  promptIndex: number;           // Which prompt variant was used (for rotation)

  // Performance tracking
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewed: Date;

  // SM-2 algorithm fields
  easeFactor: number;            // Starts at 2.5, adjusts based on performance
  interval: number;              // Days until next review
  repetitions: number;           // Consecutive correct answers
  nextReviewDate: Date;          // Calculated next review

  // Mastery
  mastered: boolean;             // Reached mastery threshold
  masteredAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 RetentionCheckResult

Result of a retention check event.

```typescript
interface RetentionCheckResult {
  id: string;
  learnerId: ObjectId;
  courseId: ObjectId;
  sourceModuleId: ObjectId;      // Module whose questions were checked

  // Context
  triggeredAtModuleId: ObjectId; // Where in the course this was triggered
  triggeredAt: Date;

  // Configuration snapshot
  cardCount: number;             // How many questions were presented
  failureThreshold: number;      // Threshold at time of check

  // Results
  questionIds: ObjectId[];       // Questions shown (reference to Question docs)
  results: {
    questionId: ObjectId;
    correct: boolean;
    quality: number;             // SM-2 quality rating (0-5)
    timeSpent: number;           // Seconds
  }[];

  correctCount: number;
  incorrectCount: number;

  // Outcome
  passed: boolean;
  remediationRequired: boolean;
  remediationId?: ObjectId;      // Reference to Remediation if triggered

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. SM-2 Spaced Repetition Algorithm

### 4.1 Algorithm Overview

The SM-2 algorithm schedules reviews based on how well the learner knows each card:

1. **Ease Factor (EF)**: Starts at 2.5, adjusts based on recall quality
2. **Interval**: Days until next review, grows exponentially for known cards
3. **Repetitions**: Consecutive correct answers

### 4.2 Implementation

```typescript
interface SM2Response {
  quality: 0 | 1 | 2 | 3 | 4 | 5;  // 0=blackout, 5=perfect recall
}

function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): {
  nextInterval: number;
  newEaseFactor: number;
  newRepetitions: number;
} {
  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let nextInterval = interval;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      nextInterval = 1;       // First correct: review tomorrow
    } else if (repetitions === 1) {
      nextInterval = 6;       // Second correct: review in 6 days
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    nextInterval = 1;         // Review tomorrow
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;  // Minimum EF

  return { nextInterval, newEaseFactor, newRepetitions };
}
```

### 4.3 Quality Mapping

For binary "correct/incorrect" flashcard responses:

| Response | Quality | Description |
|----------|---------|-------------|
| Incorrect | 1 | Complete failure to recall |
| Correct (hesitant) | 3 | Correct after difficulty |
| Correct (confident) | 5 | Perfect recall |

---

## 5. Course Choreography Integration

### 5.1 Injection Points

Retention checks are injected into the course flow at configurable points:

```typescript
type CheckFrequency =
  | 'every_module'           // After each module completion
  | 'every_n_modules'        // Every N modules (e.g., every 2 modules)
  | 'custom';                // Defined in module settings

interface ChoreographyInjection {
  type: 'retention_check';
  sourceModuleId: ObjectId;  // Which module's cards to check
  position: 'before_module' | 'after_lesson' | 'before_final';
  priority: number;          // For ordering multiple injections
}
```

### 5.2 Learner Course View

The learner sees retention checks as required activities:

```
Course: Biology 101
├── Module 1: Cell Structure ✓ Completed
├── Module 2: Photosynthesis ✓ Completed
├── Module 3: Genetics (Current)
│   ├── Lesson 1: DNA Structure ✓
│   ├── 🃏 Retention Check: Module 1 ← Required before continuing
│   ├── Lesson 2: RNA Transcription (Locked)
│   └── Final Quiz (Locked)
├── Module 4: Evolution (Locked)
└── ...
```

### 5.3 Remediation Flow

When remediation is triggered:

```
Course: Biology 101
├── Module 1: Cell Structure (REMEDIATION REQUIRED)
│   ├── ⚠️ Re-review Required
│   ├── Lesson 1: Cell Theory (Must revisit)
│   ├── Lesson 2: Cell Parts (Must revisit)
│   ├── 📝 Retake Final Quiz
│   └── Status: Waiting for re-completion
├── Module 2: Photosynthesis ✓
├── Module 3: Genetics (Paused until remediation complete)
└── ...
```

---

## 6. API Endpoints

### 6.1 Question Management (Flashcard Authoring)

Flashcards are authored by creating Questions with `'flashcard'` in their `questionTypes` array:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/modules/:moduleId/questions?types=flashcard` | List questions that can be flashcards |
| POST | `/api/v2/modules/:moduleId/questions` | Create question (include questionTypes: ['flashcard']) |
| GET | `/api/v2/modules/:moduleId/questions/:questionId` | Get question details |
| PUT | `/api/v2/modules/:moduleId/questions/:questionId` | Update question |
| DELETE | `/api/v2/modules/:moduleId/questions/:questionId` | Delete question |
| POST | `/api/v2/modules/:moduleId/questions/bulk` | Bulk create questions |

**Note:** The same Question endpoints serve all question types. Filter by `types=flashcard` to get flashcard-capable questions.

### 6.2 Course Flashcard Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/courses/:courseId/flashcard-config` | Get flashcard settings |
| PUT | `/api/v2/courses/:courseId/flashcard-config` | Update flashcard settings |

### 6.3 Learner Flashcard Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/courses/:courseId/flashcard-session` | Get cards for in-module practice |
| POST | `/api/v2/courses/:courseId/flashcard-result` | Record card result |
| GET | `/api/v2/courses/:courseId/flashcard-progress` | Get learner progress overview |
| DELETE | `/api/v2/courses/:courseId/flashcard-progress` | Reset all progress |

### 6.4 Retention Check Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/courses/:courseId/retention-checks/pending` | Get pending retention checks |
| GET | `/api/v2/courses/:courseId/retention-checks/:checkId` | Get retention check details |
| POST | `/api/v2/courses/:courseId/retention-checks/:checkId/submit` | Submit retention check answers |
| GET | `/api/v2/courses/:courseId/retention-checks/history` | Get retention check history |

### 6.5 Remediation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/courses/:courseId/remediations/active` | Get active remediations |
| POST | `/api/v2/courses/:courseId/remediations/:remediationId/content-reviewed` | Mark content as reviewed |
| GET | `/api/v2/courses/:courseId/remediations/:remediationId/status` | Get remediation status |

---

## 7. Permissions

| Action | Required Permission | Roles |
|--------|---------------------|-------|
| Create/edit flashcards | `write:modules` | Instructor, Content Admin, Admin |
| Delete flashcards | `delete:modules` | Content Admin, Admin |
| Configure course flashcard settings | `write:courses` | Instructor, Admin |
| View flashcards (in-module) | `read:modules` | Enrolled learner |
| Take retention checks | `write:progress` | Enrolled learner |
| View learner flashcard progress | `read:progress` | Instructor, Admin |

---

## 8. UI Components

### 8.1 Authoring (Staff)

```
src/features/flashcard-builder/
├── ui/
│   ├── FlashcardEditor.tsx        # Single card editor
│   ├── FlashcardList.tsx          # List view with reordering
│   ├── FlashcardBulkImport.tsx    # CSV/bulk import
│   └── FlashcardPreview.tsx       # Preview card flip
└── model/
    └── flashcard-authoring.ts     # Authoring state
```

### 8.2 Learner Experience

```
src/features/flashcard-player/
├── ui/
│   ├── FlashcardPractice.tsx      # In-module practice player
│   ├── RetentionCheck.tsx         # Retention check UI
│   ├── CardFlip.tsx               # Animated card component
│   └── RemediationNotice.tsx      # Remediation required banner
└── model/
    └── flashcard-learner.ts       # Learner state
```

---

## 9. Configuration Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Flashcard system enabled |
| `flashcardsPerCheck` | `3` | Cards per retention check |
| `failureThreshold` | `2` | Incorrect answers before remediation |
| `checkFrequency` | `'every_module'` | When to inject checks |
| `selectionMethod` | `'random'` | How to select cards |
| `requireContentReview` | `true` | Must re-review content on remediation |
| `requireFinalRetake` | `true` | Must retake final event on remediation |

---

## 10. Related Documents

- **Question System**: `ai_team_config/memory_store/entities/question-system.md` - Monolithic Question design
- **Question Types**: `contracts/types/question-types.ts` - TypeScript interfaces
- **API Contract**: `contracts/api/flashcards.contract.ts`
- **ADR**: ADR-CONTENT-001 (Content Delivery Architecture)
- **API Issues**:
  - API-ISS-009: Question Model Monolithic Design Update
  - API-ISS-010: Flashcard System Implementation
  - API-ISS-013: Retention Check & Remediation System

---

*Version 1.1.0 - Updated 2026-01-28 to reflect monolithic Question design*

*End of Specification*
