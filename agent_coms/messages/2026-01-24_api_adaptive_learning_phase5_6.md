# API Update: Adaptive Learning - Selection Service & API Endpoints

**From:** API Team
**To:** UI Team
**Date:** 2026-01-24
**Subject:** Phase 5-6 Complete: Adaptive Selection & Full API Endpoints

---

## Summary

Phase 5 (Adaptive Selection) and Phase 6 (API Completion) are now complete. The Knowledge Node adaptive learning system now has:
- Intelligent question selection based on learner mastery
- Complete REST API endpoints for all adaptive learning features
- Full API contracts for frontend integration

---

## Phase 5: Adaptive Question Selection

### New Service: AdaptiveQuestionSelectionService

Implements intelligent question selection based on learner progress.

#### Selection Strategy

The service determines which questions to present based on three strategies:
- **"advancing"**: Learner is ready for the next cognitive depth level
- **"reinforcing"**: Learner needs more practice at current level
- **"reviewing"**: Learner has mastered all levels, reviewing for retention

#### Selection Algorithm

1. Get learner's current progress on the knowledge node
2. Check if ready to advance (success rate >= threshold AND attempts >= minAttempts)
3. Determine target depth based on readiness
4. Query questions matching node, depth, and optional filters
5. Randomly select for variety
6. Return with adaptive metadata

---

## Phase 6: Complete API Endpoints

### Cognitive Depth Levels

**Base:** `/api/v2`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cognitive-depth-levels` | List system defaults |
| GET | `/departments/:departmentId/cognitive-depth-levels` | List for department (merged) |
| POST | `/departments/:departmentId/cognitive-depth-levels` | Create department override |
| PUT | `/departments/:departmentId/cognitive-depth-levels/:slug` | Update department level |
| DELETE | `/departments/:departmentId/cognitive-depth-levels/:slug` | Delete (revert to default) |

### Knowledge Nodes

**Base:** `/api/v2/departments/:departmentId/knowledge-nodes`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create knowledge node |
| GET | `/` | List nodes (paginated) |
| GET | `/tree` | Get hierarchical tree |
| GET | `/:nodeId` | Get node by ID |
| PUT | `/:nodeId` | Update node |
| DELETE | `/:nodeId` | Delete node |
| GET | `/:nodeId/questions` | Get linked questions |
| GET | `/:nodeId/graph` | Get graph connections |
| POST | `/:nodeId/prerequisites` | Add prerequisite |
| DELETE | `/:nodeId/prerequisites/:prereqId` | Remove prerequisite |

### Learner Knowledge Progress

**Base:** `/api/v2`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learners/:learnerId/knowledge-progress` | All progress |
| GET | `/learners/:learnerId/knowledge-progress/summary` | Summary stats |
| GET | `/learners/:learnerId/knowledge-progress/:nodeId` | Progress for node |
| DELETE | `/learners/:learnerId/knowledge-progress/:nodeId` | Reset progress |
| GET | `/departments/:departmentId/learners/:learnerId/knowledge-map` | Knowledge map |

### Adaptive Selection

**Base:** `/api/v2/adaptive`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/select-question` | Select single question |
| POST | `/select-questions` | Select multiple questions |
| POST | `/record-response` | Record response & update progress |

---

## Key Endpoint Details

### POST /adaptive/select-question

Select a single question based on learner's current mastery.

**Request:**
```json
{
  "learnerId": "optional - defaults to authenticated user",
  "knowledgeNodeId": "required",
  "questionBankIds": ["optional array"],
  "excludeQuestionIds": ["optional array"],
  "preferredTypes": ["optional array"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": { /* full question object */ },
    "presentationType": "multiple_choice",
    "cognitiveDepth": "practice",
    "selectionReason": "reinforcing",
    "adaptiveMetadata": {
      "currentMastery": 65.5,
      "targetDepth": "practice",
      "progressToNextDepth": 82
    }
  }
}
```

### POST /adaptive/select-questions

Select multiple questions for a learning session.

**Request:**
```json
{
  "learnerId": "optional",
  "knowledgeNodeId": "required",
  "count": 5,
  "questionBankIds": ["optional"],
  "excludeQuestionIds": ["optional"],
  "preferredTypes": ["optional"]
}
```

**Response:** Array of selected questions with metadata.

### POST /adaptive/record-response

Record a learner's response and update progress.

**Request:**
```json
{
  "learnerId": "optional",
  "questionId": "required",
  "knowledgeNodeId": "required",
  "cognitiveDepth": "practice",
  "isCorrect": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progressUpdated": true,
    "newMasteryScore": 72.5,
    "levelAdvanced": false,
    "previousDepth": "practice",
    "isNodeComplete": false
  }
}
```

### GET /learners/:learnerId/knowledge-progress/summary

Get progress summary for analytics dashboards.

**Query:** `departmentId` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalNodes": 25,
    "masteredNodes": 8,
    "inProgressNodes": 5,
    "notStartedNodes": 12,
    "overallMasteryPercent": 45.2,
    "depthDistribution": {
      "exposure": 3,
      "practice": 4,
      "proficiency": 4,
      "mastery": 1
    }
  }
}
```

### GET /departments/:departmentId/learners/:learnerId/knowledge-map

Get complete knowledge map for visualization.

**Response:**
```json
{
  "success": true,
  "data": {
    "masteredNodes": ["nodeId1", "nodeId2"],
    "inProgressNodes": ["nodeId3", "nodeId4"],
    "readyToLearnNodes": ["nodeId5", "nodeId6"],
    "summary": { /* same as progress summary */ }
  }
}
```

---

## API Contracts

Full API contracts are available at:
- `contracts/api/cognitive-depth-levels.contract.ts`
- `contracts/api/knowledge-nodes.contract.ts`
- `contracts/api/learner-knowledge-progress.contract.ts`
- `contracts/api/adaptive-selection.contract.ts`

---

## Permissions

| Endpoint Group | Read | Write |
|---------------|------|-------|
| Cognitive Depth Levels | `content:department:read`, `content:own:read` | `content:department:manage` |
| Knowledge Nodes | `content:department:read`, `content:own:read` | `content:department:manage` |
| Learner Progress | `learner:grades:read`, `grades:own:read` | `grades:department:manage` |
| Adaptive Selection | `learner:own:read`, `content:department:read` | - |

---

## Integration Notes

1. **learnerId defaults to authenticated user** - For learner-facing UIs, you can omit `learnerId` in adaptive selection endpoints

2. **Progress is automatically tracked** - When using `/adaptive/record-response`, progress is automatically updated including mastery scores and level advancement

3. **Knowledge map for visualizations** - The `/knowledge-map` endpoint returns node IDs categorized by status, ideal for building visual knowledge graphs

4. **Questions vs Knowledge Nodes** - Questions are linked to Knowledge Nodes via `knowledgeNodeId`. Question Banks are still used for administrative organization.

---

## Questions?

Reach out for clarification on:
- Adaptive selection algorithm customization
- Progress visualization approaches
- Integration with existing assessment flows
- Permission model details

---

**System Status:** All Phase 5-6 features complete and tested. TypeScript compilation passes.

**Next Phase:** Phase 7 - Testing & Documentation
