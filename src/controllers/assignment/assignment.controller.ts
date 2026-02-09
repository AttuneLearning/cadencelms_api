import { Request, Response } from 'express';
import { AssignmentService } from '@/services/assignment/assignment.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const assignment = await AssignmentService.createAssignment(req.body, user.userId);
  res.status(201).json(ApiResponse.success(assignment, 'Assignment created successfully'));
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const assignment = await AssignmentService.getAssignment(assignmentId);
  res.status(200).json(ApiResponse.success(assignment));
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const user = (req as any).user;
  const assignment = await AssignmentService.updateAssignment(assignmentId, req.body, user.userId);
  res.status(200).json(ApiResponse.success(assignment, 'Assignment updated successfully'));
});

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const filters = {
    moduleId: req.query.moduleId as string,
    isPublished: req.query.isPublished !== undefined
      ? req.query.isPublished === 'true'
      : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20
  };

  // When accessed via GET /assignments, courseId comes from query
  // When accessed via nested route, it would come from params
  const courseId = (req.query.courseId as string) || assignmentId;
  const result = await AssignmentService.listAssignments(courseId, filters);
  res.status(200).json(ApiResponse.success(result));
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const user = (req as any).user;
  const assignment = await AssignmentService.deleteAssignment(assignmentId, user.userId);
  res.status(200).json(ApiResponse.success(assignment, 'Assignment deleted successfully'));
});
