import { Request, Response, NextFunction } from 'express';
import { QuestionBanksService } from '@/services/content/question-banks.service';

/**
 * Question Banks Controller
 * Handles all department-scoped question bank management endpoints
 *
 * Base path: /api/v2/departments/:departmentId/question-banks
 */
export class QuestionBanksController {
  /**
   * GET /api/v2/departments/:departmentId/question-banks
   * List question banks in a department with filtering and pagination
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId } = req.params;
      const { search, tags, page, limit, sort } = req.query;

      const result = await QuestionBanksService.list(departmentId, {
        search: search as string,
        tags: tags ? (tags as string).split(',') : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sort: sort as string
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v2/departments/:departmentId/question-banks
   * Create a new question bank in a department
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId } = req.params;
      const userId = req.user?.userId;

      const result = await QuestionBanksService.create(departmentId, req.body, userId!);
      res.status(201).json({ success: true, message: 'Question bank created', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/departments/:departmentId/question-banks/:bankId
   * Get details of a specific question bank
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId, bankId } = req.params;

      const result = await QuestionBanksService.getById(departmentId, bankId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v2/departments/:departmentId/question-banks/:bankId
   * Update an existing question bank
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId, bankId } = req.params;

      const result = await QuestionBanksService.update(departmentId, bankId, req.body);
      res.json({ success: true, message: 'Question bank updated', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v2/departments/:departmentId/question-banks/:bankId
   * Delete a question bank (soft delete)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId, bankId } = req.params;
      const { force } = req.query;

      await QuestionBanksService.delete(departmentId, bankId, force === 'true');
      res.json({ success: true, message: 'Question bank deleted' });
    } catch (error) {
      next(error);
    }
  }
}
