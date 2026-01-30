# ADR-DEV-001: Testing Strategy

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Development Process

## Context

Consistent testing practices are essential for maintaining code quality across both API and UI codebases. Without a defined strategy, teams may:
- Skip tests under time pressure
- Write tests at inconsistent granularity
- Miss critical test scenarios
- Have unclear ownership of test types

This ADR establishes the testing strategy for CadenceLMS development.

## Decision

### 1. Testing Philosophy: Lazy TDD

Write tests **after** completing each development phase or issue, not during initial implementation. This balances velocity with quality.

```
┌─────────────────────────────────────────────────────────────┐
│                    LAZY TDD WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Implement Feature/Fix                                    │
│           │                                                  │
│           ▼                                                  │
│  2. Write Tests for Implementation                           │
│           │                                                  │
│           ▼                                                  │
│  3. Run Related Tests: npm test [path]                       │
│           │                                                  │
│           ▼                                                  │
│  4. At Milestone: Full Suite + Type Check                    │
│           │                                                  │
│           ▼                                                  │
│  5. Before Merge: npm run build && npm test                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Test Types by Layer

#### API Testing

| Type | Location | Runner | Purpose |
|------|----------|--------|---------|
| Unit | `tests/unit/` | Jest | Service logic, utilities, validators |
| Integration | `tests/integration/` | Jest + MongoDB | API endpoints, database operations |
| E2E | `tests/e2e/` | Jest | Full request/response cycles |

#### UI Testing

| Type | Location | Runner | Purpose |
|------|----------|--------|---------|
| Unit | `src/**/__tests__/` | Vitest | Components, hooks, utilities |
| Integration | `src/**/__tests__/` | Vitest + MSW | Feature flows, API mocking |
| E2E | `e2e/` | Playwright | Critical user journeys |

### 3. Test Requirements by Change Type

| Change Type | Required Tests | Optional |
|-------------|----------------|----------|
| Bug fix | Regression test proving fix | — |
| New endpoint | Integration test | Unit tests for complex logic |
| New UI component | Unit test for rendering | Integration for interactions |
| New feature | Integration + happy path E2E | Edge cases |
| Refactor | Existing tests must pass | Additional coverage |
| Security fix | Security-focused test | Penetration test |

### 4. Checkpoints

#### Per-Phase Checkpoint
After completing each development phase or issue:

```bash
# API
npm test -- --testPathPattern="[related-path]"
npx tsc --noEmit

# UI
npm test -- [related-path]
npx tsc --noEmit
```

#### Milestone Checkpoint
At major milestones (feature complete, sprint end):

```bash
# API
npm run build
npm test
npm run lint

# UI
npm run build
npm test
npm run lint
```

#### Pre-Merge Checkpoint
Before merging to main branch:

```bash
# Both
npm run build && npm test && npm run lint
```

### 5. Test Helpers

#### API: MongoDB Test Helper

```typescript
// Use describeIfMongo for database-dependent tests
import { describeIfMongo } from '@/tests/helpers/mongoHelper';

describeIfMongo('UserService', () => {
  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should create user', async () => {
    // Test implementation
  });
});
```

#### UI: Mock Service Worker (MSW)

```typescript
// Use MSW for API mocking
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v2/users', (req, res, ctx) => {
    return res(ctx.json({ data: mockUsers }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 6. Coverage Guidelines

| Metric | Target | Minimum |
|--------|--------|---------|
| Line coverage | 80% | 60% |
| Branch coverage | 75% | 50% |
| Critical paths | 100% | 90% |

**Critical paths include:**
- Authentication/authorization flows
- Payment processing
- Data mutations (create, update, delete)
- Error handling paths

### 7. Test Naming Convention

```typescript
// Pattern: describe what, it should behavior
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', () => {});
    it('should throw UnauthorizedError for invalid password', () => {});
    it('should lock account after 5 failed attempts', () => {});
  });
});
```

### 8. Pre-Existing Test Failures

When working on code with pre-existing test failures:
1. Document existing failures before starting
2. Do not fix unrelated failures (scope creep)
3. Ensure your changes don't add new failures
4. Report pre-existing failures to tech debt backlog

## Consequences

### Positive
- Consistent test coverage across teams
- Clear expectations for what to test
- Faster development with "lazy" approach
- Quality gates at key checkpoints

### Negative
- Tests written after implementation may miss edge cases
- Requires discipline to not skip test phase
- Coverage targets may slow initial velocity

### Neutral
- Existing tests remain valid
- Gradual improvement of coverage over time

## Alternatives Considered

### Strict TDD (Test First)
- **Rejected**: Too slow for rapid development phase; adopt post-launch if needed.

### No Formal Strategy
- **Rejected**: Leads to inconsistent quality and technical debt.

### 100% Coverage Requirement
- **Rejected**: Diminishing returns; focus on critical paths instead.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-API-001-API-DESIGN-STANDARDS]] (API test patterns)
  - [[ADR-UI-001-FSD-ARCHITECTURE]] (UI test organization)
- Guidance:
  - `../../guidance/FEATURE_DEVELOPMENT_CHECKLIST.md` (T1-T3 rules)
- Implementation:
  - `tests/` - API test directory
  - `src/**/__tests__/` - UI test files
