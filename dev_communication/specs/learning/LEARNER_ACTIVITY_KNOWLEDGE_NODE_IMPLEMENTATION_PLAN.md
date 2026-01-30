# Knowledge Node System - Implementation Plan

## Overview

This document outlines the phased implementation plan for the Knowledge Node adaptive learning system. Each phase builds upon the previous, allowing for incremental delivery and testing.

**Reference:** See `LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md` for detailed specifications.

---

## Phase Summary

| Phase | Name | Description | Dependencies |
|-------|------|-------------|--------------|
| 1 | Foundation | Core models, cognitive depth levels, seeding | None |
| 2 | Knowledge Nodes | Node CRUD, graph relationships | Phase 1 |
| 3 | Question Integration | Link questions to nodes and depth levels | Phase 1, 2 |
| 4 | Progress Tracking | Learner progress models and tracking | Phase 1, 2, 3 |
| 5 | Adaptive Selection | Intelligent question selection algorithm | Phase 1-4 |
| 6 | API Completion | Controllers, routes, contracts, validation | Phase 1-5 |
| 7 | Testing & Documentation | Integration tests, E2E tests, docs | Phase 1-6 |

---

## Phase 1: Foundation

**Goal:** Establish the cognitive depth level system as the foundation for all adaptive learning features.

### 1.1 CognitiveDepthLevel Model

**File:** `/src/models/content/CognitiveDepthLevel.model.ts`

```typescript
interface ICognitiveDepthLevel {
  _id: ObjectId;
  departmentId?: ObjectId;      // null = system default
  slug: string;
  name: string;
  description?: string;
  order: number;
  advanceThreshold: number;     // 0.0 - 1.0
  minAttempts: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// - { slug: 1, departmentId: 1 } unique
// - { departmentId: 1, order: 1 }
// - { isDefault: 1 }
```

### 1.2 Seed Script

**File:** `/scripts/seed-cognitive-depth-levels.ts`

Seeds system default levels:

| slug | name | order | advanceThreshold | minAttempts |
|------|------|-------|------------------|-------------|
| exposure | Exposure | 1 | 0.70 | 2 |
| practice | Practice | 2 | 0.80 | 3 |
| proficiency | Proficiency | 3 | 0.85 | 4 |
| mastery | Mastery | 4 | 0.90 | 5 |

### 1.3 Cognitive Depth Level Service

**File:** `/src/services/content/cognitive-depth-levels.service.ts`

```typescript
class CognitiveDepthLevelsService {
  // Core CRUD
  create(departmentId: ObjectId, data: CreateLevelDto): Promise<ICognitiveDepthLevel>
  update(departmentId: ObjectId, slug: string, data: UpdateLevelDto): Promise<ICognitiveDepthLevel>
  delete(departmentId: ObjectId, slug: string): Promise<void>

  // Resolution (critical for all other services)
  getForDepartment(departmentId: ObjectId): Promise<ICognitiveDepthLevel[]>
  resolveLevel(slug: string, departmentId: ObjectId): Promise<ICognitiveDepthLevel>
  validateSlug(slug: string, departmentId: ObjectId): Promise<boolean>

  // Progression helpers
  getNextLevel(currentSlug: string, departmentId: ObjectId): Promise<ICognitiveDepthLevel | null>
  getPreviousLevel(currentSlug: string, departmentId: ObjectId): Promise<ICognitiveDepthLevel | null>
  getLevelByOrder(order: number, departmentId: ObjectId): Promise<ICognitiveDepthLevel | null>
}
```

### 1.4 Validator

**File:** `/src/validators/cognitive-depth-level.validator.ts`

```typescript
const createSchema = Joi.object({
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).max(50).required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional(),
  order: Joi.number().positive().required(),
  advanceThreshold: Joi.number().min(0).max(1).required(),
  minAttempts: Joi.number().integer().min(1).max(100).required()
});
```

### 1.5 Deliverables

- [ ] `CognitiveDepthLevel.model.ts`
- [ ] `cognitive-depth-levels.service.ts`
- [ ] `cognitive-depth-level.validator.ts`
- [ ] `seed-cognitive-depth-levels.ts`
- [ ] Unit tests for service

---

## Phase 2: Knowledge Nodes

**Goal:** Implement the knowledge node model with graph relationships (parent, prerequisites, related).

### 2.1 KnowledgeNode Model

**File:** `/src/models/content/KnowledgeNode.model.ts`

```typescript
interface IKnowledgeNode {
  _id: ObjectId;
  departmentId: ObjectId;

  // Identity
  name: string;
  slug: string;
  description?: string;

  // Graph relationships
  parentNodeId?: ObjectId;
  prerequisiteNodeIds: ObjectId[];
  relatedNodeIds: ObjectId[];

  // Depth range
  depthRange: {
    min: string;    // slug
    max: string;    // slug
  };

  // Metadata
  tags: string[];
  isActive: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// - { departmentId: 1, slug: 1 } unique
// - { departmentId: 1, isActive: 1 }
// - { parentNodeId: 1 }
// - { prerequisiteNodeIds: 1 }
// - { tags: 1 }
```

### 2.2 Knowledge Nodes Service

**File:** `/src/services/content/knowledge-nodes.service.ts`

```typescript
class KnowledgeNodesService {
  // CRUD
  create(departmentId: ObjectId, data: CreateNodeDto): Promise<IKnowledgeNode>
  getById(nodeId: ObjectId): Promise<IKnowledgeNode>
  getBySlug(departmentId: ObjectId, slug: string): Promise<IKnowledgeNode>
  update(nodeId: ObjectId, data: UpdateNodeDto): Promise<IKnowledgeNode>
  delete(nodeId: ObjectId): Promise<void>

  // Listing
  listForDepartment(departmentId: ObjectId, options: ListOptions): Promise<PaginatedResult<IKnowledgeNode>>
  listAsTree(departmentId: ObjectId): Promise<IKnowledgeNodeTree[]>

  // Graph operations
  getPrerequisites(nodeId: ObjectId, recursive?: boolean): Promise<IKnowledgeNode[]>
  getDependents(nodeId: ObjectId): Promise<IKnowledgeNode[]>  // nodes that require this one
  getRelated(nodeId: ObjectId): Promise<IKnowledgeNode[]>
  getChildren(nodeId: ObjectId): Promise<IKnowledgeNode[]>

  // Relationship management
  addPrerequisite(nodeId: ObjectId, prerequisiteId: ObjectId): Promise<void>
  removePrerequisite(nodeId: ObjectId, prerequisiteId: ObjectId): Promise<void>
  addRelated(nodeId: ObjectId, relatedId: ObjectId): Promise<void>
  removeRelated(nodeId: ObjectId, relatedId: ObjectId): Promise<void>

  // Validation
  validateNoCircularPrerequisites(nodeId: ObjectId, newPrereqId: ObjectId): Promise<boolean>
}
```

### 2.3 Validator

**File:** `/src/validators/knowledge-node.validator.ts`

```typescript
const createSchema = Joi.object({
  name: Joi.string().max(200).required(),
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).max(100).optional(),
  description: Joi.string().max(2000).optional(),
  parentNodeId: Joi.string().hex().length(24).optional(),
  prerequisiteNodeIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  relatedNodeIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  depthRange: Joi.object({
    min: Joi.string().required(),
    max: Joi.string().required()
  }).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional()
});
```

### 2.4 Deliverables

- [ ] `KnowledgeNode.model.ts`
- [ ] `knowledge-nodes.service.ts`
- [ ] `knowledge-node.validator.ts`
- [ ] Unit tests for service
- [ ] Circular dependency detection tests

---

## Phase 3: Question Integration

**Goal:** Add knowledge node and cognitive depth fields to questions, update services and validators.

### 3.1 Question Model Updates

**File:** `/src/models/assessment/Question.model.ts`

Add fields:

```typescript
knowledgeNodeId: {
  type: Schema.Types.ObjectId,
  ref: 'KnowledgeNode',
  index: true,
  required: false
},
cognitiveDepth: {
  type: String,
  index: true,
  required: false
  // Validated against CognitiveDepthLevel collection on save
}
```

### 3.2 Question Service Updates

**File:** `/src/services/content/questions.service.ts`

Add to existing service:

```typescript
// New query options
interface QuestionQueryOptions {
  // ... existing options
  knowledgeNodeId?: ObjectId;
  cognitiveDepth?: string;
  cognitiveDepthRange?: { min: string; max: string };
}

// New methods
getByKnowledgeNode(nodeId: ObjectId, options?: QueryOptions): Promise<IQuestion[]>
getByCognitiveDepth(depth: string, departmentId: ObjectId): Promise<IQuestion[]>
getForAdaptiveSelection(nodeId: ObjectId, depth: string, questionBankIds: ObjectId[]): Promise<IQuestion[]>
```

### 3.3 Department Questions Service Updates

**File:** `/src/services/content/department-questions.service.ts`

Update create/update to:
- Accept `knowledgeNodeId` and `cognitiveDepth`
- Validate `cognitiveDepth` slug exists for department
- Validate `knowledgeNodeId` belongs to same department

### 3.4 Validator Updates

**File:** `/src/validators/department-question.validator.ts`

Add to schema:

```typescript
knowledgeNodeId: Joi.string().hex().length(24).optional(),
cognitiveDepth: Joi.string().max(50).optional()
```

### 3.5 Migration Script

**File:** `/src/migrations/add-knowledge-fields-to-questions.ts`

- Add indexes for new fields
- No data migration needed (fields are optional)

### 3.6 Deliverables

- [ ] Update `Question.model.ts`
- [ ] Update `questions.service.ts`
- [ ] Update `department-questions.service.ts`
- [ ] Update `department-question.validator.ts`
- [ ] Migration script
- [ ] Update existing question tests
- [ ] New tests for knowledge node filtering

---

## Phase 4: Progress Tracking

**Goal:** Implement learner knowledge progress tracking.

### 4.1 LearnerKnowledgeProgress Model

**File:** `/src/models/progress/LearnerKnowledgeProgress.model.ts`

```typescript
interface ILearnerKnowledgeProgress {
  _id: ObjectId;
  learnerId: ObjectId;
  knowledgeNodeId: ObjectId;
  departmentId: ObjectId;

  // Current state
  currentDepth: string;         // slug of current level
  masteryScore: number;         // 0-100

  // Aggregates
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: Date;
  lastCorrectAt: Date;

  // Per-level tracking (Map keyed by slug)
  depthProgress: Map<string, {
    attempts: number;
    correct: number;
    mastered: boolean;
    masteredAt?: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// Indexes:
// - { learnerId: 1, knowledgeNodeId: 1 } unique
// - { learnerId: 1, departmentId: 1 }
// - { knowledgeNodeId: 1 }
// - { currentDepth: 1 }
// - { masteryScore: 1 }
```

### 4.2 Learner Knowledge Progress Service

**File:** `/src/services/progress/learner-knowledge-progress.service.ts`

```typescript
class LearnerKnowledgeProgressService {
  // Core operations
  getOrCreate(learnerId: ObjectId, knowledgeNodeId: ObjectId): Promise<ILearnerKnowledgeProgress>
  getForLearner(learnerId: ObjectId, departmentId?: ObjectId): Promise<ILearnerKnowledgeProgress[]>
  getForNode(learnerId: ObjectId, nodeId: ObjectId): Promise<ILearnerKnowledgeProgress | null>

  // Progress updates
  recordAttempt(
    learnerId: ObjectId,
    knowledgeNodeId: ObjectId,
    cognitiveDepth: string,
    isCorrect: boolean
  ): Promise<ILearnerKnowledgeProgress>

  // Mastery calculation
  recalculateMasteryScore(progressId: ObjectId): Promise<number>
  checkForLevelAdvancement(progressId: ObjectId): Promise<{
    advanced: boolean;
    newDepth?: string;
  }>

  // Queries
  getMasteredNodes(learnerId: ObjectId, departmentId: ObjectId): Promise<IKnowledgeNode[]>
  getInProgressNodes(learnerId: ObjectId, departmentId: ObjectId): Promise<IKnowledgeNode[]>
  getReadyToLearnNodes(learnerId: ObjectId, departmentId: ObjectId): Promise<IKnowledgeNode[]>

  // Analytics
  getProgressSummary(learnerId: ObjectId, departmentId: ObjectId): Promise<ProgressSummary>
}

interface ProgressSummary {
  totalNodes: number;
  masteredNodes: number;
  inProgressNodes: number;
  notStartedNodes: number;
  overallMasteryPercent: number;
  depthDistribution: { [slug: string]: number };
}
```

### 4.3 Deliverables

- [ ] `LearnerKnowledgeProgress.model.ts`
- [ ] `learner-knowledge-progress.service.ts`
- [ ] Unit tests for progress tracking
- [ ] Tests for mastery calculation
- [ ] Tests for level advancement

---

## Phase 5: Adaptive Selection

**Goal:** Implement the intelligent question selection algorithm.

### 5.1 Adaptive Question Selection Service

**File:** `/src/services/progress/adaptive-question-selection.service.ts`

```typescript
class AdaptiveQuestionSelectionService {

  // Main selection method
  selectQuestion(params: SelectionParams): Promise<SelectedQuestion>

  // Selection with multiple questions
  selectQuestions(params: SelectionParams, count: number): Promise<SelectedQuestion[]>

  // Record response and update progress
  recordResponse(params: ResponseParams): Promise<ResponseResult>
}

interface SelectionParams {
  learnerId: ObjectId;
  knowledgeNodeId: ObjectId;
  questionBankIds?: ObjectId[];       // Optional filter
  excludeQuestionIds?: ObjectId[];    // Don't repeat these
  preferredTypes?: string[];          // Preferred question types
}

interface SelectedQuestion {
  question: IQuestion;
  presentationType: string;           // Selected from questionTypes[]
  cognitiveDepth: string;
  selectionReason: string;            // "advancing", "reinforcing", "reviewing"
  adaptiveMetadata: {
    currentMastery: number;
    targetDepth: string;
    progressToNextDepth: number;      // 0-100
  };
}

interface ResponseParams {
  learnerId: ObjectId;
  questionId: ObjectId;
  knowledgeNodeId: ObjectId;
  cognitiveDepth: string;
  presentationType: string;
  isCorrect: boolean;
  responseTimeMs?: number;
}

interface ResponseResult {
  progressUpdated: boolean;
  newMasteryScore: number;
  levelAdvanced: boolean;
  newDepth?: string;
}
```

### 5.2 Selection Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                   Selection Algorithm                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. GET LEARNER PROGRESS                                        │
│     - Fetch LearnerKnowledgeProgress for node                   │
│     - If none exists, start at first depth level                │
│                                                                  │
│  2. DETERMINE TARGET DEPTH                                      │
│     - Check if can advance (threshold met)                      │
│     - If yes: targetDepth = next level ("advancing")            │
│     - If no: targetDepth = current level ("reinforcing")        │
│     - If mastery complete: review random level ("reviewing")    │
│                                                                  │
│  3. QUERY CANDIDATE QUESTIONS                                   │
│     Question.find({                                              │
│       knowledgeNodeId,                                          │
│       cognitiveDepth: targetDepth,                              │
│       questionBankId: { $in: questionBankIds },                 │
│       _id: { $nin: excludeQuestionIds },                        │
│       isActive: true                                             │
│     })                                                           │
│                                                                  │
│  4. RANK CANDIDATES                                             │
│     Score based on:                                              │
│     - Time since last shown (longer = higher)                   │
│     - Learner's success rate with question types                │
│     - Variety (different type than last question)               │
│     - Random factor for variety                                  │
│                                                                  │
│  5. SELECT PRESENTATION TYPE                                    │
│     From question.questionTypes[], choose based on:             │
│     - Learner needs practice with this type                     │
│     - Variety from recent presentations                         │
│     - Type appropriate for cognitive depth                      │
│                                                                  │
│  6. RETURN SELECTED QUESTION                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Integration Points

Update `assessment-attempts.service.ts` to:
- Optionally use adaptive selection when starting an attempt
- Record responses to update knowledge progress
- Include adaptive metadata in attempt results

### 5.4 Deliverables

- [ ] `adaptive-question-selection.service.ts`
- [ ] Integration with `assessment-attempts.service.ts`
- [ ] Unit tests for selection algorithm
- [ ] Tests for edge cases (no questions available, all mastered, etc.)

---

## Phase 6: API Completion

**Goal:** Create all controllers, routes, and API contracts.

### 6.1 Cognitive Depth Levels Controller

**File:** `/src/controllers/content/cognitive-depth-levels.controller.ts`

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/cognitive-depth-levels` | `listSystemDefaults` |
| GET | `/departments/:departmentId/cognitive-depth-levels` | `listForDepartment` |
| POST | `/departments/:departmentId/cognitive-depth-levels` | `create` |
| PUT | `/departments/:departmentId/cognitive-depth-levels/:slug` | `update` |
| DELETE | `/departments/:departmentId/cognitive-depth-levels/:slug` | `delete` |

### 6.2 Knowledge Nodes Controller

**File:** `/src/controllers/content/knowledge-nodes.controller.ts`

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/departments/:deptId/knowledge-nodes` | `create` |
| GET | `/departments/:deptId/knowledge-nodes` | `list` |
| GET | `/departments/:deptId/knowledge-nodes/tree` | `listAsTree` |
| GET | `/departments/:deptId/knowledge-nodes/:nodeId` | `getById` |
| PUT | `/departments/:deptId/knowledge-nodes/:nodeId` | `update` |
| DELETE | `/departments/:deptId/knowledge-nodes/:nodeId` | `delete` |
| GET | `/departments/:deptId/knowledge-nodes/:nodeId/questions` | `getQuestions` |
| GET | `/departments/:deptId/knowledge-nodes/:nodeId/graph` | `getGraph` |
| POST | `/departments/:deptId/knowledge-nodes/:nodeId/prerequisites` | `addPrerequisite` |
| DELETE | `/departments/:deptId/knowledge-nodes/:nodeId/prerequisites/:prereqId` | `removePrerequisite` |

### 6.3 Learner Knowledge Progress Controller

**File:** `/src/controllers/progress/learner-knowledge-progress.controller.ts`

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/learners/:learnerId/knowledge-progress` | `getAll` |
| GET | `/learners/:learnerId/knowledge-progress/:nodeId` | `getForNode` |
| GET | `/learners/:learnerId/knowledge-progress/summary` | `getSummary` |
| GET | `/departments/:deptId/learners/:learnerId/knowledge-map` | `getKnowledgeMap` |

### 6.4 Adaptive Selection Controller

**File:** `/src/controllers/progress/adaptive-selection.controller.ts`

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/adaptive/select-question` | `selectQuestion` |
| POST | `/adaptive/select-questions` | `selectMultiple` |
| POST | `/adaptive/record-response` | `recordResponse` |

### 6.5 API Contracts

**Files:**
- `/contracts/api/cognitive-depth-levels.contract.ts`
- `/contracts/api/knowledge-nodes.contract.ts`
- `/contracts/api/learner-knowledge-progress.contract.ts`
- `/contracts/api/adaptive-selection.contract.ts`

### 6.6 Route Registration

**File:** `/src/routes/index.ts`

Register new route files:
- `cognitive-depth-levels.routes.ts`
- `knowledge-nodes.routes.ts`
- `learner-knowledge-progress.routes.ts`
- `adaptive-selection.routes.ts`

### 6.7 Deliverables

- [ ] All controllers
- [ ] All route files
- [ ] All contracts
- [ ] Route registration
- [ ] Access control/permission checks

---

## Phase 7: Testing & Documentation

**Goal:** Comprehensive testing and documentation.

### 7.1 Unit Tests

| File | Coverage |
|------|----------|
| `cognitive-depth-levels.service.test.ts` | Level CRUD, resolution, ordering |
| `knowledge-nodes.service.test.ts` | Node CRUD, graph operations, circular detection |
| `learner-knowledge-progress.service.test.ts` | Progress tracking, mastery calculation |
| `adaptive-question-selection.service.test.ts` | Selection algorithm, edge cases |

### 7.2 Integration Tests

| File | Coverage |
|------|----------|
| `cognitive-depth-levels.integration.test.ts` | API endpoints, department override |
| `knowledge-nodes.integration.test.ts` | API endpoints, relationships |
| `learner-knowledge-progress.integration.test.ts` | Progress API, learner isolation |
| `adaptive-selection.integration.test.ts` | End-to-end adaptive flow |

### 7.3 E2E Tests

| Scenario | Description |
|----------|-------------|
| Adaptive learning journey | Learner progresses through all depth levels |
| Department customization | Department overrides default levels |
| Knowledge prerequisites | Learner must complete prerequisites first |
| Cross-bank questions | Adaptive selection across multiple question banks |

### 7.4 Documentation Updates

- [ ] Update API documentation
- [ ] Add knowledge node admin guide
- [ ] Add adaptive learning configuration guide
- [ ] Update developer guide

### 7.5 Deliverables

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E test scenarios passing
- [ ] Documentation complete

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    Implementation Timeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: Foundation                                            │
│  ├── CognitiveDepthLevel.model.ts                              │
│  ├── cognitive-depth-levels.service.ts                         │
│  ├── seed-cognitive-depth-levels.ts                            │
│  └── Unit tests                                                 │
│           │                                                      │
│           ▼                                                      │
│  Phase 2: Knowledge Nodes                                       │
│  ├── KnowledgeNode.model.ts                                    │
│  ├── knowledge-nodes.service.ts                                │
│  └── Unit tests                                                 │
│           │                                                      │
│           ▼                                                      │
│  Phase 3: Question Integration                                  │
│  ├── Update Question.model.ts                                  │
│  ├── Update question services                                   │
│  ├── Migration script                                           │
│  └── Unit tests                                                 │
│           │                                                      │
│           ▼                                                      │
│  Phase 4: Progress Tracking                                     │
│  ├── LearnerKnowledgeProgress.model.ts                         │
│  ├── learner-knowledge-progress.service.ts                     │
│  └── Unit tests                                                 │
│           │                                                      │
│           ▼                                                      │
│  Phase 5: Adaptive Selection                                    │
│  ├── adaptive-question-selection.service.ts                    │
│  ├── Integration with assessment-attempts                       │
│  └── Unit tests                                                 │
│           │                                                      │
│           ▼                                                      │
│  Phase 6: API Completion                                        │
│  ├── All controllers                                            │
│  ├── All routes                                                 │
│  ├── All contracts                                              │
│  └── Permission checks                                          │
│           │                                                      │
│           ▼                                                      │
│  Phase 7: Testing & Documentation                               │
│  ├── Integration tests                                          │
│  ├── E2E tests                                                  │
│  └── Documentation                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circular prerequisite dependencies | Implement validation on add, graph traversal check |
| Performance with large knowledge graphs | Index optimization, limit recursion depth, caching |
| Cognitive depth slug changes | Prevent slug changes if in use, or cascade updates |
| Orphaned progress records | Cleanup job when nodes deleted, soft delete nodes |
| Adaptive algorithm gaming | Rate limiting, minimum time between attempts |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Default cognitive depth levels seeded
- [ ] Levels can be customized per department
- [ ] Level resolution works (department → system fallback)

### Phase 2 Complete When:
- [ ] Knowledge nodes can be created with relationships
- [ ] Graph operations work (prerequisites, related, children)
- [ ] Circular dependency detection works

### Phase 3 Complete When:
- [ ] Questions can be linked to knowledge nodes
- [ ] Questions can have cognitive depth assigned
- [ ] Filtering by node/depth works

### Phase 4 Complete When:
- [ ] Progress tracked per learner per node
- [ ] Mastery score calculates correctly
- [ ] Level advancement triggers appropriately

### Phase 5 Complete When:
- [ ] Adaptive selection returns appropriate questions
- [ ] Question type selection considers learner history
- [ ] Progress updates on response

### Phase 6 Complete When:
- [ ] All endpoints accessible and secured
- [ ] Contracts match implementation
- [ ] Permissions enforced

### Phase 7 Complete When:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] System ready for production use

---

## Status

**Plan Status**: APPROVED
**Implementation Status**: IN PROGRESS
**Current Phase**: Phase 6 Complete

### Completed Phases

- [x] **Phase 1: Foundation** - CognitiveDepthLevel model, service, validator, seed
- [x] **Phase 2: Knowledge Nodes** - KnowledgeNode model, service, validator
- [x] **Phase 3: Question Integration** - Added knowledgeNodeId and cognitiveDepth to Question model, updated services and validators, created migration script
- [x] **Phase 4: Progress Tracking** - LearnerKnowledgeProgress model and service with mastery calculation and level advancement
- [x] **Phase 5: Adaptive Selection** - AdaptiveQuestionSelectionService with intelligent question selection
- [x] **Phase 6: API Completion** - Controllers, routes, and API contracts for all adaptive learning endpoints
- [x] **Phase 7: Testing & Documentation** - Integration tests (139 passing), E2E tests, documentation

### Status

**ALL PHASES COMPLETE** - The Knowledge Node adaptive learning system is fully implemented and tested.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | API Agent | Initial implementation plan |
| 2026-01-24 | API Agent | Phase 1 (Foundation) complete |
| 2026-01-24 | API Agent | Phase 2 (Knowledge Nodes) complete |
| 2026-01-24 | API Agent | Phase 3 (Question Integration) complete |
| 2026-01-24 | API Agent | Phase 4 (Progress Tracking) complete |
| 2026-01-24 | API Agent | Phase 5 (Adaptive Selection) complete |
| 2026-01-24 | API Agent | Phase 6 (API Completion) complete |
| 2026-01-24 | API Agent | Phase 7 (Testing & Documentation) complete - ALL PHASES DONE |
