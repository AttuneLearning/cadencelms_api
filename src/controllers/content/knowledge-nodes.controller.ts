import { Request, Response } from 'express';
import { KnowledgeNodesService } from '@/services/content/knowledge-nodes.service';
import { QuestionsService } from '@/services/content/questions.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Knowledge Nodes Controller
 * Handles all /api/v2/departments/:departmentId/knowledge-nodes endpoints
 *
 * Knowledge nodes represent concepts in a knowledge graph with prerequisites,
 * relationships, and associated questions for adaptive learning.
 */

/**
 * POST /api/v2/departments/:departmentId/knowledge-nodes
 * Create a new knowledge node in a department
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const {
    name,
    slug,
    description,
    parentNodeId,
    prerequisiteNodeIds,
    relatedNodeIds,
    depthRange,
    tags
  } = req.body;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw ApiError.badRequest('Name is required and must be a non-empty string');
  }

  if (name.length > 200) {
    throw ApiError.badRequest('Name cannot exceed 200 characters');
  }

  // Validate optional fields
  if (slug !== undefined && typeof slug !== 'string') {
    throw ApiError.badRequest('Slug must be a string');
  }

  if (description !== undefined && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (description && description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  if (parentNodeId !== undefined && typeof parentNodeId !== 'string') {
    throw ApiError.badRequest('Parent node ID must be a string');
  }

  if (prerequisiteNodeIds !== undefined) {
    if (!Array.isArray(prerequisiteNodeIds)) {
      throw ApiError.badRequest('Prerequisite node IDs must be an array');
    }
    for (const id of prerequisiteNodeIds) {
      if (typeof id !== 'string') {
        throw ApiError.badRequest('Each prerequisite node ID must be a string');
      }
    }
  }

  if (relatedNodeIds !== undefined) {
    if (!Array.isArray(relatedNodeIds)) {
      throw ApiError.badRequest('Related node IDs must be an array');
    }
    for (const id of relatedNodeIds) {
      if (typeof id !== 'string') {
        throw ApiError.badRequest('Each related node ID must be a string');
      }
    }
  }

  if (depthRange !== undefined) {
    if (typeof depthRange !== 'object' || depthRange === null) {
      throw ApiError.badRequest('Depth range must be an object');
    }
    if (depthRange.min !== undefined && (typeof depthRange.min !== 'number' || depthRange.min < 1)) {
      throw ApiError.badRequest('Depth range min must be a positive number');
    }
    if (depthRange.max !== undefined && (typeof depthRange.max !== 'number' || depthRange.max < 1)) {
      throw ApiError.badRequest('Depth range max must be a positive number');
    }
    if (depthRange.min !== undefined && depthRange.max !== undefined && depthRange.min > depthRange.max) {
      throw ApiError.badRequest('Depth range min cannot be greater than max');
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw ApiError.badRequest('Tags must be an array');
    }
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw ApiError.badRequest('Each tag must be a non-empty string');
      }
    }
  }

  // Get user ID from authenticated user
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const nodeData = {
    name: name.trim(),
    slug: slug?.trim(),
    description: description?.trim(),
    parentNodeId,
    prerequisiteNodeIds,
    relatedNodeIds,
    depthRange,
    tags
  };

  const result = await KnowledgeNodesService.create(departmentId, user.userId, nodeData);
  res.status(201).json(ApiResponse.created(result, 'Knowledge node created successfully'));
});

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes
 * List knowledge nodes in a department with filtering and pagination
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    search: req.query.search as string | undefined,
    isActive: req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined,
    parentNodeId: req.query.parentNodeId as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  const result = await KnowledgeNodesService.listForDepartment(departmentId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/tree
 * Get knowledge nodes as a hierarchical tree structure
 */
export const listAsTree = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const result = await KnowledgeNodesService.listAsTree(departmentId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Get details of a specific knowledge node
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  const result = await KnowledgeNodesService.getById(nodeId, departmentId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Update an existing knowledge node
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;
  const {
    name,
    slug,
    description,
    parentNodeId,
    prerequisiteNodeIds,
    relatedNodeIds,
    depthRange,
    tags,
    isActive
  } = req.body;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  // Validate optional fields if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw ApiError.badRequest('Name must be a non-empty string');
    }
    if (name.length > 200) {
      throw ApiError.badRequest('Name cannot exceed 200 characters');
    }
  }

  if (slug !== undefined && typeof slug !== 'string') {
    throw ApiError.badRequest('Slug must be a string');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw ApiError.badRequest('Description must be a string');
  }

  if (description && description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  if (parentNodeId !== undefined && parentNodeId !== null && typeof parentNodeId !== 'string') {
    throw ApiError.badRequest('Parent node ID must be a string');
  }

  if (prerequisiteNodeIds !== undefined) {
    if (!Array.isArray(prerequisiteNodeIds)) {
      throw ApiError.badRequest('Prerequisite node IDs must be an array');
    }
    for (const id of prerequisiteNodeIds) {
      if (typeof id !== 'string') {
        throw ApiError.badRequest('Each prerequisite node ID must be a string');
      }
    }
  }

  if (relatedNodeIds !== undefined) {
    if (!Array.isArray(relatedNodeIds)) {
      throw ApiError.badRequest('Related node IDs must be an array');
    }
    for (const id of relatedNodeIds) {
      if (typeof id !== 'string') {
        throw ApiError.badRequest('Each related node ID must be a string');
      }
    }
  }

  if (depthRange !== undefined) {
    if (depthRange !== null && (typeof depthRange !== 'object')) {
      throw ApiError.badRequest('Depth range must be an object or null');
    }
    if (depthRange !== null) {
      if (depthRange.min !== undefined && (typeof depthRange.min !== 'number' || depthRange.min < 1)) {
        throw ApiError.badRequest('Depth range min must be a positive number');
      }
      if (depthRange.max !== undefined && (typeof depthRange.max !== 'number' || depthRange.max < 1)) {
        throw ApiError.badRequest('Depth range max must be a positive number');
      }
      if (depthRange.min !== undefined && depthRange.max !== undefined && depthRange.min > depthRange.max) {
        throw ApiError.badRequest('Depth range min cannot be greater than max');
      }
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      throw ApiError.badRequest('Tags must be an array');
    }
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        throw ApiError.badRequest('Each tag must be a non-empty string');
      }
    }
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }

  // Get user ID from authenticated user
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const updateData = {
    name: name?.trim(),
    description: description?.trim(),
    parentNodeId,
    prerequisiteNodeIds,
    relatedNodeIds,
    depthRange,
    tags,
    isActive
  };

  const result = await KnowledgeNodesService.update(nodeId, departmentId, user.userId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Knowledge node updated successfully'));
});

/**
 * DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId
 * Delete a knowledge node (soft delete)
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  await KnowledgeNodesService.delete(nodeId, departmentId);
  res.status(200).json(ApiResponse.success(null, 'Knowledge node deleted successfully'));
});

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/questions
 * Get questions linked to a specific knowledge node
 */
export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  // Verify the node belongs to this department
  await KnowledgeNodesService.getById(nodeId, departmentId);

  const options = {
    cognitiveDepth: req.query.cognitiveDepth as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100
  };

  // Validate limit
  if (options.limit < 1 || options.limit > 500) {
    throw ApiError.badRequest('Limit must be between 1 and 500');
  }

  const questions = await QuestionsService.getByKnowledgeNode(nodeId, options);
  res.status(200).json(ApiResponse.success(questions));
});

/**
 * GET /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/graph
 * Get the graph connections for a knowledge node (prerequisites, dependents, related)
 */
export const getGraph = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  // Verify the node belongs to this department
  await KnowledgeNodesService.getById(nodeId, departmentId);

  // Get graph connections in parallel
  const [prerequisites, dependents, related, children] = await Promise.all([
    KnowledgeNodesService.getPrerequisites(nodeId),
    KnowledgeNodesService.getDependents(nodeId),
    KnowledgeNodesService.getRelated(nodeId),
    KnowledgeNodesService.getChildren(nodeId)
  ]);

  res.status(200).json(ApiResponse.success({
    prerequisites,
    dependents,
    related,
    children
  }));
});

/**
 * POST /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites
 * Add a prerequisite to a knowledge node
 */
export const addPrerequisite = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId } = req.params;
  const { prerequisiteNodeId } = req.body;

  if (!departmentId || !nodeId) {
    throw ApiError.badRequest('Department ID and Node ID are required');
  }

  if (!prerequisiteNodeId || typeof prerequisiteNodeId !== 'string') {
    throw ApiError.badRequest('Prerequisite node ID is required and must be a string');
  }

  if (prerequisiteNodeId === nodeId) {
    throw ApiError.badRequest('A node cannot be a prerequisite of itself');
  }

  const result = await KnowledgeNodesService.addPrerequisite(nodeId, prerequisiteNodeId, departmentId);
  res.status(201).json(ApiResponse.created(result, 'Prerequisite added successfully'));
});

/**
 * DELETE /api/v2/departments/:departmentId/knowledge-nodes/:nodeId/prerequisites/:prereqId
 * Remove a prerequisite from a knowledge node
 */
export const removePrerequisite = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, nodeId, prereqId } = req.params;

  if (!departmentId || !nodeId || !prereqId) {
    throw ApiError.badRequest('Department ID, Node ID, and Prerequisite ID are required');
  }

  await KnowledgeNodesService.removePrerequisite(nodeId, prereqId, departmentId);
  res.status(200).json(ApiResponse.success(null, 'Prerequisite removed successfully'));
});
