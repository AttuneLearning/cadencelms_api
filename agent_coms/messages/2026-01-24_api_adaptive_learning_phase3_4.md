# API Update: Adaptive Learning - Question Integration & Progress Tracking

**From:** API Team
**To:** UI Team
**Date:** 2026-01-24
**Subject:** Phase 3-4 Complete: Question Integration & Learner Progress Tracking

---

## Summary

Building on the Knowledge Node foundation (Phase 1-2), we've now completed Phase 3 (Question Integration) and Phase 4 (Progress Tracking). Questions can now be linked to Knowledge Nodes with cognitive depth metadata, and learner progress is tracked through the adaptive learning system.

---

## Phase 3: Question Integration

### New Question Fields (Optional)

Questions now support two new optional fields for adaptive learning:

```typescript
{
  // Existing fields...

  // NEW: Link question to a knowledge node
  knowledgeNodeId?: string;  // ObjectId reference to KnowledgeNode

  // NEW: Cognitive depth level for this question
  cognitiveDepth?: string;   // e.g., "exposure", "practice", "proficiency", "mastery"
}
```

### Create/Update Question with Adaptive Fields

**POST/PUT** `/api/departments/:departmentId/questions`

```json
{
  "questionText": "What is the primary function of...",
  "questionType": "multiple-choice",
  "questionBankIds": ["bankId1", "bankId2"],
  "knowledgeNodeId": "nodeId123",
  "cognitiveDepth": "practice"
}
```

### New Query Parameters for Questions

**GET** `/api/departments/:departmentId/questions`

New filter parameters:
- `knowledgeNodeId` - Filter by specific knowledge node
- `cognitiveDepth` - Filter by cognitive depth level
- `hasKnowledgeNode` - Filter to questions with/without a knowledge node (`true`/`false`)

Example:
```
GET /api/departments/:id/questions?knowledgeNodeId=abc123&cognitiveDepth=exposure
GET /api/departments/:id/questions?hasKnowledgeNode=true
```

### Backward Compatibility

**All adaptive learning fields are optional.** Existing Question Banks and questions work exactly as before. The new fields are enhancements for departments that want to use adaptive learning features.

---

## Phase 4: Learner Progress Tracking

### New Entity: LearnerKnowledgeProgress

Tracks each learner's progress through knowledge nodes:

```typescript
interface LearnerKnowledgeProgress {
  id: string;
  learnerId: string;
  knowledgeNodeId: string;
  departmentId: string;
  currentDepth: string;        // Current cognitive depth level
  masteryScore: number;        // 0-100 overall mastery percentage
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: Date | null;
  lastCorrectAt: Date | null;
  depthProgress: {             // Progress per depth level
    [depth: string]: {
      attempts: number;
      correct: number;
      mastered: boolean;
      masteredAt?: Date;
      lastAttemptAt?: Date;
    }
  };
  isComplete: boolean;         // True when highest depth mastered
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Key Service Methods Available

The `LearnerKnowledgeProgressService` provides:

1. **Progress Tracking**
   - `getOrCreate(learnerId, knowledgeNodeId)` - Get or initialize progress
   - `getForNode(learnerId, knowledgeNodeId)` - Get progress for specific node
   - `getForLearner(learnerId, departmentId?)` - Get all progress for a learner

2. **Recording Attempts**
   - `recordAttempt(learnerId, knowledgeNodeId, cognitiveDepth, isCorrect)` - Record an attempt result
   - Returns: `{ progressUpdated, newMasteryScore, levelAdvanced, newDepth?, previousDepth, isNodeComplete }`

3. **Query Methods**
   - `getMasteredNodes(learnerId, departmentId)` - Get IDs of mastered nodes
   - `getInProgressNodes(learnerId, departmentId)` - Get IDs of in-progress nodes
   - `getReadyToLearnNodes(learnerId, departmentId)` - Get nodes where prerequisites are met

4. **Analytics**
   - `getProgressSummary(learnerId, departmentId)` - Get summary statistics:
     ```typescript
     {
       totalNodes: number;
       masteredNodes: number;
       inProgressNodes: number;
       notStartedNodes: number;
       overallMasteryPercent: number;
       depthDistribution: { [depth: string]: number };
     }
     ```

### Level Advancement Logic

Learners automatically advance to the next cognitive depth when:
1. Success rate >= `advanceThreshold` (defined per depth level)
2. Attempts >= `minAttempts` (defined per depth level)

The system automatically:
- Calculates mastery scores
- Determines level advancement
- Marks previous depths as mastered
- Checks for node completion (highest level mastered)

---

## Migration

A migration script is available for adding the necessary indexes:

```bash
npx ts-node src/migrations/add-knowledge-fields-to-questions.ts
```

Rollback:
```bash
npx ts-node src/migrations/add-knowledge-fields-to-questions.ts down
```

---

## Architecture Notes

### Relationship: Knowledge Nodes vs Question Banks

| Aspect | Question Banks | Knowledge Nodes |
|--------|---------------|-----------------|
| Purpose | Administrative organization | Conceptual organization |
| Scope | Can span multiple concepts | Single concept/skill |
| Relationships | Flat (many-to-many with questions) | Graph (hierarchy + prerequisites) |
| Progress Tracking | No | Yes, per-depth mastery |

Questions can belong to:
- Multiple Question Banks (for administrative purposes)
- Zero or one Knowledge Node (for adaptive learning)

This allows existing Question Bank workflows to continue unchanged while enabling adaptive learning for departments that opt in.

---

## Questions?

Reach out if you need clarification on:
- How to integrate adaptive learning into existing question flows
- Progress tracking data structures for analytics dashboards
- Prerequisite logic for learning paths

---

**Next Phases:**
- Phase 5: Adaptive Question Selection Service
- Phase 6: Learning Events Integration
