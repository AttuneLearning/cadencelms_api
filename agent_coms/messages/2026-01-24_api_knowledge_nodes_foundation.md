# API Feature: Knowledge Nodes System - Foundation Complete

**Date:** 2026-01-24
**From:** API Team
**To:** UI Team
**Priority:** Informational - Future Enhancement

---

## Summary

The API team has completed Phase 1-2 of the adaptive learning Knowledge Node system. This provides the foundation for intelligent question selection and learner progress tracking.

**Current Status:** Foundation models and services are ready. Controllers and routes will be added in Phase 6.

## What's New

### Phase 1: Cognitive Depth Levels (Complete)

Configurable mastery progression levels for adaptive learning:

| Slug | Name | Advance Threshold | Min Attempts |
|------|------|-------------------|--------------|
| `exposure` | Exposure | 70% | 2 |
| `practice` | Practice | 80% | 3 |
| `proficiency` | Proficiency | 85% | 4 |
| `mastery` | Mastery | 90% | 5 |

- Levels are seeded as system defaults
- Departments can customize thresholds or add custom levels
- Level resolution: department-specific first, then system default

### Phase 2: Knowledge Nodes (Complete)

Knowledge Nodes organize questions by **conceptual topic** (separate from Question Banks which are administrative containers).

```typescript
interface KnowledgeNode {
  id: string;
  departmentId: string;
  name: string;
  slug: string;
  description?: string;

  // Graph relationships
  parentNodeId?: string;           // Hierarchical parent
  prerequisiteNodeIds: string[];   // Must master before this
  relatedNodeIds: string[];        // Conceptually related

  // Depth range
  depthRange: {
    min: string;  // e.g., "exposure"
    max: string;  // e.g., "mastery"
  };

  tags: string[];
  isActive: boolean;
}
```

**Key Concepts:**

1. **Knowledge Nodes vs Question Banks:**
   - Question Banks = Administrative grouping (who can access)
   - Knowledge Nodes = Conceptual grouping (what topic)
   - A question can be in multiple Question Banks AND linked to ONE Knowledge Node

2. **Graph Relationships:**
   - Parent/Child hierarchy (tree view)
   - Prerequisites (learning path dependencies)
   - Related nodes (conceptual links)

3. **Circular Dependency Detection:**
   - API prevents circular prerequisites
   - API prevents circular parent hierarchy

## Contracts Available

See these contract files for detailed API specifications:

- `contracts/api/cognitive-depth-levels.contract.ts`
- `contracts/api/knowledge-nodes.contract.ts`

## UI Planning Notes

### When Knowledge Nodes Are Live (Phase 6):

**Question Creation/Edit:**
- Optional "Knowledge Node" selector (dropdown of department nodes)
- Optional "Cognitive Depth" selector (dropdown of depth levels)
- These fields are OPTIONAL - existing question banks work without them

**Knowledge Node Management (Admin):**
- Tree view of department's knowledge nodes
- CRUD operations for nodes
- Prerequisite relationship management
- Graph visualization (nice-to-have)

**Learner Progress (Future - Phase 4+):**
- Progress through knowledge nodes
- Mastery indicators per node
- Learning path recommendations

## No UI Changes Required Yet

These are backend-only changes. The UI does NOT need to change anything now.

When Phase 6 (API Controllers) is complete, we'll send a follow-up message with:
- Live endpoints
- Request/response examples
- Integration guidance

## Files Created

```
src/models/content/CognitiveDepthLevel.model.ts
src/models/content/KnowledgeNode.model.ts
src/services/content/cognitive-depth-levels.service.ts
src/services/content/knowledge-nodes.service.ts
src/validators/cognitive-depth-level.validator.ts
src/validators/knowledge-node.validator.ts
contracts/api/cognitive-depth-levels.contract.ts
contracts/api/knowledge-nodes.contract.ts
scripts/seed-cognitive-depth-levels.ts
```

## Implementation Plan Reference

See `agent_coms/api/specs/LEARNER_ACTIVITY_KNOWLEDGE_NODE_IMPLEMENTATION_PLAN.md` for the full 7-phase plan.

## Questions?

If you have questions about how these features will integrate with the UI, please reach out. We're happy to clarify the design before controllers are implemented.
