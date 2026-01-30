# UI-UI-ISS-025: Create Report Entity Types

**Priority:** High  
**Phase:** 1 - Foundation  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 6  
**Depends On:** UI-ISS-024  
**Blocks:** UI-ISS-026, UI-ISS-027, UI-ISS-028

---

## Summary

Create comprehensive TypeScript type definitions for all Report System entities: ReportJob, ReportTemplate, ReportSchedule, and supporting types for the Custom Report Builder.

---

## Requirements

### 1. Create ReportJob Types

**File:** `src/entities/report-job/model/types.ts`

```typescript
// Job states using kebab-case
export type ReportJobState =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'rendering'
  | 'uploading'
  | 'ready'
  | 'downloaded'
  | 'failed'
  | 'cancelled'
  | 'expired';

// Job priority levels
export type ReportJobPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical'
  | 'scheduled';

// Output formats
export type ReportOutputFormat = 'pdf' | 'excel' | 'csv' | 'json';

// Visibility levels
export type ReportVisibility = 'private' | 'team' | 'department' | 'organization' | 'global';

export interface ReportJob {
  _id: string;
  organizationId: string;
  reportType: ReportType;
  templateId?: string;
  name: string;
  description?: string;
  
  state: ReportJobState;
  priority: ReportJobPriority;
  
  definition: ReportDefinition;
  filters: ReportFilter[];
  dateRange: DateRange;
  outputFormat: ReportOutputFormat;
  
  result?: ReportJobResult;
  error?: ReportJobError;
  metrics?: ReportJobMetrics;
  
  visibility: ReportVisibility;
  sharedWith?: string[];
  teamId?: string;
  
  notifications?: NotificationConfig;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface ReportJobResult {
  fileUrl: string;
  fileSize: number;
  rowCount: number;
  pageCount?: number;
  downloadCount: number;
  lastDownloadedAt?: string;
  checksum?: string;
}

export interface ReportJobError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  occurredAt: string;
}

export interface ReportJobMetrics {
  queueWaitTimeMs?: number;
  queryTimeMs?: number;
  renderTimeMs?: number;
  uploadTimeMs?: number;
  totalTimeMs?: number;
  dataRowsProcessed?: number;
  memoryUsedMB?: number;
  retryCount?: number;
}

export interface NotificationConfig {
  onComplete?: NotificationChannel[];
  onFailure?: NotificationChannel[];
  recipients?: string[];
}

export type NotificationChannel = 'email' | 'in-app' | 'slack' | 'webhook';
```

### 2. Create ReportTemplate Types

**File:** `src/entities/report-template/model/types.ts`

```typescript
export interface ReportTemplate {
  _id: string;
  organizationId: string;
  
  name: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  
  reportType: ReportType;
  definition: ReportDefinition;
  defaultFilters?: ReportFilter[];
  defaultDateRange?: DateRangePreset;
  
  // Versioning
  version: number;
  previousVersionId?: string;
  isLatest: boolean;
  
  // Access control
  visibility: ReportVisibility;
  sharedWith?: string[];
  teamId?: string;
  requiredPermissions?: string[];
  requiredRoleLevel?: number;
  
  // Display
  icon?: string;
  color?: string;
  
  // Metadata
  isSystemTemplate: boolean;
  isDeleted: boolean;
  usageCount: number;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Create ReportSchedule Types

**File:** `src/entities/report-schedule/model/types.ts`

```typescript
export type ScheduleFrequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface ReportSchedule {
  _id: string;
  organizationId: string;
  
  name: string;
  description?: string;
  templateId?: string;
  reportType: ReportType;
  definition: ReportDefinition;
  
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
      attachReport: boolean;
    };
    storage?: {
      location: string;
      retentionDays: number;
    };
    webhook?: {
      url: string;
      headers?: Record<string, string>;
    };
  };
  
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  lastJobId?: string;
  consecutiveFailures: number;
  maxConsecutiveFailures: number;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Create Report Builder Types

**File:** `src/shared/types/report-builder.ts`

```typescript
// Report types (kebab-case)
export type ReportType =
  | 'enrollment-summary'
  | 'completion-rates'
  | 'performance-analysis'
  | 'learner-activity'
  | 'course-analytics'
  | 'instructor-workload'
  | 'department-overview'
  | 'program-progress'
  | 'assessment-results'
  | 'scorm-attempts'
  | 'transcript'
  | 'certification-status'
  | 'custom';

// Dimensions (kebab-case)
export type DimensionType =
  | 'learner'
  | 'course'
  | 'class'
  | 'program'
  | 'department'
  | 'instructor'
  | 'enrollment'
  | 'activity'
  | 'assessment'
  | 'scorm-attempt';

// Measures (kebab-case)
export type MeasureType =
  | 'count'
  | 'average'
  | 'sum'
  | 'min'
  | 'max'
  | 'completion-rate'
  | 'pass-rate'
  | 'fail-rate'
  | 'average-score'
  | 'average-time-spent'
  | 'total-time-spent'
  | 'average-attempts'
  | 'first-attempt-pass-rate'
  | 'engagement-rate'
  | 'event-count'
  | 'unique-users'
  | 'enrollment-count'
  | 'dropout-rate'
  | 'on-time-completion-rate';

// Slicer/Filter types (kebab-case)
export type SlicerType =
  | 'date-range'
  | 'department-id'
  | 'course-id'
  | 'class-id'
  | 'program-id'
  | 'enrollment-status'
  | 'completion-status'
  | 'instructor-id'
  | 'event-type'
  | 'content-type'
  | 'assessment-type'
  | 'passing-status'
  | 'role-level';

// Groups (kebab-case)
export type GroupType =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'department'
  | 'course'
  | 'class'
  | 'instructor'
  | 'status';

// Report definition for custom reports
export interface ReportDefinition {
  dimensions: DimensionConfig[];
  measures: MeasureConfig[];
  slicers: SlicerConfig[];
  groups: GroupConfig[];
  sorting?: SortConfig[];
  pagination?: PaginationConfig;
}

export interface DimensionConfig {
  type: DimensionType;
  label?: string;
  fields?: string[];
  sortOrder?: number;
}

export interface MeasureConfig {
  type: MeasureType;
  label?: string;
  targetField?: string;
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  decimalPlaces?: number;
}

export interface SlicerConfig {
  type: SlicerType;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'between' | 'contains';
  value: unknown;
  label?: string;
}

export interface GroupConfig {
  type: GroupType;
  label?: string;
  sortBy?: 'label' | 'value';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
  preset?: DateRangePreset;
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'last-30-days'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'custom';

export interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}
```

### 5. Create Entity Index Files

**File:** `src/entities/report-job/index.ts`
```typescript
export * from './model/types';
export * from './api/reportJobApi';
export * from './hooks';
```

**File:** `src/entities/report-template/index.ts`
```typescript
export * from './model/types';
export * from './api/reportTemplateApi';
export * from './hooks';
```

**File:** `src/entities/report-schedule/index.ts`
```typescript
export * from './model/types';
export * from './api/reportScheduleApi';
export * from './hooks';
```

---

## Directory Structure to Create

```
src/entities/
├── report-job/
│   ├── api/
│   │   └── reportJobApi.ts (placeholder)
│   ├── hooks/
│   │   └── index.ts (placeholder)
│   ├── model/
│   │   └── types.ts
│   └── index.ts
├── report-template/
│   ├── api/
│   ├── hooks/
│   ├── model/
│   │   └── types.ts
│   └── index.ts
└── report-schedule/
    ├── api/
    ├── hooks/
    ├── model/
    │   └── types.ts
    └── index.ts
```

---

## Acceptance Criteria

- [ ] All Report entity types created with kebab-case values
- [ ] Types are correctly exported from entity index files
- [ ] Types align with API team's data models
- [ ] No TypeScript errors
- [ ] Types include proper JSDoc comments

---

## Notes

- Types should match API team's models exactly
- Use string literals for dates (ISO 8601 format)
- All ObjectId fields should be typed as `string` on the client
- Add JSDoc comments for complex types
