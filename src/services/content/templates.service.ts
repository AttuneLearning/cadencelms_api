import mongoose from 'mongoose';
import Template, { TemplateType, TemplateStatus } from '@/models/content/Template.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import { ApiError } from '@/utils/ApiError';

interface ListTemplatesFilters {
  page?: number;
  limit?: number;
  type?: TemplateType;
  department?: string;
  status?: TemplateStatus;
  search?: string;
  sort?: string;
}

interface CreateTemplateInput {
  name: string;
  type: TemplateType;
  css?: string;
  html?: string;
  department?: string;
  isGlobal?: boolean;
  status?: TemplateStatus;
  createdBy: string;
}

interface UpdateTemplateInput {
  name?: string;
  css?: string;
  html?: string;
  status?: TemplateStatus;
  isGlobal?: boolean;
}

interface DuplicateTemplateOptions {
  name?: string;
  type?: TemplateType;
  department?: string;
  status?: TemplateStatus;
  createdBy: string;
}

export class TemplatesService {
  /**
   * Sanitize CSS content to prevent XSS attacks
   */
  private static sanitizeCSS(css: string): string {
    if (!css) return '';

    // Remove any potential script injections
    let sanitized = css.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove @import with javascript
    sanitized = sanitized.replace(/@import\s+url\s*\(\s*['"]?javascript:/gi, '');

    // Remove expression() (IE specific)
    sanitized = sanitized.replace(/expression\s*\(/gi, '');

    // Remove behavior (IE specific)
    sanitized = sanitized.replace(/behavior\s*:/gi, '');

    // Remove -moz-binding (Firefox specific)
    sanitized = sanitized.replace(/-moz-binding\s*:/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  private static sanitizeHTML(html: string): string {
    if (!html) return '';

    // Remove script tags
    let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove event handlers (onclick, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol in hrefs and src
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
    sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');

    // Remove style attributes with javascript
    sanitized = sanitized.replace(/style\s*=\s*["'][^"']*javascript:[^"']*["']/gi, '');

    return sanitized.trim();
  }

  /**
   * Validate that HTML contains valid placeholders
   */
  private static validatePlaceholders(html: string): void {
    const validPlaceholders = [
      '{{courseTitle}}',
      '{{courseCode}}',
      '{{content}}',
      '{{instructorName}}',
      '{{departmentName}}'
    ];

    // Find all placeholders in HTML
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches = html.match(placeholderRegex);

    if (matches) {
      for (const match of matches) {
        if (!validPlaceholders.includes(match)) {
          throw ApiError.badRequest(
            `Invalid placeholder "${match}". Valid placeholders: ${validPlaceholders.join(', ')}`
          );
        }
      }
    }
  }

  /**
   * List templates with filtering and pagination
   */
  static async listTemplates(filters: ListTemplatesFilters, _userId?: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isDeleted: false };

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Department filter
    if (filters.department) {
      if (!mongoose.Types.ObjectId.isValid(filters.department)) {
        throw ApiError.badRequest('Invalid department ID');
      }
      query.departmentId = filters.department;
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Search filter (by name)
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    // Sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [templates, total] = await Promise.all([
      Template.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('departmentId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Template.countDocuments(query)
    ]);

    // Build response
    const templatesData = templates.map((template) => {
      const createdBy = template.createdBy as any;
      const department = template.departmentId as any;

      return {
        id: template._id.toString(),
        name: template.name,
        type: template.type,
        status: template.status,
        department: template.departmentId ? template.departmentId.toString() : null,
        departmentName: department?.name || null,
        isGlobal: template.isGlobal,
        createdBy: {
          id: createdBy._id.toString(),
          firstName: createdBy.firstName,
          lastName: createdBy.lastName
        },
        usageCount: template.usageCount,
        previewUrl: `/api/v2/templates/${template._id}/preview`,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      };
    });

    return {
      templates: templatesData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new template
   */
  static async createTemplate(templateData: CreateTemplateInput): Promise<any> {
    // Validate name
    if (!templateData.name || templateData.name.trim().length === 0) {
      throw ApiError.badRequest('Template name is required');
    }

    // Validate type
    if (!['master', 'department', 'custom'].includes(templateData.type)) {
      throw ApiError.badRequest('Invalid template type');
    }

    // Validate department for department templates
    if (templateData.type === 'department' && !templateData.department) {
      throw ApiError.badRequest('Department is required for department templates');
    }

    // Validate department exists
    if (templateData.department) {
      if (!mongoose.Types.ObjectId.isValid(templateData.department)) {
        throw ApiError.badRequest('Invalid department ID');
      }

      const department = await Department.findById(templateData.department);
      if (!department) {
        throw ApiError.notFound('Department does not exist');
      }
    }

    // Sanitize CSS and HTML
    const sanitizedCSS = templateData.css ? this.sanitizeCSS(templateData.css) : undefined;
    const sanitizedHTML = templateData.html ? this.sanitizeHTML(templateData.html) : undefined;

    // Validate placeholders in HTML
    if (sanitizedHTML) {
      this.validatePlaceholders(sanitizedHTML);
    }

    // Check for duplicate name within scope
    const duplicateQuery: any = {
      name: templateData.name.trim(),
      type: templateData.type,
      isDeleted: false
    };

    if (templateData.type === 'department') {
      duplicateQuery.departmentId = templateData.department;
    } else if (templateData.type === 'custom') {
      duplicateQuery.createdBy = templateData.createdBy;
    }

    const existingTemplate = await Template.findOne(duplicateQuery);
    if (existingTemplate) {
      throw ApiError.conflict('Template with this name already exists in scope');
    }

    // Create template
    const template = new Template({
      name: templateData.name.trim(),
      type: templateData.type,
      css: sanitizedCSS,
      html: sanitizedHTML,
      departmentId: templateData.department || undefined,
      isGlobal: templateData.type === 'master' ? (templateData.isGlobal || false) : false,
      status: templateData.status || 'draft',
      createdBy: templateData.createdBy,
      usageCount: 0
    });

    await template.save();

    // Populate for response
    await template.populate('createdBy', 'firstName lastName');
    await template.populate('departmentId', 'name');

    const createdBy = template.createdBy as any;
    const department = template.departmentId as any;

    return {
      id: template._id.toString(),
      name: template.name,
      type: template.type,
      status: template.status,
      css: template.css || null,
      html: template.html || null,
      department: template.departmentId ? template.departmentId.toString() : null,
      departmentName: department?.name || null,
      isGlobal: template.isGlobal,
      createdBy: {
        id: createdBy._id.toString(),
        firstName: createdBy.firstName,
        lastName: createdBy.lastName
      },
      usageCount: template.usageCount,
      previewUrl: `/api/v2/templates/${template._id}/preview`,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw ApiError.badRequest('Invalid template ID');
    }

    const template = await Template.findOne({ _id: templateId, isDeleted: false })
      .populate('createdBy', 'firstName lastName email')
      .populate('departmentId', 'name');

    if (!template) {
      throw ApiError.notFound('Template does not exist');
    }

    // Get courses using this template (from metadata field in Course model)
    // Note: This assumes courses store templateId in metadata.templateId
    const courses = await Course.find({
      'metadata.templateId': template._id,
      isActive: true
    })
      .select('_id name code')
      .limit(100);

    const usedByCourses = courses.map((course) => ({
      id: course._id.toString(),
      title: course.name,
      code: course.code
    }));

    const createdBy = template.createdBy as any;
    const department = template.departmentId as any;

    return {
      id: template._id.toString(),
      name: template.name,
      type: template.type,
      status: template.status,
      css: template.css || null,
      html: template.html || null,
      department: template.departmentId ? template.departmentId.toString() : null,
      departmentName: department?.name || null,
      isGlobal: template.isGlobal,
      createdBy: {
        id: createdBy._id.toString(),
        firstName: createdBy.firstName,
        lastName: createdBy.lastName,
        email: createdBy.email || ''
      },
      usageCount: template.usageCount,
      usedByCourses,
      previewUrl: `/api/v2/templates/${template._id}/preview`,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId: string, updateData: UpdateTemplateInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw ApiError.badRequest('Invalid template ID');
    }

    const template = await Template.findOne({ _id: templateId, isDeleted: false });
    if (!template) {
      throw ApiError.notFound('Template does not exist');
    }

    // Check if template is in use and warn (but allow update)
    if (template.usageCount > 0 && template.status === 'active') {
      // Note: In production, you might want to prevent updates or create versions
      // For now, we'll allow it as per contract
    }

    // Update name if provided
    if (updateData.name !== undefined) {
      if (!updateData.name || updateData.name.trim().length === 0) {
        throw ApiError.badRequest('Template name cannot be empty');
      }

      // Check for duplicate name within scope
      const duplicateQuery: any = {
        name: updateData.name.trim(),
        type: template.type,
        isDeleted: false,
        _id: { $ne: templateId }
      };

      if (template.type === 'department') {
        duplicateQuery.departmentId = template.departmentId;
      } else if (template.type === 'custom') {
        duplicateQuery.createdBy = template.createdBy;
      }

      const existingTemplate = await Template.findOne(duplicateQuery);
      if (existingTemplate) {
        throw ApiError.conflict('Template with this name already exists in scope');
      }

      template.name = updateData.name.trim();
    }

    // Update and sanitize CSS if provided
    if (updateData.css !== undefined) {
      template.css = updateData.css ? this.sanitizeCSS(updateData.css) : undefined;
    }

    // Update and sanitize HTML if provided
    if (updateData.html !== undefined) {
      const sanitizedHTML = updateData.html ? this.sanitizeHTML(updateData.html) : undefined;

      // Validate placeholders
      if (sanitizedHTML) {
        this.validatePlaceholders(sanitizedHTML);
      }

      template.html = sanitizedHTML;
    }

    // Update status if provided
    if (updateData.status !== undefined) {
      if (!['active', 'draft'].includes(updateData.status)) {
        throw ApiError.badRequest('Invalid status');
      }
      template.status = updateData.status;
    }

    // Update isGlobal if provided (only for master templates)
    if (updateData.isGlobal !== undefined) {
      if (template.type === 'master') {
        template.isGlobal = updateData.isGlobal;
      }
    }

    await template.save();

    // Populate for response
    await template.populate('createdBy', 'firstName lastName');
    await template.populate('departmentId', 'name');

    const createdBy = template.createdBy as any;
    const department = template.departmentId as any;

    return {
      id: template._id.toString(),
      name: template.name,
      type: template.type,
      status: template.status,
      css: template.css || null,
      html: template.html || null,
      department: template.departmentId ? template.departmentId.toString() : null,
      departmentName: department?.name || null,
      isGlobal: template.isGlobal,
      createdBy: {
        id: createdBy._id.toString(),
        firstName: createdBy.firstName,
        lastName: createdBy.lastName
      },
      usageCount: template.usageCount,
      previewUrl: `/api/v2/templates/${template._id}/preview`,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  /**
   * Delete template (soft delete)
   */
  static async deleteTemplate(templateId: string, force: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw ApiError.badRequest('Invalid template ID');
    }

    const template = await Template.findOne({ _id: templateId, isDeleted: false });
    if (!template) {
      throw ApiError.notFound('Template does not exist');
    }

    // Check if template is in use
    if (template.usageCount > 0 && !force) {
      throw ApiError.conflict(
        'Cannot delete template in use by courses. Use force=true or reassign courses first.'
      );
    }

    let affectedCourses = 0;
    let replacedWith = null;

    // If force delete and template is in use, remove from courses
    if (force && template.usageCount > 0) {
      // Find courses using this template
      const courses = await Course.find({
        'metadata.templateId': template._id
      });

      affectedCourses = courses.length;

      // Remove template reference from courses
      for (const course of courses) {
        if (course.metadata) {
          delete course.metadata.templateId;
          await course.save();
        }
      }

      // Reset usage count
      template.usageCount = 0;
    }

    // Perform soft delete
    template.isDeleted = true;
    await template.save();

    return {
      deletedId: template._id.toString(),
      affectedCourses,
      replacedWith
    };
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(
    templateId: string,
    options: DuplicateTemplateOptions
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw ApiError.badRequest('Invalid template ID');
    }

    // Get source template
    const sourceTemplate = await Template.findOne({ _id: templateId, isDeleted: false });
    if (!sourceTemplate) {
      throw ApiError.notFound('Source template does not exist');
    }

    // Determine new template properties
    const newName = options.name || `Copy of ${sourceTemplate.name}`;
    const newType = options.type || sourceTemplate.type;
    const newDepartment = options.department || sourceTemplate.departmentId?.toString();
    const newStatus = options.status || 'draft';

    // Validate department if needed
    if (newType === 'department' && !newDepartment) {
      throw ApiError.badRequest('Department is required for department templates');
    }

    // Validate department exists
    if (newDepartment) {
      if (!mongoose.Types.ObjectId.isValid(newDepartment)) {
        throw ApiError.badRequest('Invalid department ID');
      }

      const department = await Department.findById(newDepartment);
      if (!department) {
        throw ApiError.notFound('Department does not exist');
      }
    }

    // Check for duplicate name within scope
    const duplicateQuery: any = {
      name: newName.trim(),
      type: newType,
      isDeleted: false
    };

    if (newType === 'department') {
      duplicateQuery.departmentId = newDepartment;
    } else if (newType === 'custom') {
      duplicateQuery.createdBy = options.createdBy;
    }

    const existingTemplate = await Template.findOne(duplicateQuery);
    if (existingTemplate) {
      throw ApiError.conflict('Template with this name already exists');
    }

    // Create new template
    const newTemplate = new Template({
      name: newName.trim(),
      type: newType,
      css: sourceTemplate.css,
      html: sourceTemplate.html,
      departmentId: newDepartment || undefined,
      isGlobal: newType === 'master' ? false : false, // New templates are not global by default
      status: newStatus,
      createdBy: options.createdBy,
      duplicatedFrom: sourceTemplate._id,
      usageCount: 0
    });

    await newTemplate.save();

    // Populate for response
    await newTemplate.populate('createdBy', 'firstName lastName');
    await newTemplate.populate('departmentId', 'name');

    const createdBy = newTemplate.createdBy as any;
    const department = newTemplate.departmentId as any;

    return {
      id: newTemplate._id.toString(),
      name: newTemplate.name,
      type: newTemplate.type,
      status: newTemplate.status,
      css: newTemplate.css || null,
      html: newTemplate.html || null,
      department: newTemplate.departmentId ? newTemplate.departmentId.toString() : null,
      departmentName: department?.name || null,
      isGlobal: newTemplate.isGlobal,
      createdBy: {
        id: createdBy._id.toString(),
        firstName: createdBy.firstName,
        lastName: createdBy.lastName
      },
      usageCount: newTemplate.usageCount,
      duplicatedFrom: sourceTemplate._id.toString(),
      previewUrl: `/api/v2/templates/${newTemplate._id}/preview`,
      createdAt: newTemplate.createdAt,
      updatedAt: newTemplate.updatedAt
    };
  }

  /**
   * Preview template with sample data
   */
  static async previewTemplate(
    templateId: string,
    courseTitle?: string,
    courseCode?: string,
    format: 'html' | 'json' = 'html'
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw ApiError.badRequest('Invalid template ID');
    }

    const template = await Template.findOne({ _id: templateId, isDeleted: false })
      .populate('departmentId', 'name');

    if (!template) {
      throw ApiError.notFound('Template does not exist');
    }

    // Sample data for placeholders
    const department = template.departmentId as any;
    const placeholders = {
      courseTitle: courseTitle || 'Sample Course Title',
      courseCode: courseCode || 'SAMPLE101',
      instructorName: 'Sample Instructor',
      departmentName: department?.name || 'Sample Department',
      content: '<p>This is sample course content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'
    };

    // Replace placeholders in HTML
    let renderedHTML = template.html || '<div>{{content}}</div>';
    Object.entries(placeholders).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      renderedHTML = renderedHTML.replace(new RegExp(placeholder, 'g'), value);
    });

    // Return based on format
    if (format === 'json') {
      return {
        html: renderedHTML,
        css: template.css || '',
        metadata: {
          templateId: template._id.toString(),
          templateName: template.name,
          previewGenerated: new Date().toISOString(),
          placeholders
        }
      };
    }

    // Return HTML format (with inline CSS)
    const inlineCSS = template.css ? `<style>${template.css}</style>` : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Preview</title>
  ${inlineCSS}
</head>
<body>
  ${renderedHTML}
</body>
</html>`;
  }
}
