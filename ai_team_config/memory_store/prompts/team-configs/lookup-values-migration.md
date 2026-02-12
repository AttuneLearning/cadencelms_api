# Team Config: LookupValues Migration

**ID:** P-TEAM-002
**Type:** team-config
**Version:** 1.0
**Created:** 2026-01-15
**Status:** Complete
**Tags:** #prompt #team-config #migration #data-model

## Team

| Field | Value |
|-------|-------|
| Name | LMS Backend Team - LookupValues Migration |
| Description | Agent team for implementing LookupValues collection, RoleRegistry service, and UserType object transformation |
| Streams | 3 parallel + 1 integration |

## Purpose

Implement LookupValues collection to replace hardcoded role constants with database-driven lookup values. Transform UserType from strings to rich objects.

## Agents

### Agent A: Data Layer Specialist (Stream A)

**Role:** Handles LookupValue model, seed scripts, and database migrations

**Tasks:**
- A1: Create LookupValue model
- A2: Create LookupValue model tests
- A3: Create constants seed script
- A4: Create seed runner
- A5: Create migration for roledefinitions
- A6: Add npm scripts

**Output Files:**
- `src/models/LookupValue.model.ts`
- `scripts/seeds/constants.seed.ts`
- `scripts/seeds/run-seeds.ts`
- `src/migrations/migrate-roledefinitions.ts`
- `src/migrations/migrate-globaladmin.ts`

**Dependencies:** None (other agents depend on this)

### Agent B: Service Layer Specialist (Stream B)

**Role:** Handles RoleRegistry service, validation factory, and UserType utilities

**Tasks:**
- B1: Create RoleRegistry interface
- B2: Create RoleRegistry tests
- B3: Create RoleRegistry implementation
- B4: Create ValidatorFactory tests
- B5: Create ValidatorFactory
- B6: Create userType utils tests
- B7: Create userType utils

**Output Files:**
- `src/services/role-registry.interface.ts`
- `src/services/role-registry.service.ts`
- `src/validators/department-membership.validator.ts`
- `src/utils/user-type.utils.ts`

**Dependencies:** Blocked by Agent A

### Agent C: API Layer Specialist (Stream C)

**Role:** Handles auth response transformation, middleware updates, and API endpoints

**Tasks:**
- C1: Update auth response types
- C2: Create auth transform tests
- C3: Create auth transform layer
- C4: Create middleware tests
- C5: Update middleware
- C6: Create list endpoints tests
- C7: Create list endpoints
- C8: Create routes

**Output Files:**
- `src/services/auth/auth-transform.service.ts`
- `src/controllers/lookup-values.controller.ts`
- `src/routes/lookup-values.routes.ts`

**Dependencies:** Blocked by Agents A and B

### Agent Integration: Wiring Specialist

**Role:** Wires all streams together, handles startup initialization, and creates E2E tests

**Tasks:**
- I1-I10: Wire services, update models, create E2E tests

**Dependencies:** Blocked by all other agents

## Phase Gates

### Stream A Complete
- LookupValue model created with all indexes
- All A2 tests passing
- Seed script idempotent
- `npm run seed:constants` works
- Migration script created

### Stream B Complete
- RoleRegistry interface defined
- All B2, B4, B6 tests passing
- RoleRegistry works with mock data
- ValidatorFactory works with injected registry

### Stream C Complete
- Auth types updated for UserTypeObject
- All C2, C4, C6 tests passing
- Transform service works with mocked registry
- List endpoints created

### Integration Complete
- Server starts and initializes RoleRegistry
- Server fails if lookups missing
- Login response includes UserTypeObject[]
- All E2E tests passing

## LookupValues Context

| Metric | Value |
|--------|-------|
| Total Records | 15 |
| User Types | 3 |
| Learner Roles | 3 |
| Staff Roles | 4 |
| GlobalAdmin Roles | 5 |
| Pattern | `category.key` (e.g., `userType.staff`, `role.instructor`) |

## TDD Workflow

1. Implement functionality following contracts and specifications
2. Create comprehensive tests at end of phase
3. Ensure 85%+ test coverage before phase completion
4. All tests must pass with real function calls
5. Refactor while keeping tests green
6. Phase gate: Cannot proceed without 85% coverage

## Links

- Prompt registry: [[../prompt-registry]]
- Team configs index: [[index]]
- Original: `.claude/team-config-lookup-values.json`
