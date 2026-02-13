/**
 * Report Templates API Contract
 * Simplified contract for report template management
 */

import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    reportType: z.string().min(1),
    parameters: z.record(z.string(), z.any()),
    defaultOutput: z.object({
      format: z.string().min(1),
      filenameTemplate: z.string().optional()
    }),
    visibility: z.string().optional(),
    sharedWith: z.object({
      users: z.array(objectIdSchema).optional(),
      departments: z.array(objectIdSchema).optional(),
      roles: z.array(z.string()).optional()
    }).optional()
  })
});

export const listTemplatesSchema = z.object({
  query: z.object({
    reportType: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

export const getTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema })
});

export const updateTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    parameters: z.record(z.string(), z.any()).optional(),
    isActive: z.boolean().optional()
  })
});

export const deleteTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema })
});

export const cloneTemplateSchema = z.object({
  params: z.object({ templateId: objectIdSchema }),
  body: z.object({ name: z.string().min(1).max(200).optional() })
});

export const ReportTemplatesContract = {
  create: {
    endpoint: '/api/v2/reports/templates',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a report template',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: { type: 'string', required: true },
        reportType: { type: 'string', required: true },
        parameters: { type: 'object', required: true },
        defaultOutput: { type: 'object', required: true }
      }
    },
    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            name: 'string',
            reportType: 'string'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid template payload' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' }
      ]
    }
  },
  list: {
    endpoint: '/api/v2/reports/templates',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List report templates',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      query: {
        reportType: { type: 'string', required: false },
        search: { type: 'string', required: false },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportTemplate[]'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' }
      ]
    }
  },
  getById: {
    endpoint: '/api/v2/reports/templates/:templateId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get report template details',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      params: {
        templateId: { type: 'ObjectId', required: true }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportTemplate'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 404, code: 'NOT_FOUND', message: 'Template not found' }
      ]
    }
  },
  update: {
    endpoint: '/api/v2/reports/templates/:templateId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update report template',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        templateId: { type: 'ObjectId', required: true }
      },
      body: {
        name: { type: 'string', required: false },
        description: { type: 'string', required: false },
        parameters: { type: 'object', required: false },
        isActive: { type: 'boolean', required: false }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportTemplate'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid update payload' },
        { status: 404, code: 'NOT_FOUND', message: 'Template not found' }
      ]
    }
  },
  delete: {
    endpoint: '/api/v2/reports/templates/:templateId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete report template',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      params: {
        templateId: { type: 'ObjectId', required: true }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Template not found' }
      ]
    }
  },
  clone: {
    endpoint: '/api/v2/reports/templates/:templateId/clone',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Clone report template',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        templateId: { type: 'ObjectId', required: true }
      },
      body: {
        name: { type: 'string', required: false }
      }
    },
    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            name: 'string'
          }
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Template not found' }
      ]
    }
  }
} as const;
