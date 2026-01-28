import mongoose from 'mongoose';
import KnowledgeNode, { IKnowledgeNode } from '@/models/content/KnowledgeNode.model';
import Department from '@/models/organization/Department.model';
import { CognitiveDepthLevelsService } from './cognitive-depth-levels.service';
import { ApiError } from '@/utils/ApiError';

/**
 * KnowledgeNodes Service
 *
 * Manages knowledge nodes for adaptive learning.
 * Handles CRUD operations, graph relationships, and circular dependency detection.
 *
 * Graph Operations:
 * - Parent/Child hierarchy (tree structure)
 * - Prerequisites (must be mastered before)
 * - Related nodes (conceptually linked)
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

interface CreateNodeDto {
  name: string;
  slug?: string;
  description?: string;
  parentNodeId?: string;
  prerequisiteNodeIds?: string[];
  relatedNodeIds?: string[];
  depthRange?: {
    min: string;
    max: string;
  };
  tags?: string[];
}

interface UpdateNodeDto {
  name?: string;
  description?: string;
  parentNodeId?: string | null;
  prerequisiteNodeIds?: string[];
  relatedNodeIds?: string[];
  depthRange?: {
    min: string;
    max: string;
  };
  tags?: string[];
  isActive?: boolean;
}

interface ListOptions {
  search?: string;
  tags?: string[];
  parentNodeId?: string;
  hasQuestions?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

interface NodeResponse {
  id: string;
  departmentId: string;
  name: string;
  slug: string;
  description: string | null;
  parentNodeId: string | null;
  prerequisiteNodeIds: string[];
  relatedNodeIds: string[];
  depthRange: {
    min: string;
    max: string;
  };
  tags: string[];
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  questionCount?: number;
}

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  children: TreeNode[];
}

interface PaginatedResult<T> {
  nodes: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class KnowledgeNodesService {
  /**
   * Create a new knowledge node
   */
  static async create(
    departmentId: string,
    userId: string,
    data: CreateNodeDto
  ): Promise<NodeResponse> {
    // Validate department
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Generate slug if not provided
    const slug = data.slug || this.generateSlug(data.name);

    // Check for duplicate slug in department
    const existing = await KnowledgeNode.findOne({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      slug
    });

    if (existing) {
      throw ApiError.badRequest('Node with this slug already exists in department');
    }

    // Validate parent node if provided
    if (data.parentNodeId) {
      await this.validateNodeInDepartment(data.parentNodeId, departmentId, 'Parent node');
    }

    // Validate prerequisite nodes
    if (data.prerequisiteNodeIds && data.prerequisiteNodeIds.length > 0) {
      for (const prereqId of data.prerequisiteNodeIds) {
        await this.validateNodeInDepartment(prereqId, departmentId, 'Prerequisite node');
      }
    }

    // Validate related nodes
    if (data.relatedNodeIds && data.relatedNodeIds.length > 0) {
      for (const relatedId of data.relatedNodeIds) {
        await this.validateNodeInDepartment(relatedId, departmentId, 'Related node');
      }
    }

    // Validate depth range slugs
    if (data.depthRange) {
      const minValid = await CognitiveDepthLevelsService.validateSlug(data.depthRange.min, departmentId);
      if (!minValid) {
        throw ApiError.badRequest(`Invalid cognitive depth slug: ${data.depthRange.min}`);
      }
      const maxValid = await CognitiveDepthLevelsService.validateSlug(data.depthRange.max, departmentId);
      if (!maxValid) {
        throw ApiError.badRequest(`Invalid cognitive depth slug: ${data.depthRange.max}`);
      }
    }

    const node = await KnowledgeNode.create({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      name: data.name,
      slug,
      description: data.description,
      parentNodeId: data.parentNodeId ? new mongoose.Types.ObjectId(data.parentNodeId) : null,
      prerequisiteNodeIds: data.prerequisiteNodeIds?.map((id) => new mongoose.Types.ObjectId(id)) || [],
      relatedNodeIds: data.relatedNodeIds?.map((id) => new mongoose.Types.ObjectId(id)) || [],
      depthRange: data.depthRange || { min: 'exposure', max: 'mastery' },
      tags: data.tags || [],
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId)
    });

    return this.formatNodeResponse(node);
  }

  /**
   * Get a knowledge node by ID
   */
  static async getById(nodeId: string, departmentId?: string): Promise<NodeResponse> {
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    const query: Record<string, unknown> = { _id: nodeId };
    if (departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const node = await KnowledgeNode.findOne(query);
    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    return this.formatNodeResponse(node);
  }

  /**
   * Get a knowledge node by slug
   */
  static async getBySlug(departmentId: string, slug: string): Promise<NodeResponse> {
    const node = await KnowledgeNode.findOne({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      slug: slug.toLowerCase()
    });

    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    return this.formatNodeResponse(node);
  }

  /**
   * List knowledge nodes for a department
   */
  static async listForDepartment(
    departmentId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResult<NodeResponse>> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    };

    // Search filter
    if (options.search) {
      query.$text = { $search: options.search };
    }

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    // Parent filter
    if (options.parentNodeId !== undefined) {
      if (options.parentNodeId === 'null' || options.parentNodeId === '') {
        query.parentNodeId = null;
      } else {
        query.parentNodeId = new mongoose.Types.ObjectId(options.parentNodeId);
      }
    }

    // Build sort
    const sortField = options.sort || 'name';
    const sort: Record<string, 1 | -1> = { [sortField]: 1 };

    // Execute query
    const [nodes, total] = await Promise.all([
      KnowledgeNode.find(query).sort(sort).skip(skip).limit(limit),
      KnowledgeNode.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      nodes: nodes.map((node) => this.formatNodeResponse(node)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * List knowledge nodes as a tree structure
   */
  static async listAsTree(departmentId: string, maxDepth: number = 5): Promise<TreeNode[]> {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Get all active nodes for department
    const nodes = await KnowledgeNode.find({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    }).select('_id name slug parentNodeId');

    // Build tree structure
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // First pass: create all nodes
    for (const node of nodes) {
      nodeMap.set(node._id.toString(), {
        id: node._id.toString(),
        name: node.name,
        slug: node.slug,
        questionCount: 0, // TODO: compute from questions
        children: []
      });
    }

    // Second pass: build hierarchy
    for (const node of nodes) {
      const treeNode = nodeMap.get(node._id.toString())!;

      if (node.parentNodeId) {
        const parent = nodeMap.get(node.parentNodeId.toString());
        if (parent) {
          parent.children.push(treeNode);
        } else {
          // Parent not found, treat as root
          rootNodes.push(treeNode);
        }
      } else {
        rootNodes.push(treeNode);
      }
    }

    // Sort children at each level
    const sortChildren = (nodes: TreeNode[], depth: number): void => {
      if (depth >= maxDepth) return;
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      for (const node of nodes) {
        sortChildren(node.children, depth + 1);
      }
    };

    sortChildren(rootNodes, 0);

    return rootNodes;
  }

  /**
   * Update a knowledge node
   */
  static async update(
    nodeId: string,
    departmentId: string,
    userId: string,
    data: UpdateNodeDto
  ): Promise<NodeResponse> {
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    const node = await KnowledgeNode.findOne({
      _id: nodeId,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    // Validate parent node if being changed
    if (data.parentNodeId !== undefined) {
      if (data.parentNodeId === null) {
        node.parentNodeId = undefined;
      } else {
        // Check for self-reference
        if (data.parentNodeId === nodeId) {
          throw ApiError.badRequest('Node cannot be its own parent');
        }

        // Check for circular hierarchy
        const wouldBeCircular = await this.checkCircularHierarchy(
          nodeId,
          data.parentNodeId,
          departmentId
        );
        if (wouldBeCircular) {
          throw ApiError.badRequest('Parent would create circular hierarchy');
        }

        await this.validateNodeInDepartment(data.parentNodeId, departmentId, 'Parent node');
        node.parentNodeId = new mongoose.Types.ObjectId(data.parentNodeId);
      }
    }

    // Validate and update prerequisites
    if (data.prerequisiteNodeIds !== undefined) {
      // Check for self-reference
      if (data.prerequisiteNodeIds.includes(nodeId)) {
        throw ApiError.badRequest('Node cannot be its own prerequisite');
      }

      // Check for circular prerequisites
      for (const prereqId of data.prerequisiteNodeIds) {
        const wouldBeCircular = await this.checkCircularPrerequisite(nodeId, prereqId, departmentId);
        if (wouldBeCircular) {
          throw ApiError.badRequest('Prerequisite would create circular dependency');
        }
        await this.validateNodeInDepartment(prereqId, departmentId, 'Prerequisite node');
      }

      node.prerequisiteNodeIds = data.prerequisiteNodeIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    // Validate and update related nodes
    if (data.relatedNodeIds !== undefined) {
      for (const relatedId of data.relatedNodeIds) {
        if (relatedId !== nodeId) {
          await this.validateNodeInDepartment(relatedId, departmentId, 'Related node');
        }
      }
      node.relatedNodeIds = data.relatedNodeIds
        .filter((id) => id !== nodeId)
        .map((id) => new mongoose.Types.ObjectId(id));
    }

    // Validate depth range
    if (data.depthRange) {
      const minValid = await CognitiveDepthLevelsService.validateSlug(
        data.depthRange.min,
        departmentId
      );
      if (!minValid) {
        throw ApiError.badRequest(`Invalid cognitive depth slug: ${data.depthRange.min}`);
      }
      const maxValid = await CognitiveDepthLevelsService.validateSlug(
        data.depthRange.max,
        departmentId
      );
      if (!maxValid) {
        throw ApiError.badRequest(`Invalid cognitive depth slug: ${data.depthRange.max}`);
      }
      node.depthRange = data.depthRange;
    }

    // Update other fields
    if (data.name !== undefined) node.name = data.name;
    if (data.description !== undefined) node.description = data.description;
    if (data.tags !== undefined) node.tags = data.tags;
    if (data.isActive !== undefined) node.isActive = data.isActive;

    node.updatedBy = new mongoose.Types.ObjectId(userId);
    await node.save();

    return this.formatNodeResponse(node);
  }

  /**
   * Delete a knowledge node
   */
  static async delete(
    nodeId: string,
    departmentId: string,
    force: boolean = false
  ): Promise<{ deleted: boolean; questionsUnlinked: number; childNodesOrphaned: number }> {
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    const node = await KnowledgeNode.findOne({
      _id: nodeId,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    // Check for child nodes
    const childCount = await KnowledgeNode.countDocuments({
      parentNodeId: new mongoose.Types.ObjectId(nodeId),
      isActive: true
    });

    if (childCount > 0 && !force) {
      throw ApiError.badRequest('Cannot delete node with child nodes. Delete or reparent children first.');
    }

    // TODO: Check for linked questions when Question model is updated
    const questionsLinked = 0;

    if (questionsLinked > 0 && !force) {
      throw ApiError.badRequest('Cannot delete node with linked questions. Use force=true or unlink questions first.');
    }

    // Soft delete (mark as inactive)
    node.isActive = false;
    await node.save();

    // Orphan child nodes if force
    let childNodesOrphaned = 0;
    if (force && childCount > 0) {
      await KnowledgeNode.updateMany(
        { parentNodeId: new mongoose.Types.ObjectId(nodeId) },
        { $set: { parentNodeId: null } }
      );
      childNodesOrphaned = childCount;
    }

    // Remove from prerequisite lists of other nodes
    await KnowledgeNode.updateMany(
      { prerequisiteNodeIds: new mongoose.Types.ObjectId(nodeId) },
      { $pull: { prerequisiteNodeIds: new mongoose.Types.ObjectId(nodeId) } }
    );

    // Remove from related lists of other nodes
    await KnowledgeNode.updateMany(
      { relatedNodeIds: new mongoose.Types.ObjectId(nodeId) },
      { $pull: { relatedNodeIds: new mongoose.Types.ObjectId(nodeId) } }
    );

    return {
      deleted: true,
      questionsUnlinked: questionsLinked,
      childNodesOrphaned
    };
  }

  // ============================================
  // GRAPH OPERATIONS
  // ============================================

  /**
   * Get prerequisites for a node (optionally recursive)
   */
  static async getPrerequisites(
    nodeId: string,
    recursive: boolean = false
  ): Promise<NodeResponse[]> {
    const node = await KnowledgeNode.findById(nodeId);
    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    if (!recursive) {
      const prereqs = await KnowledgeNode.find({
        _id: { $in: node.prerequisiteNodeIds },
        isActive: true
      });
      return prereqs.map((n) => this.formatNodeResponse(n));
    }

    // Recursive: get all prerequisites transitively
    const visited = new Set<string>();
    const result: IKnowledgeNode[] = [];

    const traverse = async (prereqIds: mongoose.Types.ObjectId[]): Promise<void> => {
      for (const prereqId of prereqIds) {
        const idStr = prereqId.toString();
        if (visited.has(idStr)) continue;
        visited.add(idStr);

        const prereq = await KnowledgeNode.findOne({ _id: prereqId, isActive: true });
        if (prereq) {
          result.push(prereq);
          await traverse(prereq.prerequisiteNodeIds);
        }
      }
    };

    await traverse(node.prerequisiteNodeIds);
    return result.map((n) => this.formatNodeResponse(n));
  }

  /**
   * Get nodes that depend on this one (have it as prerequisite)
   */
  static async getDependents(nodeId: string): Promise<NodeResponse[]> {
    const dependents = await KnowledgeNode.find({
      prerequisiteNodeIds: new mongoose.Types.ObjectId(nodeId),
      isActive: true
    });

    return dependents.map((n) => this.formatNodeResponse(n));
  }

  /**
   * Get related nodes
   */
  static async getRelated(nodeId: string): Promise<NodeResponse[]> {
    const node = await KnowledgeNode.findById(nodeId);
    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    const related = await KnowledgeNode.find({
      _id: { $in: node.relatedNodeIds },
      isActive: true
    });

    return related.map((n) => this.formatNodeResponse(n));
  }

  /**
   * Get child nodes
   */
  static async getChildren(nodeId: string): Promise<NodeResponse[]> {
    const children = await KnowledgeNode.find({
      parentNodeId: new mongoose.Types.ObjectId(nodeId),
      isActive: true
    }).sort({ name: 1 });

    return children.map((n) => this.formatNodeResponse(n));
  }

  /**
   * Add a prerequisite relationship
   */
  static async addPrerequisite(
    nodeId: string,
    prerequisiteId: string,
    departmentId: string
  ): Promise<{ nodeId: string; prerequisiteNodeIds: string[] }> {
    if (nodeId === prerequisiteId) {
      throw ApiError.badRequest('Node cannot be its own prerequisite');
    }

    const node = await KnowledgeNode.findOne({
      _id: nodeId,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    await this.validateNodeInDepartment(prerequisiteId, departmentId, 'Prerequisite node');

    // Check if already a prerequisite
    const prereqObjectId = new mongoose.Types.ObjectId(prerequisiteId);
    if (node.prerequisiteNodeIds.some((id) => id.equals(prereqObjectId))) {
      throw ApiError.badRequest('Node is already a prerequisite');
    }

    // Check for circular dependency
    const wouldBeCircular = await this.checkCircularPrerequisite(nodeId, prerequisiteId, departmentId);
    if (wouldBeCircular) {
      throw ApiError.badRequest('Would create circular dependency');
    }

    node.prerequisiteNodeIds.push(prereqObjectId);
    await node.save();

    return {
      nodeId,
      prerequisiteNodeIds: node.prerequisiteNodeIds.map((id) => id.toString())
    };
  }

  /**
   * Remove a prerequisite relationship
   */
  static async removePrerequisite(
    nodeId: string,
    prerequisiteId: string,
    departmentId: string
  ): Promise<{ nodeId: string; prerequisiteNodeIds: string[] }> {
    const node = await KnowledgeNode.findOne({
      _id: nodeId,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!node) {
      throw ApiError.notFound('Knowledge node not found', 'NOT_FOUND');
    }

    const prereqObjectId = new mongoose.Types.ObjectId(prerequisiteId);
    const index = node.prerequisiteNodeIds.findIndex((id) => id.equals(prereqObjectId));

    if (index === -1) {
      throw ApiError.badRequest('Node is not a prerequisite');
    }

    node.prerequisiteNodeIds.splice(index, 1);
    await node.save();

    return {
      nodeId,
      prerequisiteNodeIds: node.prerequisiteNodeIds.map((id) => id.toString())
    };
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate that a node exists and belongs to the department
   */
  private static async validateNodeInDepartment(
    nodeId: string,
    departmentId: string,
    label: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(nodeId)) {
      throw ApiError.notFound(`${label} not found`, 'NODE_NOT_FOUND');
    }

    const node = await KnowledgeNode.findOne({
      _id: nodeId,
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!node) {
      throw ApiError.notFound(`${label} not found in department`, 'NODE_NOT_FOUND');
    }
  }

  /**
   * Check if adding a prerequisite would create a circular dependency
   */
  private static async checkCircularPrerequisite(
    nodeId: string,
    newPrereqId: string,
    departmentId: string
  ): Promise<boolean> {
    // If adding newPrereqId as a prerequisite of nodeId would create a cycle,
    // that means nodeId is already reachable from newPrereqId through prerequisites

    const visited = new Set<string>();

    const checkPath = async (currentId: string): Promise<boolean> => {
      if (currentId === nodeId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const current = await KnowledgeNode.findOne({
        _id: currentId,
        departmentId: new mongoose.Types.ObjectId(departmentId)
      });

      if (!current) return false;

      for (const prereqId of current.prerequisiteNodeIds) {
        if (await checkPath(prereqId.toString())) {
          return true;
        }
      }

      return false;
    };

    return checkPath(newPrereqId);
  }

  /**
   * Check if setting a parent would create a circular hierarchy
   */
  private static async checkCircularHierarchy(
    nodeId: string,
    newParentId: string,
    departmentId: string
  ): Promise<boolean> {
    // Check if nodeId is an ancestor of newParentId
    const visited = new Set<string>();

    const checkAncestors = async (currentId: string): Promise<boolean> => {
      if (currentId === nodeId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const current = await KnowledgeNode.findOne({
        _id: currentId,
        departmentId: new mongoose.Types.ObjectId(departmentId)
      });

      if (!current || !current.parentNodeId) return false;

      return checkAncestors(current.parentNodeId.toString());
    };

    return checkAncestors(newParentId);
  }

  /**
   * Generate a URL-friendly slug from a name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  /**
   * Format node document to response object
   */
  private static formatNodeResponse(node: IKnowledgeNode): NodeResponse {
    return {
      id: node._id.toString(),
      departmentId: node.departmentId.toString(),
      name: node.name,
      slug: node.slug,
      description: node.description || null,
      parentNodeId: node.parentNodeId ? node.parentNodeId.toString() : null,
      prerequisiteNodeIds: node.prerequisiteNodeIds.map((id) => id.toString()),
      relatedNodeIds: node.relatedNodeIds.map((id) => id.toString()),
      depthRange: {
        min: node.depthRange.min,
        max: node.depthRange.max
      },
      tags: node.tags,
      isActive: node.isActive,
      createdBy: node.createdBy.toString(),
      updatedBy: node.updatedBy.toString(),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt
    };
  }
}

export default KnowledgeNodesService;
