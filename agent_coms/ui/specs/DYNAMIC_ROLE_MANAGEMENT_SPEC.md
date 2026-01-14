# Dynamic Role Management - Specification

**Status:** 📝 DRAFT - Awaiting Review  
**Author:** UI Agent  
**Date:** 2026-01-14  
**Proposed Issue:** ISS-021  
**Related Documents:** [COURSE_ROLE_FUNCTION_MATRIX.md](./COURSE_ROLE_FUNCTION_MATRIX.md)

---

## Overview

This specification defines a Settings UI for creating and managing custom roles with selectable capability assignments. This enables organizations to define roles beyond the built-in defaults to match their specific organizational needs.

---

## Goals

1. **Flexibility:** Allow organizations to create custom roles
2. **Granularity:** Enable fine-grained capability assignment
3. **Auditability:** Track role changes and who made them
4. **Safety:** Prevent accidental removal of critical permissions

---

## Built-in Roles (System Defaults)

These roles cannot be deleted but can be viewed:

| Role | Description | Modifiable |
|------|-------------|------------|
| `instructor` | Teaching and hosting | ❌ Capabilities locked |
| `content-admin` | Content creation/editing | ❌ Capabilities locked |
| `dept-admin` | Department governance | ❌ Capabilities locked |
| `billing-admin` | Financial management | ❌ Capabilities locked |
| `enrollment-admin` | Enrollment management | ❌ Capabilities locked |
| `system-admin` | Full system access | ❌ Capabilities locked |

---

## Custom Roles

Organizations can create custom roles with selected capabilities:

```typescript
interface CustomRole {
  id: string;
  name: string;                    // e.g., "Lead Instructor"
  description: string;             // Human-readable description
  capabilities: string[];          // Array of capability keys
  isBuiltIn: false;                // Always false for custom
  createdBy: string;               // User who created
  createdAt: Date;
  updatedAt: Date;
  departmentId: string | null;     // null = organization-wide
}
```

---

## Capability Registry

All available capabilities that can be assigned to roles:

### Course Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `course:view` | View course list and details | View |
| `course:preview` | Preview course content | View |
| `course:create` | Create new courses | Create |
| `course:edit` | Edit course metadata and content | Edit |
| `course:review` | Review courses for approval | Edit |
| `course:publish` | Publish courses | Publish |
| `course:unpublish` | Unpublish courses | Publish |
| `course:archive` | Archive courses | Lifecycle |
| `course:delete` | Delete courses | Lifecycle |
| `course:move` | Move courses between departments | Lifecycle |

### Module Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `module:create` | Create course modules | Create |
| `module:edit` | Edit modules | Edit |
| `module:delete` | Delete modules | Lifecycle |
| `content:upload` | Upload content files | Create |

### Teaching Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `class:host` | Host live class sessions | Teaching |
| `class:grade` | Grade student submissions | Teaching |
| `class:announce` | Send class announcements | Teaching |
| `class:roster:view` | View class roster | Teaching |
| `class:roster:manage` | Manage class roster | Teaching |

### Enrollment Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `enrollment:view` | View enrollment data | View |
| `enrollment:view:own-classes` | View enrollments for own classes | View |
| `enrollment:manage` | Manage enrollments | Admin |
| `learner:view` | View learner information | View |

### Financial Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `course:view:financial` | View course financial data | Finance |
| `revenue:view` | View revenue reports | Finance |
| `pricing:manage` | Manage course pricing | Finance |
| `payments:view` | View payment history | Finance |
| `payments:process` | Process payments | Finance |
| `refunds:process` | Process refunds | Finance |
| `financial-reports:view` | View financial reports | Finance |

### Staff Management Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `staff:view` | View staff in department | Admin |
| `staff:roles:edit` | Edit staff role assignments | Admin |
| `staff:invite` | Invite new staff | Admin |

### Department Capabilities

| Key | Description | Category |
|-----|-------------|----------|
| `subdepartment:view` | View subdepartments | View |
| `subdepartment:manage` | Create/edit subdepartments | Admin |
| `department:settings` | Manage department settings | Admin |

---

## UI Design

### Role Management Page

**Route:** `/admin/settings/roles`

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Role Management                    [+ Create Role]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BUILT-IN ROLES                                                 │
│  ─────────────                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔒 instructor                                    [View] │   │
│  │    Teaching and hosting courses                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔒 content-admin                                 [View] │   │
│  │    Content creation and editing                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔒 dept-admin                                    [View] │   │
│  │    Department governance                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ... (more built-in roles)                                      │
│                                                                 │
│  CUSTOM ROLES                                                   │
│  ────────────                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Lead Instructor                         [Edit] [🗑️] │   │
│  │    Senior instructor with content review access         │   │
│  │    Created by: admin@company.com                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 Content Reviewer                        [Edit] [🗑️] │   │
│  │    Review-only access to content                        │   │
│  │    Created by: admin@company.com                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [No custom roles yet? Create one to get started]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create/Edit Role Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Custom Role                                    [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Role Name *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Lead Instructor                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Senior instructor with content review capabilities      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  SELECT CAPABILITIES                                            │
│                                                                 │
│  ▼ Course Access                                                │
│    ☑️ course:view          View course list                     │
│    ☑️ course:preview       Preview course content               │
│    ☐ course:create        Create new courses                   │
│    ☐ course:edit          Edit course metadata                 │
│    ☑️ course:review        Review courses for approval          │
│    ☐ course:publish       Publish courses                      │
│    ☐ course:delete        Delete courses                       │
│                                                                 │
│  ▼ Teaching                                                     │
│    ☑️ class:host           Host live class sessions             │
│    ☑️ class:grade          Grade student submissions            │
│    ☑️ class:announce       Send announcements                   │
│    ☑️ class:roster:view    View class roster                    │
│    ☐ class:roster:manage  Manage roster                        │
│                                                                 │
│  ▶ Enrollment (collapsed)                                       │
│  ▶ Financial (collapsed)                                        │
│  ▶ Staff Management (collapsed)                                 │
│  ▶ Department (collapsed)                                       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  PREVIEW                                                        │
│  This role will be able to:                                     │
│  • View and preview courses                                     │
│  • Review courses for approval                                  │
│  • Host classes and grade students                              │
│  • View class rosters                                           │
│                                                                 │
│                               [Cancel]  [Create Role]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### View Built-in Role

```
┌─────────────────────────────────────────────────────────────────┐
│  View Role: instructor                          🔒 Built-in     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This is a built-in role. Its capabilities cannot be modified. │
│                                                                 │
│  CAPABILITIES INCLUDED                                          │
│                                                                 │
│  Course Access                                                  │
│    ✓ course:view          View course list                     │
│    ✓ course:preview       Preview course content               │
│                                                                 │
│  Teaching                                                       │
│    ✓ class:host           Host live class sessions             │
│    ✓ class:grade          Grade student submissions            │
│    ✓ class:announce       Send announcements                   │
│    ✓ class:roster:view    View class roster                    │
│                                                                 │
│  Enrollment                                                     │
│    ✓ enrollment:view:own-classes  View enrollments             │
│                                                                 │
│                                              [Close]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Role Management

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| `GET` | `/api/v2/roles` | List all roles | system-admin, dept-admin |
| `GET` | `/api/v2/roles/:id` | Get role details | system-admin, dept-admin |
| `POST` | `/api/v2/roles` | Create custom role | system-admin |
| `PUT` | `/api/v2/roles/:id` | Update custom role | system-admin |
| `DELETE` | `/api/v2/roles/:id` | Delete custom role | system-admin |
| `GET` | `/api/v2/capabilities` | List all capabilities | system-admin |

### Request/Response Examples

**Create Role:**
```typescript
// POST /api/v2/roles
{
  name: "Lead Instructor",
  description: "Senior instructor with content review access",
  capabilities: [
    "course:view",
    "course:preview",
    "course:review",
    "class:host",
    "class:grade",
    "class:announce",
    "class:roster:view"
  ],
  departmentId: null  // Organization-wide
}

// Response: 201 Created
{
  success: true,
  data: {
    id: "role-123",
    name: "Lead Instructor",
    description: "Senior instructor with content review access",
    capabilities: [...],
    isBuiltIn: false,
    createdBy: "user-456",
    createdAt: "2026-01-14T...",
    updatedAt: "2026-01-14T..."
  }
}
```

---

## Business Rules

### Role Creation
1. Role names must be unique within the organization
2. At least one capability must be selected
3. Custom roles can only be created by system-admin
4. Department-specific roles can be created by dept-admin

### Role Modification
1. Built-in roles cannot be modified
2. Custom roles can only be modified by system-admin or creator
3. Capability changes take effect immediately for all users with that role

### Role Deletion
1. Built-in roles cannot be deleted
2. Cannot delete a role that is currently assigned to users
3. Must reassign users before deletion, OR
4. Force-delete removes role from all users (requires confirmation)

### Safety Guards
1. Cannot create a role with `system-admin` capabilities without being system-admin
2. Warn when creating roles with financial capabilities
3. Audit log all role changes

---

## Database Schema

```typescript
// roles collection
interface Role {
  _id: ObjectId;
  name: string;
  slug: string;                  // URL-safe identifier
  description: string;
  capabilities: string[];
  isBuiltIn: boolean;
  isActive: boolean;             // Soft disable
  departmentId: ObjectId | null; // null = org-wide
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// capabilities collection (reference/documentation)
interface Capability {
  _id: ObjectId;
  key: string;                   // e.g., "course:view"
  name: string;                  // Display name
  description: string;
  category: string;              // For grouping in UI
  isDeprecated: boolean;
}

// role_audit_log collection
interface RoleAuditLog {
  _id: ObjectId;
  roleId: ObjectId;
  action: 'create' | 'update' | 'delete' | 'assign' | 'unassign';
  changes: object;               // What changed
  performedBy: ObjectId;
  performedAt: Date;
  ipAddress: string;
}
```

---

## Migration Path

### Phase 1: Database Updates
1. Create `roles` collection with built-in roles
2. Create `capabilities` collection with all capabilities
3. Migrate existing role assignments

### Phase 2: API Implementation
1. Implement role CRUD endpoints
2. Update permission checking to use capability lookup
3. Implement audit logging

### Phase 3: UI Implementation
1. Build role management page
2. Build role editor with capability selection
3. Update staff role assignment UI

---

## Acceptance Criteria

### Role Management UI
- [ ] View list of all roles (built-in and custom)
- [ ] View capabilities for any role
- [ ] Create new custom role with selected capabilities
- [ ] Edit custom role name, description, capabilities
- [ ] Delete custom role (with user reassignment)
- [ ] Search/filter roles

### Capability Selection
- [ ] Grouped capability checkboxes
- [ ] Select all / deselect all per group
- [ ] Preview of effective permissions
- [ ] Validation (at least one capability required)

### Built-in Role Protection
- [ ] Cannot modify built-in role capabilities
- [ ] Cannot delete built-in roles
- [ ] Clear visual distinction (lock icon)

### Audit & Safety
- [ ] Confirmation dialog for destructive actions
- [ ] Audit log of all role changes
- [ ] Warning for financial capabilities

---

## Future Considerations

1. **Role Templates:** Pre-built capability sets for common roles
2. **Role Cloning:** Clone existing role as starting point
3. **Capability Dependencies:** Some capabilities require others
4. **Time-Limited Roles:** Roles that expire after a period
5. **Department-Specific Roles:** Roles that only exist within one department

---

**END OF SPECIFICATION**

*This specification should be reviewed and approved before creating ISS-021.*
