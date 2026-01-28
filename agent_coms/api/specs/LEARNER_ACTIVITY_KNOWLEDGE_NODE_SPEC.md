# Learner Activity Knowledge Node Specification

## Overview

This specification defines the **Knowledge Node** system for enabling adaptive learning in Cadence LMS. Knowledge Nodes provide a way to relate questions across question banks by knowledge topic, enabling:

- Cross-bank question relationships by concept
- Progressive learning paths based on cognitive depth
- Adaptive question selection based on learner mastery
- Department-specific knowledge taxonomies

---

## Knowledge Level Concept Analysis

### The Question: Bloom's Taxonomy vs Alternatives

Bloom's Taxonomy is widely recognized in academic settings but may be overly complex for practical LMS implementation. Here's a comparison of approaches:

### Option 1: Bloom's Taxonomy (6 levels)

```
remember → understand → apply → analyze → evaluate → create
```

| Pros | Cons |
|------|------|
| Industry standard in education | 6 levels may be overly granular |
| Well-documented with clear definitions | Academic jargon may confuse non-educators |
| Familiar to instructional designers | Hard to consistently classify questions |
| Supports deep academic rigor | "Evaluate" vs "Analyze" distinction is subtle |

### Option 2: Webb's Depth of Knowledge (4 levels)

```
recall → skill/concept → strategic thinking → extended thinking
```

| Pros | Cons |
|------|------|
| Simpler than Bloom's | Less recognized outside K-12 |
| Practical for assessment design | Still somewhat academic |
| Clear progression | Limited adoption in corporate training |

### Option 3: Mastery-Based (4 levels) - RECOMMENDED

```
exposure → practice → proficiency → mastery
```

| Level | Description | Question Characteristics |
|-------|-------------|-------------------------|
| **Exposure** | First introduction to concept | Recognition, basic recall, definitions |
| **Practice** | Building familiarity | Application of concept in simple contexts |
| **Proficiency** | Consistent correct application | Multi-step problems, varied contexts |
| **Mastery** | Deep understanding, can teach others | Complex scenarios, synthesis, edge cases |

| Pros | Cons |
|------|------|
| Intuitive for all users | Less academic rigor |
| Easy to classify questions | May not satisfy formal education requirements |
| Clear progression path | Fewer gradations |
| Works for corporate & academic | |

### Option 4: Hybrid Approach

Store both a simple `cognitiveDepth` for the system AND allow optional `bloomsLevel` tagging for institutions that require it:

```typescript
cognitiveDepth: 'exposure' | 'practice' | 'proficiency' | 'mastery'  // Required
bloomsLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'  // Optional
```

### Recommendation

**Use Option 3 (Mastery-Based)** with the field name `cognitiveDepth` because:

1. Intuitive for content creators without education backgrounds
2. Sufficient granularity for adaptive algorithms
3. Clear, actionable levels
4. Can always be extended or mapped to Bloom's later if needed

### Final Design Decision

**Dynamic levels stored in database** with:
- **Option B**: Department override (departments can customize, fall back to system defaults)
- **Approach 2**: Store slug string (readable, validated against DB, no join needed)

This allows:
- Adding new levels in the future without code changes
- Department-specific level customization
- Human-readable data in the Question collection
- Simple queries without joins for most operations

---

## Data Models

### CognitiveDepthLevel Model (Dynamic Levels)

Stores configurable cognitive depth levels. Departments can override system defaults or add custom levels.

```typescript
interface ICognitiveDepthLevel {
  _id: ObjectId;
  departmentId?: ObjectId;          // null = system-wide default

  // Identity
  slug: string;                      // "exposure", "practice", etc.
  name: string;                      // "Exposure", "Practice"
  description?: string;              // "First introduction to concept..."

  // Progression
  order: number;                     // 1, 2, 3, 4... determines sequence

  // Mastery thresholds for this level
  advanceThreshold: number;          // 0.80 = 80% success rate to advance
  minAttempts: number;               // Minimum attempts before can advance

  // Status
  isActive: boolean;
  isDefault: boolean;                // Part of system defaults (departmentId: null)

  createdAt: Date;
  updatedAt: Date;
}

// Compound unique index: { slug: 1, departmentId: 1 }
// Allows same slug for system default AND department override
```

**Default Seeded Levels (departmentId: null, isDefault: true):**

| slug | name | order | advanceThreshold | minAttempts |
|------|------|-------|------------------|-------------|
| exposure | Exposure | 1 | 0.70 | 2 |
| practice | Practice | 2 | 0.80 | 3 |
| proficiency | Proficiency | 3 | 0.85 | 4 |
| mastery | Mastery | 4 | 0.90 | 5 |

**Level Resolution Logic:**
1. Check for department-specific level with matching slug
2. Fall back to system default (departmentId: null)
3. Error if neither exists

### KnowledgeNode Model

Represents a concept/topic node in the knowledge graph.

```typescript
interface IKnowledgeNode {
  _id: ObjectId;
  departmentId: ObjectId;           // Department ownership

  // Identity
  name: string;                      // "Light Scattering in Atmosphere"
  slug: string;                      // "light-scattering-atmosphere"
  description?: string;              // Detailed explanation of this knowledge area

  // Graph Relationships
  parentNodeId?: ObjectId;           // Parent concept (broader topic)
  prerequisiteNodeIds: ObjectId[];   // Must understand these first
  relatedNodeIds: ObjectId[];        // Related but not prerequisite

  // Cognitive depth range available for this node (slugs, not ObjectIds)
  depthRange: {
    min: string;                     // Slug of minimum depth level
    max: string;                     // Slug of maximum depth level
  };

  // Metadata
  tags: string[];
  isActive: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Question Model Updates

Add fields to existing Question model:

```typescript
// Add to existing Question schema:
knowledgeNodeId: {
  type: Schema.Types.ObjectId,
  ref: 'KnowledgeNode',
  index: true,
  required: false              // Optional - questions can exist without nodes
},
cognitiveDepth: {
  type: String,                // Stores slug: "practice", "exposure", etc.
  index: true,
  required: false,             // Optional - questions can exist without depth
  validate: {
    // Custom validator checks slug exists in CognitiveDepthLevel collection
    // for either the question's department or system defaults
  }
}
```

**Validation on save:**
```typescript
async function validateCognitiveDepth(slug: string, departmentId: ObjectId): Promise<boolean> {
  const level = await CognitiveDepthLevel.findOne({
    slug,
    $or: [
      { departmentId },
      { departmentId: null, isDefault: true }
    ],
    isActive: true
  });
  return !!level;
}
```

### LearnerKnowledgeProgress Model

Tracks learner mastery of knowledge nodes.

```typescript
interface ILearnerKnowledgeProgress {
  _id: ObjectId;
  learnerId: ObjectId;
  knowledgeNodeId: ObjectId;
  departmentId: ObjectId;

  // Current mastery state
  currentDepth: string;              // Slug of highest depth demonstrated
  masteryScore: number;              // 0-100 confidence score

  // Attempt history
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: Date;
  lastCorrectAt: Date;

  // Depth-level progression tracking (dynamic, keyed by slug)
  depthProgress: Map<string, IDepthLevelProgress>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface IDepthLevelProgress {
  attempts: number;
  correct: number;
  mastered: boolean;
  masteredAt?: Date;
}
```

**MongoDB Schema (using Mixed type for dynamic keys):**
```typescript
depthProgress: {
  type: Map,
  of: {
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    mastered: { type: Boolean, default: false },
    masteredAt: { type: Date }
  },
  default: {}
}
```

**Example document:**
```json
{
  "learnerId": "ObjectId(...)",
  "knowledgeNodeId": "ObjectId(...)",
  "currentDepth": "practice",
  "masteryScore": 65,
  "depthProgress": {
    "exposure": { "attempts": 5, "correct": 4, "mastered": true, "masteredAt": "2026-01-20" },
    "practice": { "attempts": 8, "correct": 5, "mastered": false }
  }
}
```

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Knowledge Node Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        DEPARTMENT                                    │   │
│   │                     (owns everything)                                │   │
│   └───────────────────────────┬─────────────────────────────────────────┘   │
│                               │                                              │
│              ┌────────────────┼────────────────┐                            │
│              ▼                ▼                ▼                            │
│   ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐               │
│   │  Question Banks  │ │   Knowledge  │ │     Learners     │               │
│   │  (Administrative)│ │    Nodes     │ │                  │               │
│   │                  │ │  (Conceptual)│ │                  │               │
│   └────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘               │
│            │                  │                   │                         │
│            │    ┌─────────────┴─────────────┐    │                         │
│            │    │                           │    │                         │
│            ▼    ▼                           ▼    ▼                         │
│   ┌──────────────────────────┐    ┌──────────────────────────┐            │
│   │        QUESTIONS         │    │   LearnerKnowledge       │            │
│   │                          │    │      Progress            │            │
│   │  - questionBankId        │    │                          │            │
│   │  - knowledgeNodeId ──────┼────│  - knowledgeNodeId       │            │
│   │  - cognitiveDepth        │    │  - currentDepth          │            │
│   │  - questionTypes[]       │    │  - masteryScore          │            │
│   │                          │    │  - depthProgress{}       │            │
│   └──────────────────────────┘    └──────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      Knowledge Node Graph Example                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ┌─────────────────────┐                              │
│                        │   Atmospheric       │                              │
│                        │   Science           │                              │
│                        │   (Parent Node)     │                              │
│                        └──────────┬──────────┘                              │
│                                   │                                          │
│              ┌────────────────────┼────────────────────┐                    │
│              ▼                    ▼                    ▼                    │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │  Light &        │  │   Atmospheric   │  │   Weather       │           │
│   │  Radiation      │  │   Chemistry     │  │   Patterns      │           │
│   └────────┬────────┘  └────────┬────────┘  └─────────────────┘           │
│            │                    │                                           │
│            │   prerequisite     │                                           │
│            └───────────────────►│                                           │
│            │                    │                                           │
│            ▼                    ▼                                           │
│   ┌─────────────────┐  ┌─────────────────┐                                 │
│   │  Light          │  │   Molecular     │                                 │
│   │  Scattering     │◄─│   Interactions  │  (related)                      │
│   │                 │  │                 │                                 │
│   │  Questions:     │  │  Questions:     │                                 │
│   │  - Why sky blue?│  │  - What is      │                                 │
│   │  - Sunset colors│  │    dispersion?  │                                 │
│   │  - Rayleigh eq. │  │  - Frequency    │                                 │
│   └─────────────────┘  │    effects      │                                 │
│                        └─────────────────┘                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Adaptive Question Selection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Adaptive Question Selection                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT: learnerId, knowledgeNodeId, questionBankIds[]                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 1. GET LEARNER PROGRESS                                             │     │
│  │    Query LearnerKnowledgeProgress for this node                     │     │
│  │    Result: currentDepth = "practice", masteryScore = 65             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 2. DETERMINE TARGET DEPTH                                           │     │
│  │                                                                      │     │
│  │    if masteryScore >= 80 for current depth:                         │     │
│  │      targetDepth = next level (practice → proficiency)              │     │
│  │    else:                                                             │     │
│  │      targetDepth = current level (more practice needed)             │     │
│  │                                                                      │     │
│  │    Result: targetDepth = "practice" (score < 80)                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 3. QUERY MATCHING QUESTIONS                                         │     │
│  │                                                                      │     │
│  │    Question.find({                                                   │     │
│  │      knowledgeNodeId: targetNode,                                   │     │
│  │      cognitiveDepth: targetDepth,                                   │     │
│  │      questionBankId: { $in: questionBankIds },                      │     │
│  │      isActive: true                                                  │     │
│  │    })                                                                │     │
│  │                                                                      │     │
│  │    Result: 12 questions match                                        │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 4. SELECT QUESTION & PRESENTATION TYPE                              │     │
│  │                                                                      │     │
│  │    Selection factors:                                                │     │
│  │    - Avoid recently shown questions                                  │     │
│  │    - Learner's success rate per questionType                        │     │
│  │    - Variety (rotate presentation types)                            │     │
│  │    - Difficulty progression within depth                            │     │
│  │                                                                      │     │
│  │    Selected: Question #7                                             │     │
│  │    questionTypes: ['multiple_choice', 'short_answer', 'matching']   │     │
│  │    Chosen type: 'short_answer' (learner needs practice)             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    ▼                                         │
│  OUTPUT: {                                                                   │
│    question: Question #7,                                                    │
│    presentationType: 'short_answer',                                        │
│    cognitiveDepth: 'practice',                                              │
│    knowledgeNodeId: ObjectId,                                               │
│    adaptiveMetadata: {                                                       │
│      reason: 'Continuing practice at current depth',                        │
│      progressToNextDepth: 65                                                 │
│    }                                                                         │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Cognitive Depth Level Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cognitive-depth-levels` | List system default levels |
| GET | `/departments/:departmentId/cognitive-depth-levels` | List levels for department (includes defaults) |
| POST | `/departments/:departmentId/cognitive-depth-levels` | Create department-specific level |
| PUT | `/departments/:departmentId/cognitive-depth-levels/:slug` | Update department level |
| DELETE | `/departments/:departmentId/cognitive-depth-levels/:slug` | Delete department level (reverts to default) |

### Knowledge Node Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/departments/:departmentId/knowledge-nodes` | Create knowledge node |
| GET | `/departments/:departmentId/knowledge-nodes` | List all nodes (with tree option) |
| GET | `/departments/:departmentId/knowledge-nodes/:nodeId` | Get single node |
| PUT | `/departments/:departmentId/knowledge-nodes/:nodeId` | Update node |
| DELETE | `/departments/:departmentId/knowledge-nodes/:nodeId` | Delete node |
| GET | `/departments/:departmentId/knowledge-nodes/:nodeId/questions` | Get questions for node |
| GET | `/departments/:departmentId/knowledge-nodes/:nodeId/graph` | Get node with relationships |
| POST | `/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites` | Add prerequisite |
| DELETE | `/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites/:prereqId` | Remove prerequisite |

### Learner Knowledge Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learners/:learnerId/knowledge-progress` | Get all progress for learner |
| GET | `/learners/:learnerId/knowledge-progress/:nodeId` | Get progress for specific node |
| GET | `/departments/:departmentId/learners/:learnerId/knowledge-map` | Visual progress map |

### Adaptive Question Selection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/adaptive/select-question` | Select next question adaptively |
| POST | `/adaptive/record-response` | Record response and update progress |

---

## Implementation Files

### New Files to Create

| File | Location | Purpose |
|------|----------|---------|
| `CognitiveDepthLevel.model.ts` | `/src/models/content/` | Dynamic depth level schema |
| `KnowledgeNode.model.ts` | `/src/models/content/` | Knowledge node schema |
| `LearnerKnowledgeProgress.model.ts` | `/src/models/progress/` | Learner progress tracking |
| `cognitive-depth-levels.service.ts` | `/src/services/content/` | Level CRUD & resolution |
| `knowledge-nodes.service.ts` | `/src/services/content/` | Node CRUD & graph operations |
| `learner-knowledge-progress.service.ts` | `/src/services/progress/` | Progress tracking |
| `adaptive-question-selection.service.ts` | `/src/services/progress/` | Adaptive algorithm |
| `cognitive-depth-levels.controller.ts` | `/src/controllers/content/` | Level HTTP handlers |
| `knowledge-nodes.controller.ts` | `/src/controllers/content/` | Node HTTP handlers |
| `cognitive-depth-level.validator.ts` | `/src/validators/` | Level request validation |
| `knowledge-node.validator.ts` | `/src/validators/` | Node request validation |
| `cognitive-depth-levels.contract.ts` | `/contracts/api/` | Level API contracts |
| `knowledge-nodes.contract.ts` | `/contracts/api/` | Node API contracts |
| `seed-cognitive-depth-levels.ts` | `/scripts/` | Seed default levels |

### Files to Modify

| File | Changes |
|------|---------|
| `Question.model.ts` | Add `knowledgeNodeId`, `cognitiveDepth` fields |
| `department-question.validator.ts` | Add validation for new fields |
| `questions.service.ts` | Support filtering by node/depth |
| `department-questions.service.ts` | Support filtering by node/depth |

---

## Mastery Calculation Algorithm

```typescript
class MasteryCalculator {

  // Get all levels for department (ordered)
  async getLevels(departmentId: ObjectId): Promise<ICognitiveDepthLevel[]> {
    return CognitiveDepthLevel.find({
      $or: [
        { departmentId },
        { departmentId: null, isDefault: true }
      ],
      isActive: true
    }).sort({ order: 1 });
  }

  // Calculate mastery score (0-100) using dynamic levels
  async calculateScore(
    depthProgress: Map<string, IDepthLevelProgress>,
    departmentId: ObjectId
  ): Promise<number> {
    const levels = await this.getLevels(departmentId);
    const totalLevels = levels.length;

    // Weight distribution: later levels worth more
    // e.g., 4 levels: [0.10, 0.20, 0.30, 0.40]
    const weights = levels.map((_, i) => (i + 1) / ((totalLevels * (totalLevels + 1)) / 2));

    let score = 0;
    levels.forEach((level, i) => {
      const progress = depthProgress.get(level.slug);
      if (!progress) return;

      if (progress.mastered) {
        score += weights[i] * 100;
      } else if (progress.attempts > 0) {
        const rate = progress.correct / progress.attempts;
        score += weights[i] * rate * 80; // Partial credit capped at 80%
      }
    });

    return Math.round(score);
  }

  // Determine if ready for next depth (uses level's own thresholds)
  async canAdvance(
    currentSlug: string,
    depthProgress: Map<string, IDepthLevelProgress>,
    departmentId: ObjectId
  ): Promise<{ canAdvance: boolean; nextLevel?: ICognitiveDepthLevel }> {
    const levels = await this.getLevels(departmentId);
    const currentIndex = levels.findIndex(l => l.slug === currentSlug);
    const currentLevel = levels[currentIndex];
    const nextLevel = levels[currentIndex + 1];

    if (!nextLevel) {
      return { canAdvance: false }; // Already at max level
    }

    const progress = depthProgress.get(currentSlug);
    if (!progress || progress.attempts < currentLevel.minAttempts) {
      return { canAdvance: false, nextLevel };
    }

    const successRate = progress.correct / progress.attempts;
    return {
      canAdvance: successRate >= currentLevel.advanceThreshold,
      nextLevel
    };
  }

  // Get next level by order
  async getNextLevel(currentSlug: string, departmentId: ObjectId): Promise<ICognitiveDepthLevel | null> {
    const levels = await this.getLevels(departmentId);
    const currentIndex = levels.findIndex(l => l.slug === currentSlug);
    return levels[currentIndex + 1] || null;
  }
}
```

---

## Question Bank vs Knowledge Node

These are **orthogonal organizing systems**:

| Aspect | Question Bank | Knowledge Node |
|--------|---------------|----------------|
| **Purpose** | Administrative grouping | Conceptual relationship |
| **Organized by** | Course, topic, exam | Knowledge concept, skill |
| **Used for** | Content management, access control | Adaptive learning, prerequisites |
| **Scope** | Single department typically | Can span departments (future) |
| **Hierarchy** | Flat (questions belong to bank) | Graph (prerequisites, relations) |

A single question can belong to:
- One Question Bank (administrative home)
- One Knowledge Node (conceptual topic)

Example:
```
Question: "Why is the sky blue?"
├── Question Bank: "Physics 101 Final Exam" (administrative)
└── Knowledge Node: "Light Scattering" (conceptual)
```

---

## Future Enhancements

1. **Cross-department knowledge sharing** - Allow knowledge nodes to be shared/referenced across departments
2. **AI-assisted node classification** - Auto-suggest knowledge node and cognitive depth for new questions
3. **Learning path generation** - Auto-generate learning paths based on node prerequisites
4. **Spaced repetition integration** - Use knowledge progress to schedule review sessions
5. **Bloom's taxonomy mapping** - Optional field for institutions requiring formal Bloom's classification

---

## Status

**Specification Status**: DRAFT
**Implementation Status**: NOT STARTED
**Dependencies**: Question Bank System (implemented)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | API Agent | Initial specification |
