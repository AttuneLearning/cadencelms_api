# LMS Report System Specification

**Version:** 2.0.0  
**Date:** 2026-01-15  
**Status:** ✅ ALIGNED WITH API RECOMMENDATION  
**Author:** UI Team (revised per API Team feedback)  
**API Reference:** [REPORT_SYSTEM_RECOMMENDATION.md](../api/REPORT_SYSTEM_RECOMMENDATION.md)

---

## Key Conventions (Per API Team)

| Convention | Standard | Example |
|------------|----------|--------|
| **Enum naming** | kebab-case (hyphens) | `content-completed`, `enrollment-summary` |
| **Enum storage** | LookupValue table | Runtime extensible without code changes |
| **Visibility levels** | 4 levels | `private`, `team`, `department`, `organization` |
| **Output formats** | 4 formats | `pdf`, `excel`, `csv`, `json` |  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Report Types](#3-report-types)
4. [Report Job Queue System](#4-report-job-queue-system)
5. [Custom Report Builder](#5-custom-report-builder)
6. [Data Model](#6-data-model)
7. [API Endpoints](#7-api-endpoints)
8. [UI Components](#8-ui-components)
9. [Performance Considerations](#9-performance-considerations)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Executive Summary

### Problem Statement

The LMS requires a robust reporting system that allows administrators and staff to:
- Generate pre-defined reports (enrollment, performance, attendance, etc.)
- Create custom ad-hoc reports with flexible dimensions and filters
- Queue long-running reports for background processing
- Download reports in multiple formats (PDF, Excel, CSV)
- Reuse report configurations via templates

### Proposed Solution

A hybrid reporting system combining:
1. **Real-time reports** - Quick queries for dashboard summaries
2. **Queued report jobs** - Background processing for large/complex reports
3. **Custom report builder** - User-defined dimensions, slicers, and groupings

---

## 2. System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UI Layer                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ System       │  │ Staff        │  │ Custom Report Builder        │  │
│  │ Reports Page │  │ Reports Page │  │ (Dimensions, Slicers, Groups)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬───────────────┘  │
│         │                 │                          │                   │
│         ▼                 ▼                          ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Report Hooks & API Client                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Layer                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ /reports/*       │  │ /report-jobs     │  │ /report-templates    │   │
│  │ (Real-time data) │  │ (Queue system)   │  │ (Saved configs)      │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘   │
│           │                     │                       │                │
│           ▼                     ▼                       ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Report Processing Engine                      │    │
│  │  • Query Builder (handles dimensions, slicers, groups)           │    │
│  │  • Aggregation Pipeline Generator                                │    │
│  │  • File Generator (PDF, Excel, CSV)                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Layer (MongoDB)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│  │ Enrollments│ │ Courses    │ │ Learners   │ │ ReportJobs         │    │
│  │            │ │            │ │ /Staff     │ │ (Queue Collection) │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│  │ Classes    │ │ Grades     │ │ Learning   │ │ ReportTemplates    │    │
│  │            │ │            │ │ Events     │ │ (Saved Configs)    │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Report Types

### 3.1 Pre-defined Reports

| Report Type | Description | Primary Data Source | Key Metrics |
|-------------|-------------|---------------------|-------------|
| `enrollment-summary` | Enrollment statistics | Enrollments, Classes | Total, by status, trends |
| `completion-rates` | Course completion rates | Enrollments, Courses | Completion %, time to complete |
| `performance-analysis` | Grades and assessments | Grades, ExamAttempts | Averages, distributions |
| `learner-activity` | Individual learner engagement | LearningEvents | Events by type, time spent, completion rates |
| `course-analytics` | Course effectiveness | LearningEvents, Enrollments | Engagement, event counts, success rates |
| `instructor-workload` | Staff workload | Classes, Enrollments | Classes taught, students per instructor |
| `department-overview` | Department rollup | All above | Aggregated by department |
| `program-progress` | Program completion tracking | Enrollments, Programs | Progress %, completion trends |
| `assessment-results` | Assessment performance | ExamResults, Grades | Scores, pass rates |
| `scorm-attempts` | SCORM package tracking | ScormAttempts | Completion, scores, time |
| `transcript` | Learner transcript | Enrollments, Grades | Course history, grades |
| `certification-status` | Certification tracking | Certifications | Earned, expiring, expired |

> **Note:** All report types are stored in `LookupValue` table (category: `report-type`) for runtime extensibility.

### 3.2 Custom Reports

Users can build reports by selecting:
- **Dimensions** (rows): What entity to report on
- **Measures** (values): What metrics to calculate
- **Slicers** (columns): How to break down the data
- **Groups**: How to aggregate/bucket the data
- **Filters**: What subset of data to include

---

## 4. Report Job Queue System

### 4.1 Why Queue Reports?

| Scenario | Real-time | Queued |
|----------|-----------|--------|
| < 1,000 records | ✅ | ❌ |
| 1,000 - 10,000 records | ⚠️ | ✅ |
| > 10,000 records | ❌ | ✅ |
| Complex aggregations | ❌ | ✅ |
| PDF generation | ❌ | ✅ |
| Scheduled reports | ❌ | ✅ |

### 4.2 Job Lifecycle

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌─────────┐
│ PENDING │ ──▶ │ PROCESSING │ ──▶ │   READY   │ ──▶ │ EXPIRED │
└─────────┘     └────────────┘     └───────────┘     └─────────┘
     │                │                  │
     │                │                  │
     ▼                ▼                  ▼
┌─────────┐     ┌────────────┐     ┌───────────┐
│ CANCELLED│    │   FAILED   │     │ DOWNLOADED│
└─────────┘     └────────────┘     └───────────┘
```

### 4.3 Job States

| State | Description | Transitions To |
|-------|-------------|----------------|
| `pending` | Job created, waiting to be picked up | `processing`, `cancelled` |
| `processing` | Worker is generating the report | `ready`, `failed` |
| `ready` | Report file available for download | `expired`, `downloaded` |
| `downloaded` | User has downloaded at least once | `expired` |
| `failed` | Error during generation | - |
| `cancelled` | User cancelled before processing | - |
| `expired` | File deleted after retention period | - |

### 4.4 Job Priority

| Priority | Use Case | Processing Order |
|----------|----------|------------------|
| `critical` | Urgent admin/compliance requests | Immediate |
| `high` | Admin urgent requests | First |
| `normal` | Standard user requests | FIFO |
| `low` | Batch reports | After normal |
| `scheduled` | Scheduled/recurring reports | Background |

> **Note:** Priority levels stored in `LookupValue` table (category: `report-priority`).

---

## 5. Custom Report Builder

### 5.1 Concept Overview

The Custom Report Builder allows users to construct reports using a visual interface similar to pivot tables or BI tools.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CUSTOM REPORT BUILDER                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ AVAILABLE FIELDS ──────────┐    ┌─ REPORT LAYOUT ───────────────┐   │
│  │                              │    │                                │   │
│  │  📊 Dimensions              │    │  ROWS (Dimensions):            │   │
│  │    ├─ Learner               │    │    [Department] [Course]       │   │
│  │    ├─ Course                │    │                                │   │
│  │    ├─ Program               │    │  COLUMNS (Slicers):            │   │
│  │    ├─ Department            │    │    [Enrollment Status]         │   │
│  │    ├─ Instructor            │    │                                │   │
│  │    ├─ Class                 │    │  VALUES (Measures):            │   │
│  │    └─ Academic Year         │    │    [Count] [Avg Grade]         │   │
│  │                              │    │                                │   │
│  │  📈 Measures                │    │  GROUPS:                       │   │
│  │    ├─ Count                 │    │    [By Month]                  │   │
│  │    ├─ Sum                   │    │                                │   │
│  │    ├─ Average               │    └────────────────────────────────┘   │
│  │    ├─ Min/Max               │                                         │
│  │    ├─ Completion Rate       │    ┌─ FILTERS ─────────────────────┐   │
│  │    ├─ Pass Rate             │    │  Date Range: [Jan 2025 - Dec] │   │
│  │    └─ Time to Complete      │    │  Department: [Psychology]     │   │
│  │                              │    │  Status: [Active only]        │   │
│  │  🔀 Slicers                 │    └────────────────────────────────┘   │
│  │    ├─ Enrollment Status     │                                         │
│  │    ├─ Completion Status     │    ┌─ PREVIEW ─────────────────────┐   │
│  │    ├─ Grade Range           │    │                                │   │
│  │    ├─ Time Period           │    │  [Live preview of report]     │   │
│  │    └─ Department            │    │                                │   │
│  │                              │    └────────────────────────────────┘   │
│  └──────────────────────────────┘                                        │
│                                                                          │
│  [Save as Template]  [Generate Report]  [Schedule]  [Export Config]     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Dimensions (Row Entities)

Dimensions define WHAT you're reporting on - the primary entity for each row.

| Dimension | Description | Available Fields |
|-----------|-------------|------------------|
| `learner` | Individual learner records | name, email, department, enrollmentDate, status |
| `course` | Course-level data | name, code, department, credits, duration |
| `class` | Class instance data | name, instructor, startDate, endDate, capacity |
| `program` | Program-level data | name, department, totalCredits, courseCount |
| `department` | Department-level data | name, headCount, courseCount, enrollmentCount |
| `instructor` | Instructor data | name, department, classCount, studentCount |
| `enrollment` | Individual enrollment records | learner, course, class, status, grade |
| `activity` | Activity events (from LearningEvents) | learner, course, class, eventType, timestamp, duration, score |
| `assessment` | Assessment/exam records | learner, course, score, passed, attemptNumber |
| `scorm-attempt` | SCORM package attempts | learner, content, status, score, totalTime |

> **Note:** Dimension entities stored in `LookupValue` table (category: `dimension-entity`).

### 5.3 Measures (Calculated Values)

Measures are the values calculated for each dimension.

| Measure | Description | Applicable To |
|---------|-------------|---------------|
| `count` | Number of records | All dimensions |
| `count-distinct` | Unique count | All dimensions |
| `sum` | Sum of numeric field | grades, credits, duration |
| `average` | Average of numeric field | grades, scores, time |
| `median` | Median value | grades, scores |
| `min` | Minimum value | grades, dates, duration |
| `max` | Maximum value | grades, dates, duration |
| `std-dev` | Standard deviation | grades, scores |
| `variance` | Statistical variance | grades, scores |
| `completion-rate` | % completed | enrollments, courses |
| `pass-rate` | % passed (grade >= threshold) | enrollments, courses, assessments |
| `fail-rate` | % failed | enrollments, courses, assessments |
| `engagement-rate` | % of learners with activity | courses, classes |
| `retention-rate` | % not withdrawn | enrollments, programs |
| `dropout-rate` | % withdrawn | enrollments, programs |
| `avg-time-to-complete` | Average completion time | enrollments |
| `avg-study-time` | Average time spent | learners, courses |
| `avg-score` | Average assessment score | assessments, courses, learners |
| `event-count` | Count of learning events | learners, courses, classes |

> **Note:** Measure types stored in `LookupValue` table (category: `measure-type`) with metadata for format and applicability.

### 5.4 Slicers (Column Breakdown)

Slicers break down measures across categories (creates columns).

| Slicer | Values | Example Output |
|--------|--------|----------------|
| `enrollment-status` | not-started, in-progress, completed, withdrawn | Columns: "Not Started", "In Progress", etc. |
| `grade-range` | A, B, C, D, F | Columns by grade letter |
| `time-period` | month, quarter, year | Columns by time bucket |
| `department` | <dynamic from data> | Columns by department |
| `completion-status` | incomplete, complete | Two columns |
| `event-type` | content-started, content-completed, assessment-completed, module-completed, course-completed, etc. | Columns by LearningEvent type |

> **Note:** Event types use kebab-case per API convention. All event types stored in `LookupValue` table (category: `activity-event`).

### 5.5 Groups (Aggregation Buckets)

Groups allow hierarchical aggregation of data.

| Group | Description | Example |
|-------|-------------|---------|
| `by-month` | Group by calendar month | Jan 2025, Feb 2025, ... |
| `by-quarter` | Group by fiscal quarter | Q1 2025, Q2 2025, ... |
| `by-year` | Group by year | 2024, 2025, 2026 |
| `by-week` | Group by week number | Week 1, Week 2, ... |
| `by-day` | Group by day | 2025-01-15, 2025-01-16, ... |
| `by-hour` | Group by hour | 08:00, 09:00, ... |
| `by-department` | Group by department | Psychology, IT, ... |
| `by-program` | Group by program | CBT Certificate, ... |
| `by-course` | Group by course | CBT 101, CBT 201, ... |
| `by-instructor` | Group by instructor | John Smith, ... |
| `by-grade-range` | Bucket grades | 90-100, 80-89, ... |

### 5.6 Report Definition Schema

```typescript
interface CustomReportDefinition {
  // Metadata
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  isShared: boolean;
  
  // Report Structure
  dimensions: DimensionConfig[];   // Row entities
  measures: MeasureConfig[];       // Calculated values
  slicers: SlicerConfig[];         // Column breakdown
  groups: GroupConfig[];           // Aggregation buckets
  
  // Filtering
  filters: FilterConfig[];
  
  // Display Options
  displayOptions: {
    showTotals: boolean;
    showSubtotals: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    chartType?: 'none' | 'bar' | 'line' | 'pie';
  };
  
  // Output Options
  outputOptions: {
    formats: ('view' | 'pdf' | 'excel' | 'csv' | 'json')[];
    includeCharts: boolean;
    includeRawData: boolean;
    includeSummary: boolean;
    pageOrientation?: 'portrait' | 'landscape';
    pageSize?: 'letter' | 'legal' | 'a4';
  };
}

interface DimensionConfig {
  entity: 'learner' | 'course' | 'class' | 'program' | 'department' | 'instructor' | 'enrollment' | 'activity' | 'assessment' | 'scorm-attempt';
  fields: string[];              // Which fields to include
  label?: string;                // Custom column header
  sortOrder?: number;            // Order in row hierarchy
}

interface MeasureConfig {
  id: string;                    // Unique identifier
  type: 'count' | 'count-distinct' | 'sum' | 'average' | 'median' | 'min' | 'max' | 'std-dev' | 'variance' | 'completion-rate' | 'pass-rate' | 'fail-rate' | 'engagement-rate' | 'retention-rate' | 'dropout-rate' | 'avg-time-to-complete' | 'avg-study-time' | 'avg-score' | 'event-count';
  field?: string;                // Field to aggregate (for sum, avg, etc.)
  label?: string;                // Custom header
  format?: 'number' | 'percent' | 'currency' | 'duration' | 'date';
  decimals?: number;
  conditionalFormatting?: ConditionalFormat[];
}

interface SlicerConfig {
  field: string;                 // Field to slice by
  type: 'categorical' | 'range' | 'time' | 'dynamic';
  values?: string[];             // Specific values to include (optional)
  buckets?: {                    // For range slicers
    label: string;
    min?: number;
    max?: number;
  }[];
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  dynamicSource?: string;        // Endpoint for dynamic values
}

interface GroupConfig {
  field: string;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  sortBy: 'value' | 'label' | 'count';
  sortDirection: 'asc' | 'desc';
  topN?: number;                 // Only show top N groups
  showOther: boolean;            // Combine remaining into "Other"
}

interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'between' | 'isNull' | 'isNotNull';
  value: any;
  valueEnd?: any;                // For 'between' operator
}
```

---

## 6. Data Model

### 6.1 ReportJob Collection

```typescript
interface ReportJob {
  _id: ObjectId;
  
  // Job Identification
  name: string;
  description?: string;
  type: 'predefined' | 'custom';
  templateId?: ObjectId;         // Reference to ReportTemplate (if used)
  predefinedType?: 'enrollment-summary' | 'completion-rates' | 'performance-analysis' | 'learner-activity' | 'course-analytics' | 'instructor-workload' | 'department-overview' | 'program-progress' | 'assessment-results' | 'scorm-attempts' | 'transcript' | 'certification-status';
  customDefinition?: CustomReportDefinition;
  
  // Job State (per API recommendation)
  status: 'pending' | 'queued' | 'processing' | 'rendering' | 'uploading' | 'ready' | 'downloaded' | 'failed' | 'cancelled' | 'expired';
  priority: 'critical' | 'high' | 'normal' | 'low' | 'scheduled';
  progress: number;              // 0-100 for progress tracking
  
  // Filters (for predefined reports)
  filters?: {
    departmentIds?: ObjectId[];
    programIds?: ObjectId[];
    courseIds?: ObjectId[];
    classIds?: ObjectId[];
    learnerIds?: ObjectId[];
    instructorIds?: ObjectId[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    academicYearId?: ObjectId;
    enrollmentStatus?: string[];
    completionStatus?: string[];
  };
  
  // Output (per API recommendation)
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  outputFile?: {
    storageProvider: 'local' | 's3' | 'azure' | 'gcs';
    bucket?: string;
    key?: string;
    url?: string;                // Signed URL (ephemeral)
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string;
    generatedAt: Date;
    expiresAt: Date;
  };
  rowCount?: number;
  
  // Execution Metrics
  metrics?: {
    rowsProcessed: number;
    rowsTotal?: number;
    queryTimeMs: number;
    renderTimeMs: number;
    totalTimeMs: number;
    memoryPeakMb?: number;
  };
  
  // Scheduling (separate ReportSchedule collection per API recommendation)
  scheduleId?: ObjectId;         // Reference to ReportSchedule
  scheduledFor?: Date;
  
  // Notifications (per API recommendation)
  notifyOnComplete: boolean;
  notifyChannels?: {
    email?: string[];
    webhook?: string;
    inApp?: boolean;
  };
  
  // Error Handling
  error?: {
    code: string;
    message: string;
    stack?: string;              // Development only
    retryable: boolean;
  };
  retryCount: number;
  maxRetries: number;
  
  // Metadata
  createdBy: ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;              // When file will be deleted
  downloadedAt?: Date;
  downloadCount: number;
  
  // Access Control (per API recommendation - added 'team' level)
  visibility: 'private' | 'team' | 'department' | 'organization';
  departmentId?: ObjectId;       // For department-scoped jobs
  sharedWith?: ObjectId[];       // Specific user IDs
  
  // Multi-tenant support
  organizationId: ObjectId;
}
```

### 6.2 ReportTemplate Collection

```typescript
interface ReportTemplate {
  _id: ObjectId;
  
  // Template Info
  name: string;
  description: string;
  slug: string;                  // URL-friendly identifier
  type: 'predefined' | 'custom';
  predefinedType?: string;
  customDefinition?: CustomReportDefinition;
  
  // Default Configuration
  defaultFilters?: ReportFilters;
  defaultOutputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  
  // Classification
  category: string;
  tags: string[];
  icon?: string;
  color?: string;
  
  // Visibility (per API recommendation - added 'team' and 'global')
  isSystemTemplate: boolean;     // Built-in template
  visibility: 'private' | 'team' | 'department' | 'organization' | 'global';
  departmentId?: ObjectId;
  
  // Usage Stats
  usageCount: number;
  lastUsedAt?: Date;
  lastUsedBy?: ObjectId;
  
  // Version Control (per API recommendation)
  version: number;
  previousVersionId?: ObjectId;
  isLatest: boolean;
  
  // Audit
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Permissions (per API recommendation)
  requiredPermissions: string[];  // e.g., ['reports:read', 'performance:read']
  requiredRoleLevel?: number;     // Minimum role level
  
  // Multi-tenant
  organizationId: ObjectId;
}
```

### 6.3 ReportSchedule Collection (Separate per API Recommendation)

```typescript
interface ReportSchedule {
  _id: ObjectId;
  
  // Identification
  name: string;
  description?: string;
  templateId: ObjectId;          // Must reference a template
  
  // Schedule Definition
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    cronExpression?: string;     // For complex schedules
    timezone: string;
    dayOfWeek?: number;          // 0-6 for weekly
    dayOfMonth?: number;         // 1-31 for monthly
    time: string;                // HH:mm
    startDate?: Date;
    endDate?: Date;
  };
  
  // Overrides
  filterOverrides?: Partial<ReportFilters>;
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  
  // State
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunJobId?: ObjectId;
  lastRunStatus?: 'success' | 'failed';
  runCount: number;
  failureCount: number;
  consecutiveFailures: number;
  
  // Notifications
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  notifyChannels?: {
    email?: string[];
    webhook?: string;
    inApp?: boolean;
  };
  
  // Access Control
  visibility: 'private' | 'team' | 'department' | 'organization';
  createdBy: ObjectId;
  departmentId?: ObjectId;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  
  // Multi-tenant
  organizationId: ObjectId;
}
```

### 6.4 Indexes (Per API Recommendation)

```javascript
// ReportJob indexes
db.reportJobs.createIndex({ organizationId: 1, createdBy: 1, createdAt: -1 });
db.reportJobs.createIndex({ organizationId: 1, status: 1, priority: -1, createdAt: 1 });
db.reportJobs.createIndex({ organizationId: 1, departmentId: 1, visibility: 1 });
db.reportJobs.createIndex({ scheduleId: 1 }, { sparse: true });
db.reportJobs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ReportTemplate indexes
db.reportTemplates.createIndex({ organizationId: 1, isSystemTemplate: 1, visibility: 1 });
db.reportTemplates.createIndex({ organizationId: 1, createdBy: 1 });
db.reportTemplates.createIndex({ organizationId: 1, category: 1, tags: 1 });
db.reportTemplates.createIndex({ slug: 1 }, { unique: true });
db.reportTemplates.createIndex({ usageCount: -1 });

// ReportSchedule indexes
db.reportSchedules.createIndex({ organizationId: 1, isActive: 1, nextRunAt: 1 });
db.reportSchedules.createIndex({ templateId: 1 });

// LearningEvent indexes (enhanced per API recommendation)
db.learningEvents.createIndex({ organizationId: 1, learnerId: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, courseId: 1, eventType: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, classId: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, "aggregation.dayKey": 1, eventType: 1 });
db.learningEvents.createIndex({ organizationId: 1, "aggregation.monthKey": 1, eventType: 1 });
```

---

## 7. API Endpoints

### 7.1 Report Jobs

```typescript
// ============================================================
// REPORT JOBS - Queue Management
// ============================================================

/**
 * POST /api/v2/report-jobs
 * Create a new report job (queue for processing)
 */
createReportJob: {
  method: 'POST',
  endpoint: '/api/v2/report-jobs',
  
  request: {
    body: {
      name: string;                    // Required
      description?: string;
      type: 'predefined' | 'custom';   // Required
      predefinedType?: string;         // Required if type='predefined'
      customDefinition?: CustomReportDefinition; // Required if type='custom'
      filters?: ReportFilters;
      outputFormat: 'pdf' | 'excel' | 'csv'; // Required
      priority?: 'high' | 'normal' | 'low';  // Default: 'normal'
      notifyOnComplete?: boolean;      // Default: true
      notifyEmails?: string[];
      visibility?: 'private' | 'department' | 'organization';
    }
  },
  
  response: {
    success: true,
    data: {
      job: ReportJob,
      estimatedTime: number,           // Estimated seconds to complete
      queuePosition: number            // Position in queue
    }
  },
  
  permissions: ['reports:create', 'staff', 'global-admin']
};

/**
 * GET /api/v2/report-jobs
 * List report jobs for current user
 */
listReportJobs: {
  method: 'GET',
  endpoint: '/api/v2/report-jobs',
  
  request: {
    query: {
      status?: string[];               // Filter by status(es)
      type?: 'predefined' | 'custom';
      dateFrom?: string;               // Created after
      dateTo?: string;                 // Created before
      search?: string;                 // Search name/description
      sort?: string;                   // e.g., '-createdAt', 'name'
      page?: number;
      limit?: number;
    }
  },
  
  response: {
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
  },
  
  permissions: ['reports:read', 'staff', 'global-admin']
};

/**
 * GET /api/v2/report-jobs/:id
 * Get single report job details
 */
getReportJob: {
  method: 'GET',
  endpoint: '/api/v2/report-jobs/:id',
  
  response: {
    success: true,
    data: {
      job: ReportJob
    }
  },
  
  permissions: ['reports:read']
};

/**
 * GET /api/v2/report-jobs/:id/status
 * Get job status (lightweight endpoint for polling)
 */
getReportJobStatus: {
  method: 'GET',
  endpoint: '/api/v2/report-jobs/:id/status',
  
  response: {
    success: true,
    data: {
      id: string,
      status: string,
      progress: number,
      estimatedTimeRemaining?: number,
      fileUrl?: string,                // Included when ready
      error?: { code: string, message: string }
    }
  }
};

/**
 * GET /api/v2/report-jobs/:id/download
 * Get download URL (generates signed URL)
 */
downloadReportJob: {
  method: 'GET',
  endpoint: '/api/v2/report-jobs/:id/download',
  
  response: {
    success: true,
    data: {
      downloadUrl: string,             // Signed URL, expires in 1 hour
      fileName: string,
      contentType: string,
      fileSizeBytes: number,
      expiresAt: string
    }
  }
};

/**
 * DELETE /api/v2/report-jobs/:id
 * Cancel pending job or delete completed job
 */
deleteReportJob: {
  method: 'DELETE',
  endpoint: '/api/v2/report-jobs/:id',
  
  response: {
    success: true,
    message: 'Report job deleted'
  },
  
  permissions: ['reports:delete']
};

/**
 * POST /api/v2/report-jobs/:id/retry
 * Retry a failed job
 */
retryReportJob: {
  method: 'POST',
  endpoint: '/api/v2/report-jobs/:id/retry',
  
  response: {
    success: true,
    data: {
      job: ReportJob
    }
  }
};
```

### 7.2 Report Templates

```typescript
// ============================================================
// REPORT TEMPLATES
// ============================================================

/**
 * POST /api/v2/report-templates
 * Create a new report template
 */
createReportTemplate: {
  method: 'POST',
  endpoint: '/api/v2/report-templates',
  
  request: {
    body: {
      name: string;
      description: string;
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
  },
  
  response: {
    success: true,
    data: {
      template: ReportTemplate
    }
  },
  
  permissions: ['reports:templates:create']
};

/**
 * GET /api/v2/report-templates
 * List available templates
 */
listReportTemplates: {
  method: 'GET',
  endpoint: '/api/v2/report-templates',
  
  request: {
    query: {
      type?: 'predefined' | 'custom';
      visibility?: 'private' | 'shared' | 'system';
      category?: string;
      tags?: string[];
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
    }
  },
  
  response: {
    success: true,
    data: {
      templates: ReportTemplate[],
      pagination: { ... }
    }
  }
};

/**
 * GET /api/v2/report-templates/:id
 */
getReportTemplate: {
  method: 'GET',
  endpoint: '/api/v2/report-templates/:id',
  
  response: {
    success: true,
    data: {
      template: ReportTemplate
    }
  }
};

/**
 * PUT /api/v2/report-templates/:id
 */
updateReportTemplate: {
  method: 'PUT',
  endpoint: '/api/v2/report-templates/:id',
  
  request: {
    body: Partial<CreateReportTemplatePayload>
  },
  
  response: {
    success: true,
    data: {
      template: ReportTemplate
    }
  }
};

/**
 * DELETE /api/v2/report-templates/:id
 */
deleteReportTemplate: {
  method: 'DELETE',
  endpoint: '/api/v2/report-templates/:id',
  
  response: {
    success: true,
    message: 'Template deleted'
  }
};

/**
 * POST /api/v2/report-templates/:id/use
 * Create a report job from a template
 */
useReportTemplate: {
  method: 'POST',
  endpoint: '/api/v2/report-templates/:id/use',
  
  request: {
    body: {
      name?: string;                   // Override template name
      filters?: ReportFilters;         // Override filters
      outputFormat?: string;           // Override format
    }
  },
  
  response: {
    success: true,
    data: {
      job: ReportJob
    }
  }
};
```

### 7.3 Custom Report Metadata

```typescript
// ============================================================
// CUSTOM REPORT METADATA
// ============================================================

/**
 * GET /api/v2/report-metadata/dimensions
 * Get available dimensions for custom reports
 */
getReportDimensions: {
  method: 'GET',
  endpoint: '/api/v2/report-metadata/dimensions',
  
  response: {
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
            { id: 'department', label: 'Department', type: 'reference' },
            // ...
          ]
        },
        // ... other dimensions
      ]
    }
  }
};

/**
 * GET /api/v2/report-metadata/measures
 * Get available measures for custom reports
 */
getReportMeasures: {
  method: 'GET',
  endpoint: '/api/v2/report-metadata/measures',
  
  response: {
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
          id: 'average',
          label: 'Average',
          description: 'Average value',
          applicableTo: ['number'],
          requiresField: true
        },
        // ...
      ]
    }
  }
};

/**
 * GET /api/v2/report-metadata/slicers
 * Get available slicers
 */
getReportSlicers: {
  method: 'GET',
  endpoint: '/api/v2/report-metadata/slicers',
  
  response: {
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
        // ...
      ]
    }
  }
};

/**
 * POST /api/v2/report-metadata/validate
 * Validate a custom report definition
 */
validateReportDefinition: {
  method: 'POST',
  endpoint: '/api/v2/report-metadata/validate',
  
  request: {
    body: {
      definition: CustomReportDefinition
    }
  },
  
  response: {
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
};

/**
 * POST /api/v2/report-metadata/preview
 * Get a preview of report data (limited rows)
 */
previewReport: {
  method: 'POST',
  endpoint: '/api/v2/report-metadata/preview',
  
  request: {
    body: {
      definition: CustomReportDefinition,
      limit?: number                   // Default: 10
    }
  },
  
  response: {
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
};
```

---

## 8. UI Components

### 8.1 Page Structure

```
/admin/reports                    → System Reports Dashboard (overview + queue)
/admin/reports/builder            → Custom Report Builder
/admin/reports/templates          → Report Templates Library
/admin/reports/jobs/:id           → Report Job Details
/admin/reports/scheduled          → Scheduled Reports Management

/staff/reports                    → Staff Reports (scoped to their classes)
/staff/reports/builder            → Custom Report Builder (limited dimensions)
```

### 8.2 Component Hierarchy

```
<ReportsPage>
  ├── <SystemOverviewCards>          // Real-time summary stats
  │     ├── <EnrollmentSummaryCard>
  │     ├── <CompletionRateCard>
  │     ├── <PerformanceSummaryCard>
  │     └── <EngagementSummaryCard>   // Based on LearningEvents
  │
  ├── <QuickReportActions>           // Pre-defined report buttons
  │     └── <ReportTypeCard> (for each type)
  │
  ├── <ReportJobsTable>              // Queue/history
  │     ├── <JobStatusBadge>
  │     ├── <JobProgressBar>
  │     └── <JobActions> (download, delete, retry)
  │
  └── <CreateReportDialog>           // Quick create modal
        ├── <ReportTypeSelector>
        ├── <FilterConfiguration>
        └── <OutputOptions>

<CustomReportBuilder>
  ├── <FieldPalette>                 // Available fields to drag
  │     ├── <DimensionsList>
  │     ├── <MeasuresList>
  │     └── <SlicersList>
  │
  ├── <ReportCanvas>                 // Drop zones
  │     ├── <RowsDropZone>           // Dimensions
  │     ├── <ColumnsDropZone>        // Slicers
  │     ├── <ValuesDropZone>         // Measures
  │     └── <GroupsDropZone>
  │
  ├── <FilterPanel>                  // Filter configuration
  │     └── <FilterRow> (repeatable)
  │
  ├── <PreviewPanel>                 // Live data preview
  │     ├── <PreviewTable>
  │     └── <PreviewChart>
  │
  └── <ActionBar>
        ├── <SaveTemplateButton>
        ├── <GenerateReportButton>
        └── <ScheduleButton>
```

### 8.3 Key UI Features

| Feature | Description |
|---------|-------------|
| Drag-and-drop | Drag fields from palette to drop zones |
| Live preview | Shows sample data as you build |
| Validation | Real-time validation with error messages |
| Complexity indicator | Shows if report will be slow |
| Template library | Save and reuse configurations |
| Schedule reports | Set up recurring report generation |
| Export config | Export/import report definitions as JSON |

---

## 9. Performance Considerations

### 9.1 Query Optimization

| Scenario | Strategy |
|----------|----------|
| Large datasets (>100k records) | Use aggregation pipelines, not find() |
| Complex joins | Use $lookup with pipeline (not simple) |
| Time-series data | Pre-aggregate into daily/weekly buckets |
| Frequent reports | Cache aggregated data |
| Cross-collection queries | Consider materialized views |

### 9.2 Background Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                     Report Worker Pool                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Worker 1   │  │  Worker 2   │  │  Worker 3   │  ...         │
│  │  (PDF Gen)  │  │  (Excel)    │  │  (CSV)      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         ▲                ▲                ▲                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    ┌─────┴─────┐                                │
│                    │  Job Queue │                                │
│                    │  (Redis)   │                                │
│                    └───────────┘                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Caching Strategy

| Cache Type | TTL | Use Case |
|------------|-----|----------|
| Report metadata | 1 hour | Dimensions, measures, slicers lists |
| Aggregated summaries | 15 min | Dashboard cards |
| Report data cache | 1 hour | Repeated identical reports |
| File URLs | 7 days | Generated report files |

### 9.4 Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max rows in preview | 100 | UI performance |
| Max rows in export | 500,000 | Memory/file size |
| Max concurrent jobs per user | 5 | Resource fairness |
| Job retention period | 30 days | Storage costs |
| File retention period | 7 days | Storage costs |
| Max custom dimensions | 5 | Query complexity |
| Max slicers | 3 | Output readability |

---

## 10. Future Enhancements

### 10.1 Reporting Database (Phase 2)

For large-scale deployments, consider a dedicated reporting database:

```
┌─────────────────┐         ┌─────────────────┐
│   MongoDB       │ ──CDC──▶│  ClickHouse     │
│   (OLTP)        │         │  (OLAP)         │
│                 │         │                 │
│  • Transactions │         │  • Analytics    │
│  • Real-time    │         │  • Aggregations │
│  • User data    │         │  • Time series  │
└─────────────────┘         └─────────────────┘
```

**Considerations:**
- Use Change Data Capture (CDC) to sync
- ClickHouse or TimescaleDB for analytics
- Keep MongoDB for real-time, small queries
- Route large/complex reports to OLAP DB

### 10.2 Additional Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Email delivery | High | Email report when ready |
| Scheduled reports | High | Recurring report generation |
| Report subscriptions | Medium | Users subscribe to reports |
| Interactive dashboards | Medium | Saved dashboard layouts |
| Report sharing | Medium | Share with specific users |
| Data export API | Low | Programmatic access |
| Custom visualizations | Low | User-defined charts |
| Report versioning | Low | Track changes to templates |

### 10.3 Integration Points

| System | Integration |
|--------|-------------|
| Email service | Send report notifications |
| File storage (S3) | Store generated files |
| Redis | Job queue, caching |
| Webhooks | Notify external systems |
| Calendar | Scheduled report triggers |

---

## Appendix A: Example Custom Report Definitions

### A.1 Enrollment by Department by Month

```json
{
  "name": "Enrollment by Department by Month",
  "dimensions": [
    { "entity": "department", "fields": ["name"] }
  ],
  "measures": [
    { "type": "count", "label": "Total Enrollments" },
    { "type": "completionRate", "label": "Completion %" }
  ],
  "slicers": [
    { "field": "enrollmentStatus", "type": "categorical" }
  ],
  "groups": [
    { "field": "enrolledAt", "granularity": "month" }
  ],
  "filters": [
    { "field": "enrolledAt", "operator": "between", "value": "2025-01-01", "valueEnd": "2025-12-31" }
  ]
}
```

### A.2 Instructor Performance Summary

```json
{
  "name": "Instructor Performance Summary",
  "dimensions": [
    { "entity": "instructor", "fields": ["name", "department"] }
  ],
  "measures": [
    { "type": "count", "label": "Classes Taught" },
    { "type": "countDistinct", "field": "learnerId", "label": "Students" },
    { "type": "average", "field": "grade", "label": "Avg Grade" },
    { "type": "completionRate", "label": "Completion Rate" }
  ],
  "slicers": [],
  "groups": [],
  "filters": [
    { "field": "classEndDate", "operator": "gte", "value": "2025-01-01" }
  ],
  "displayOptions": {
    "sortBy": "avgGrade",
    "sortDirection": "desc",
    "showTotals": true
  }
}
```

---

## Appendix B: Migration Plan

### B.1 Phase 1: Report Jobs (MVP)

- [ ] Create ReportJob collection and indexes
- [ ] Implement CRUD endpoints for report jobs
- [ ] Implement background worker for job processing
- [ ] Basic predefined report types
- [ ] PDF/Excel/CSV generation

### B.2 Phase 2: Templates & Custom Reports

- [ ] Create ReportTemplate collection
- [ ] Implement template CRUD
- [ ] Implement custom report definition schema
- [ ] Build report metadata endpoints
- [ ] Implement query builder for custom reports

### B.3 Phase 3: Advanced Features

- [ ] Scheduled reports
- [ ] Email notifications
- [ ] Report sharing
- [ ] Performance optimization
- [ ] Caching layer

---

## Document Status

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | UI Team | Initial draft |

**Next Steps:**
1. API Team review and feedback
2. Create formal endpoint contracts
3. UI/API alignment meeting
4. Begin Phase 1 implementation
