# Content Admin User Flow - Design Document

**Status:** 📝 DRAFT - Awaiting Final Review  
**Author:** UI Agent  
**Date:** 2026-01-14  
**Related Issues:** ISS-019, ISS-020  
**Related Documents:** [COURSE_ROLE_FUNCTION_MATRIX.md](./COURSE_ROLE_FUNCTION_MATRIX.md) - Detailed role-to-function permission matrix

---

## Overview

This document defines the user flow for content-admin access to course management tools. The core principle is:

> **All staff see "Manage Courses" in the sidebar, but it remains disabled until a department is SELECTED and the user has `content-admin` role in THAT SPECIFIC department.**

---

## ⚠️ Critical Behavior Note

The "Manage Courses" link activation depends on **TWO conditions**:

1. **A department must be actively selected** (via department dropdown/context)
2. **User must have `content-admin` role in THAT selected department**

```
┌─────────────────────────────────────────────────────────────────┐
│                     LINK ACTIVATION LOGIC                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IF (no department selected)                                    │
│      → DISABLED (greyed, not clickable)                         │
│                                                                 │
│  ELSE IF (department selected BUT user lacks content-admin)     │
│      → DISABLED (greyed, not clickable)                         │
│                                                                 │
│  ELSE IF (department selected AND user has content-admin)       │
│      → ENABLED (clickable, navigates to /staff/courses)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key distinction:** This is NOT "has content-admin in ANY department". The user must have content-admin in the **CURRENTLY SELECTED** department context.

---

## 1. Permission Model Recap

From ISS-017's two-level architecture:

```
LEVEL 1: userTypes → Dashboard access
  • learner → Learner Dashboard
  • staff → Staff Dashboard  
  • global-admin → Staff + Admin Dashboard

LEVEL 2: Department Roles → Feature access
  • content-admin → Course creation/editing within department
  • instructor → Teaching within department
  • dept-admin → Department management
```

**Key insight:** A user can be `staff` but have NO department roles (new hire, not yet assigned).

---

## 2. "Manage Courses" Link States

### State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    "Manage Courses" Link                        │
└─────────────────────────────────────────────────────────────────┘

                    No Department Selected
                            │
                            ▼
                    ┌──────────────┐
                    │   DISABLED   │
                    │  (grayed)    │
                    └──────────────┘
                            │
        User selects department ──────────────────┐
                            │                     │
                            ▼                     ▼
            ┌──────────────────────┐    ┌──────────────────────┐
            │ Has content-admin    │    │ NO content-admin     │
            │ in selected dept?    │    │ in selected dept?    │
            └──────────────────────┘    └──────────────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐      ┌──────────────┐
                    │    ACTIVE    │      │   DISABLED   │
                    │  (clickable) │      │  (grayed)    │
                    └──────────────┘      └──────────────┘
```

### Visual States

| Condition | Appearance | Click Behavior |
|-----------|------------|----------------|
| **No department selected** | Grayed out, muted icon | Not clickable (no action) |
| **Dept selected, no content-admin** | Grayed out, muted icon | Not clickable (no action) |
| **Dept selected, has content-admin** | Normal color, full opacity | Navigate to `/staff/courses` |

**Note:** Disabled state has NO click action - not even a toast or error message.

---

## 3. User Flow Scenarios

### Scenario A: Staff with NO department selected

```
┌─────────────────────────────────────────────────────────────────┐
│  Sarah - Staff Member                                           │
│  userType: staff                                                │
│  Departments: IT (content-admin), Marketing (instructor)        │
│  Currently Selected Department: NONE                            │
└─────────────────────────────────────────────────────────────────┘

Sarah's Sidebar:
┌─────────────────────────┐
│ Department: [Select ▼]  │  ← No department selected
├─────────────────────────┤
│ ✓ Dashboard             │
│ ✓ My Profile            │
│ ⚪ My Progress (learner) │
│ ⚪ Certificates (learner)│
├─────────────────────────┤
│ ✓ My Classes            │
│ ⚫ Manage Courses        │  ← DISABLED (no dept selected)
│ ✓ Calendar              │
└─────────────────────────┘

When Sarah clicks "Manage Courses":
  → Nothing happens (not clickable)
```

### Scenario B: Staff selects department WITHOUT content-admin role

```
┌─────────────────────────────────────────────────────────────────┐
│  Sarah - Staff Member                                           │
│  userType: staff                                                │
│  Departments: IT (content-admin), Marketing (instructor)        │
│  Currently Selected Department: Marketing                       │
└─────────────────────────────────────────────────────────────────┘

Sarah's Sidebar:
┌─────────────────────────┐
│ Department: [Marketing▼]│  ← Marketing selected (only instructor)
├─────────────────────────┤
│ ✓ Dashboard             │
│ ✓ My Profile            │
│ ⚪ My Progress (learner) │
│ ⚪ Certificates (learner)│
├─────────────────────────┤
│ ✓ My Classes            │
│ ⚫ Manage Courses        │  ← DISABLED (no content-admin in Marketing)
│ ✓ Calendar              │
└─────────────────────────┘

When Sarah clicks "Manage Courses":
  → Nothing happens (not clickable)
```

### Scenario C: Staff selects department WITH content-admin role

```
┌─────────────────────────────────────────────────────────────────┐
│  Sarah - Staff Member                                           │
│  userType: staff                                                │
│  Departments: IT (content-admin), Marketing (instructor)        │
│  Currently Selected Department: IT                              │
└─────────────────────────────────────────────────────────────────┘

Sarah's Sidebar:
┌─────────────────────────┐
│ Department: [IT ▼]      │  ← IT selected (has content-admin)
├─────────────────────────┤
│ ✓ Dashboard             │
│ ✓ My Profile            │
│ ⚪ My Progress (learner) │
│ ⚪ Certificates (learner)│
├─────────────────────────┤
│ ✓ My Classes            │
│ ✓ Manage Courses        │  ← ACTIVE (has content-admin in IT)
│ ✓ Calendar              │
└─────────────────────────┘

When Sarah clicks "Manage Courses":
  → Navigate to /staff/courses
  → Shows IT department courses only
  → Can create, edit, delete courses
```

### Scenario D: Instructor View (View-Only Access)

```
┌─────────────────────────────────────────────────────────────────┐
│  Mike - Instructor Only                                         │
│  userType: staff                                                │
│  Departments: Marketing (instructor only)                       │
│  Currently Selected Department: Marketing                       │
└─────────────────────────────────────────────────────────────────┘

Mike's Sidebar:
┌─────────────────────────┐
│ Department: [Marketing▼]│
├─────────────────────────┤
│ ✓ Dashboard             │
│ ✓ My Profile            │
├─────────────────────────┤
│ ✓ My Classes            │  ← Shows courses Mike is assigned to teach
│ ⚫ Manage Courses        │  ← DISABLED (instructor ≠ content-admin)
│ ✓ Calendar              │
└─────────────────────────┘

HOWEVER, if Mike navigates to a course he's assigned to:
  → CAN VIEW course details, modules, content
  → CANNOT edit, create, or delete
  → Read-only access to courses he teaches
```

### Scenario E: Global Admin

```
┌─────────────────────────────────────────────────────────────────┐
│  Alex - Global Admin                                            │
│  userType: global-admin                                         │
│  Departments: Master Department (system-admin)                  │
│  Currently Selected Department: Master Department (or any)      │
└─────────────────────────────────────────────────────────────────┘

Alex's Sidebar (Staff Dashboard):
┌─────────────────────────┐
│ Department: [Any Dept▼] │  ← Any department or Master Dept
├─────────────────────────┤
│ ✓ Dashboard             │
│ ✓ My Profile            │
│ ✓ Manage Courses        │  ← ALWAYS ACTIVE (system-admin)
│ ✓ Calendar              │
└─────────────────────────┘

System-admin role grants content-admin equivalent in ALL departments.
```

---

## 4. Navigation Implementation

### navItems.ts Changes

```typescript
// In STAFF_NAV_ITEMS

{
  label: 'Manage Courses',
  path: '/staff/courses',
  icon: BookOpen,
  
  // NEW: Department-context-aware activation
  requiresDepartmentRole: 'content-admin',
  
  // Determines if link is active based on SELECTED department
  isActive: (user: User, selectedDepartmentId: string | null) => {
    // No department selected = disabled
    if (!selectedDepartmentId) return false;
    
    // System-admin always has access
    if (hasRoleInDepartment(user, selectedDepartmentId, 'system-admin')) return true;
    
    // Check if user has content-admin in the SELECTED department
    return hasRoleInDepartment(user, selectedDepartmentId, 'content-admin');
  },
}
```

### Helper Functions

```typescript
// src/shared/lib/permissions/hasRoleInDepartment.ts

/**
 * Check if user has a specific role in a specific department
 */
export function hasRoleInDepartment(
  user: User,
  departmentId: string,
  role: string
): boolean {
  if (!user.departmentRoles) return false;
  
  const rolesInDept = user.departmentRoles[departmentId];
  return rolesInDept?.includes(role) ?? false;
}

/**
 * Check if user has content-admin in the currently selected department
 */
export function canManageCoursesInDepartment(
  user: User,
  selectedDepartmentId: string | null
): boolean {
  if (!selectedDepartmentId) return false;
  
  return hasRoleInDepartment(user, selectedDepartmentId, 'content-admin') ||
         hasRoleInDepartment(user, selectedDepartmentId, 'system-admin');
}

// Example user.departmentRoles structure:
// {
//   "dept-123": ["content-admin", "instructor"],
//   "dept-456": ["instructor"]
// }
```

### Department Context Integration

```typescript
// The sidebar must have access to the selected department context

function Sidebar() {
  const { user } = useAuth();
  const { selectedDepartmentId } = useDepartmentContext();
  
  // Pass context to nav item rendering
  return (
    <nav>
      {navItems.map(item => (
        <NavItem
          key={item.path}
          item={item}
          isActive={item.isActive?.(user, selectedDepartmentId) ?? true}
        />
      ))}
    </nav>
  );
}
```

---

## 5. StaffCoursesPage Behavior

### Department-Scoped View

When a user navigates to `/staff/courses`, they see courses ONLY from the currently selected department:

```typescript
// /staff/courses page behavior

function StaffCoursesPage() {
  const { user } = useAuth();
  const { selectedDepartmentId } = useDepartmentContext();
  
  // If no department selected or no permission, redirect
  useEffect(() => {
    if (!canManageCoursesInDepartment(user, selectedDepartmentId)) {
      navigate('/staff/dashboard');
    }
  }, [selectedDepartmentId, user]);
  
  // Fetch courses for the selected department only
  const { data: courses } = useCourses({
    departmentId: selectedDepartmentId,
  });
  
  // ...
}
```

### Instructor View-Only Mode

Instructors can VIEW courses they're assigned to, but cannot edit:

```typescript
function CourseDetailPage({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { data: course } = useCourse(courseId);
  
  // Determine access level
  const canEdit = canManageCoursesInDepartment(user, course.departmentId);
  const canView = canEdit || isInstructorForCourse(user, courseId);
  
  if (!canView) {
    return <AccessDenied />;
  }
  
  return (
    <CourseDetail
      course={course}
      readOnly={!canEdit}  // Instructors get read-only view
    />
  );
}
```

### Create Course Flow (Single Department Context)

Since a department is already selected, course creation is simpler:

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Create Course"                                    │
│  (Department already selected: "Marketing")                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌────────────────────────┐
                │ Open CourseEditorPage  │
                │ /staff/courses/create  │
                │                        │
                │ Department: Marketing  │  ← Pre-filled from context
                │ (read-only field)      │
                └────────────────────────┘
```

### Remember Last Department Choice

When user returns to the app, restore their last selected department:

```typescript
// Store in localStorage
const LAST_DEPT_KEY = 'cadencelms:lastDepartmentId';

function useDepartmentContext() {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(
    () => localStorage.getItem(LAST_DEPT_KEY)
  );
  
  const selectDepartment = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    localStorage.setItem(LAST_DEPT_KEY, deptId);
  };
  
  return { selectedDepartmentId, selectDepartment };
}
```

---

## 6. UI Mockups

### No Department Selected

```
┌─ Staff Sidebar ────────────────────────────────────┐
│                                                     │
│  Department: [Select department ▼]  ← NONE SELECTED │
│                                                     │
│  ─────────────────────                              │
│                                                     │
│  📊 Dashboard                                       │
│  👤 My Profile                                      │
│  📈 My Progress            (grayed - no learner)    │
│  🏆 Certificates           (grayed - no learner)    │
│                                                     │
│  ─────────────────────                              │
│                                                     │
│  📚 My Classes                                      │
│  📖 Manage Courses         ← GRAYED (no dept)       │
│  📅 Calendar                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Department Selected - NO content-admin Role

```
┌─ Staff Sidebar ────────────────────────────────────┐
│                                                     │
│  Department: [Marketing ▼]  ← Selected, but only   │
│                               instructor role       │
│  ─────────────────────                              │
│                                                     │
│  📊 Dashboard                                       │
│  👤 My Profile                                      │
│  📈 My Progress            (grayed - no learner)    │
│  🏆 Certificates           (grayed - no learner)    │
│                                                     │
│  ─────────────────────                              │
│                                                     │
│  📚 My Classes                                      │
│  📖 Manage Courses         ← GRAYED (no role)       │
│  📅 Calendar                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Department Selected - HAS content-admin Role

```
┌─ Staff Sidebar ────────────────────────────────────┐
│                                                     │
│  Department: [IT ▼]  ← Selected, HAS content-admin  │
│                                                     │
│  ─────────────────────                              │
│                                                     │
│  📊 Dashboard                                       │
│  👤 My Profile                                      │
│  📈 My Progress            (grayed - no learner)    │
│  🏆 Certificates           (grayed - no learner)    │
│                                                     │
│  ─────────────────────                              │
│                                                     │
│  📚 My Classes                                      │
│  📖 Manage Courses  ✓      ← ACTIVE, CLICKABLE     │
│  📅 Calendar                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### StaffCoursesPage - Department-Scoped View

```
┌─────────────────────────────────────────────────────────────────┐
│  Manage Courses                              [+ Create Course]  │
│  Department: IT                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Showing courses in IT department                               │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │ 📚 Course 1      │  │ 📚 Course 2      │  │ 📚 Course 3    ││
│  │ IT Department    │  │ IT Department    │  │ IT Department  ││
│  │ Draft • 3 modules│  │ Published        │  │ Draft          ││
│  │ [Edit] [Preview] │  │ [Edit] [Preview] │  │ [Edit]         ││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
│                                                                 │
│  To manage courses in other departments, select a different     │
│  department from the dropdown above.                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Edge Cases

### Edge Case 1: Department Changed While on Manage Courses Page

```
User is on /staff/courses with IT department selected
User switches department dropdown to "Marketing" (no content-admin)

→ Immediate redirect to /staff/dashboard
→ "Manage Courses" link becomes disabled
→ No error message (just seamless redirect)
```

### Edge Case 2: Role Removed While on Page

```
User is on /staff/courses with IT department selected
Admin removes their content-admin role from IT
Next API call returns 403

→ Redirect to /staff/dashboard
→ "Manage Courses" link becomes disabled
```

### Edge Case 3: Direct URL Access Without Permission

```
User manually types /staff/courses in browser
But no department is selected OR no content-admin role

→ Redirect to /staff/dashboard (or show "select a department" message)
```

### Edge Case 4: Instructor Accessing Course Detail

```
User has:
  - Marketing: ['instructor']  ← Assigned to teach Course A

User navigates to /staff/courses/course-a:
  → CAN view course details (read-only)
  → CANNOT see Edit button
  → CANNOT see Delete button
  → CAN see Preview button
  → CANNOT access /staff/courses (the list page)
```

### Edge Case 5: Last Selected Department No Longer Accessible

```
User's last selected department was "IT"
User's IT membership is removed by admin
User logs back in

→ localStorage has "IT" stored
→ Validate on load: user no longer in IT
→ Clear stored value
→ Show "Select a department" state
```

---

## 8. API Requirements

### Endpoint: GET /courses (filtered)

```typescript
// Request
GET /api/v2/courses?departments=dept-123,dept-456&manageable=true

// Response
{
  success: true,
  data: {
    courses: [...],  // Only courses user can manage
    pagination: {...}
  }
}
```

The backend MUST filter based on:
1. User's content-admin role memberships
2. OR system-admin role (returns all)

### Endpoint: POST /courses (with department)

```typescript
// Request
POST /api/v2/courses
{
  title: "New Course",
  departmentId: "dept-123",  // REQUIRED
  // ...
}

// Backend validates:
// - User has content-admin role in dept-123
// - OR user has system-admin role
```

---

## 9. Implementation Checklist

### Phase 1: Navigation State (Part of ISS-020)
- [ ] Update nav items to use department context for activation
- [ ] Create `hasRoleInDepartment()` helper
- [ ] Create `canManageCoursesInDepartment()` helper
- [ ] Update NavItem component to handle disabled state (not clickable)
- [ ] Ensure disabled links have no click handler

### Phase 2: StaffCoursesPage Updates
- [ ] Filter courses by selected department only
- [ ] Redirect if department context lost/changed
- [ ] Implement read-only mode for instructors
- [ ] Pre-fill department on course creation

### Phase 3: Department Context Persistence
- [ ] Store last selected department in localStorage
- [ ] Restore on app load
- [ ] Validate stored department is still accessible
- [ ] Clear if user no longer has access

### Phase 4: Instructor View-Only Access
- [ ] Allow instructors to view courses they're assigned to
- [ ] Hide edit/delete buttons for view-only access
- [ ] Show "View" instead of "Edit" button
- [ ] Ensure route protection allows view access

---

## 10. Design Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| **Disabled click behavior** | No click allowed - not even a toast or error |
| **Role change notification** | No notification needed |
| **Instructor view access** | Yes - instructors can VIEW but not EDIT courses they're assigned to |
| **Remember department choice** | Yes - store in localStorage, restore on login |

---

## Appendix: Role Definitions

| Role | Scope | Course Permissions |
|------|-------|-------------------|
| `content-admin` | Department | Create, Edit, Delete, Publish courses in that dept |
| `instructor` | Course (assigned) | View course, manage enrolled students, grade |
| `dept-admin` | Department | Manage department settings, assign roles |
| `system-admin` | Global | All permissions across all departments |

---

**END OF DESIGN DOCUMENT**

*Awaiting review before creating issue ticket.*
