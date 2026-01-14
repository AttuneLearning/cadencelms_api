a# Course Management Role-Function Matrix

**Status:** ✅ APPROVED  
**Author:** UI Agent  
**Date:** 2026-01-14  
**Approved:** 2026-01-14  
**Related Documents:** 
- [CONTENT_ADMIN_FLOW_DESIGN.md](./CONTENT_ADMIN_FLOW_DESIGN.md)
- [DYNAMIC_ROLE_MANAGEMENT_SPEC.md](./DYNAMIC_ROLE_MANAGEMENT_SPEC.md) (Future: ISS-021)

---

## Overview

This document defines the **additive role model** for course management operations. Roles are NOT hierarchical - each role grants specific, independent capabilities. Users can have multiple roles in their array to combine capabilities.

---

## Core Principle: Additive Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADDITIVE ROLE MODEL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Roles are INDEPENDENT, not hierarchical                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  instructor  │  │content-admin │  │  dept-admin  │          │
│  │              │  │              │  │              │          │
│  │  • View      │  │  • View      │  │  • View      │          │
│  │  • Teach     │  │  • Create    │  │  • Publish   │          │
│  │  • Host      │  │  • Edit      │  │  • Archive   │          │
│  │              │  │  • Review    │  │  • Delete    │          │
│  │              │  │              │  │  • Roles Mgmt│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  User roles: ["instructor", "content-admin"]                   │
│  = VIEW + TEACH + HOST + CREATE + EDIT + REVIEW                │
│                                                                 │
│  User roles: ["dept-admin"]                                    │
│  = VIEW + PUBLISH + ARCHIVE + DELETE + ROLES MGMT              │
│  ≠ CREATE, EDIT (would need content-admin role too)            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  DEDUPLICATION: When a user has multiple roles, capabilities   │
│  are MERGED into a Set (no duplicates). Example:               │
│                                                                 │
│  roles: ["instructor", "content-admin"]                        │
│  instructor  → [view, teach, grade]                            │
│  content-admin → [view, create, edit]                          │
│  ───────────────────────────────────                           │
│  RESULT → Set { view, teach, grade, create, edit }             │
│           ("view" appears once, not twice)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role Definitions

| Role | Primary Purpose | Key Capabilities |
|------|-----------------|------------------|
| **instructor** | Teach and host courses | View, Teach, Host classes |
| **content-admin** | Create and edit content | View, Create, Edit, Review content |
| **dept-admin** | Department governance | View, Publish, Archive, Delete, Manage staff roles |
| **billing-admin** | Financial management | Financial data access, Revenue reports |
| **enrollment-admin** | Enrollment management | View courses, Manage learner enrollments, Classes |

---

## Data Model

```typescript
// User's roles per department (additive array)
interface UserDepartmentRoles {
  [departmentId: string]: string[];  // Array of role names
}

// Example user
const user = {
  id: "user-123",
  userType: "staff",
  departmentRoles: {
    "dept-marketing": ["instructor"],
    "dept-training": ["instructor", "content-admin"],
    "dept-it": ["instructor", "content-admin", "dept-admin"],
    "dept-finance": ["billing-admin"]
  }
};
```

---

## Function-Role Matrix

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Has capability |
| ❌ | Does NOT have capability |
| 🔵 | Conditional (see notes) |

---

### Course Viewing

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| View course list | ✅ | ✅ | ✅ | ✅ | ✅ | billing: for revenue reports |
| View course details | ✅ | ✅ | ✅ | ✅ | ✅ | billing: for revenue reports |
| View course modules | ✅ | ✅ | ✅ | ❌ | ❌ | |
| Preview course content | ✅ | ✅ | ✅ | ❌ | ❌ | |
| View course analytics | ✅ | ✅ | ✅ | ✅ | ✅ | Different views per role |

---

### Course Creation & Editing

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| Create new course | ❌ | ✅ | ❌ | ❌ | ❌ | content-admin ONLY |
| Edit course metadata | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Edit course modules | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Create modules | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Upload content | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Reorder modules | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Review content | ❌ | ✅ | ❌ | ❌ | ❌ | Pre-publish review |

---

### Course Publishing & Lifecycle

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| Submit for approval | ❌ | ✅ | ❌ | ❌ | ❌ | content-admin submits |
| Approve for publish | ❌ | ❌ | ✅ | ❌ | ❌ | dept-admin approves |
| Publish course | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Unpublish course | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Archive course | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Delete course | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Move to subdepartment | ❌ | ❌ | ✅ | ❌ | ❌ | |

---

### Teaching & Hosting

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| Be assigned as instructor | ✅ | ❌ | ❌ | ❌ | ❌ | instructor role required |
| Host live class | ✅ | ❌ | ❌ | ❌ | ❌ | |
| Grade submissions | ✅ | ❌ | ❌ | ❌ | ❌ | |
| Override/edit grades | ❌ | ❌ | ✅ | ❌ | ❌ | **Requires change log** |
| Manage class roster | ✅ | ❌ | ❌ | ❌ | ✅ | enrollment-admin for bulk ops |
| Send class announcements | ✅ | ❌ | ❌ | ❌ | ❌ | |

---

### Enrollment Management

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| View enrolled learners | ✅ | ❌ | ✅ | ❌ | ✅ | instructor: own classes only |
| Enroll learners | ❌ | ❌ | ✅ | ❌ | ✅ | |
| Unenroll learners | ❌ | ❌ | ✅ | ❌ | ✅ | |
| Manage class sessions | ❌ | ❌ | ✅ | ❌ | ✅ | Scheduled course groups |
| View enrollment reports | ✅ | ❌ | ✅ | ❌ | ✅ | instructor: own classes |

---

### Financial Functions

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| View course revenue | ❌ | ❌ | ❌ | ✅ | ❌ | billing-admin ONLY |
| View financial reports | ❌ | ❌ | ❌ | ✅ | ❌ | |
| Set course pricing | ❌ | ❌ | ❌ | ✅ | ❌ | |
| Manage payment settings | ❌ | ❌ | ❌ | ✅ | ❌ | |
| Process refunds | ❌ | ❌ | ❌ | ✅ | ❌ | |
| View payment history | ❌ | ❌ | ❌ | ✅ | ❌ | |

---

### Department Administration

| Function | instructor | content-admin | dept-admin | billing-admin | enrollment-admin | Notes |
|----------|------------|---------------|------------|---------------|------------------|-------|
| View staff in department | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Edit staff roles array | ❌ | ❌ | ✅ | ❌ | ❌ | Add/remove roles for staff |
| Create subdepartment | ❌ | ❌ | ✅ | ❌ | ❌ | |
| Manage subdepartments | ❌ | ❌ | ✅ | ❌ | ❌ | |
| View department analytics | ❌ | ❌ | ✅ | ✅ | ✅ | Different data per role |

---

## UI Route Access Matrix

| Route | instructor | content-admin | dept-admin | billing-admin | enrollment-admin |
|-------|------------|---------------|------------|---------------|------------------|
| `/staff/courses` (list) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/staff/courses/create` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/staff/courses/:id` (view) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/staff/courses/:id/edit` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/staff/courses/:id/modules` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/staff/courses/:id/publish` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/staff/courses/:id/revenue` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/staff/courses/:id/enrollments` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `/staff/classes` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `/staff/classes/:id/roster` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `/staff/department/staff` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/staff/department/settings` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/staff/financials` | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Sidebar Link Visibility

Based on roles in the currently selected department:

| Link | Required Role(s) | Notes |
|------|------------------|-------|
| Manage Courses | content-admin OR dept-admin | View/edit vs publish control |
| My Classes | instructor | Teaching assignments |
| Enrollments | enrollment-admin OR dept-admin | Learner management |
| Financials | billing-admin | Revenue/billing only |
| Department Settings | dept-admin | Staff roles, subdepts |

---

## Common Role Combinations

| User Type | Typical Roles | Capabilities |
|-----------|--------------|--------------|
| **Teacher** | `["instructor"]` | View, Teach, Host, Grade |
| **Content Creator** | `["content-admin"]` | View, Create, Edit, Review |
| **Lead Instructor** | `["instructor", "content-admin"]` | All teaching + content creation |
| **Department Head** | `["instructor", "content-admin", "dept-admin"]` | Full department control |
| **Department Manager** (non-teaching) | `["dept-admin"]` | Publish, Archive, Manage staff |
| **Curriculum Designer** | `["content-admin"]` | Content only, no teaching |
| **Finance Officer** | `["billing-admin"]` | Financial access only |
| **Registrar** | `["enrollment-admin"]` | Enrollment management |
| **Admin Assistant** | `["enrollment-admin", "content-admin"]` | Enrollments + content support |

---

## Content Lifecycle Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COURSE LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │  content-admin   │
  │  creates course  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  content-admin   │
  │  edits & reviews │  ◄──── Can loop here
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  content-admin   │
  │  submits for     │
  │  approval        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  dept-admin      │     │  dept-admin      │
  │  reviews         │────►│  requests        │───► Back to Edit
  └────────┬─────────┘     │  changes         │
           │               └──────────────────┘
           ▼
  ┌──────────────────┐
  │  dept-admin      │
  │  PUBLISHES       │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  instructor      │
  │  teaches course  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  dept-admin      │
  │  archives when   │
  │  complete        │
  └──────────────────┘
```

---

## Separation of Concerns

### Why billing-admin is separate:

```
┌─────────────────────────────────────────────────────────────────┐
│  SEPARATION OF CONCERNS: CONTENT vs FINANCE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Content Roles                    Finance Roles                 │
│  ─────────────                    ─────────────                 │
│  • instructor                     • billing-admin               │
│  • content-admin                                                │
│  • dept-admin                                                   │
│  • enrollment-admin                                             │
│                                                                 │
│  Cannot access:                   Cannot access:                │
│  • Revenue data                   • Course content              │
│  • Pricing settings               • Module editing              │
│  • Payment processing             • Publishing                  │
│  • Financial reports              • Teaching                    │
│                                                                 │
│  This prevents:                                                 │
│  • Content creators seeing revenue                              │
│  • Finance staff modifying content                              │
│  • SOX/audit compliance issues                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Permission Check Implementation

```typescript
// Role capability mapping (can be stored in DB for dynamic management)
const ROLE_CAPABILITIES: Record<string, string[]> = {
  'instructor': [
    'course:view',
    'course:preview',
    'course:teach',
    'class:host',
    'class:grade',
    'class:roster:view',
    'class:announce',
    'enrollment:view:own-classes'
  ],
  'content-admin': [
    'course:view',
    'course:preview',
    'course:create',
    'course:edit',
    'course:review',
    'module:create',
    'module:edit',
    'module:delete',
    'content:upload'
  ],
  'dept-admin': [
    'course:view',
    'course:preview',
    'course:publish',
    'course:unpublish',
    'course:archive',
    'course:delete',
    'course:move',
    'grade:override',       // Can edit student grades (change log required)
    'enrollment:view',
    'enrollment:manage',
    'staff:view',
    'staff:roles:edit',
    'subdepartment:manage'
  ],
  'billing-admin': [
    'course:view',          // Can view courses for revenue reports
    'revenue:view',
    'pricing:manage',
    'payments:view',
    'payments:process',
    'refunds:process',
    'financial-reports:view'
  ],
  'enrollment-admin': [
    'course:view',
    'enrollment:view',
    'enrollment:manage',
    'class:manage',
    'learner:view'
  ]
};

/**
 * Check if user has a specific capability in a department
 */
function hasCapability(
  user: User,
  departmentId: string,
  capability: string
): boolean {
  const userRoles = user.departmentRoles?.[departmentId] ?? [];
  
  return userRoles.some(role => 
    ROLE_CAPABILITIES[role]?.includes(capability)
  );
}

/**
 * Get all capabilities for a user in a department
 */
function getUserCapabilities(
  user: User,
  departmentId: string
): string[] {
  const userRoles = user.departmentRoles?.[departmentId] ?? [];
  
  const capabilities = new Set<string>();
  userRoles.forEach(role => {
    ROLE_CAPABILITIES[role]?.forEach(cap => capabilities.add(cap));
  });
  
  return Array.from(capabilities);
}
```

---

## API Backend Requirements

| Endpoint | Required Capability | Notes |
|----------|---------------------|-------|
| `GET /courses` | `course:view` | All except billing-admin |
| `POST /courses` | `course:create` | content-admin only |
| `PUT /courses/:id` | `course:edit` | content-admin only |
| `DELETE /courses/:id` | `course:delete` | dept-admin only |
| `POST /courses/:id/publish` | `course:publish` | dept-admin only |
| `GET /courses/:id/revenue` | `revenue:view` | billing-admin only |
| `PUT /staff/:id/roles` | `staff:roles:edit` | dept-admin only |
| `GET /enrollments` | `enrollment:view` | dept-admin, enrollment-admin |
| `POST /enrollments` | `enrollment:manage` | dept-admin, enrollment-admin |

---

## Future: Dynamic Role Management

A future feature (ISS-021) will allow:
- Creating custom roles with selected capabilities
- Editing capability assignments for roles
- Settings UI for role management

See: [DYNAMIC_ROLE_MANAGEMENT_SPEC.md](./DYNAMIC_ROLE_MANAGEMENT_SPEC.md)

---

## Summary Table

| Capability | instructor | content-admin | dept-admin | billing-admin | enrollment-admin |
|------------|:----------:|:-------------:|:----------:|:-------------:|:----------------:|
| **View Courses** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Courses** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Edit Courses** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Publish Courses** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Delete/Archive** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Teach/Host** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Grade Students** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Override Grades** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Manage Enrollments** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **View Financials** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Manage Staff Roles** | ❌ | ❌ | ✅ | ❌ | ❌ |

---

**END OF DOCUMENT**

*This matrix should be reviewed and approved before implementation.*
