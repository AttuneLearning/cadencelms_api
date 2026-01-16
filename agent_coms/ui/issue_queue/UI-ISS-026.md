# UI-UI-ISS-026: Create Report API Client

**Priority:** High  
**Phase:** 1 - Foundation  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 6  
**Depends On:** UI-ISS-025  
**Blocks:** UI-ISS-027, UI-ISS-028

---

## Summary

Create API client functions for all Report System endpoints, including ReportJob, ReportTemplate, and ReportSchedule operations.

---

## Requirements

### 1. Update Endpoints Configuration

**File:** `src/shared/api/endpoints.ts`

Add the following endpoints:

```typescript
export const REPORT_ENDPOINTS = {
  // Report Jobs
  JOBS: '/api/v2/report-jobs',
  JOB_BY_ID: (id: string) => `/api/v2/report-jobs/${id}`,
  JOB_CANCEL: (id: string) => `/api/v2/report-jobs/${id}/cancel`,
  JOB_RETRY: (id: string) => `/api/v2/report-jobs/${id}/retry`,
  JOB_DOWNLOAD: (id: string) => `/api/v2/report-jobs/${id}/download`,
  
  // Report Templates
  TEMPLATES: '/api/v2/report-templates',
  TEMPLATE_BY_ID: (id: string) => `/api/v2/report-templates/${id}`,
  MY_TEMPLATES: '/api/v2/report-templates/my',
  SYSTEM_TEMPLATES: '/api/v2/report-templates/system',
  TEMPLATE_FROM_JOB: '/api/v2/report-templates/from-job',
  
  // Report Schedules
  SCHEDULES: '/api/v2/report-schedules',
  SCHEDULE_BY_ID: (id: string) => `/api/v2/report-schedules/${id}`,
  SCHEDULE_PAUSE: (id: string) => `/api/v2/report-schedules/${id}/pause`,
  SCHEDULE_RESUME: (id: string) => `/api/v2/report-schedules/${id}/resume`,
  SCHEDULE_RUN_NOW: (id: string) => `/api/v2/report-schedules/${id}/run-now`,
  
  // Report Metadata
  METADATA_DIMENSIONS: '/api/v2/report-metadata/dimensions',
  METADATA_MEASURES: '/api/v2/report-metadata/measures',
  METADATA_SLICERS: '/api/v2/report-metadata/slicers',
  METADATA_REPORT_TYPES: '/api/v2/report-metadata/report-types',
  
  // Lookup Values (for enums)
  LOOKUP_VALUES: '/api/v2/lookup-values',
} as const;
```

### 2. Create ReportJob API Client

**File:** `src/entities/report-job/api/reportJobApi.ts`

```typescript
import { api } from '@/shared/api/client';
import { REPORT_ENDPOINTS } from '@/shared/api/endpoints';
import type {
  ReportJob,
  ReportJobState,
  ReportJobPriority,
  ReportOutputFormat,
} from '../model/types';
import type { ReportDefinition, DateRange, ReportFilter } from '@/shared/types/report-builder';

// Request/Response types
export interface CreateReportJobRequest {
  reportType: string;
  templateId?: string;
  name: string;
  description?: string;
  definition?: ReportDefinition;
  filters?: ReportFilter[];
  dateRange: DateRange;
  outputFormat: ReportOutputFormat;
  priority?: ReportJobPriority;
  visibility?: string;
  sharedWith?: string[];
  scheduledAt?: string;
}

export interface ListReportJobsParams {
  page?: number;
  limit?: number;
  state?: ReportJobState | ReportJobState[];
  reportType?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Functions
export const reportJobApi = {
  // List report jobs with filters
  list: async (params?: ListReportJobsParams): Promise<PaginatedResponse<ReportJob>> => {
    const response = await api.get(REPORT_ENDPOINTS.JOBS, { params });
    return response.data;
  },

  // Get single report job by ID
  getById: async (id: string): Promise<ReportJob> => {
    const response = await api.get(REPORT_ENDPOINTS.JOB_BY_ID(id));
    return response.data;
  },

  // Create new report job
  create: async (request: CreateReportJobRequest): Promise<ReportJob> => {
    const response = await api.post(REPORT_ENDPOINTS.JOBS, request);
    return response.data;
  },

  // Cancel a pending or processing job
  cancel: async (id: string): Promise<ReportJob> => {
    const response = await api.post(REPORT_ENDPOINTS.JOB_CANCEL(id));
    return response.data;
  },

  // Retry a failed job
  retry: async (id: string): Promise<ReportJob> => {
    const response = await api.post(REPORT_ENDPOINTS.JOB_RETRY(id));
    return response.data;
  },

  // Get download URL
  getDownloadUrl: async (id: string): Promise<{ url: string; expiresIn: number }> => {
    const response = await api.get(REPORT_ENDPOINTS.JOB_DOWNLOAD(id));
    return response.data;
  },

  // Delete a report job
  delete: async (id: string): Promise<void> => {
    await api.delete(REPORT_ENDPOINTS.JOB_BY_ID(id));
  },
};
```

### 3. Create ReportTemplate API Client

**File:** `src/entities/report-template/api/reportTemplateApi.ts`

```typescript
import { api } from '@/shared/api/client';
import { REPORT_ENDPOINTS } from '@/shared/api/endpoints';
import type { ReportTemplate } from '../model/types';
import type { ReportDefinition, ReportFilter } from '@/shared/types/report-builder';

export interface CreateReportTemplateRequest {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  reportType: string;
  definition: ReportDefinition;
  defaultFilters?: ReportFilter[];
  visibility?: string;
  sharedWith?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateReportTemplateRequest extends Partial<CreateReportTemplateRequest> {
  createNewVersion?: boolean;
}

export interface ListReportTemplatesParams {
  page?: number;
  limit?: number;
  category?: string;
  reportType?: string;
  isSystemTemplate?: boolean;
  visibility?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const reportTemplateApi = {
  // List all accessible templates
  list: async (params?: ListReportTemplatesParams): Promise<PaginatedResponse<ReportTemplate>> => {
    const response = await api.get(REPORT_ENDPOINTS.TEMPLATES, { params });
    return response.data;
  },

  // Get user's own templates
  getMyTemplates: async (): Promise<ReportTemplate[]> => {
    const response = await api.get(REPORT_ENDPOINTS.MY_TEMPLATES);
    return response.data;
  },

  // Get system templates
  getSystemTemplates: async (): Promise<ReportTemplate[]> => {
    const response = await api.get(REPORT_ENDPOINTS.SYSTEM_TEMPLATES);
    return response.data;
  },

  // Get template by ID
  getById: async (id: string): Promise<ReportTemplate> => {
    const response = await api.get(REPORT_ENDPOINTS.TEMPLATE_BY_ID(id));
    return response.data;
  },

  // Create new template
  create: async (request: CreateReportTemplateRequest): Promise<ReportTemplate> => {
    const response = await api.post(REPORT_ENDPOINTS.TEMPLATES, request);
    return response.data;
  },

  // Update existing template
  update: async (id: string, request: UpdateReportTemplateRequest): Promise<ReportTemplate> => {
    const response = await api.patch(REPORT_ENDPOINTS.TEMPLATE_BY_ID(id), request);
    return response.data;
  },

  // Create template from existing job
  createFromJob: async (jobId: string, name: string, description?: string): Promise<ReportTemplate> => {
    const response = await api.post(REPORT_ENDPOINTS.TEMPLATE_FROM_JOB, {
      jobId,
      name,
      description,
    });
    return response.data;
  },

  // Delete template
  delete: async (id: string): Promise<void> => {
    await api.delete(REPORT_ENDPOINTS.TEMPLATE_BY_ID(id));
  },
};
```

### 4. Create ReportSchedule API Client

**File:** `src/entities/report-schedule/api/reportScheduleApi.ts`

```typescript
import { api } from '@/shared/api/client';
import { REPORT_ENDPOINTS } from '@/shared/api/endpoints';
import type { ReportSchedule, ScheduleFrequency } from '../model/types';
import type { ReportDefinition, ReportOutputFormat } from '@/shared/types/report-builder';

export interface CreateReportScheduleRequest {
  name: string;
  description?: string;
  templateId?: string;
  reportType: string;
  definition?: ReportDefinition;
  schedule: {
    frequency: ScheduleFrequency;
    cronExpression?: string;
    timezone: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    startDate?: string;
    endDate?: string;
  };
  outputFormat: ReportOutputFormat;
  delivery: {
    email?: {
      recipients: string[];
      subject?: string;
      body?: string;
      attachReport?: boolean;
    };
    storage?: {
      location: string;
      retentionDays: number;
    };
  };
}

export interface ListReportSchedulesParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  reportType?: string;
  frequency?: ScheduleFrequency;
  sortBy?: 'name' | 'nextRunAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const reportScheduleApi = {
  // List schedules
  list: async (params?: ListReportSchedulesParams): Promise<PaginatedResponse<ReportSchedule>> => {
    const response = await api.get(REPORT_ENDPOINTS.SCHEDULES, { params });
    return response.data;
  },

  // Get schedule by ID
  getById: async (id: string): Promise<ReportSchedule> => {
    const response = await api.get(REPORT_ENDPOINTS.SCHEDULE_BY_ID(id));
    return response.data;
  },

  // Create schedule
  create: async (request: CreateReportScheduleRequest): Promise<ReportSchedule> => {
    const response = await api.post(REPORT_ENDPOINTS.SCHEDULES, request);
    return response.data;
  },

  // Update schedule
  update: async (id: string, request: Partial<CreateReportScheduleRequest>): Promise<ReportSchedule> => {
    const response = await api.patch(REPORT_ENDPOINTS.SCHEDULE_BY_ID(id), request);
    return response.data;
  },

  // Pause schedule
  pause: async (id: string): Promise<ReportSchedule> => {
    const response = await api.post(REPORT_ENDPOINTS.SCHEDULE_PAUSE(id));
    return response.data;
  },

  // Resume schedule
  resume: async (id: string): Promise<ReportSchedule> => {
    const response = await api.post(REPORT_ENDPOINTS.SCHEDULE_RESUME(id));
    return response.data;
  },

  // Run schedule immediately
  runNow: async (id: string): Promise<{ jobId: string }> => {
    const response = await api.post(REPORT_ENDPOINTS.SCHEDULE_RUN_NOW(id));
    return response.data;
  },

  // Delete schedule
  delete: async (id: string): Promise<void> => {
    await api.delete(REPORT_ENDPOINTS.SCHEDULE_BY_ID(id));
  },
};
```

### 5. Create Report Metadata API Client

**File:** `src/shared/api/reportMetadataApi.ts`

```typescript
import { api } from '@/shared/api/client';
import { REPORT_ENDPOINTS } from '@/shared/api/endpoints';

export interface DimensionMetadata {
  type: string;
  label: string;
  description: string;
  availableFields: string[];
  compatibleMeasures: string[];
}

export interface MeasureMetadata {
  type: string;
  label: string;
  description: string;
  requiresTargetField: boolean;
  compatibleDimensions: string[];
  defaultFormat: string;
}

export interface SlicerMetadata {
  type: string;
  label: string;
  description: string;
  valueType: 'string' | 'number' | 'date' | 'array' | 'boolean';
  operators: string[];
}

export interface ReportTypeMetadata {
  type: string;
  label: string;
  description: string;
  defaultDimensions: string[];
  defaultMeasures: string[];
  icon?: string;
}

export const reportMetadataApi = {
  getDimensions: async (): Promise<DimensionMetadata[]> => {
    const response = await api.get(REPORT_ENDPOINTS.METADATA_DIMENSIONS);
    return response.data;
  },

  getMeasures: async (): Promise<MeasureMetadata[]> => {
    const response = await api.get(REPORT_ENDPOINTS.METADATA_MEASURES);
    return response.data;
  },

  getSlicers: async (): Promise<SlicerMetadata[]> => {
    const response = await api.get(REPORT_ENDPOINTS.METADATA_SLICERS);
    return response.data;
  },

  getReportTypes: async (): Promise<ReportTypeMetadata[]> => {
    const response = await api.get(REPORT_ENDPOINTS.METADATA_REPORT_TYPES);
    return response.data;
  },
};
```

---

## Acceptance Criteria

- [ ] All endpoints added to endpoints.ts
- [ ] ReportJob API client created with all CRUD operations
- [ ] ReportTemplate API client created with all operations
- [ ] ReportSchedule API client created with all operations
- [ ] Report Metadata API client created
- [ ] All functions have proper TypeScript types
- [ ] Error handling follows existing patterns
- [ ] API clients exported from entity index files

---

## Testing Notes

- Create mock implementations for development before API is ready
- Use MSW (Mock Service Worker) or similar for API mocking
- Verify all endpoints match API team's contract

---

## Notes

- API client should follow existing patterns in the codebase
- Use the existing `api` instance from `@/shared/api/client`
- Handle authentication and error responses consistently
