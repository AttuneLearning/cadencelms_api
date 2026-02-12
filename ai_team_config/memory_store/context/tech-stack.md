# Context: Tech Stack

**Category:** Technical
**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Tags:** #context #api #technical

## Overview

Core technologies powering the CadenceLMS API.

## Runtime & Language

- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe JavaScript
- **ts-node** - TypeScript execution

## Framework

- **Express.js** - Web framework
- **express-validator** - Request validation

## Database

- **MongoDB** - Document database
- **Mongoose** - ODM for MongoDB
- **MongoMemoryServer** - In-memory MongoDB for testing

## Authentication

- **JWT (jsonwebtoken)** - Token-based auth
- **bcrypt** - Password hashing

## Testing

- **Jest** - Test framework
- **Supertest** - HTTP testing

## Build & Development

- **tsconfig-paths** - Path alias resolution
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Key Dependencies

```json
{
  "express": "^4.x",
  "mongoose": "^7.x",
  "jsonwebtoken": "^9.x",
  "jest": "^29.x",
  "typescript": "^5.x"
}
```

## Path Aliases

The project uses `@/` as a path alias for `src/`:

```typescript
import { User } from '@/models/User.model';
import { ApiError } from '@/utils/ApiError';
```

## Related Context

- [[project-overview]]
- [[api-conventions]]

## Links

- Memory log: [[../memory-log]]
