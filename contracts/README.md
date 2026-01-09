# API Contracts

## Overview

This directory contains the API contracts that serve as the **single source of truth** for communication between the backend and UI teams. The backend team owns and maintains these contracts.

## Directory Structure

```
contracts/
├── README.md              # This file
├── api/                   # Endpoint contracts by domain
│   ├── auth.contract.ts   # Authentication endpoints
│   ├── user.contract.ts   # User management endpoints
│   ├── course.contract.ts # Course endpoints
│   └── ...
├── types/                 # Shared TypeScript types
│   ├── api-types.ts       # Request/Response types
│   └── domain-types.ts    # Domain model types
├── validation/            # Contract validation utilities
│   └── contract-validator.ts
└── dist/                  # Exported contracts (generated)
    ├── contracts.json     # JSON export for UI team
    └── openapi.yaml       # OpenAPI specification
```

## Cross-Team Workflow

### Backend Team (This Repository)

1. **Define Contract First**
   - Create/update contract in `contracts/api/`
   - Define request/response types in `contracts/types/`
   - Get tech lead approval

2. **Implement Endpoint**
   - Write tests against contract
   - Implement controller/service
   - Validate response matches contract

3. **Export for UI Team**
   ```bash
   npm run contracts:export
   ```

4. **Notify UI Team**
   - Share exported contracts
   - Document breaking changes
   - Update version if needed

### UI Team (Separate Repository)

1. **Import Contracts**
   - Copy `contracts/dist/` to UI repo
   - Or use shared package/submodule

2. **Generate Types**
   - Use contracts to generate TypeScript types
   - Build type-safe API client

3. **Develop Components**
   - Use contract types for props/state
   - Mock API responses from contract examples

## Contract Format

Each contract file follows this structure:

```typescript
// contracts/api/example.contract.ts

export const ExampleContract = {
  // Endpoint metadata
  endpoint: '/api/v2/example',
  method: 'POST',
  version: '1.0.0',
  
  // Request specification
  request: {
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: {
      field1: { type: 'string', required: true },
      field2: { type: 'number', required: false }
    }
  },
  
  // Response specification
  response: {
    success: {
      status: 200,
      body: {
        id: 'string',
        field1: 'string',
        createdAt: 'Date'
      }
    },
    errors: [
      { status: 400, code: 'VALIDATION_ERROR' },
      { status: 401, code: 'UNAUTHORIZED' },
      { status: 404, code: 'NOT_FOUND' }
    ]
  },
  
  // Example for mocking
  example: {
    request: { field1: 'test', field2: 42 },
    response: { id: '123', field1: 'test', createdAt: '2026-01-08T00:00:00Z' }
  }
};
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run contracts:export` | Export contracts to JSON and OpenAPI format |
| `npm run contracts:validate` | Validate all contracts are properly formatted |
| `npm run contracts:docs` | Generate API documentation from contracts |

## Versioning

Contracts follow semantic versioning:

- **MAJOR**: Breaking changes (removed fields, changed types)
- **MINOR**: New optional fields, new endpoints
- **PATCH**: Documentation, examples, bug fixes

### Breaking Change Process

1. Increment major version
2. Document migration path
3. Notify UI team with timeline
4. Support old version during transition (if possible)

## Validation

The backend validates responses match contracts at runtime (in development):

```typescript
import { ContractValidator } from './validation/contract-validator';

// In controller
const response = await service.doSomething();
ContractValidator.validateResponse('POST /api/v2/example', response);
return res.json(response);
```

## Current Contracts

| Domain | Contract File | Status |
|--------|--------------|--------|
| Authentication | `api/auth.contract.ts` | ✅ Defined |
| Users | `api/user.contract.ts` | 🔲 Pending |
| Courses | `api/course.contract.ts` | 🔲 Pending |
| Enrollments | `api/enrollment.contract.ts` | 🔲 Pending |
| Content | `api/content.contract.ts` | 🔲 Pending |
| Assessments | `api/assessment.contract.ts` | 🔲 Pending |
| SCORM | `api/scorm.contract.ts` | 🔲 Pending |

## References

- [Ideal TypeScript Data Structures](../devdocs/Ideal_TypeScript_DataStructures.md)
- [API Crosswalk](../devdocs/Ideal_RestfulAPI_toCurrent_Crosswalk.md)
- [MongoDB Data Objects](../devdocs/Ideal_MongoDB_DataObjects.md)
