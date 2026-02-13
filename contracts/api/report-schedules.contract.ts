/**
 * Report Schedules API Contract
 * Simplified contract for report schedule management
 */

import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createScheduleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    templateId: objectIdSchema,
    schedule: z.object({
      frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly']),
      timezone: z.string().default('UTC'),
      timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
    }),
    output: z.object({
      format: z.string()
    }),
    delivery: z.object({
      method: z.enum(['email', 'storage', 'both'])
    })
  })
});

export const listSchedulesSchema = z.object({
  query: z.object({
    templateId: objectIdSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

export const getScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema })
});

export const updateScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema }),
  body: z.record(z.string(), z.any())
});

export const pauseScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema }),
  body: z.object({ reason: z.string().optional() })
});

export const resumeScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema })
});

export const ReportSchedulesContract = {
  create: {
    endpoint: '/api/v2/reports/schedules',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a report schedule',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: { type: 'string', required: true },
        templateId: { type: 'ObjectId', required: true },
        schedule: { type: 'object', required: true },
        output: { type: 'object', required: true },
        delivery: { type: 'object', required: true }
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
            isActive: 'boolean'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid schedule payload' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' }
      ]
    }
  },
  list: {
    endpoint: '/api/v2/reports/schedules',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List report schedules',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      query: {
        templateId: { type: 'ObjectId', required: false },
        isActive: { type: 'boolean', required: false },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportSchedule[]'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' }
      ]
    }
  },
  getById: {
    endpoint: '/api/v2/reports/schedules/:scheduleId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get report schedule details',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      params: {
        scheduleId: { type: 'ObjectId', required: true }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportSchedule'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 404, code: 'NOT_FOUND', message: 'Schedule not found' }
      ]
    }
  },
  update: {
    endpoint: '/api/v2/reports/schedules/:scheduleId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update report schedule',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        scheduleId: { type: 'ObjectId', required: true }
      },
      body: {
        updates: { type: 'object', required: true }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'ReportSchedule'
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid update payload' },
        { status: 404, code: 'NOT_FOUND', message: 'Schedule not found' }
      ]
    }
  },
  pause: {
    endpoint: '/api/v2/reports/schedules/:scheduleId/pause',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Pause report schedule',
    request: {
      headers: {
        Authorization: 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        scheduleId: { type: 'ObjectId', required: true }
      },
      body: {
        reason: { type: 'string', required: false }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            isActive: false
          }
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Schedule not found' }
      ]
    }
  },
  resume: {
    endpoint: '/api/v2/reports/schedules/:scheduleId/resume',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Resume report schedule',
    request: {
      headers: {
        Authorization: 'Bearer <token>'
      },
      params: {
        scheduleId: { type: 'ObjectId', required: true }
      }
    },
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            isActive: true
          }
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Schedule not found' }
      ]
    }
  }
} as const;
