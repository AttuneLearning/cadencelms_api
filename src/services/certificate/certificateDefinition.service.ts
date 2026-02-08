import CertificateDefinition, { CertificateDefinitionStatus } from '@/models/certificate/CertificateDefinition.model';
import CertificateRequirement from '@/models/certificate/CertificateRequirement.model';
import CredentialGroup from '@/models/certificate/CredentialGroup.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import { ApiError } from '@/utils/ApiError';
import { eventBus, EVENTS, CourseVersionPublishedPayload } from '@/events/eventBus';
import mongoose from 'mongoose';

interface ListDefinitionsFilters {
  page?: number;
  limit?: number;
  credentialGroupId?: string;
  status?: CertificateDefinitionStatus;
  sort?: string;
}

interface CreateDefinitionData {
  credentialGroupId: string;
  title: string;
  description: string;
  isCompatible?: boolean;
  compatibilityBreakReason?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  expiresAfterMonths?: number | null;
  autoIssue?: boolean;
}

interface UpdateDefinitionData {
  title?: string;
  description?: string;
  isCompatible?: boolean;
  compatibilityBreakReason?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  expiresAfterMonths?: number | null;
  autoIssue?: boolean;
}

interface AddRequirementData {
  courseVersionId: string;
  isRequired?: boolean;
  minimumScore?: number | null;
  order?: number;
  electiveGroupId?: string | null;
  electiveGroupName?: string | null;
  electiveMinCount?: number | null;
}

export class CertificateDefinitionService {
  /**
   * List certificate definitions with filtering and pagination
   */
  static async listDefinitions(
    filters: ListDefinitionsFilters,
    _userId: string
  ): Promise<{
    definitions: any[];
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

    if (filters.credentialGroupId) {
      if (!mongoose.Types.ObjectId.isValid(filters.credentialGroupId)) {
        throw ApiError.badRequest('Invalid credential group ID');
      }
      query.credentialGroupId = new mongoose.Types.ObjectId(filters.credentialGroupId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Parse sort
    const sortField = filters.sort || '-version';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [definitions, total] = await Promise.all([
      CertificateDefinition.find(query)
        .populate('credentialGroupId', 'name code type')
        .populate('parentDefinitionId', 'version title')
        .populate('supersededByDefinitionId', 'version title')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CertificateDefinition.countDocuments(query)
    ]);

    // Enrich with requirement counts
    const enrichedDefinitions = await Promise.all(
      definitions.map(async (def) => {
        const requirementCount = await CertificateRequirement.countDocuments({
          certificateDefinitionId: def._id
        });

        const credentialGroup = def.credentialGroupId as any;
        const parentDef = def.parentDefinitionId as any;
        const supersededBy = def.supersededByDefinitionId as any;

        return {
          id: def._id.toString(),
          credentialGroup: credentialGroup ? {
            id: credentialGroup._id.toString(),
            name: credentialGroup.name,
            code: credentialGroup.code,
            type: credentialGroup.type
          } : null,
          version: def.version,
          parentDefinition: parentDef ? {
            id: parentDef._id.toString(),
            version: parentDef.version,
            title: parentDef.title
          } : null,
          title: def.title,
          description: def.description,
          status: def.status,
          isCompatible: def.isCompatible,
          compatibilityBreakReason: def.compatibilityBreakReason,
          deprecatedAt: def.deprecatedAt,
          deprecatedReason: def.deprecatedReason,
          supersededBy: supersededBy ? {
            id: supersededBy._id.toString(),
            version: supersededBy.version,
            title: supersededBy.title
          } : null,
          validFrom: def.validFrom,
          validUntil: def.validUntil,
          expiresAfterMonths: def.expiresAfterMonths,
          autoIssue: def.autoIssue,
          requirementCount,
          createdAt: def.createdAt,
          updatedAt: def.updatedAt
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      definitions: enrichedDefinitions,
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
   * Create a new certificate definition
   */
  static async createDefinition(
    data: CreateDefinitionData,
    userId: string
  ): Promise<any> {
    // Validate credential group
    if (!mongoose.Types.ObjectId.isValid(data.credentialGroupId)) {
      throw ApiError.badRequest('Invalid credential group ID');
    }

    const credentialGroup = await CredentialGroup.findById(data.credentialGroupId);
    if (!credentialGroup) {
      throw ApiError.notFound('Credential group not found');
    }

    if (!credentialGroup.isActive) {
      throw ApiError.badRequest('Cannot create definition for inactive credential group');
    }

    // Get next version number
    const lastDefinition = await CertificateDefinition.findOne({ credentialGroupId: data.credentialGroupId })
      .sort({ version: -1 })
      .lean();

    const version = lastDefinition ? lastDefinition.version + 1 : 1;
    const parentDefinitionId = lastDefinition ? lastDefinition._id : null;

    // Create definition
    const definition = new CertificateDefinition({
      credentialGroupId: data.credentialGroupId,
      version,
      parentDefinitionId,
      title: data.title,
      description: data.description,
      status: 'draft',
      isCompatible: data.isCompatible ?? true,
      compatibilityBreakReason: data.compatibilityBreakReason || null,
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
      expiresAfterMonths: data.expiresAfterMonths || null,
      autoIssue: data.autoIssue ?? false,
      createdBy: userId
    });

    await definition.save();

    return {
      id: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      parentDefinitionId: definition.parentDefinitionId?.toString() || null,
      title: definition.title,
      description: definition.description,
      status: definition.status,
      isCompatible: definition.isCompatible,
      compatibilityBreakReason: definition.compatibilityBreakReason,
      validFrom: definition.validFrom,
      validUntil: definition.validUntil,
      expiresAfterMonths: definition.expiresAfterMonths,
      autoIssue: definition.autoIssue,
      createdBy: definition.createdBy.toString(),
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt
    };
  }

  /**
   * Get a certificate definition by ID
   */
  static async getDefinitionById(
    definitionId: string,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId)
      .populate('credentialGroupId', 'name code type departmentId')
      .populate('parentDefinitionId', 'version title')
      .populate('supersededByDefinitionId', 'version title')
      .populate('createdBy', 'email')
      .lean();

    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    // Get requirements
    const requirements = await CertificateRequirement.find({ certificateDefinitionId: definitionId })
      .populate('courseVersionId', 'title version canonicalCourseId')
      .sort({ order: 1 })
      .lean();

    const credentialGroup = definition.credentialGroupId as any;
    const parentDef = definition.parentDefinitionId as any;
    const supersededBy = definition.supersededByDefinitionId as any;
    const createdByUser = definition.createdBy as any;

    const enrichedRequirements = requirements.map((req) => {
      const courseVersion = req.courseVersionId as any;
      return {
        id: req._id.toString(),
        courseVersion: courseVersion ? {
          id: courseVersion._id.toString(),
          title: courseVersion.title,
          version: courseVersion.version,
          canonicalCourseId: courseVersion.canonicalCourseId?.toString()
        } : null,
        isRequired: req.isRequired,
        minimumScore: req.minimumScore,
        order: req.order,
        electiveGroupId: req.electiveGroupId,
        electiveGroupName: req.electiveGroupName,
        electiveMinCount: req.electiveMinCount
      };
    });

    return {
      id: definition._id.toString(),
      credentialGroup: credentialGroup ? {
        id: credentialGroup._id.toString(),
        name: credentialGroup.name,
        code: credentialGroup.code,
        type: credentialGroup.type,
        departmentId: credentialGroup.departmentId?.toString()
      } : null,
      version: definition.version,
      parentDefinition: parentDef ? {
        id: parentDef._id.toString(),
        version: parentDef.version,
        title: parentDef.title
      } : null,
      title: definition.title,
      description: definition.description,
      status: definition.status,
      isCompatible: definition.isCompatible,
      compatibilityBreakReason: definition.compatibilityBreakReason,
      deprecatedAt: definition.deprecatedAt,
      deprecatedReason: definition.deprecatedReason,
      supersededBy: supersededBy ? {
        id: supersededBy._id.toString(),
        version: supersededBy.version,
        title: supersededBy.title
      } : null,
      validFrom: definition.validFrom,
      validUntil: definition.validUntil,
      expiresAfterMonths: definition.expiresAfterMonths,
      autoIssue: definition.autoIssue,
      requirements: enrichedRequirements,
      createdBy: createdByUser ? {
        id: createdByUser._id.toString(),
        email: createdByUser.email
      } : null,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt
    };
  }

  /**
   * Update a certificate definition (only drafts can be updated)
   */
  static async updateDefinition(
    definitionId: string,
    data: UpdateDefinitionData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status !== 'draft') {
      throw ApiError.badRequest('Only draft definitions can be updated');
    }

    // Update fields
    if (data.title !== undefined) definition.title = data.title;
    if (data.description !== undefined) definition.description = data.description;
    if (data.isCompatible !== undefined) definition.isCompatible = data.isCompatible;
    if (data.compatibilityBreakReason !== undefined) definition.compatibilityBreakReason = data.compatibilityBreakReason;
    if (data.validFrom !== undefined) definition.validFrom = data.validFrom;
    if (data.validUntil !== undefined) definition.validUntil = data.validUntil;
    if (data.expiresAfterMonths !== undefined) definition.expiresAfterMonths = data.expiresAfterMonths;
    if (data.autoIssue !== undefined) definition.autoIssue = data.autoIssue;

    await definition.save();

    return {
      id: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      title: definition.title,
      description: definition.description,
      status: definition.status,
      isCompatible: definition.isCompatible,
      compatibilityBreakReason: definition.compatibilityBreakReason,
      validFrom: definition.validFrom,
      validUntil: definition.validUntil,
      expiresAfterMonths: definition.expiresAfterMonths,
      autoIssue: definition.autoIssue,
      updatedAt: definition.updatedAt
    };
  }

  /**
   * Activate a certificate definition
   */
  static async activateDefinition(
    definitionId: string,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status !== 'draft') {
      throw ApiError.badRequest('Only draft definitions can be activated');
    }

    // Check that definition has at least one requirement
    const requirementCount = await CertificateRequirement.countDocuments({
      certificateDefinitionId: definitionId
    });

    if (requirementCount === 0) {
      throw ApiError.badRequest('Cannot activate a definition with no requirements');
    }

    // Deprecate any existing active definition for this credential group
    const existingActive = await CertificateDefinition.findOne({
      credentialGroupId: definition.credentialGroupId,
      status: 'active'
    });

    if (existingActive) {
      existingActive.status = 'deprecated';
      existingActive.deprecatedAt = new Date();
      existingActive.deprecatedReason = 'Superseded by newer version';
      existingActive.supersededByDefinitionId = definition._id as mongoose.Types.ObjectId;
      await existingActive.save();
    }

    // Activate this definition
    definition.status = 'active';
    await definition.save();

    // Emit event
    eventBus.emit(EVENTS.CERTIFICATE_DEFINITION_ACTIVATED, {
      definitionId: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      activatedBy: userId
    });

    return {
      id: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      title: definition.title,
      status: definition.status,
      activatedAt: definition.updatedAt
    };
  }

  /**
   * Deprecate a certificate definition
   */
  static async deprecateDefinition(
    definitionId: string,
    reason: string,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status === 'deprecated') {
      throw ApiError.badRequest('Definition is already deprecated');
    }

    definition.status = 'deprecated';
    definition.deprecatedAt = new Date();
    definition.deprecatedReason = reason;
    await definition.save();

    // Emit event
    eventBus.emit(EVENTS.CERTIFICATE_DEFINITION_DEPRECATED, {
      definitionId: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      reason,
      deprecatedBy: userId
    });

    return {
      id: definition._id.toString(),
      credentialGroupId: definition.credentialGroupId.toString(),
      version: definition.version,
      title: definition.title,
      status: definition.status,
      deprecatedAt: definition.deprecatedAt,
      deprecatedReason: definition.deprecatedReason
    };
  }

  /**
   * List requirements for a definition
   */
  static async listRequirements(
    definitionId: string,
    _userId: string
  ): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    const requirements = await CertificateRequirement.find({ certificateDefinitionId: definitionId })
      .populate('courseVersionId', 'title version canonicalCourseId status')
      .sort({ order: 1 })
      .lean();

    return requirements.map((req) => {
      const courseVersion = req.courseVersionId as any;
      return {
        id: req._id.toString(),
        courseVersion: courseVersion ? {
          id: courseVersion._id.toString(),
          title: courseVersion.title,
          version: courseVersion.version,
          canonicalCourseId: courseVersion.canonicalCourseId?.toString(),
          status: courseVersion.status
        } : null,
        isRequired: req.isRequired,
        minimumScore: req.minimumScore,
        order: req.order,
        electiveGroupId: req.electiveGroupId,
        electiveGroupName: req.electiveGroupName,
        electiveMinCount: req.electiveMinCount,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      };
    });
  }

  /**
   * Add a requirement to a definition
   */
  static async addRequirement(
    definitionId: string,
    data: AddRequirementData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status !== 'draft') {
      throw ApiError.badRequest('Cannot add requirements to non-draft definitions');
    }

    // Validate course version
    if (!mongoose.Types.ObjectId.isValid(data.courseVersionId)) {
      throw ApiError.badRequest('Invalid course version ID');
    }

    const courseVersion = await CourseVersion.findById(data.courseVersionId);
    if (!courseVersion) {
      throw ApiError.notFound('Course version not found');
    }

    // Check for duplicate
    const existing = await CertificateRequirement.findOne({
      certificateDefinitionId: definitionId,
      courseVersionId: data.courseVersionId
    });

    if (existing) {
      throw ApiError.conflict('This course version is already a requirement');
    }

    // Get next order if not provided
    let order = data.order;
    if (order === undefined) {
      const lastReq = await CertificateRequirement.findOne({ certificateDefinitionId: definitionId })
        .sort({ order: -1 })
        .lean();
      order = lastReq ? lastReq.order + 1 : 0;
    }

    const requirement = new CertificateRequirement({
      certificateDefinitionId: definitionId,
      courseVersionId: data.courseVersionId,
      isRequired: data.isRequired ?? true,
      minimumScore: data.minimumScore ?? null,
      order,
      electiveGroupId: data.electiveGroupId ?? null,
      electiveGroupName: data.electiveGroupName ?? null,
      electiveMinCount: data.electiveMinCount ?? null
    });

    await requirement.save();

    return {
      id: requirement._id.toString(),
      certificateDefinitionId: requirement.certificateDefinitionId.toString(),
      courseVersionId: requirement.courseVersionId.toString(),
      isRequired: requirement.isRequired,
      minimumScore: requirement.minimumScore,
      order: requirement.order,
      electiveGroupId: requirement.electiveGroupId,
      electiveGroupName: requirement.electiveGroupName,
      electiveMinCount: requirement.electiveMinCount,
      createdAt: requirement.createdAt
    };
  }

  /**
   * Remove a requirement from a definition
   */
  static async removeRequirement(
    definitionId: string,
    requirementId: string,
    _userId: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(definitionId)) {
      throw ApiError.badRequest('Invalid definition ID');
    }

    if (!mongoose.Types.ObjectId.isValid(requirementId)) {
      throw ApiError.badRequest('Invalid requirement ID');
    }

    const definition = await CertificateDefinition.findById(definitionId);
    if (!definition) {
      throw ApiError.notFound('Certificate definition not found');
    }

    if (definition.status !== 'draft') {
      throw ApiError.badRequest('Cannot remove requirements from non-draft definitions');
    }

    const requirement = await CertificateRequirement.findOne({
      _id: requirementId,
      certificateDefinitionId: definitionId
    });

    if (!requirement) {
      throw ApiError.notFound('Requirement not found');
    }

    await requirement.deleteOne();
  }

  /**
   * Auto-version definitions when a course version is published
   * This creates new draft definitions for any active definitions that
   * reference the old course version
   */
  static async handleCourseVersionPublished(
    payload: CourseVersionPublishedPayload
  ): Promise<void> {
    const { courseVersionId, previousVersionId, publishedBy } = payload;

    if (!previousVersionId) {
      // First version, no auto-versioning needed
      return;
    }

    // Find all active certificate definitions that have the old version as a requirement
    const affectedRequirements = await CertificateRequirement.find({
      courseVersionId: previousVersionId
    }).lean();

    if (affectedRequirements.length === 0) {
      return;
    }

    // Group requirements by definition
    const definitionIds = [...new Set(affectedRequirements.map(r => r.certificateDefinitionId.toString()))];

    for (const defIdStr of definitionIds) {
      const defId = new mongoose.Types.ObjectId(defIdStr);
      const activeDefinition = await CertificateDefinition.findOne({
        _id: defId,
        status: 'active'
      });

      if (!activeDefinition) {
        continue; // Only auto-version active definitions
      }

      // Check if there's already a draft for this credential group
      const existingDraft = await CertificateDefinition.findOne({
        credentialGroupId: activeDefinition.credentialGroupId,
        status: 'draft'
      });

      if (existingDraft) {
        // Update the existing draft's requirements instead
        await CertificateRequirement.updateMany(
          {
            certificateDefinitionId: existingDraft._id,
            courseVersionId: previousVersionId
          },
          {
            $set: { courseVersionId: courseVersionId }
          }
        );
        continue;
      }

      // Create a new draft definition
      const newVersion = activeDefinition.version + 1;

      const newDefinition = new CertificateDefinition({
        credentialGroupId: activeDefinition.credentialGroupId,
        version: newVersion,
        parentDefinitionId: activeDefinition._id,
        title: activeDefinition.title,
        description: activeDefinition.description,
        status: 'draft',
        isCompatible: true, // Auto-versioned definitions are compatible by default
        compatibilityBreakReason: null,
        validFrom: null,
        validUntil: null,
        expiresAfterMonths: activeDefinition.expiresAfterMonths,
        autoIssue: activeDefinition.autoIssue,
        createdBy: publishedBy
      });

      await newDefinition.save();

      // Copy all requirements, updating the course version reference
      const oldRequirements = await CertificateRequirement.find({
        certificateDefinitionId: activeDefinition._id
      }).lean();

      for (const oldReq of oldRequirements) {
        const newCourseVersionId = oldReq.courseVersionId.toString() === previousVersionId
          ? courseVersionId
          : oldReq.courseVersionId;

        const newRequirement = new CertificateRequirement({
          certificateDefinitionId: newDefinition._id,
          courseVersionId: newCourseVersionId,
          isRequired: oldReq.isRequired,
          minimumScore: oldReq.minimumScore,
          order: oldReq.order,
          electiveGroupId: oldReq.electiveGroupId,
          electiveGroupName: oldReq.electiveGroupName,
          electiveMinCount: oldReq.electiveMinCount
        });

        await newRequirement.save();
      }
    }
  }
}

// Register event listener for auto-versioning
eventBus.on(EVENTS.COURSE_VERSION_PUBLISHED, async (payload: CourseVersionPublishedPayload) => {
  try {
    await CertificateDefinitionService.handleCourseVersionPublished(payload);
  } catch (error) {
    console.error('Error handling course version published event:', error);
  }
});
