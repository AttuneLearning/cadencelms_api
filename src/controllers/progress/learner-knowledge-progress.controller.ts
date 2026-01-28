import { Request, Response } from 'express';
import { LearnerKnowledgeProgressService } from '@/services/progress/learner-knowledge-progress.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Learner Knowledge Progress Controller
 * Handles all learner knowledge progress endpoints
 *
 * Tracks learner progress through knowledge nodes in the adaptive learning system.
 * Used for mastery tracking, learning path recommendations, and progress analytics.
 */

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress
 * Get all knowledge progress for a learner, optionally filtered by department
 */
export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;
  const { departmentId } = req.query;

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  const progress = await LearnerKnowledgeProgressService.getForLearner(
    learnerId,
    departmentId as string | undefined
  );

  res.status(200).json(ApiResponse.success(progress));
});

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress/:nodeId
 * Get progress for a specific knowledge node
 */
export const getForNode = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId, nodeId } = req.params;

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!nodeId) {
    throw ApiError.badRequest('Node ID is required');
  }

  const progress = await LearnerKnowledgeProgressService.getForNode(
    learnerId,
    nodeId
  );

  if (!progress) {
    throw ApiError.notFound('Progress not found for this learner and node');
  }

  res.status(200).json(ApiResponse.success(progress));
});

/**
 * GET /api/v2/learners/:learnerId/knowledge-progress/summary
 * Get progress summary with stats for a learner in a department
 */
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;
  const { departmentId } = req.query;

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  const summary = await LearnerKnowledgeProgressService.getProgressSummary(
    learnerId,
    departmentId as string
  );

  res.status(200).json(ApiResponse.success(summary));
});

/**
 * GET /api/v2/departments/:departmentId/learners/:learnerId/knowledge-map
 * Get knowledge map showing mastered, in-progress, and ready-to-learn nodes
 */
export const getKnowledgeMap = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, learnerId } = req.params;

  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // Fetch all data in parallel for efficiency
  const [masteredNodes, inProgressNodes, readyToLearnNodes, summary] = await Promise.all([
    LearnerKnowledgeProgressService.getMasteredNodes(learnerId, departmentId),
    LearnerKnowledgeProgressService.getInProgressNodes(learnerId, departmentId),
    LearnerKnowledgeProgressService.getReadyToLearnNodes(learnerId, departmentId),
    LearnerKnowledgeProgressService.getProgressSummary(learnerId, departmentId)
  ]);

  res.status(200).json(ApiResponse.success({
    masteredNodes,
    inProgressNodes,
    readyToLearnNodes,
    summary
  }));
});

/**
 * DELETE /api/v2/learners/:learnerId/knowledge-progress/:nodeId
 * Reset/delete progress for a learner on a specific node
 */
export const resetProgress = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId, nodeId } = req.params;

  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!nodeId) {
    throw ApiError.badRequest('Node ID is required');
  }

  await LearnerKnowledgeProgressService.resetProgress(learnerId, nodeId);

  res.status(200).json(ApiResponse.success(null, 'Progress reset successfully'));
});

/**
 * Export controller methods as a class for alternative usage pattern
 */
export class LearnerKnowledgeProgressController {
  static getAll = getAll;
  static getForNode = getForNode;
  static getSummary = getSummary;
  static getKnowledgeMap = getKnowledgeMap;
  static resetProgress = resetProgress;
}
