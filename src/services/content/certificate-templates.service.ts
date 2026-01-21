import mongoose from 'mongoose';
import Template from '@/models/content/Template.model';
import { ApiError } from '@/utils/ApiError';

interface ListCertificateTemplatesFilters {
  scope?: 'system' | 'organization' | 'department';
  departmentId?: string;
}

interface CertificateTemplateResponse {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  scope: 'system' | 'department';
  isDefault: boolean;
  departmentId?: string;
  departmentName?: string;
}

export class CertificateTemplatesService {
  /**
   * List certificate templates with filtering
   *
   * Maps Template model types to scope:
   * - 'master' type + isGlobal=true -> 'system' scope
   * - 'department' type -> 'department' scope
   *
   * NOTE: The Template model currently uses 'type' (master/department/custom)
   * and 'isGlobal' flag. This service maps these to the 'scope' concept
   * (system/organization/department) requested by the UI.
   *
   * TODO: Consider adding a 'category' or 'purpose' field to Template model
   * to better distinguish certificate templates from other template types.
   */
  static async listCertificateTemplates(
    filters: ListCertificateTemplatesFilters
  ): Promise<{ templates: CertificateTemplateResponse[] }> {
    // Build query to find templates suitable for certificates
    const query: any = {
      isDeleted: false,
      status: 'active' // Only show active templates for certificate selection
    };

    // Filter by scope (map to Template model's type field)
    if (filters.scope) {
      if (filters.scope === 'system' || filters.scope === 'organization') {
        // System/organization scope = master templates that are global
        query.type = 'master';
        query.isGlobal = true;
      } else if (filters.scope === 'department') {
        // Department scope = department templates
        query.type = 'department';
      }
    }

    // Filter by departmentId for department-scoped templates
    if (filters.departmentId) {
      if (!mongoose.Types.ObjectId.isValid(filters.departmentId)) {
        throw ApiError.badRequest('Invalid department ID');
      }
      query.departmentId = filters.departmentId;
      // If departmentId is specified, only show department templates
      query.type = 'department';
    }

    // Execute query
    const templates = await Template.find(query)
      .populate('departmentId', 'name')
      .sort({ isGlobal: -1, name: 1 }); // Show system templates first, then alphabetical

    // Build response
    const templatesData = templates.map((template) => {
      const department = template.departmentId as any;

      // Determine scope based on template type and isGlobal flag
      let scope: 'system' | 'department';
      if (template.type === 'master' && template.isGlobal) {
        scope = 'system';
      } else if (template.type === 'department') {
        scope = 'department';
      } else {
        // Fallback for other types (shouldn't happen with current query)
        scope = 'system';
      }

      const response: CertificateTemplateResponse = {
        id: template._id.toString(),
        name: template.name,
        description: template.metadata?.description || null,
        thumbnailUrl: template.metadata?.thumbnailUrl || null,
        scope: scope,
        isDefault: template.isGlobal && template.metadata?.isDefault === true,
      };

      // Add department info for department-scoped templates
      if (scope === 'department' && template.departmentId) {
        response.departmentId = template.departmentId.toString();
        response.departmentName = department?.name || null;
      }

      return response;
    });

    return {
      templates: templatesData
    };
  }
}
