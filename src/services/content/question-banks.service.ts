import mongoose from 'mongoose';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

interface ListFilters {
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort?: string;
}

interface CreateBankDto {
  name: string;
  description?: string;
  tags?: string[];
}

interface UpdateBankDto {
  name?: string;
  description?: string;
  tags?: string[];
}

interface BankUsageInfo {
  inUse: boolean;
  usageCount: number;
  learningUnits: Array<{
    learningUnitId: string;
    title?: string;
  }>;
}

interface PaginatedResponse<T> {
  questionBanks: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface QuestionBankResponse {
  id: string;
  departmentId: string;
  name: string;
  description: string | null;
  questionCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
}

export class QuestionBanksService {
  /**
   * List question banks in a department with pagination
   */
  static async list(departmentId: string, filters: ListFilters): Promise<PaginatedResponse<QuestionBankResponse>> {
    // Validate departmentId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      departmentId: new mongoose.Types.ObjectId(departmentId),
      isActive: true
    };

    // Search filter - name and description
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags.map(tag => tag.toLowerCase()) };
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortDirection };

    // Execute query with virtual population
    const [questionBanks, total] = await Promise.all([
      QuestionBank.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('questionCount'),
      QuestionBank.countDocuments(query)
    ]);

    // Format response
    const formattedBanks: QuestionBankResponse[] = questionBanks.map((bank: any) => ({
      id: bank._id.toString(),
      departmentId: bank.departmentId.toString(),
      name: bank.name,
      description: bank.description || null,
      questionCount: bank.questionCount || 0,
      tags: bank.tags || [],
      createdAt: bank.createdAt,
      updatedAt: bank.updatedAt
    }));

    return {
      questionBanks: formattedBanks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new question bank
   */
  static async create(departmentId: string, data: CreateBankDto, userId: string): Promise<QuestionBankResponse> {
    // Validate departmentId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    // Check for duplicate name in department (case-insensitive)
    const existingBank = await QuestionBank.findOne({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      name: { $regex: new RegExp(`^${this.escapeRegex(data.name)}$`, 'i') },
      isActive: true
    });

    if (existingBank) {
      throw ApiError.badRequest('Question bank with this name already exists in department');
    }

    // Create bank
    const bank = await QuestionBank.create({
      name: data.name,
      description: data.description || null,
      departmentId: new mongoose.Types.ObjectId(departmentId),
      questionIds: [],
      tags: data.tags?.map(tag => tag.toLowerCase()) || [],
      isActive: true,
      metadata: {
        createdBy: userId
      }
    });

    return {
      id: bank._id.toString(),
      departmentId: bank.departmentId.toString(),
      name: bank.name,
      description: bank.description || null,
      questionCount: 0,
      tags: bank.tags || [],
      createdAt: bank.createdAt,
      updatedAt: bank.updatedAt
    };
  }

  /**
   * Get question bank by ID with details
   */
  static async getById(departmentId: string, bankId: string): Promise<QuestionBankResponse> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Find bank with virtuals
    const bank = await QuestionBank.findById(bankId)
      .populate('questionCount')
      .populate('usageCount');

    if (!bank || !bank.isActive) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Verify department match
    if (bank.departmentId.toString() !== departmentId) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    return {
      id: bank._id.toString(),
      departmentId: bank.departmentId.toString(),
      name: bank.name,
      description: bank.description || null,
      questionCount: (bank as any).questionCount || 0,
      tags: bank.tags || [],
      usageCount: (bank as any).usageCount || 0,
      createdAt: bank.createdAt,
      updatedAt: bank.updatedAt
    };
  }

  /**
   * Update question bank
   */
  static async update(departmentId: string, bankId: string, data: UpdateBankDto): Promise<QuestionBankResponse> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Find bank
    const bank = await QuestionBank.findById(bankId);

    if (!bank || !bank.isActive) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Verify department match
    if (bank.departmentId.toString() !== departmentId) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== bank.name.toLowerCase()) {
      const existingBank = await QuestionBank.findOne({
        departmentId: new mongoose.Types.ObjectId(departmentId),
        name: { $regex: new RegExp(`^${this.escapeRegex(data.name)}$`, 'i') },
        isActive: true,
        _id: { $ne: bankId }
      });

      if (existingBank) {
        throw ApiError.badRequest('Question bank with this name already exists in department');
      }
    }

    // Update fields
    if (data.name !== undefined) {
      bank.name = data.name;
    }
    if (data.description !== undefined) {
      bank.description = data.description;
    }
    if (data.tags !== undefined) {
      bank.tags = data.tags.map(tag => tag.toLowerCase());
    }

    await bank.save();

    // Fetch with virtuals for response
    const updatedBank = await QuestionBank.findById(bankId)
      .populate('questionCount')
      .populate('usageCount');

    return {
      id: updatedBank!._id.toString(),
      departmentId: updatedBank!.departmentId.toString(),
      name: updatedBank!.name,
      description: updatedBank!.description || null,
      questionCount: (updatedBank as any).questionCount || 0,
      tags: updatedBank!.tags || [],
      usageCount: (updatedBank as any).usageCount || 0,
      createdAt: updatedBank!.createdAt,
      updatedAt: updatedBank!.updatedAt
    };
  }

  /**
   * Delete question bank (soft delete)
   */
  static async delete(departmentId: string, bankId: string, force: boolean = false): Promise<void> {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.notFound('Department not found', 'DEPARTMENT_NOT_FOUND');
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Find bank
    const bank = await QuestionBank.findById(bankId);

    if (!bank || !bank.isActive) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Verify department match
    if (bank.departmentId.toString() !== departmentId) {
      throw ApiError.notFound('Question bank not found', 'NOT_FOUND');
    }

    // Check if bank is in use by learning units
    const usageInfo = await this.checkBankInUse(bankId);

    if (usageInfo.inUse && !force) {
      throw ApiError.badRequest(
        `Cannot delete bank in use by ${usageInfo.usageCount} learning unit(s). Use force=true or unlink first.`
      );
    }

    // Remove bankId from all questions' questionBankIds arrays
    await Question.updateMany(
      { questionBankIds: bankId },
      { $pull: { questionBankIds: bankId } }
    );

    // If force delete, also remove LearningUnitQuestion links
    if (force && usageInfo.inUse) {
      await LearningUnitQuestion.deleteMany({ bankId: new mongoose.Types.ObjectId(bankId) });
    }

    // Soft delete bank
    bank.isActive = false;
    bank.metadata = {
      ...bank.metadata,
      deletedAt: new Date()
    };
    await bank.save();
  }

  /**
   * Check if bank is in use
   */
  static async checkBankInUse(bankId: string): Promise<BankUsageInfo> {
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return { inUse: false, usageCount: 0, learningUnits: [] };
    }

    // Find LearningUnitQuestion records with this bankId
    const usageRecords = await LearningUnitQuestion.find({
      bankId: new mongoose.Types.ObjectId(bankId)
    })
      .select('learningUnitId')
      .populate('learningUnitId', 'title')
      .limit(100);

    // Get unique learning units
    const uniqueLearningUnits = new Map<string, { learningUnitId: string; title?: string }>();

    for (const record of usageRecords) {
      const luId = record.learningUnitId.toString();
      if (!uniqueLearningUnits.has(luId)) {
        const populated = record.learningUnitId as any;
        uniqueLearningUnits.set(luId, {
          learningUnitId: luId,
          title: populated?.title || undefined
        });
      }
    }

    const learningUnits = Array.from(uniqueLearningUnits.values());
    const usageCount = learningUnits.length;

    return {
      inUse: usageCount > 0,
      usageCount,
      learningUnits
    };
  }

  /**
   * Helper: Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
