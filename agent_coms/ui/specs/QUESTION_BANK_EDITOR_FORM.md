# Question Bank Editor Form Specification

**Date:** 2026-01-23 (Updated)
**Owner:** UI Team
**Scope:** Question Bank editor form and question creation/editing workflow

**Related Documents:**
- [Implementation Plan](./LEARNING_ACTIVITY_IMPLEMENTATION_PLAN.md) - Architecture, component library mapping, timeline
- [Learning Activity Editor Forms](./LEARNING_ACTIVITY_EDITOR_FORMS.md) - Activity type editors
- [UI Component Library](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) - Reusable components
- [Feature Development Checklist](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) - Coding standards

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scope** | Department-level | Questions shared across courses in department |
| **Cross-Department** | System admin copy | Admins can copy questions between departments |
| **Deletion** | Block if linked | Must unlink from learning units before delete |
| **Randomization** | Multiple levels | in_order, by_difficulty, completely_random |
| **Repetition** | Mastery-based | Questions "turn off" after N correct answers |
| **Adaptive Testing** | Hierarchy-based | Skip related questions on correct answers |
| **AI Quizzing** | Future (low priority) | LLM-driven adaptive questioning |

---

## Purpose
Provide a dedicated Question Bank editor that allows staff to create, edit, and manage questions at the **department level**, including distractors (wrong answers), correct answers, percentage match threshold for typed answers, and question hierarchy for adaptive testing.

## Entry Points
- Linked from the Quiz/Exam creator form (Learning Activity Editor).
- Standalone navigation: **Staff > [Department] > Question Bank**
- Admin: **System Admin > Question Banks** (cross-department management)

---

## Form Structure

### 1) Question Bank Overview
- **Department Selector** (for multi-department staff)
- **Bank Filter** (question banks within department)
- **Search** (text)
- **Filters**: type, difficulty, tags, status
- **Actions**: Create Question, Create Bank, Bulk Import (future), Export (future)
- **Table/List**: question text preview, type, difficulty, tags, usage count, last updated

### 2) Question Bank Management (NEW)

#### Create/Edit Question Bank
- **Name** (required) - "Geography Fundamentals"
- **Description** (optional) - purpose, intended courses
- **Tags** (optional) - organizational tags
- **Question Count** (read-only) - auto-calculated

### 3) Question Editor (Create/Edit)

#### Common Fields
- **Question Bank** (required) - select which bank
- **Question Title** (optional, internal)
- **Question Text** (required)
- **Question Type** (required)
  - Multiple Choice
  - Multiple Select
  - True/False
  - Short Answer (typed)
  - Essay (manual graded)
  - Matching
  - Flashcard
  - Fill in the Blank
- **Difficulty** (optional) - easy, medium, hard
- **Tags** (optional)
- **Points** (optional, default value)
- **Explanation** (optional, shown after grading)

#### Answer Configuration
- **Correct Answers** (required)
  - For choice-based: select correct option(s)
  - For typed: list accepted answers
- **Distractors** (wrong answers)
  - For choice-based: configurable options
- **Percentage Match Threshold** (typed answers only)
  - Numeric (0–100)
  - Default: 80%
  - Used by auto-grader to accept close matches

#### Question Hierarchy (for Adaptive Testing)
- **Parent Question** (optional) - concept hierarchy
- **Related Questions** (optional) - same concept, skip if parent correct
- **Prerequisite Questions** (optional) - must answer first
- **Concept Tag** (optional) - groups questions by concept
- **Difficulty Progression** (optional) - order within progression

---

## Wireframes

### Question Bank Overview (Department Scoped)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Question Bank                                    [Marketing Department] │
├─────────────────────────────────────────────────────────────────────────┤
│ Bank: [All Banks ▼] [+ Create Bank]                                     │
│ Search: [____________________]  Type [All ▼]  Difficulty [All ▼]        │
│ Tags [All ▼]   [Create Question]   [Bulk Import]                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Bank: Geography Fundamentals (45 questions)                             │
│ ├─ Q: "What is capital of France?"   MCQ   Easy    Used: 3   [Edit]    │
│ ├─ Q: "Define continental drift"     Short Med     Used: 1   [Edit]    │
│ └─ Q: "Match countries to capitals"  Match Med     Used: 2   [Edit]    │
│                                                                         │
│ Bank: Marketing Basics (22 questions)                                   │
│ ├─ Q: "What is a CTA?"               MCQ   Easy    Used: 5   [Edit]    │
│ └─ Q: "Explain funnel stages"        Essay Hard    Used: 0   [Edit]    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Question Editor (Multiple Choice)
```
┌─────────────────────────────────────────────────────────────┐
│ Create Question                                              │
├─────────────────────────────────────────────────────────────┤
│ Bank: [Geography Fundamentals ▼]                            │
│ Question Text: [________________________________________]   │
│ Type: [Multiple Choice ▼]  Difficulty: [Medium ▼]           │
│ Tags: [ + add tags ]                                        │
│ Points: [ 1 ]                                               │
│ Explanation: [________________________________________]     │
│                                                             │
│ Options (Distractors + Correct)                             │
│  ( ) A. [____________________]                              │
│  (●) B. [____________________]                              │
│  ( ) C. [____________________]                              │
│  ( ) D. [____________________]                              │
│  [Add Option]                                               │
│                                                             │
│ ▼ Advanced: Hierarchy                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Related Questions: [Select...]                          │ │
│ │ Concept Tag: [geography-capitals]                       │ │
│ │ Difficulty Progression: [1]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                      [Save] │
└─────────────────────────────────────────────────────────────┘
```

### Question Editor (Short Answer)
```
┌─────────────────────────────────────────────────────────────┐
│ Create Question                                              │
├─────────────────────────────────────────────────────────────┤
│ Bank: [Geography Fundamentals ▼]                            │
│ Question Text: [________________________________________]   │
│ Type: [Short Answer ▼]  Difficulty: [Medium ▼]              │
│ Tags: [ + add tags ]  Points: [ 2 ]                         │
│                                                             │
│ Accepted Answers                                            │
│  - [____________________]                                   │
│  - [____________________]                                   │
│  [Add Answer]                                               │
│                                                             │
│ Percentage Match Threshold: [ 80 ] %                        │
│ (Used for auto-grading near matches)                        │
│                                                             │
│                                                      [Save] │
└─────────────────────────────────────────────────────────────┘
```

### System Admin: Cross-Department Copy (NEW)
```
┌─────────────────────────────────────────────────────────────┐
│ Copy Questions Between Departments                          │
├─────────────────────────────────────────────────────────────┤
│ Source Department: [Marketing ▼]                            │
│ Source Bank: [All Banks ▼]                                  │
│                                                             │
│ Select Questions to Copy:                                   │
│ ☑ "What is a CTA?"                                         │
│ ☑ "Define funnel stages"                                   │
│ ☐ "Email best practices"                                   │
│                                                             │
│ Target Department: [Sales ▼]                                │
│ Target Bank: [Create New... ▼]                              │
│ New Bank Name: [Sales Training Questions]                   │
│                                                             │
│                                        [Cancel] [Copy (2)]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Quiz/Assessment Settings (Randomization & Repetition)

### Randomization Levels
| Level | Description |
|-------|-------------|
| `in_order` | Questions appear in defined sequence order |
| `by_difficulty` | Questions sorted by difficulty (easy→hard or configurable) |
| `completely_random` | Full randomization on each attempt |

### Repetition (Mastery-Based)
- **Repetition Threshold**: Number of correct answers before question is "turned off"
- Example: If threshold = 3, after 3 correct answers, question won't appear again this testing round
- Resets per course attempt/enrollment

### User Selection
- If `allowUserRandomizationChoice = true`, learner sees dropdown to select randomization level
- If `allowUserRandomizationChoice = false`, instructor's setting is used

### Assessment Settings Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Assessment Settings                                          │
├─────────────────────────────────────────────────────────────┤
│ Question Selection Mode: [Manual ▼]                         │
│                                                             │
│ Randomization Level: [By Difficulty ▼]                      │
│   ○ In Order (questions appear in sequence)                 │
│   ● By Difficulty (easy to hard progression)                │
│   ○ Completely Random                                       │
│                                                             │
│ ☑ Allow learner to choose randomization                     │
│                                                             │
│ Repetition Threshold: [ 3 ]                                 │
│ (Questions "turn off" after this many correct answers)      │
│                                                             │
│ ▼ Advanced: Adaptive Testing                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Enable Adaptive Mode                                  │ │
│ │ ☑ Skip related questions on correct answer              │ │
│ │ ☑ Repeat wrong answers                                  │ │
│ │ Repeat Delay: [ 3 ] questions                           │ │
│ │ Difficulty Progression: [Increase on Correct ▼]         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Adaptive Testing Mode (MEDIUM PRIORITY)

### Concept
Adaptive testing adjusts question flow based on learner responses:
- **Skip related questions** when a "parent" concept question is answered correctly
- **Repeat wrong answers** with a delay between repetitions
- **Difficulty progression** - increase/decrease based on performance

### How It Works
1. Questions are organized in a **hierarchy** by concept
2. When learner answers parent question correctly:
   - Related questions (testing same concept) can be skipped
3. When learner answers incorrectly:
   - Question is queued for repeat after N questions
4. Difficulty adjusts based on streak

### Hierarchy Example
```
Geography Capitals (Concept)
├── Q1: "What is the capital of France?" (Parent, Easy)
│   ├── Q2: "Paris is the capital of which country?" (Related)
│   └── Q3: "Which city serves as France's capital?" (Related)
├── Q4: "What is the capital of Germany?" (Parent, Easy)
│   └── Q5: "Berlin is known for..." (Related)
└── Q6: "Name 3 European capitals" (Advanced, requires Q1+Q4)
```

If learner answers Q1 correctly → Q2 and Q3 can be skipped (same concept).

---

## AI-Assisted Quizzing (LOW PRIORITY - Future)

### Concept
LLM watches testing session and adapts questions in real-time:
- Selects next question based on performance patterns
- Provides personalized feedback and hints
- Can identify knowledge gaps
- Future: Generate new questions from question bank patterns

### Instructor Settings
```
┌─────────────────────────────────────────────────────────────┐
│ AI Quizzing Settings (Beta)                                 │
├─────────────────────────────────────────────────────────────┤
│ ☐ Enable AI-Assisted Quizzing                               │
│                                                             │
│ When enabled:                                               │
│ ☐ Allow learner to toggle AI assistance                     │
│ Adaptation Level: [Moderate ▼]                              │
│   ○ Minimal (subtle adjustments)                            │
│   ● Moderate (noticeable adaptation)                        │
│   ○ Aggressive (significant changes)                        │
│                                                             │
│ Feedback Level: [Detailed ▼]                                │
│   ○ None (no AI feedback)                                   │
│   ○ Correct Only (confirm right answers)                    │
│   ● Detailed (explanations and hints)                       │
│   ○ Conversational (interactive)                            │
│                                                             │
│ ☐ Allow AI to generate questions (Future)                   │
│ Question Scope: [Linked Questions Only ▼]                   │
│                                                             │
│ ⚠️ AI quizzing is in beta. Results may vary.                │
└─────────────────────────────────────────────────────────────┘
```

---

## Deletion Rules

### Cannot Delete If Linked
When attempting to delete a question that's linked to learning units:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Cannot Delete Question                                   │
├─────────────────────────────────────────────────────────────┤
│ This question is linked to 3 learning units:                │
│                                                             │
│ • Module 1 Quiz (Introduction Course)                       │
│ • Chapter 3 Assessment (Advanced Course)                    │
│ • Final Exam (Certification Course)                         │
│                                                             │
│ Remove the question from these learning units before        │
│ deleting.                                                   │
│                                                             │
│                                        [View Links] [Close] │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules
- Question Text required.
- Question Bank selection required.
- At least one correct answer required.
- For choice-based questions, at least two options required.
- For short answer, percentage match must be 0–100.
- Repetition threshold must be >= 1 if set.

---

## Data Notes (API/Models)
- Questions are **department-scoped** (not course-scoped)
- System admins can copy questions between departments
- Question hierarchy stored for adaptive testing
- Learner progress tracked per question per enrollment
- See API proposal: `api/agent_coms/messages/2026-01-23_ui_question_bank_api_proposal.md`

---

## Related Specs
- See Learning Activity Editor Forms: ./LEARNING_ACTIVITY_EDITOR_FORMS.md
- See Implementation Plan: ./LEARNING_ACTIVITY_IMPLEMENTATION_PLAN.md
