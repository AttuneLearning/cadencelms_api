import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as knowledgeNodesController from '@/controllers/content/knowledge-nodes.controller';

const router = Router({ mergeParams: true });

/**
 * Knowledge Nodes Routes
 * Base path: /api/v2/departments/:departmentId/knowledge-nodes
 *
 * Knowledge nodes represent discrete learning concepts that can be organized
 * hierarchically and linked to questions for adaptive learning and mastery tracking.
 *
 * Related: Knowledge Graph, Question Bank, Adaptive Learning
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes
 * List all knowledge nodes in a department with pagination
 * Access Rights: content:department:read OR content:own:read
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (search node names and descriptions)
 * - parentId: ObjectId (filter by parent node)
 * - sort: string (default: -createdAt)
 */
router.get('/',
  authorize.anyOf(['content:department:read', 'content:own:read']),
  knowledgeNodesController.list
);

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/tree
 * Get knowledge nodes as a hierarchical tree structure
 * Access Rights: content:department:read OR content:own:read
 *
 * Query params:
 * - rootId: ObjectId (optional - start tree from specific node)
 * - depth: number (optional - limit tree depth)
 */
router.get('/tree',
  authorize.anyOf(['content:department:read', 'content:own:read']),
  knowledgeNodesController.listAsTree
);

/**
 * POST /api/v2/departments/:departmentId/knowledge-nodes
 * Create a new knowledge node
 * Access Right: content:department:manage
 *
 * Body:
 * - name: string (required, max 200 chars)
 * - description: string (optional, max 2000 chars)
 * - parentId: ObjectId (optional - parent node for hierarchy)
 * - metadata: object (optional - additional node properties)
 */
router.post('/',
  authorize.anyOf(['content:department:manage']),
  knowledgeNodesController.create
);

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Get detailed information for a knowledge node
 * Access Rights: content:department:read OR content:own:read
 *
 * Response includes:
 * - Node details
 * - Parent node reference
 * - Child count
 * - Question count
 */
router.get('/:nodeId',
  authorize.anyOf(['content:department:read', 'content:own:read']),
  knowledgeNodesController.getById
);

/**
 * PUT /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Update an existing knowledge node
 * Access Right: content:department:manage
 *
 * Body: (all fields optional)
 * - name: string (max 200 chars)
 * - description: string (max 2000 chars)
 * - parentId: ObjectId (change parent node)
 * - metadata: object
 */
router.put('/:nodeId',
  authorize.anyOf(['content:department:manage']),
  knowledgeNodesController.update
);

/**
 * DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Delete a knowledge node (soft delete)
 * Access Right: content:department:manage
 *
 * Note: Cannot delete nodes with children or linked questions.
 * Returns error with dependency list if node has dependencies.
 */
router.delete('/:nodeId',
  authorize.anyOf(['content:department:manage']),
  knowledgeNodesController.remove
);

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/questions
 * Get all questions linked to a knowledge node
 * Access Rights: content:department:read OR content:own:read
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - type: string (filter by question type)
 * - difficulty: string (filter by difficulty)
 */
router.get('/:nodeId/questions',
  authorize.anyOf(['content:department:read', 'content:own:read']),
  knowledgeNodesController.getQuestions
);

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/graph
 * Get the knowledge graph for a node (prerequisites, dependents, related)
 * Access Rights: content:department:read OR content:own:read
 *
 * Response includes:
 * - prerequisites: nodes that must be mastered before this one
 * - dependents: nodes that depend on this one
 * - related: nodes related by topic or content
 */
router.get('/:nodeId/graph',
  authorize.anyOf(['content:department:read', 'content:own:read']),
  knowledgeNodesController.getGraph
);

/**
 * POST /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites
 * Add a prerequisite relationship to a knowledge node
 * Access Right: content:department:manage
 *
 * Body:
 * - prerequisiteId: ObjectId (required - the node that is a prerequisite)
 * - weight: number (optional - strength of prerequisite relationship)
 */
router.post('/:nodeId/prerequisites',
  authorize.anyOf(['content:department:manage']),
  knowledgeNodesController.addPrerequisite
);

/**
 * DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites/:prereqId
 * Remove a prerequisite relationship from a knowledge node
 * Access Right: content:department:manage
 */
router.delete('/:nodeId/prerequisites/:prereqId',
  authorize.anyOf(['content:department:manage']),
  knowledgeNodesController.removePrerequisite
);

export default router;
