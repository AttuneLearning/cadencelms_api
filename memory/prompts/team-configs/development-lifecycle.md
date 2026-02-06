# Development Lifecycle Team Config

**Version:** 1.0.0
**Created:** 2026-02-05
**ADR:** [[../../dev_communication/architecture/decisions/ADR-DEV-002-DEVELOPMENT-LIFECYCLE]]

## Purpose

Enforces the mandatory development lifecycle for all code changes. Use `/develop` to execute.

## Invocation

```
/develop                    # Process next issue in queue
/develop API-ISS-022        # Process specific issue
/develop all                # Process all issues in queue
/develop quick <file>       # Quick mode for trivial changes (no full verification)
```

## Team Detection (Portable)

Auto-detect team from working directory:
```yaml
detection:
  ui_team: "path contains 'cadencelms_ui'"
  api_team: "path contains 'cadencelms_api'"

paths:
  inbox: "dev_communication/messaging/*-to-{team}/"
  outbox: "dev_communication/messaging/{team}-to-*/"
  issues: "dev_communication/issues/{team}/"
```

## Workflow Definition

### Phase 0: Message Polling & Unblocking (AUTOMATIC)

**Runs BEFORE processing issues and BETWEEN issues when processing multiple.**

```yaml
message_polling:
  trigger: "Before each issue, between issues in batch"
  timeout: "20 minutes of inactivity"

  termination_conditions:
    - condition: "issue_completed"
      action: "Stop polling, proceed to Phase 5"
    - condition: "inactivity_timeout"
      duration: "20 minutes"
      action: "Stop polling, report timeout, proceed with available work"
    - condition: "batch_completed"
      action: "Stop polling, generate final summary"
    - condition: "no_blocked_issues"
      action: "Stop polling, proceed with development"

  steps:
    - action: poll_inbox
      description: "Check for new messages in team inbox"
      path: "dev_communication/messaging/*-to-{team}/"
      check_for:
        - "In-Response-To: field (indicates response)"
        - "Message type: RESPONSE"
      on_new_message: "Reset inactivity timer"

    - action: check_blocked_issues
      description: "Find issues with BLOCKED status"
      path: "dev_communication/issues/{team}/active/"
      look_for:
        - "Status: BLOCKED"
        - "Blocked-By: field"

    - action: match_and_unblock
      description: "Match responses to blocked issues"
      matching_criteria:
        - "In-Response-To matches sent message"
        - "Issue ID mentioned in response"
        - "Subject/topic correlation"
      on_match:
        - "Update issue status: BLOCKED → IN PROGRESS"
        - "Add response content to issue notes"
        - "Log: Unblocked {issue_id}"
        - "Reset inactivity timer"

    - action: check_termination
      description: "Evaluate whether to continue polling"
      continue_if:
        - "Active issue in progress"
        - "Inactivity < 20 minutes"
        - "Blocked issues awaiting responses"
      stop_if:
        - "Issue completed"
        - "Inactivity >= 20 minutes"
        - "No blocked issues remain"

    - action: report_results
      output: |
        ## Message Poll Results
        ### Polling Status
        - Last activity: {timestamp}
        - Inactivity: {minutes} min (timeout at 20 min)
        ### New Messages ({count})
        ### Unblocked Issues ({count})
        ### Still Blocked ({count})
```

### Phase 1: Context Loading

```yaml
context:
  steps:
    - action: check_comms
      description: "Check /comms for relevant API/UI messages"
      command: "Read dev_communication/messaging/{inbox}/"

    - action: load_memory
      description: "Load relevant patterns and context"
      command: |
        - Search memory/patterns/ for related patterns
        - Search memory/entities/ for related entities
        - Search memory/context/ for domain knowledge

    - action: identify_adrs
      description: "Identify applicable ADRs based on change type"
      lookup:
        new_endpoint: [ADR-API-001, ADR-DEV-001]
        new_component: [ADR-UI-001, ADR-DEV-001]
        new_feature: [ADR-DEV-001, domain_specific]
        bug_fix: [ADR-DEV-001]
        auth_change: [ADR-AUTH-001, ADR-SEC-001]

    - action: read_issue
      description: "Read and understand issue requirements"
      command: "Read issue file, extract acceptance criteria"
```

### Phase 2: Implementation

```yaml
implementation:
  steps:
    - action: plan
      description: "Create implementation plan if complex"
      condition: "issue.complexity > simple"

    - action: implement
      description: "Write code following patterns and ADRs"
      constraints:
        - "Follow patterns from /memory"
        - "Follow ADR conventions"
        - "Use existing abstractions"

    - action: update_types
      description: "Add/update TypeScript types"
      required: true
```

### Phase 3: Verification (MANDATORY)

```yaml
verification:
  blocking: true  # CANNOT proceed without passing
  steps:
    - action: type_check
      description: "TypeScript compilation"
      command: "npx tsc --noEmit"
      required_result: "0 errors"
      on_failure: "Fix all type errors before proceeding"

    - action: unit_tests
      description: "Run unit tests for changed code"
      command_ui: "npx vitest run {changed_test_files}"
      command_api: "npm run test:unit -- {changed_test_files}"
      required_result: "All tests pass"
      on_failure: "Fix failing tests or write missing tests"

    - action: integration_tests
      description: "Run integration tests for feature"
      command_ui: "npx vitest run --config vitest.integration.config.ts"
      command_api: "npm run test:integration"
      required_result: "All tests pass"
      on_failure: "Fix regressions before proceeding"

    - action: regression_check
      description: "Ensure no regressions introduced"
      verification: "Compare test results with baseline"
```

### Phase 4: Documentation

```yaml
documentation:
  steps:
    - action: update_memory
      description: "Store new patterns in /memory"
      condition: "new_pattern_discovered"
      command: "Use /memory skill to add pattern"

    - action: suggest_adr
      description: "Create ADR suggestion if architectural decision made"
      condition: "architectural_decision_made"
      command: "Use /adr suggest"

    - action: send_comms
      description: "Notify other team if cross-team impact"
      condition: "cross_team_impact"
      command: "Use /comms send"

    - action: update_issue
      description: "Add implementation notes to issue"
      required: true
```

### Phase 5: Completion

```yaml
completion:
  steps:
    - action: verify_acceptance
      description: "Check all acceptance criteria met"
      required: true

    - action: move_issue
      description: "Move issue to completed"
      command: "Use /comms move {issue_id} completed"

    - action: store_session
      description: "Store session state for compaction recovery"
      command: |
        Create memory/sessions/{date}-{issue-slug}.md with:
        - Issue ID and title
        - Files created/modified
        - Tests written
        - Patterns used/discovered
        - Pending items (if any)
```

## Quick Mode

For trivial changes (typos, comments, single-line fixes):

```yaml
quick_mode:
  enabled_for:
    - "Documentation updates"
    - "Comment changes"
    - "Single-line bug fixes"
    - "Typo corrections"

  skips:
    - integration_tests
    - memory_update
    - adr_suggestion

  requires:
    - type_check (must pass)
    - unit_tests (if test file exists)
```

## Team-Specific Configuration

### Portable Path Resolution

```yaml
# Auto-resolved based on team detection
{team}:
  inbox: "dev_communication/messaging/*-to-{team}/"
  outbox: "dev_communication/messaging/{team}-to-*/"
  issues: "dev_communication/issues/{team}/"
```

### UI Team

```yaml
ui:
  team_id: "ui"
  detection: "cwd contains 'cadencelms_ui'"

  test_commands:
    type_check: "npx tsc --noEmit"
    unit: "npx vitest run"
    integration: "npx vitest run --config vitest.integration.config.ts"
    e2e: "npx playwright test"

  # Resolved paths
  inbox: "dev_communication/messaging/api-to-ui/"
  outbox: "dev_communication/messaging/ui-to-api/"
  issues: "dev_communication/issues/ui/"
```

### API Team

```yaml
api:
  team_id: "api"
  detection: "cwd contains 'cadencelms_api'"

  test_commands:
    type_check: "npx tsc --noEmit"
    unit: "npm run test:unit"
    integration: "npm run test:integration"
    e2e: "npm run test:e2e"

  # Resolved paths
  inbox: "dev_communication/messaging/ui-to-api/"
  outbox: "dev_communication/messaging/api-to-ui/"
  issues: "dev_communication/issues/api/"
```

## Error Handling

```yaml
on_error:
  type_error:
    action: "Fix immediately, do not proceed"

  test_failure:
    action: "Analyze failure, fix code or test, re-run"

  regression:
    action: "Investigate, fix root cause, add regression test"

  context_compaction:
    action: "Store session state before compaction"
    template: "memory/templates/session-template.md"
```

## Usage Examples

```
User: "develop through all issues"
→ Processes all issues in queue using full lifecycle

User: "/develop API-ISS-022"
→ Processes single issue with full verification

User: "/develop quick src/services/userService.ts"
→ Quick mode for trivial change, minimal verification

User: "continue development"
→ Resumes from stored session state
```

---

[[../prompt-registry|← Back to Registry]]
