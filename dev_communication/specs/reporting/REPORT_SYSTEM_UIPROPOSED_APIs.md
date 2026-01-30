# Report System - UI Proposed API Endpoints

**Version:** 1.0.0  
**Date:** 2026-01-15  
**Status:** 📋 PROPOSED - Pending API Team Review  
**Author:** UI Team  

---

## Overview

This document contains the UI team's proposed API endpoints for the Report System. These are suggestions based on UI requirements - the API team should review and create formal contracts.

---

## 1. Report Jobs API

### 1.1 Create Report Job

```
POST /api/v2/report-jobs
```

**Purpose:** Queue a new report for background processing

**Request Body:**
```typescript
{
  name: string;                           // Required - Display name
  description?: string;                   // Optional
  type: 'predefined' | 'custom';          // Required
  
  // For predefined reports
  predefinedType?: 'enrollment' | 'completion' | 'performance' | 
                   'learner-activity' | 'course-analytics' | 'instructor-load' | 
                   'department-summary';
  
  // For custom reports
  customDefinition?: CustomReportDefinition;  // See section 3
  
  // Filters
  filters?: {
    departmentIds?: string[];
    programIds?: string[];
    courseIds?: string[];
    classIds?: string[];
    learnerIds?: string[];
    instructorIds?: string[];
    dateRange?: {
      start: string;                      // ISO date
      end: string;
    };
    academicYearId?: string;
    enrollmentStatus?: string[];
    completionStatus?: string[];
  };
  
  // Output options
  outputFormat: 'pdf' | 'excel' | 'csv';  // Required
  priority?: 'high' | 'normal' | 'low';   // Default: 'normal'
  
  // Notifications
  notifyOnComplete?: boolean;             // Default: true
  notifyEmails?: string[];
  
  // Access control
  visibility?: 'private' | 'department' | 'organization';
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    job: ReportJob,
    estimatedTime: number,                // Estimated seconds
    queuePosition: number
  }
}
```

**Permissions:** `reports:create`, `staff`, `global-admin`

---

### 1.2 List Report Jobs

```
GET /api/v2/report-jobs
```

**Purpose:** Get list of report jobs for current user

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string[] | Filter by status(es) |
| `type` | string | `predefined` or `custom` |
| `dateFrom` | string | Created after (ISO date) |
| `dateTo` | string | Created before (ISO date) |
| `search` | string | Search name/description |
| `sort` | string | e.g., `-createdAt`, `name` |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```typescript
{
  success: true,
  data: {
    jobs: ReportJob[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

### 1.3 Get Report Job

```
GET /api/v2/report-jobs/:id
```

**Response:**
```typescript
{
  success: true,
  data: {
    job: ReportJob
  }
}
```

---

### 1.4 Get Report Job Status (Lightweight)

```
GET /api/v2/report-jobs/:id/status
```

**Purpose:** Lightweight endpoint for polling job status

**Response:**
```typescript
{
  success: true,
  data: {
    id: string,
    status: 'pending' | 'processing' | 'ready' | 'downloaded' | 'failed' | 'cancelled' | 'expired',
    progress: number,                     // 0-100
    estimatedTimeRemaining?: number,      // Seconds
    fileUrl?: string,                     // When ready
    error?: {
      code: string,
      message: string
    }
  }
}
```

---

### 1.5 Download Report

```
GET /api/v2/report-jobs/:id/download
```

**Purpose:** Get signed download URL

**Response:**
```typescript
{
  success: true,
  data: {
    downloadUrl: string,                  // Signed URL, expires in 1 hour
    fileName: string,
    contentType: string,
    fileSizeBytes: number,
    expiresAt: string                     // ISO date
  }
}
```

---

### 1.6 Delete Report Job

```
DELETE /api/v2/report-jobs/:id
```

**Purpose:** Cancel pending job or delete completed job

**Response:**
```typescript
{
  success: true,
  message: 'Report job deleted'
}
```

---

### 1.7 Retry Failed Job

```
POST /api/v2/report-jobs/:id/retry
```

**Purpose:** Retry a failed job

**Response:**
```typescript
{
  success: true,
  data: {
    job: ReportJob
  }
}
```

---

## 2. Report Templates API

### 2.1 Create Template

```
POST /api/v2/report-templates
```

**Request Body:**
```typescript
{
  name: string;                           // Required
  description: string;                    // Required
  type: 'predefined' | 'custom';
  predefinedType?: string;
  customDefinition?: CustomReportDefinition;
  defaultFilters?: ReportFilters;
  defaultOutputFormat: 'pdf' | 'excel' | 'csv';
  isShared?: boolean;
  visibility?: 'private' | 'department' | 'organization';
  tags?: string[];
  category?: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    template: ReportTemplate
  }
}
```

---

### 2.2 List Templates

```
GET /api/v2/report-templates
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `predefined` or `custom` |
| `visibility` | string | `private`, `shared`, `system` |
| `category` | string | Filter by category |
| `tags` | string[] | Filter by tags |
| `search` | string | Search name/description |
| `sort` | string | Sort field |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```typescript
{
  success: true,
  data: {
    templates: ReportTemplate[],
    pagination: { ... }
  }
}
```

---

### 2.3 Get Template

```
GET /api/v2/report-templates/:id
```

---

### 2.4 Update Template

```
PUT /api/v2/report-templates/:id
```

---

### 2.5 Delete Template

```
DELETE /api/v2/report-templates/:id
```

---

### 2.6 Use Template (Create Job)

```
POST /api/v2/report-templates/:id/use
```

**Purpose:** Create a report job from a template

**Request Body:**
```typescript
{
  name?: string;                          // Override template name
  filters?: ReportFilters;                // Override filters
  outputFormat?: string;                  // Override format
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    job: ReportJob
  }
}
```

---

## 3. Report Metadata API (For Custom Report Builder)

### 3.1 Get Dimensions

```
GET /api/v2/report-metadata/dimensions
```

**Purpose:** Get available dimensions for custom reports

**Response:**
```typescript
{
  success: true,
  data: {
    dimensions: [
      {
        id: 'learner',
        label: 'Learner',
        description: 'Individual learner records',
        fields: [
          { id: 'name', label: 'Name', type: 'string' },
          { id: 'email', label: 'Email', type: 'string' },
          { id: 'department', label: 'Department', type: 'reference', referenceEntity: 'department' },
          { id: 'enrollmentDate', label: 'Enrollment Date', type: 'date' },
          { id: 'status', label: 'Status', type: 'enum', values: ['active', 'inactive', 'graduated'] }
        ]
      },
      {
        id: 'course',
        label: 'Course',
        description: 'Course-level data',
        fields: [
          { id: 'name', label: 'Name', type: 'string' },
          { id: 'code', label: 'Code', type: 'string' },
          { id: 'department', label: 'Department', type: 'reference' },
          { id: 'credits', label: 'Credits', type: 'number' },
          { id: 'duration', label: 'Duration', type: 'number' }
        ]
      },
      // ... class, program, department, instructor, enrollment, learning-event, grade
    ]
  }
}
```

---

### 3.2 Get Measures

```
GET /api/v2/report-metadata/measures
```

**Response:**
```typescript
{
  success: true,
  data: {
    measures: [
      {
        id: 'count',
        label: 'Count',
        description: 'Number of records',
        applicableTo: ['all'],
        requiresField: false
      },
      {
        id: 'countDistinct',
        label: 'Count Distinct',
        description: 'Unique count',
        applicableTo: ['all'],
        requiresField: true
      },
      {
        id: 'sum',
        label: 'Sum',
        description: 'Sum of numeric field',
        applicableTo: ['number'],
        requiresField: true
      },
      {
        id: 'average',
        label: 'Average',
        description: 'Average of numeric field',
        applicableTo: ['number'],
        requiresField: true
      },
      {
        id: 'min',
        label: 'Minimum',
        applicableTo: ['number', 'date'],
        requiresField: true
      },
      {
        id: 'max',
        label: 'Maximum',
        applicableTo: ['number', 'date'],
        requiresField: true
      },
      {
        id: 'completionRate',
        label: 'Completion Rate',
        description: 'Percentage completed',
        applicableTo: ['enrollment', 'course'],
        requiresField: false,
        format: 'percent'
      },
      {
        id: 'passRate',
        label: 'Pass Rate',
        description: 'Percentage passed',
        applicableTo: ['enrollment', 'course'],
        requiresField: false,
        format: 'percent'
      },
      {
        id: 'engagementRate',
        label: 'Engagement Rate',
        description: 'Percentage of learners with activity (from LearningEvents)',
        applicableTo: ['course', 'class'],
        requiresField: false,
        format: 'percent'
      },
      {
        id: 'avgStudyTime',
        label: 'Avg Study Time',
        description: 'Average time spent (from LearningEvents)',
        applicableTo: ['learner', 'course', 'class'],
        requiresField: false,
        format: 'duration'
      },
      {
        id: 'eventCount',
        label: 'Event Count',
        description: 'Count of learning events',
        applicableTo: ['learner', 'course', 'class'],
        requiresField: false
      },
      {
        id: 'avgTimeToComplete',
        label: 'Avg Time to Complete',
        applicableTo: ['enrollment'],
        requiresField: false,
        format: 'duration'
      }
    ]
  }
}
```

---

### 3.3 Get Slicers

```
GET /api/v2/report-metadata/slicers
```

**Response:**
```typescript
{
  success: true,
  data: {
    slicers: [
      {
        id: 'enrollmentStatus',
        label: 'Enrollment Status',
        type: 'categorical',
        values: [
          { id: 'not_started', label: 'Not Started' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
          { id: 'withdrawn', label: 'Withdrawn' }
        ]
      },
      {
        id: 'gradeRange',
        label: 'Grade Range',
        type: 'categorical',
        values: [
          { id: 'A', label: 'A (90-100)' },
          { id: 'B', label: 'B (80-89)' },
          { id: 'C', label: 'C (70-79)' },
          { id: 'D', label: 'D (60-69)' },
          { id: 'F', label: 'F (0-59)' }
        ]
      },
      {
        id: 'timePeriod',
        label: 'Time Period',
        type: 'time',
        granularities: ['day', 'week', 'month', 'quarter', 'year']
      },
      {
        id: 'department',
        label: 'Department',
        type: 'dynamic',
        sourceEndpoint: '/api/v2/departments'
      },
      {
        id: 'completionStatus',
        label: 'Completion Status',
        type: 'categorical',
        values: [
          { id: 'incomplete', label: 'Incomplete' },
          { id: 'complete', label: 'Complete' }
        ]
      },
      {
        id: 'eventType',
        label: 'Event Type',
        description: 'LearningEvent activity type',
        type: 'categorical',
        values: [
          { id: 'enrollment', label: 'Enrollment' },
          { id: 'content_started', label: 'Content Started' },
          { id: 'content_completed', label: 'Content Completed' },
          { id: 'assessment_started', label: 'Assessment Started' },
          { id: 'assessment_completed', label: 'Assessment Completed' },
          { id: 'module_completed', label: 'Module Completed' },
          { id: 'course_completed', label: 'Course Completed' },
          { id: 'achievement_earned', label: 'Achievement Earned' },
          { id: 'login', label: 'Login' },
          { id: 'logout', label: 'Logout' }
        ]
      }
    ]
  }
}
```

---

### 3.4 Validate Report Definition

```
POST /api/v2/report-metadata/validate
```

**Purpose:** Validate a custom report definition before creating

**Request Body:**
```typescript
{
  definition: CustomReportDefinition
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    valid: boolean,
    errors?: [
      { field: string, message: string }
    ],
    warnings?: [
      { field: string, message: string }
    ],
    estimatedComplexity: 'low' | 'medium' | 'high',
    estimatedRowCount: number
  }
}
```

---

### 3.5 Preview Report Data

```
POST /api/v2/report-metadata/preview
```

**Purpose:** Get a preview of report data (limited rows)

**Request Body:**
```typescript
{
  definition: CustomReportDefinition,
  limit?: number                          // Default: 10
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    columns: [
      { id: string, label: string, type: string }
    ],
    rows: any[],
    totalRowsEstimate: number,
    previewLimited: boolean
  }
}
```

---

## 4. Type Definitions

### 4.1 ReportJob

```typescript
interface ReportJob {
  id: string;
  
  // Job Info
  name: string;
  description?: string;
  type: 'predefined' | 'custom';
  predefinedType?: string;
  customDefinition?: CustomReportDefinition;
  
  // State
  status: 'pending' | 'processing' | 'ready' | 'downloaded' | 'failed' | 'cancelled' | 'expired';
  priority: 'high' | 'normal' | 'low';
  progress?: number;
  
  // Filters
  filters?: ReportFilters;
  
  // Output
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  rowCount?: number;
  
  // Error
  error?: {
    code: string;
    message: string;
  };
  
  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  downloadedAt?: string;
  downloadCount: number;
  
  // Access Control
  visibility: 'private' | 'department' | 'organization';
  departmentId?: string;
}
```

### 4.2 ReportTemplate

```typescript
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'predefined' | 'custom';
  predefinedType?: string;
  customDefinition?: CustomReportDefinition;
  defaultFilters?: ReportFilters;
  defaultOutputFormat: 'pdf' | 'excel' | 'csv';
  
  isSystemTemplate: boolean;
  isShared: boolean;
  visibility: 'private' | 'department' | 'organization';
  
  usageCount: number;
  lastUsedAt?: string;
  
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  
  tags?: string[];
  category?: string;
}
```

### 4.3 CustomReportDefinition

```typescript
interface CustomReportDefinition {
  dimensions: DimensionConfig[];
  measures: MeasureConfig[];
  slicers: SlicerConfig[];
  groups: GroupConfig[];
  filters: FilterConfig[];
  
  displayOptions: {
    showTotals: boolean;
    showSubtotals: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    chartType?: 'none' | 'bar' | 'line' | 'pie';
  };
  
  outputOptions: {
    formats: ('view' | 'pdf' | 'excel' | 'csv')[];
    includeCharts: boolean;
    includeRawData: boolean;
    pageOrientation?: 'portrait' | 'landscape';
  };
}

interface DimensionConfig {
  entity: 'learner' | 'course' | 'class' | 'program' | 'department' | 'instructor' | 'enrollment' | 'learning-event' | 'grade';
  fields: string[];
  label?: string;
  sortOrder?: number;
}

interface MeasureConfig {
  type: 'count' | 'countDistinct' | 'sum' | 'average' | 'min' | 'max' | 'completionRate' | 'passRate' | 'engagementRate' | 'avgTimeToComplete' | 'retentionRate' | 'avgStudyTime' | 'eventCount';
  field?: string;
  label?: string;
  format?: 'number' | 'percent' | 'currency' | 'duration';
  decimals?: number;
}

interface SlicerConfig {
  field: string;
  type: 'categorical' | 'range' | 'time';
  values?: string[];
  buckets?: { label: string; min?: number; max?: number }[];
  timeGranularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

interface GroupConfig {
  field: string;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  sortBy?: 'value' | 'label' | 'count';
  sortDirection?: 'asc' | 'desc';
  topN?: number;
  showOther?: boolean;
}

interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'between' | 'isNull' | 'isNotNull';
  value: any;
  valueEnd?: any;
}
```

---

## 5. Permissions Summary

| Endpoint | Required Permissions |
|----------|---------------------|
| `POST /report-jobs` | `reports:create`, `staff`, `global-admin` |
| `GET /report-jobs` | `reports:read`, `staff`, `global-admin` |
| `GET /report-jobs/:id` | Owner or `reports:read-all` |
| `DELETE /report-jobs/:id` | Owner or `reports:delete-all` |
| `POST /report-templates` | `reports:templates:create` |
| `GET /report-templates` | Authenticated |
| `PUT/DELETE /report-templates/:id` | Owner or `reports:templates:manage` |
| `GET /report-metadata/*` | Authenticated |
| `POST /report-metadata/preview` | `reports:create` |

---

## 6. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `REPORT_JOB_NOT_FOUND` | 404 | Job ID doesn't exist |
| `REPORT_JOB_ACCESS_DENIED` | 403 | User can't access this job |
| `REPORT_JOB_INVALID_STATE` | 400 | Can't perform action in current state |
| `REPORT_TEMPLATE_NOT_FOUND` | 404 | Template ID doesn't exist |
| `REPORT_DEFINITION_INVALID` | 400 | Custom report definition is invalid |
| `REPORT_TOO_COMPLEX` | 400 | Report would be too resource-intensive |
| `REPORT_QUEUE_FULL` | 429 | User has too many pending jobs |
| `REPORT_GENERATION_FAILED` | 500 | Error during report generation |

---

## Document Status

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | UI Team | Initial proposal |

**Next Steps:**
1. API Team reviews and provides feedback
2. API Team creates formal contracts
3. Begin parallel implementation
