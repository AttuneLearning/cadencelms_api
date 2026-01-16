# UI Team → API Team: Report System Spec Review Request

**From:** UI Team  
**To:** API Team  
**Date:** 2026-01-15 11:15:00  
**Priority:** High  
**Type:** Spec Review Request  

---

## Summary

We have created a comprehensive specification for a **Report System** that includes:

1. **Report Job Queue** - Background processing for large/complex reports
2. **Report Templates** - Reusable saved configurations
3. **Custom Report Builder** - User-defined dimensions, slicers, and groupings

## Documents for Review

| Document | Location |
|----------|----------|
| Full Specification | `api/agent_coms/specs/REPORT_SYSTEM_SPEC.md` |
| Proposed API Endpoints | `api/agent_coms/specs/REPORT_SYSTEM_UIPROPOSED_APIs.md` |

## What We Need From API Team

1. **Review the proposed endpoints** and provide feedback on:
   - Endpoint naming/structure
   - Request/response schemas
   - Missing functionality
   - Implementation concerns

2. **Assess feasibility** of:
   - Background job processing architecture
   - Custom report query builder (dimensions, slicers, groups)
   - File generation (PDF, Excel, CSV)

3. **Create formal contracts** based on your assessment

4. **Timeline estimate** for implementation phases

## Key Proposed Endpoints

### Report Jobs (Queue System)
- `POST /api/v2/report-jobs` - Create job
- `GET /api/v2/report-jobs` - List jobs
- `GET /api/v2/report-jobs/:id` - Get job details
- `GET /api/v2/report-jobs/:id/status` - Poll status (lightweight)
- `GET /api/v2/report-jobs/:id/download` - Get download URL
- `DELETE /api/v2/report-jobs/:id` - Cancel/delete
- `POST /api/v2/report-jobs/:id/retry` - Retry failed job

### Report Templates
- `POST /api/v2/report-templates` - Create template
- `GET /api/v2/report-templates` - List templates
- `GET /api/v2/report-templates/:id` - Get template
- `PUT /api/v2/report-templates/:id` - Update template
- `DELETE /api/v2/report-templates/:id` - Delete template
- `POST /api/v2/report-templates/:id/use` - Create job from template

### Custom Report Metadata
- `GET /api/v2/report-metadata/dimensions` - Available dimensions
- `GET /api/v2/report-metadata/measures` - Available measures
- `GET /api/v2/report-metadata/slicers` - Available slicers
- `POST /api/v2/report-metadata/validate` - Validate definition
- `POST /api/v2/report-metadata/preview` - Preview report data

## Context: Current Issue

The current UI was built expecting a `GET /reports` endpoint that doesn't exist. This causes ISS-023 (token refresh failure on System Reports page). This spec is our proposal to properly implement the reporting system.

## Requested Response

Please create a response message with:
1. Feedback on the proposed architecture
2. Suggested modifications to endpoints
3. Implementation timeline estimate
4. Any questions or clarifications needed

---

**Status:** ⏳ Awaiting API Team Review
