import CredentialGroup, { CredentialType } from '@/models/certificate/CredentialGroup.model';
import CertificateDefinition from '@/models/certificate/CertificateDefinition.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

interface ListCredentialGroupsFilters {
  page?: number;
  limit?: number;
  departmentId?: string;
  type?: CredentialType;
  isActive?: boolean;
  search?: string;
  sort?: string;
}

interface CreateCredentialGroupData {
  name: string;
  code: string;
  description: string;
  type: CredentialType;
  badgeImageUrl?: string | null;
  badgeColor?: string | null;
  departmentId: string;
  programId?: string | null;
}

interface UpdateCredentialGroupData {
  name?: string;
  code?: string;
  description?: string;
  type?: CredentialType;
  badgeImageUrl?: string | null;
  badgeColor?: string | null;
  programId?: string | null;
  isActive?: boolean;
}

export class CredentialGroupService {
  /**
   * List credential groups with filtering and pagination
   */
  static async listCredentialGroups(
    filters: ListCredentialGroupsFilters,
    _userId: string
  ): Promise<{
    credentialGroups: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Filter by department
    if (filters.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(filters.departmentId)) {
        throw ApiError.badRequest('Invalid department ID');
      }
      query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
    }

    // Filter by type
    if (filters.type) {
      query.type = filters.type;
    }

    // Filter by active status
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Search by name or code
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [credentialGroups, total] = await Promise.all([
      CredentialGroup.find(query)
        .populate('departmentId', 'name')
        .populate('programId', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CredentialGroup.countDocuments(query)
    ]);

    // Enrich with definition counts
    const enrichedGroups = await Promise.all(
      credentialGroups.map(async (group) => {
        const [totalDefinitions, activeDefinitions] = await Promise.all([
          CertificateDefinition.countDocuments({ credentialGroupId: group._id }),
          CertificateDefinition.countDocuments({ credentialGroupId: group._id, status: 'active' })
        ]);

        const department = group.departmentId as any;
        const program = group.programId as any;

        return {
          id: group._id.toString(),
          name: group.name,
          code: group.code,
          description: group.description,
          type: group.type,
          badgeImageUrl: group.badgeImageUrl,
          badgeColor: group.badgeColor,
          department: department ? {
            id: department._id.toString(),
            name: department.name
          } : null,
          program: program ? {
            id: program._id.toString(),
            name: program.name,
            code: program.code
          } : null,
          isActive: group.isActive,
          totalDefinitions,
          activeDefinitions,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      credentialGroups: enrichedGroups,
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
   * Create a new credential group
   */
  static async createCredentialGroup(
    data: CreateCredentialGroupData,
    userId: string
  ): Promise<any> {
    // Validate department exists
    if (!mongoose.Types.ObjectId.isValid(data.departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(data.departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Validate program if provided
    if (data.programId) {
      if (!mongoose.Types.ObjectId.isValid(data.programId)) {
        throw ApiError.badRequest('Invalid program ID');
      }
      const program = await Program.findById(data.programId);
      if (!program) {
        throw ApiError.notFound('Program not found');
      }
      // Program must belong to same department
      if (program.departmentId.toString() !== data.departmentId) {
        throw ApiError.badRequest('Program must belong to the same department as the credential group');
      }
    }

    // Check code uniqueness within department
    const existingGroup = await CredentialGroup.findOne({
      departmentId: data.departmentId,
      code: data.code.toUpperCase()
    });

    if (existingGroup) {
      throw ApiError.conflict('Credential code already exists in this department');
    }

    // Create credential group
    const credentialGroup = new CredentialGroup({
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      type: data.type,
      badgeImageUrl: data.badgeImageUrl || null,
      badgeColor: data.badgeColor || null,
      departmentId: data.departmentId,
      programId: data.programId || null,
      isActive: true,
      createdBy: userId
    });

    await credentialGroup.save();

    return {
      id: credentialGroup._id.toString(),
      name: credentialGroup.name,
      code: credentialGroup.code,
      description: credentialGroup.description,
      type: credentialGroup.type,
      badgeImageUrl: credentialGroup.badgeImageUrl,
      badgeColor: credentialGroup.badgeColor,
      departmentId: credentialGroup.departmentId.toString(),
      programId: credentialGroup.programId?.toString() || null,
      isActive: credentialGroup.isActive,
      createdBy: credentialGroup.createdBy.toString(),
      createdAt: credentialGroup.createdAt,
      updatedAt: credentialGroup.updatedAt
    };
  }

  /**
   * Get a credential group by ID
   */
  static async getCredentialGroupById(
    credentialGroupId: string,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    const credentialGroup = await CredentialGroup.findById(credentialGroupId)
      .populate('departmentId', 'name')
      .populate('programId', 'name code')
      .populate('createdBy', 'email')
      .lean();

    if (!credentialGroup) {
      throw ApiError.notFound('Credential group not found');
    }

    // Get definition statistics
    const [totalDefinitions, activeDefinitions, draftDefinitions, deprecatedDefinitions] = await Promise.all([
      CertificateDefinition.countDocuments({ credentialGroupId }),
      CertificateDefinition.countDocuments({ credentialGroupId, status: 'active' }),
      CertificateDefinition.countDocuments({ credentialGroupId, status: 'draft' }),
      CertificateDefinition.countDocuments({ credentialGroupId, status: 'deprecated' })
    ]);

    const department = credentialGroup.departmentId as any;
    const program = credentialGroup.programId as any;
    const createdByUser = credentialGroup.createdBy as any;

    return {
      id: credentialGroup._id.toString(),
      name: credentialGroup.name,
      code: credentialGroup.code,
      description: credentialGroup.description,
      type: credentialGroup.type,
      badgeImageUrl: credentialGroup.badgeImageUrl,
      badgeColor: credentialGroup.badgeColor,
      department: department ? {
        id: department._id.toString(),
        name: department.name
      } : null,
      program: program ? {
        id: program._id.toString(),
        name: program.name,
        code: program.code
      } : null,
      isActive: credentialGroup.isActive,
      statistics: {
        totalDefinitions,
        activeDefinitions,
        draftDefinitions,
        deprecatedDefinitions
      },
      createdBy: createdByUser ? {
        id: createdByUser._id.toString(),
        email: createdByUser.email
      } : null,
      createdAt: credentialGroup.createdAt,
      updatedAt: credentialGroup.updatedAt
    };
  }

  /**
   * Update a credential group
   */
  static async updateCredentialGroup(
    credentialGroupId: string,
    data: UpdateCredentialGroupData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    const credentialGroup = await CredentialGroup.findById(credentialGroupId);
    if (!credentialGroup) {
      throw ApiError.notFound('Credential group not found');
    }

    // Check code uniqueness if code is being updated
    if (data.code && data.code.toUpperCase() !== credentialGroup.code) {
      const existingGroup = await CredentialGroup.findOne({
        departmentId: credentialGroup.departmentId,
        code: data.code.toUpperCase(),
        _id: { $ne: credentialGroupId }
      });

      if (existingGroup) {
        throw ApiError.conflict('Credential code already exists in this department');
      }
    }

    // Validate program if being updated
    if (data.programId !== undefined && data.programId !== null) {
      if (!mongoose.Types.ObjectId.isValid(data.programId)) {
        throw ApiError.badRequest('Invalid program ID');
      }
      const program = await Program.findById(data.programId);
      if (!program) {
        throw ApiError.notFound('Program not found');
      }
      if (program.departmentId.toString() !== credentialGroup.departmentId.toString()) {
        throw ApiError.badRequest('Program must belong to the same department as the credential group');
      }
    }

    // Update fields
    if (data.name !== undefined) credentialGroup.name = data.name;
    if (data.code !== undefined) credentialGroup.code = data.code.toUpperCase();
    if (data.description !== undefined) credentialGroup.description = data.description;
    if (data.type !== undefined) credentialGroup.type = data.type;
    if (data.badgeImageUrl !== undefined) credentialGroup.badgeImageUrl = data.badgeImageUrl;
    if (data.badgeColor !== undefined) credentialGroup.badgeColor = data.badgeColor;
    if (data.programId !== undefined) {
      credentialGroup.programId = data.programId
        ? new mongoose.Types.ObjectId(data.programId)
        : null;
    }
    if (data.isActive !== undefined) credentialGroup.isActive = data.isActive;

    await credentialGroup.save();

    return {
      id: credentialGroup._id.toString(),
      name: credentialGroup.name,
      code: credentialGroup.code,
      description: credentialGroup.description,
      type: credentialGroup.type,
      badgeImageUrl: credentialGroup.badgeImageUrl,
      badgeColor: credentialGroup.badgeColor,
      departmentId: credentialGroup.departmentId.toString(),
      programId: credentialGroup.programId?.toString() || null,
      isActive: credentialGroup.isActive,
      updatedAt: credentialGroup.updatedAt
    };
  }

  /**
   * Delete a credential group (soft delete by deactivating)
   */
  static async deleteCredentialGroup(
    credentialGroupId: string,
    _userId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    const credentialGroup = await CredentialGroup.findById(credentialGroupId);
    if (!credentialGroup) {
      throw ApiError.notFound('Credential group not found');
    }

    // Check for active definitions
    const activeDefinitions = await CertificateDefinition.countDocuments({
      credentialGroupId,
      status: 'active'
    });

    if (activeDefinitions > 0) {
      throw ApiError.conflict('Cannot delete credential group with active definitions. Deprecate all definitions first.');
    }

    // Soft delete by deactivating
    credentialGroup.isActive = false;
    await credentialGroup.save();
  }
}
