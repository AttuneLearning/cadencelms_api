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
  body: z.record(z.any())
});

export const pauseScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema }),
  body: z.object({ reason: z.string().optional() })
});

export const resumeScheduleSchema = z.object({
  params: z.object({ scheduleId: objectIdSchema })
});
