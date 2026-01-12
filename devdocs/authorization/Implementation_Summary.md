# Authorization Implementation Summary

**Date:** 2026-01-11
**Status:** Ready for Implementation
**Estimated Effort:** 8-12 hours

---

## What Needs to Be Done

Apply the authorization middleware defined in [Route_Authorization_Mapping.md](./Route_Authorization_Mapping.md) to all route files.

### Files to Update (26 route files)

```
src/routes/
├── content.routes.ts          ✅ 15 routes mapped
├── courses.routes.ts          ✅ 14 routes mapped
├── course-segments.routes.ts  ✅ 6 routes mapped
├── questions.routes.ts        ✅ 6 routes mapped
├── classes.routes.ts          ✅ 10 routes mapped
├── programs.routes.ts         ✅ 10 routes mapped
├── departments.routes.ts      ✅ 9 routes mapped
├── enrollments.routes.ts      ✅ 10 routes mapped
├── staff.routes.ts            ✅ 6 routes mapped
├── learners.routes.ts         ✅ 5 routes mapped
├── users.routes.ts            ✅ 2 routes mapped
├── progress.routes.ts         ✅ 8 routes mapped
├── reports.routes.ts          ✅ 8 routes mapped
├── settings.routes.ts         ✅ 6 routes mapped
├── audit-logs.routes.ts       ✅ 5 routes mapped
├── admin.routes.ts            ✅ 20 routes mapped (NEW - system-admin only)
├── academic-years.routes.ts   ⏳ Not yet mapped
├── templates.routes.ts        ⏳ Not yet mapped
├── exercises.routes.ts        ⏳ Not yet mapped
├── exam-attempts.routes.ts    ⏳ Not yet mapped
├── content-attempts.routes.ts ⏳ Not yet mapped
├── learning-events.routes.ts  ⏳ Not yet mapped
├── lists.routes.ts            ⏳ Not yet mapped
├── lookup-values.routes.ts    ⏳ Not yet mapped
├── permissions.routes.ts      ⏳ Not yet mapped
└── system.routes.ts           ⏳ Not yet mapped
```

---

## Implementation Steps

### Step 1: Import Middleware (All Route Files)

Add to top of each route file:

```typescript
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';
```

### Step 2: Apply Authorization to Each Route

**Before:**
```typescript
router.use(authenticate);

router.get('/', coursesController.listCourses);
router.post('/', coursesController.createCourse);
router.delete('/:id', coursesController.deleteCourse);
```

**After:**
```typescript
router.use(authenticate);

router.get('/',
  requireAccessRight('content:courses:read'),
  coursesController.listCourses
);

router.post('/',
  requireAccessRight('content:lessons:manage'),
  coursesController.createCourse
);

router.delete('/:id',
  requireEscalation,
  requireAdminRole(['department-admin']),
  requireAccessRight('content:courses:manage'),
  coursesController.deleteCourse
);
```

### Step 3: Service Layer Implementation

Each controller/service needs to implement:

#### 3.1 Department Scoping
```typescript
// For instructors: filter to own classes
if (user.role === 'instructor') {
  query.classId = { $in: user.assignedClassIds };
}

// For department-admin: filter to own department (including subdepartments)
if (user.role === 'department-admin') {
  const deptIds = await getDepartmentAndSubdepartments(user.departmentId);
  query.departmentId = { $in: deptIds };
}
```

#### 3.2 Data Masking (Last Name → "FirstName L.")
```typescript
function maskLastName(user: IUser, viewer: IUser): IUser {
  // Enrollment-admin sees full names
  if (viewer.roles.includes('enrollment-admin')) {
    return user;
  }

  // Instructors and department-admin see masked names
  if (viewer.roles.includes('instructor') || viewer.roles.includes('department-admin')) {
    return {
      ...user,
      lastName: user.lastName.charAt(0) + '.',
      fullName: `${user.firstName} ${user.lastName.charAt(0)}.`
    };
  }

  return user;
}
```

#### 3.3 Creator-based Editing (Draft Content)
```typescript
async function updateCourse(courseId: string, userId: string, updates: any) {
  const course = await Course.findById(courseId);

  // If course is draft, only creator or department-admin can edit
  if (course.status === 'draft') {
    const isCreator = course.createdBy.equals(userId);
    const isDepartmentAdmin = user.roles.includes('department-admin');

    if (!isCreator && !isDepartmentAdmin) {
      throw ApiError.forbidden('Only the course creator or department admin can edit draft courses');
    }
  }

  // If course is published, only department-admin can edit
  if (course.status === 'published') {
    const isDepartmentAdmin = user.roles.includes('department-admin');

    if (!isDepartmentAdmin) {
      throw ApiError.forbidden('Only department admin can edit published courses');
    }
  }

  // Apply updates...
}
```

#### 3.4 Self-Enrollment Check
```typescript
async function enrollInCourse(learnerId: string, courseId: string, enrolledBy: string) {
  const course = await Course.findById(courseId).populate('departmentId');

  // Check if learner is enrolling themselves
  const isSelfEnroll = learnerId === enrolledBy;

  if (isSelfEnroll) {
    // Check department setting
    const setting = await getSetting('allowSelfEnrollment', course.departmentId);

    if (!setting || setting.value === false) {
      throw ApiError.forbidden('Self-enrollment is not allowed in this department');
    }
  }

  // Create enrollment...
}
```

#### 3.5 Hierarchical Department Access
```typescript
async function getDepartmentAndSubdepartments(departmentId: string): Promise<string[]> {
  const department = await Department.findById(departmentId);
  const subdepartments = await Department.find({
    parentDepartmentId: departmentId
  });

  const allDeptIds = [departmentId];

  // Recursively get all subdepartments
  for (const subdept of subdepartments) {
    const childDepts = await getDepartmentAndSubdepartments(subdept._id);
    allDeptIds.push(...childDepts);
  }

  return allDeptIds;
}
```

---

## Testing Requirements

### Unit Tests
- [ ] Test each middleware function (requireAccessRight, requireEscalation, requireAdminRole)
- [ ] Test data masking utility functions
- [ ] Test department hierarchy utility functions
- [ ] Test creator-based editing logic

### Integration Tests
- [ ] Test each protected endpoint with correct role ✅
- [ ] Test each protected endpoint without required role ❌
- [ ] Test department scoping (top-level vs subdepartment)
- [ ] Test instructor scoping (own classes only)
- [ ] Test data masking (last name format)
- [ ] Test creator-based editing (draft vs published)
- [ ] Test self-enrollment setting enforcement

### E2E Tests
- [ ] Complete user flow: instructor creates draft course → department-admin publishes → learner enrolls
- [ ] Complete user flow: department hierarchy access
- [ ] Complete user flow: instructor views class roster with masked names

---

## Priority Order

### Phase 1: High Priority (Week 1)
1. **Content & Courses** (most used endpoints)
   - content.routes.ts
   - courses.routes.ts
   - course-segments.routes.ts
   - questions.routes.ts

2. **Academic & Enrollment**
   - classes.routes.ts
   - programs.routes.ts
   - enrollments.routes.ts

### Phase 2: Medium Priority (Week 2)
3. **User Management**
   - staff.routes.ts
   - learners.routes.ts
   - departments.routes.ts

4. **Analytics & Reporting**
   - progress.routes.ts
   - reports.routes.ts

### Phase 3: Standard Priority (Week 3)
5. **System Administration**
   - settings.routes.ts
   - audit-logs.routes.ts

6. **Remaining Routes**
   - All unmapped routes

---

## Service Layer Implementation Priority

### Critical Service Updates
1. **courses.service.ts** - Draft visibility, creator-based editing
2. **enrollments.service.ts** - Self-enrollment setting check
3. **staff.service.ts** - Department hierarchy scoping
4. **learners.service.ts** - Data masking, instructor scoping
5. **classes.service.ts** - Instructor class scoping

### Data Masking Utility
Create shared utility: `src/utils/dataMasking.ts`
```typescript
export function maskLastName(user: IUser, viewer: IUser): IUser;
export function maskUserList(users: IUser[], viewer: IUser): IUser[];
```

### Department Hierarchy Utility
Create shared utility: `src/utils/departmentHierarchy.ts`
```typescript
export async function getDepartmentAndSubdepartments(deptId: string): Promise<string[]>;
export async function isTopLevelDepartmentMember(userId: string, deptId: string): Promise<boolean>;
```

---

## Known Issues to Address

1. **Route 48** - Class enrollments need last name masking for instructors
2. **Route 64-67** - Enrollment endpoints need `allowSelfEnrollment` setting check
3. **Route 68** - Staff roster needs hierarchical department scoping
4. **Route 74** - Learner list needs data masking + instructor scoping
5. **Route 96** - Learner progress needs instructor class filtering
6. **Route 111** - Transcripts need department-scoped filtering for department-admin

---

## Completion Criteria

### Routes
- [ ] All 25 route files have authorization middleware applied
- [ ] All protected endpoints return 403 for unauthorized users
- [ ] All protected endpoints return 200 for authorized users

### Service Layer
- [ ] Department scoping implemented
- [ ] Data masking implemented
- [ ] Creator-based editing implemented
- [ ] Self-enrollment setting check implemented
- [ ] Hierarchical department access implemented

### Testing
- [ ] 85%+ test coverage for authorization
- [ ] All integration tests passing
- [ ] E2E tests covering key flows

### Documentation
- [ ] Controller comments updated with authorization info
- [ ] API documentation reflects new authorization
- [ ] Migration guide created for V1 → V2 authorization

---

## Related Documents

- [Route Authorization Mapping](./Route_Authorization_Mapping.md) - Complete route-by-route reference
- [Access Rights Documentation](../../docs/api/access-rights-v2.md) - All 41 access rights defined
- [Role System V2 Plan](../plans/Role_System_V2_Phased_Implementation.md) - Overall implementation plan

---

**Ready to implement?** Start with Phase 1 routes and work through the priority order!
