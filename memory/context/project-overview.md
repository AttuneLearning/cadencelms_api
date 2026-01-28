# Context: Project Overview

**Category:** Project
**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Tags:** #context #api

## Overview

CadenceLMS is a Learning Management System API built with Node.js, Express, and MongoDB. It provides a comprehensive platform for managing educational content, courses, learners, and assessments.

## Key Capabilities

- **Multi-tenant architecture** - Department-based organization
- **Course management** - Courses, programs, modules, learning units
- **Content delivery** - Questions, question banks, SCORM support
- **User management** - Staff, learners, role-based access
- **Adaptive learning** - Knowledge nodes with mastery progression
- **Assessments** - Question banks, adaptive selection, progress tracking
- **Reporting** - Report templates, schedules, and job execution

## Architecture

- **API Version:** v2 (REST)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT-based
- **Authorization:** Role + Permission-based (RBAC)

## Code Organization

```
src/
  controllers/     # Route handlers
  services/        # Business logic
  models/          # Mongoose schemas
  routes/          # Express routes
  middlewares/     # Auth, validation
  validators/      # Request validation
  utils/           # Shared utilities
```

## Related Context

- [[tech-stack]]
- [[multi-tenant-model]]
- [[api-conventions]]

## Links

- Memory log: [[../memory-log]]
- Architecture decisions: See `dev_communication/architecture/`
