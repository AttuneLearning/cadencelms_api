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
    parameters: z.record(z.any()),
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
    parameters: z.record(z.any()).optional(),
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
