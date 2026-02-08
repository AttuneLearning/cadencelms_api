# ADR-DATA-001: Data Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Data

## Context

CadenceLMS uses MongoDB as primary data store. Consistent data modeling patterns are essential for query performance, data integrity, and maintainable schema evolution.

## Decision

### Database Technology

- **Primary:** MongoDB 6.x+ (document-oriented, horizontal scaling)
- **Secondary:** Redis (session cache, rate limiting), S3 (file storage)

### Collection Naming

- Model: PascalCase singular (`User`, `Course`)
- Collection: auto-pluralized (`users`, `courses`)

### Document Design Patterns

| Pattern | When to Use |
|---------|-------------|
| Embedding | Data always accessed together, one-to-few (<100), infrequent updates |
| Referencing | Independent identity, shared across docs, one-to-many, queried independently |
| Shared _id | Role-specific profiles extending User |
| Polymorphic | Reference different types in single field |

### Indexing Guidelines

1. Index fields used in queries
2. Index fields used in sorting
3. High-cardinality fields first in compound indexes
4. Target: 5-10 indexes per collection max

### Soft Delete Pattern

All major entities include:
- `isActive: Boolean` (default: true)
- `deletedAt: Date`
- `deletedBy: ObjectId`

### Migration Tool

`migrate-mongo` for schema migrations. Always provide rollback.

## Consequences

**Positive:** Consistent patterns, optimized queries, clear migration path.

**Negative:** Denormalization requires manual consistency, no native referential integrity.

## Patterns

- `model-mongoose` - Mongoose model conventions

## Links

- [[ADR-API-002-API-CACHING-STRATEGY]]
- `src/models/` - Mongoose model definitions
