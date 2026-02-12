# Entity: Adaptive Learning System

**Type:** System
**Created:** 2026-01-27
**Tags:** #entity #api #adaptive-learning

## Summary

The Adaptive Learning System provides intelligent question selection based on learner mastery progression through knowledge nodes. It tracks learner progress across cognitive depth levels and selects appropriate questions to advance learning.

## Key Characteristics

- **Knowledge Node-based** - Content organized as hierarchical knowledge graph
- **Cognitive depth levels** - Progression from exposure to mastery
- **Prerequisite enforcement** - Nodes can require other nodes be mastered first
- **Per-learner tracking** - Individual progress through each node
- **Adaptive selection** - Questions chosen based on current mastery level

## Components

### Models
- [[cognitive-depth-level]] - Configurable mastery levels (exposure, practice, proficiency, mastery)
- [[knowledge-node]] - Hierarchical knowledge representation with prerequisites
- [[learner-knowledge-progress]] - Per-learner, per-node progress tracking

### Services
- `CognitiveDepthLevelsService` - Manage depth levels with department overrides
- `KnowledgeNodesService` - CRUD + tree/graph operations
- `LearnerKnowledgeProgressService` - Track and update progress
- `AdaptiveQuestionSelectionService` - Intelligent question selection

### API Endpoints

**Cognitive Depth Levels:**
- `GET /api/v2/cognitive-depth-levels` - System defaults
- `GET/POST/PUT/DELETE /api/v2/departments/:id/cognitive-depth-levels` - Department levels

**Knowledge Nodes:**
- `GET/POST/PUT/DELETE /api/v2/departments/:id/knowledge-nodes`
- `GET /api/v2/departments/:id/knowledge-nodes/tree` - Hierarchical view
- `POST/DELETE /api/v2/departments/:id/knowledge-nodes/:id/prerequisites`

**Learner Progress:**
- `GET /api/v2/learners/:id/knowledge-progress`
- `GET /api/v2/learners/:id/knowledge-progress/summary`
- `GET /api/v2/departments/:id/learners/:id/knowledge-map`

**Adaptive Selection:**
- `POST /api/v2/adaptive/select-question` - Single question
- `POST /api/v2/adaptive/select-questions` - Multiple questions
- `POST /api/v2/adaptive/record-response` - Record answer + update progress

## Selection Algorithm

1. Get learner's current progress on knowledge node
2. Check if ready to advance (success rate >= threshold AND attempts >= minAttempts)
3. Determine target depth based on readiness
4. Query questions matching node, depth, and optional filters
5. Randomly select for variety
6. Return with adaptive metadata

## Selection Strategies

- **"advancing"** - Learner ready for next cognitive depth level
- **"reinforcing"** - Learner needs more practice at current level
- **"reviewing"** - Learner has mastered all levels, reviewing for retention

## Location

**Files:**
- `src/models/content/CognitiveDepthLevel.model.ts`
- `src/models/content/KnowledgeNode.model.ts`
- `src/models/content/LearnerKnowledgeProgress.model.ts`
- `src/services/content/cognitive-depth-levels.service.ts`
- `src/services/content/knowledge-nodes.service.ts`
- `src/services/content/learner-knowledge-progress.service.ts`
- `src/services/content/adaptive-question-selection.service.ts`
- `src/controllers/content/*.controller.ts`
- `src/routes/*.routes.ts`

**Tests:**
- `tests/integration/adaptive-learning/*.test.ts`

## Implementation Status

All 7 phases complete:
1. Foundation (Cognitive Depth Levels)
2. Knowledge Nodes
3. Question Integration
4. Progress Tracking
5. Adaptive Selection
6. API Completion
7. Testing & Documentation

## Links

- Memory log: [[../memory-log]]
- Related patterns: [[../patterns/department-scoping]]
- Spec: `agent_coms/api/specs/LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md`
- Implementation plan: `agent_coms/api/specs/LEARNER_ACTIVITY_KNOWLEDGE_NODE_IMPLEMENTATION_PLAN.md`
