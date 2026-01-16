# UI-UI-ISS-027: Create Report React Query Hooks

**Priority:** High  
**Phase:** 1 - Foundation  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 4  
**Depends On:** UI-ISS-026  
**Blocks:** UI-ISS-028, UI-ISS-029, UI-ISS-030

---

## Summary

Create React Query hooks for all Report System entities to provide data fetching, caching, and mutation capabilities throughout the application.

---

## Requirements

### 1. Create ReportJob Hooks

**File:** `src/entities/report-job/hooks/useReportJobs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportJobApi, type ListReportJobsParams, type CreateReportJobRequest } from '../api/reportJobApi';
import type { ReportJob } from '../model/types';

export const REPORT_JOB_KEYS = {
  all: ['report-jobs'] as const,
  lists: () => [...REPORT_JOB_KEYS.all, 'list'] as const,
  list: (params: ListReportJobsParams) => [...REPORT_JOB_KEYS.lists(), params] as const,
  details: () => [...REPORT_JOB_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REPORT_JOB_KEYS.details(), id] as const,
};

// List report jobs
export function useReportJobs(params?: ListReportJobsParams) {
  return useQuery({
    queryKey: REPORT_JOB_KEYS.list(params ?? {}),
    queryFn: () => reportJobApi.list(params),
  });
}

// Get single report job
export function useReportJob(id: string | undefined) {
  return useQuery({
    queryKey: REPORT_JOB_KEYS.detail(id ?? ''),
    queryFn: () => reportJobApi.getById(id!),
    enabled: !!id,
  });
}

// Poll for job status updates
export function useReportJobPolling(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: REPORT_JOB_KEYS.detail(id ?? ''),
    queryFn: () => reportJobApi.getById(id!),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const job = query.state.data as ReportJob | undefined;
      if (!job) return false;
      // Stop polling when job is complete or failed
      if (['ready', 'downloaded', 'failed', 'cancelled', 'expired'].includes(job.state)) {
        return false;
      }
      // Poll every 2 seconds while processing
      return 2000;
    },
  });
}

// Create report job
export function useCreateReportJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateReportJobRequest) => reportJobApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.lists() });
    },
  });
}

// Cancel report job
export function useCancelReportJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportJobApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.lists() });
    },
  });
}

// Retry report job
export function useRetryReportJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportJobApi.retry(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.lists() });
    },
  });
}

// Delete report job
export function useDeleteReportJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportJobApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_JOB_KEYS.lists() });
    },
  });
}

// Get download URL
export function useReportJobDownload(id: string) {
  return useQuery({
    queryKey: [...REPORT_JOB_KEYS.detail(id), 'download'],
    queryFn: () => reportJobApi.getDownloadUrl(id),
    enabled: false, // Only fetch on demand
  });
}
```

**File:** `src/entities/report-job/hooks/index.ts`

```typescript
export * from './useReportJobs';
```

### 2. Create ReportTemplate Hooks

**File:** `src/entities/report-template/hooks/useReportTemplates.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  reportTemplateApi, 
  type ListReportTemplatesParams, 
  type CreateReportTemplateRequest,
  type UpdateReportTemplateRequest,
} from '../api/reportTemplateApi';

export const REPORT_TEMPLATE_KEYS = {
  all: ['report-templates'] as const,
  lists: () => [...REPORT_TEMPLATE_KEYS.all, 'list'] as const,
  list: (params: ListReportTemplatesParams) => [...REPORT_TEMPLATE_KEYS.lists(), params] as const,
  my: () => [...REPORT_TEMPLATE_KEYS.all, 'my'] as const,
  system: () => [...REPORT_TEMPLATE_KEYS.all, 'system'] as const,
  details: () => [...REPORT_TEMPLATE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REPORT_TEMPLATE_KEYS.details(), id] as const,
};

// List templates
export function useReportTemplates(params?: ListReportTemplatesParams) {
  return useQuery({
    queryKey: REPORT_TEMPLATE_KEYS.list(params ?? {}),
    queryFn: () => reportTemplateApi.list(params),
  });
}

// Get my templates
export function useMyReportTemplates() {
  return useQuery({
    queryKey: REPORT_TEMPLATE_KEYS.my(),
    queryFn: () => reportTemplateApi.getMyTemplates(),
  });
}

// Get system templates
export function useSystemReportTemplates() {
  return useQuery({
    queryKey: REPORT_TEMPLATE_KEYS.system(),
    queryFn: () => reportTemplateApi.getSystemTemplates(),
  });
}

// Get single template
export function useReportTemplate(id: string | undefined) {
  return useQuery({
    queryKey: REPORT_TEMPLATE_KEYS.detail(id ?? ''),
    queryFn: () => reportTemplateApi.getById(id!),
    enabled: !!id,
  });
}

// Create template
export function useCreateReportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateReportTemplateRequest) => reportTemplateApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.my() });
    },
  });
}

// Update template
export function useUpdateReportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateReportTemplateRequest }) => 
      reportTemplateApi.update(id, request),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.lists() });
    },
  });
}

// Create template from job
export function useCreateTemplateFromJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, name, description }: { jobId: string; name: string; description?: string }) =>
      reportTemplateApi.createFromJob(jobId, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.my() });
    },
  });
}

// Delete template
export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportTemplateApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: REPORT_TEMPLATE_KEYS.my() });
    },
  });
}
```

**File:** `src/entities/report-template/hooks/index.ts`

```typescript
export * from './useReportTemplates';
```

### 3. Create ReportSchedule Hooks

**File:** `src/entities/report-schedule/hooks/useReportSchedules.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  reportScheduleApi, 
  type ListReportSchedulesParams, 
  type CreateReportScheduleRequest,
} from '../api/reportScheduleApi';

export const REPORT_SCHEDULE_KEYS = {
  all: ['report-schedules'] as const,
  lists: () => [...REPORT_SCHEDULE_KEYS.all, 'list'] as const,
  list: (params: ListReportSchedulesParams) => [...REPORT_SCHEDULE_KEYS.lists(), params] as const,
  details: () => [...REPORT_SCHEDULE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REPORT_SCHEDULE_KEYS.details(), id] as const,
};

// List schedules
export function useReportSchedules(params?: ListReportSchedulesParams) {
  return useQuery({
    queryKey: REPORT_SCHEDULE_KEYS.list(params ?? {}),
    queryFn: () => reportScheduleApi.list(params),
  });
}

// Get single schedule
export function useReportSchedule(id: string | undefined) {
  return useQuery({
    queryKey: REPORT_SCHEDULE_KEYS.detail(id ?? ''),
    queryFn: () => reportScheduleApi.getById(id!),
    enabled: !!id,
  });
}

// Create schedule
export function useCreateReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateReportScheduleRequest) => reportScheduleApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.lists() });
    },
  });
}

// Update schedule
export function useUpdateReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: Partial<CreateReportScheduleRequest> }) => 
      reportScheduleApi.update(id, request),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.lists() });
    },
  });
}

// Pause schedule
export function usePauseReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportScheduleApi.pause(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.lists() });
    },
  });
}

// Resume schedule
export function useResumeReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportScheduleApi.resume(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.lists() });
    },
  });
}

// Run schedule now
export function useRunReportScheduleNow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportScheduleApi.runNow(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.detail(id) });
      // Also invalidate jobs since a new one was created
      queryClient.invalidateQueries({ queryKey: ['report-jobs'] });
    },
  });
}

// Delete schedule
export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => reportScheduleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_SCHEDULE_KEYS.lists() });
    },
  });
}
```

**File:** `src/entities/report-schedule/hooks/index.ts`

```typescript
export * from './useReportSchedules';
```

### 4. Create Report Metadata Hooks

**File:** `src/shared/hooks/useReportMetadata.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { reportMetadataApi } from '../api/reportMetadataApi';

export const REPORT_METADATA_KEYS = {
  all: ['report-metadata'] as const,
  dimensions: () => [...REPORT_METADATA_KEYS.all, 'dimensions'] as const,
  measures: () => [...REPORT_METADATA_KEYS.all, 'measures'] as const,
  slicers: () => [...REPORT_METADATA_KEYS.all, 'slicers'] as const,
  reportTypes: () => [...REPORT_METADATA_KEYS.all, 'report-types'] as const,
};

export function useReportDimensions() {
  return useQuery({
    queryKey: REPORT_METADATA_KEYS.dimensions(),
    queryFn: () => reportMetadataApi.getDimensions(),
    staleTime: 5 * 60 * 1000, // 5 minutes - metadata rarely changes
  });
}

export function useReportMeasures() {
  return useQuery({
    queryKey: REPORT_METADATA_KEYS.measures(),
    queryFn: () => reportMetadataApi.getMeasures(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportSlicers() {
  return useQuery({
    queryKey: REPORT_METADATA_KEYS.slicers(),
    queryFn: () => reportMetadataApi.getSlicers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportTypes() {
  return useQuery({
    queryKey: REPORT_METADATA_KEYS.reportTypes(),
    queryFn: () => reportMetadataApi.getReportTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

// Combined hook for report builder
export function useReportBuilderMetadata() {
  const dimensions = useReportDimensions();
  const measures = useReportMeasures();
  const slicers = useReportSlicers();
  const reportTypes = useReportTypes();

  return {
    dimensions: dimensions.data ?? [],
    measures: measures.data ?? [],
    slicers: slicers.data ?? [],
    reportTypes: reportTypes.data ?? [],
    isLoading: dimensions.isLoading || measures.isLoading || slicers.isLoading || reportTypes.isLoading,
    isError: dimensions.isError || measures.isError || slicers.isError || reportTypes.isError,
  };
}
```

---

## Acceptance Criteria

- [ ] All ReportJob hooks created with proper query keys
- [ ] All ReportTemplate hooks created
- [ ] All ReportSchedule hooks created
- [ ] Report Metadata hooks created
- [ ] Polling hook for job status updates works correctly
- [ ] Cache invalidation works correctly after mutations
- [ ] Hooks follow existing patterns in the codebase
- [ ] All hooks are properly exported

---

## Testing Notes

- Test polling behavior manually
- Verify cache invalidation with React Query DevTools
- Test optimistic updates if applicable

---

## Notes

- Uses @tanstack/react-query (v5 syntax)
- Query keys should be consistent for cache management
- Consider adding error boundary integration
