# API Learning Unit System Contracts Complete

**From:** API Team
**To:** UI Team
**Date:** 2026-01-21
**Subject:** Learning Unit System API Contracts Ready for Review

## Summary

All API contracts for the Learning Unit System have been created and are ready for UI team review. These contracts define the request/response structures, endpoints, and validation rules that will be implemented.

## Contracts Created

### 1. Modules Contract
**File:** `contracts/api/modules.contract.ts`

- **Base Path:** `/api/v2/courses/:courseId/modules`
- **Endpoints:**
  - `GET /` - List modules for a course (with pagination, sorting)
  - `GET /:moduleId` - Get single module with learning units
  - `POST /` - Create module
  - `PUT /:moduleId` - Update module
  - `DELETE /:moduleId` - Delete module
  - `PUT /:moduleId/reorder` - Reorder module position
- **Key Features:**
  - Completion criteria configuration (all units, percentage, specific units)
  - Presentation rules (sequential/flexible order, show progress)
  - Prerequisites support

### 2. Learning Units Contract
**File:** `contracts/api/learning-units.contract.ts`

- **Base Path:** `/api/v2/modules/:moduleId/learning-units`
- **Endpoints:**
  - `GET /` - List learning units (filterable by category)
  - `GET /:learningUnitId` - Get single learning unit
  - `POST /` - Create learning unit
  - `PUT /:learningUnitId` - Update learning unit
  - `DELETE /:learningUnitId` - Delete learning unit
  - `PUT /:learningUnitId/reorder` - Reorder position
- **Key Features:**
  - Categories: `exposition`, `practice`, `assessment`
  - Weight for completion calculations
  - `isRequired` and `isReplayable` flags
  - Content type polymorphism (video, document, quiz, etc.)

### 3. Assessments Contract
**File:** `contracts/api/assessments.contract.ts`

- **Base Path:** `/api/v2/assessments`
- **Endpoints:**
  - `GET /` - List assessments (filterable by type, status, department)
  - `GET /:assessmentId` - Get assessment with questions
  - `POST /` - Create assessment
  - `PUT /:assessmentId` - Update assessment
  - `DELETE /:assessmentId` - Delete assessment
  - `POST /:assessmentId/publish` - Publish assessment
  - `POST /:assessmentId/archive` - Archive assessment
- **Key Features:**
  - Assessment types: `quiz`, `exam`, `survey`, `self-assessment`
  - Question selection modes: `all`, `random`, `weighted-random`
  - Configurable timing, attempts, passing score
  - Feedback options: `immediate`, `after-submission`, `after-grading`, `none`
  - Support for `questionBankIds[]` for multi-bank random selection

### 4. Assessment Attempts Contract
**File:** `contracts/api/assessment-attempts.contract.ts`

- **Base Path:** `/api/v2/assessments/:assessmentId/attempts`
- **Endpoints:**
  - `GET /` - List attempts for an assessment
  - `GET /my` - Get current user's attempts
  - `POST /start` - Start a new attempt
  - `GET /:attemptId` - Get attempt details
  - `PUT /:attemptId/save` - Save progress (auto-save support)
  - `POST /:attemptId/submit` - Submit attempt for grading
  - `POST /:attemptId/grade` - Manual grade (for essay questions)
- **Key Features:**
  - Status tracking: `in-progress`, `submitted`, `graded`, `abandoned`
  - Time tracking with auto-submit on expiration
  - Answer persistence with timestamps
  - Score breakdown by question type

### 5. Module Access Contract
**File:** `contracts/api/module-access.contract.ts`

- **Base Path:** `/api/v2/module-access`
- **Endpoints:**
  - `GET /` - List access records (admin analytics)
  - `GET /my` - Get current user's access records
  - `POST /` - Record access event
  - `GET /:accessId` - Get single access record
  - `PUT /:accessId` - Update access record
  - `GET /analytics/drop-off` - Get drop-off rate analytics
- **Key Features:**
  - Access status: `not-started`, `in-progress`, `completed`, `abandoned`
  - Time spent tracking
  - Completion percentage
  - Drop-off analysis for course optimization

## Type Definitions

All contracts include full TypeScript interfaces for:
- Request bodies
- Response payloads
- Query parameters
- Path parameters
- Error responses

## Notes for UI Team

1. **Nested Routes:** Modules are nested under courses, learning units under modules
2. **Pagination:** All list endpoints support `page`, `limit`, `sortBy`, `sortOrder`
3. **Filtering:** List endpoints include relevant filters (status, category, type)
4. **Validation:** Request schemas define required fields and constraints
5. **Error Codes:** Standard error response format with `statusCode`, `error`, `message`

## Questions/Feedback

If you have any questions or need modifications to these contracts, please create a message in the queue or update the relevant issue file.

## Next Steps (API Team)

1. Complete model schemas (in progress)
2. Implement services with TDD
3. Create controllers matching these contracts
4. Run full test suite before integration

---
*This message was generated as part of the Learning Unit System implementation (Phase 1)*
