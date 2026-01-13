# Agent Coordination Standard

> **Joint UI ↔ API Communication Protocol**  
> Version 1.0 | Effective: 2026-01-12

---

## Overview

This document defines the standardized message format and workflow for coordination between UI and API agents during debugging, testing, and feature implementation.

---

## Directory Structure

```
agent_coms/
├── api/                    # API agent's working folder
│   └── drafts/             # Work-in-progress before posting
├── ui/                     # UI agent's working folder  
│   └── drafts/             # Work-in-progress before posting
└── messages/               # Shared message queue
    ├── COORDINATION_STANDARD.md   # This file
    ├── ACTIVE_THREADS.md          # Thread tracking index
    └── YYYY-MM-DD_HHmmss_<team>_<type>.md
```

**Rules:**
- Draft messages in your team folder (`api/` or `ui/`)
- Post finalized messages only to `messages/`
- Messages in `messages/` are immutable - create new responses, don't edit

---

## File Naming Convention

```
YYYY-MM-DD_HHmmss_<team>_<type>.md
```

**Examples:**
- `2026-01-12_143022_ui_request.md`
- `2026-01-12_144530_api_response.md`
- `2026-01-12_150000_ui_complete.md`

**Team:** `ui` | `api`

**Message Types:**

| Type       | Description                                      |
|------------|--------------------------------------------------|
| `request`  | Requesting action or information from other team |
| `response` | Responding to a request                          |
| `complete` | Signaling task completion, ready for handoff     |
| `error`    | Reporting a blocking error                       |
| `info`     | FYI - no action required                         |
| `waiting`  | Blocked, waiting on other team                   |

---

## Standard Message Template

```markdown
# [TYPE] - Brief Title

| Field       | Value                              |
|-------------|------------------------------------|
| From        | UI Agent / API Agent               |
| To          | API Agent / UI Agent               |
| Timestamp   | YYYY-MM-DD HH:mm:ss                |
| Priority    | low / medium / high / critical     |
| Status      | pending / in-progress / blocked / resolved |
| Thread ID   | THR-XXX or THR-CATEGORY-XXX        |

---

## Context

<!-- Brief description of current state, what led to this message -->

## Request / Information

<!-- What you need from the other team OR what you're reporting -->

## Technical Details

### Endpoint(s) Affected (if applicable)
| Method | Endpoint              | Status |
|--------|-----------------------|--------|
| POST   | /api/v2/example       | 500    |

### Error Details (if applicable)
```
<paste error message or stack trace>
```

### Request/Response Example (if applicable)
```json
// Request
{ }

// Response (actual)
{ }

// Response (expected)  
{ }
```

### Relevant Files
- `path/to/file.ts` - description
- `path/to/another.ts` - description

### Contract Changes (if applicable)
- `contracts/api/example.ts` - added/modified/removed

---

## Testing Status

| Test Type    | Status  | Notes                    |
|--------------|---------|--------------------------|
| Unit         | ✅ Pass  |                          |
| Integration  | ⚠️ Skip  | Waiting on other team    |
| E2E          | ❌ Fail  | Needs verification       |

---

## Action Required

- [ ] Specific task 1
- [ ] Specific task 2

## Response Requested
- [ ] Confirmation of receipt
- [ ] Fix confirmation
- [ ] Testing complete
- [ ] Contract review/approval
- [ ] Ready to continue

---

## Notes

<!-- Additional context, workarounds attempted, assumptions made -->
```

---

## Thread ID Convention

**Format:** `THR-XXX` (sequential) or `THR-CATEGORY-XXX`

**Categories:**
| Prefix        | Domain                          |
|---------------|---------------------------------|
| `THR-AUTH-`   | Authentication/authorization    |
| `THR-ENRL-`   | Enrollment                      |
| `THR-CRSE-`   | Course management               |
| `THR-USER-`   | User management                 |
| `THR-DATA-`   | Data/contract sync              |
| `THR-TEST-`   | Testing coordination            |

---

## Priority Levels

| Priority   | Response Time | Use Case                           |
|------------|---------------|------------------------------------|
| critical   | Immediate     | Production issue, system down      |
| high       | < 30 min      | Feature blocked, test failing      |
| medium     | < 2 hours     | Normal development flow            |
| low        | Next session  | Refactoring, documentation         |

---

## Workflow

### Starting Work
1. Check `messages/` for unresolved threads or new messages from other team
2. Review `messages/ACTIVE_THREADS.md` for context
3. Address pending items before starting new work

### Initiating Request
1. Draft in your team folder (`ui/` or `api/`)
2. Assign Thread ID (new or existing)
3. Post to `messages/` with timestamped filename
4. Update `ACTIVE_THREADS.md`

### Responding
1. Read the request thoroughly
2. Implement fixes or gather information
3. Post response with same Thread ID
4. Include verification steps for other team

### Signaling Completion
Post a `_complete.md` or `_waiting.md` message:

```markdown
# [COMPLETE] - Task Title

| Field       | Value              |
|-------------|--------------------|
| From        | <Your Team> Agent  |
| Timestamp   | YYYY-MM-DD HH:mm:ss|
| Thread ID   | THR-XXX            |
| Status      | resolved           |

## Completed Tasks
- [x] Task 1
- [x] Task 2

## Verification
- Tested: yes/no
- Build passing: yes/no
- Ready for next step: yes/no

## Next Steps
<!-- What happens next, or what the other agent should do -->
```

---

## Specialized Templates

### Contract Change Notification

```markdown
# [REQUEST] - Contract Update Required

| Field       | Value              |
|-------------|--------------------|
| From        | API Agent          |
| To          | UI Agent           |
| Timestamp   | YYYY-MM-DD HH:mm:ss|
| Priority    | high               |
| Thread ID   | THR-DATA-XXX       |

## Contract Changes

### File: `contracts/api/example.ts`

#### Added Types
```typescript
export interface NewType {
  field: string;
}
```

#### Modified Types
```typescript
// Before
export interface Example {
  id: string;
}

// After  
export interface Example {
  id: string;
  newField?: string; // NEW
}
```

#### Removed Types
- `OldTypeName` - replaced by `NewTypeName`

## Breaking Changes
- [ ] Yes - requires code changes
- [ ] No - backward compatible

## Migration Steps
1. Step one
2. Step two

## Action Required
- [ ] Acknowledge contract change
- [ ] Implement required updates
- [ ] Confirm tests passing
```

### Error Report

```markdown
# [ERROR] - Error Title

| Field       | Value              |
|-------------|--------------------|
| From        | <Team> Agent       |
| To          | <Other Team> Agent |
| Timestamp   | YYYY-MM-DD HH:mm:ss|
| Priority    | high/critical      |
| Thread ID   | THR-XXX            |

## Error Summary
One-line description

## Environment
- Branch: `feature/xyz`
- Last working commit: `abc1234`

## Full Error
```
Error: message
    at file.ts:123:45
```

## Reproduction Steps
1. Step one
2. Step two
3. Error occurs

## Expected Behavior
What should happen

## Actual Behavior
What is happening

## Investigation Done
- [x] Checked X
- [x] Verified Y
- [ ] Needs other team to check Z

## Suspected Cause
Hypothesis...

## Temporary Workaround (if any)
Description
```

### Waiting/Blocked Status

```markdown
# [WAITING] - Blocked on <Other Team>

| Field       | Value              |
|-------------|--------------------|
| From        | <Team> Agent       |
| To          | <Other Team> Agent |
| Timestamp   | YYYY-MM-DD HH:mm:ss|
| Priority    | high               |
| Thread ID   | THR-XXX            |
| Status      | blocked            |

## Changes Ready
- Change 1
- Change 2

## Verification Steps for Other Team
1. Step one
2. Step two
3. Confirm result

## Expected Behavior After Fix
Description

## Blocked Until
- [ ] Other team confirms fix works
- [ ] Other team reports any new errors

## Will Continue With
What this agent will do after unblocked
```

### Test Coordination

```markdown
# [INFO] - Test Suite Starting/Complete

| Field       | Value              |
|-------------|--------------------|
| From        | <Team> Agent       |
| Timestamp   | YYYY-MM-DD HH:mm:ss|
| Thread ID   | THR-TEST-XXX       |

## Test Plan / Results Summary
- Total: X tests
- Passed: Y
- Failed: Z

## Failed Tests (if any)
1. `test.spec.ts` - Line XX
   - Error: description
   - Needs: what other team should check

## Action Required
- [ ] Task for other team

## Next Steps
Description
```

---

## Active Thread Tracking

Maintain `messages/ACTIVE_THREADS.md`:

```markdown
# Active Threads

| Thread ID     | Started    | Topic              | Status      | Owner | Last Update |
|---------------|------------|--------------------|-------------|-------|-------------|
| THR-AUTH-001  | 2026-01-12 | Login 401 errors   | in-progress | API   | 14:30       |
| THR-ENRL-002  | 2026-01-12 | Enrollment flow    | blocked     | UI    | 15:00       |
| THR-DATA-003  | 2026-01-12 | Course contract    | resolved    | API   | 16:00       |

## Closed Threads (Last 7 Days)
| Thread ID     | Resolved   | Topic              | Resolution  |
|---------------|------------|--------------------|-------------|
| THR-TEST-001  | 2026-01-11 | E2E suite setup    | Complete    |
```

---

## Agent Checklists

### Before Posting Any Message
- [ ] Thread ID assigned/referenced
- [ ] Timestamp in filename matches content
- [ ] Clear action items with checkboxes
- [ ] Response type specified
- [ ] All relevant file paths included

### Before Starting Work Session
- [ ] Checked `messages/` for new messages
- [ ] Reviewed `ACTIVE_THREADS.md`
- [ ] Addressed pending items from other team

### When Responding
- [ ] Referenced original Thread ID
- [ ] Addressed all action items from request
- [ ] Included verification steps
- [ ] Specified what signals completion

### When Completing Thread
- [ ] Posted `_complete.md` message
- [ ] Updated `ACTIVE_THREADS.md` status
- [ ] Moved to closed threads if resolved

---

## Quick Reference

| I need to...                    | Use Type    | Priority  |
|---------------------------------|-------------|-----------|
| Ask other team to fix something | `request`   | high      |
| Answer a question               | `response`  | match     |
| Report I'm done                 | `complete`  | medium    |
| Report a blocking error         | `error`     | critical  |
| Share info, no action needed    | `info`      | low       |
| Say I'm waiting on other team   | `waiting`   | high      |
