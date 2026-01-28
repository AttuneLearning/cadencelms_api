# Coordination Hub

Central coordination point for supervisor agents managing API and UI teams.

## Team Status

| Team | Status | Current Focus | Blockers |
|------|--------|---------------|----------|
| API | [[api-team-status]] | - | - |
| UI | [[ui-team-status]] | - | - |

## Protocols

- [[supervisor-protocol]] - Architecture feedback loop and QA guidelines

## Cross-Team Dependencies

See [[dependencies]] for:
- Issues blocked by other team
- Shared timelines
- Integration points

---

## Supervisor Agent Instructions

### On Session Start

1. Read this index
2. Check your team's status file
3. Check [[dependencies]] for blockers
4. Check inbox for messages: `../messaging/{ui-to-api|api-to-ui}/`
5. Review issue queues: `../issues/{api|ui}/queue/`

### During Session

1. Update team status file when focus changes
2. Move issues through lifecycle (queue → active → completed)
3. Send messages for cross-team requests
4. Update dependencies when blockers change

### On Session End

1. Update team status with:
   - What was completed
   - What's in progress
   - Any blockers
2. Ensure all messages sent/received are processed
3. Update issue statuses

---

## Batch Processing Guide

### For Issue Batches

1. Review all issues in `queue/`
2. Prioritize by: Critical → High → Medium → Low
3. Check dependencies - don't start blocked issues
4. Move batch to `active/`
5. Process sequentially or parallelize if independent
6. Move to `completed/` as each finishes
7. Send completion message if cross-team

### For Message Processing

1. Poll inbox every 2-3 minutes
2. For each message:
   - If request → create issue in queue
   - If response → update related issue
   - If info → acknowledge and archive
3. Send responses for completed requests

---

## Communication Protocol

### Message Priority Response Times

| Priority | Max Response Time |
|----------|------------------|
| Critical | 5 minutes |
| High | 30 minutes |
| Medium | Same session |
| Low | Next session |

### Issue Handoff

When creating an issue for the other team:

1. Create issue in `issues/{other-team}/queue/`
2. Send message to `messaging/{your-team}-to-{other-team}/`
3. Reference the issue in the message
4. Update [[dependencies]]

---

## Current Sprint

**Sprint:** [Sprint name/number]
**Dates:** YYYY-MM-DD to YYYY-MM-DD
**Goals:**
1. [Goal 1]
2. [Goal 2]

---

[[../index|← Back to Hub]]
