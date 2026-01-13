# Transaction Pattern Architecture

> **Purpose:** Guidelines for using MongoDB transactions in multi-document operations  
> **Created:** 2026-01-13  
> **Status:** Recommended pattern for production

---

## Overview

MongoDB transactions ensure that multiple document operations either all succeed together or all fail together (ACID compliance). This prevents data inconsistencies when operations span multiple collections.

---

## When to Use Transactions

### ✅ Required

| Operation | Documents Affected | Risk Without Transaction |
|-----------|-------------------|-------------------------|
| Course enrollment | Enrollment, Learner, Course, Progress | Orphaned enrollment records |
| Course withdrawal | Enrollment, Learner, Course, Progress | Learner removed but enrollment remains |
| Department deletion | Department, Staff memberships, Courses | Orphaned courses with no department |
| Learner transfer | Source enrollment, Target enrollment, Progress | Learner in limbo between departments |
| Bulk grade import | Multiple Progress, Enrollment statuses | Partial grades imported |
| Course completion | Enrollment, Progress, Certificate | Certificate issued but progress not marked |
| User deactivation | User, Staff, Learner, Enrollments | Partial deactivation state |

### ❌ Not Required

- Single document operations (CRUD on one document)
- Read-only operations (queries, aggregations)
- Operations where eventual consistency is acceptable
- Logging and audit trails (can be async/queued)

---

## Implementation

### Reusable Transaction Wrapper

```typescript
// src/utils/with-transaction.ts
import mongoose, { ClientSession } from 'mongoose';

type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Executes a callback within a MongoDB transaction.
 * Automatically commits on success, aborts on error.
 * 
 * @example
 * const result = await withTransaction(async (session) => {
 *   await Model1.create([data], { session });
 *   await Model2.findByIdAndUpdate(id, update, { session });
 *   return result;
 * });
 */
export const withTransaction = async <T>(
  callback: TransactionCallback<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
```

---

## Usage Examples

### Example 1: Course Enrollment

```typescript
// src/services/enrollment/enrollment.service.ts
import { withTransaction } from '@/utils/with-transaction';
import { Enrollment } from '@/models/enrollment/enrollment.model';
import { Learner } from '@/models/auth/learner.model';
import { Course } from '@/models/academic/course.model';
import { Progress } from '@/models/enrollment/progress.model';

export const enrollLearnerInCourse = async (
  learnerId: string,
  courseId: string,
  enrolledBy: string
) => {
  return withTransaction(async (session) => {
    // 1. Create enrollment record
    const [enrollment] = await Enrollment.create([{
      learnerId,
      courseId,
      enrolledBy,
      enrolledAt: new Date(),
      status: 'enrolled'
    }], { session });

    // 2. Update learner's enrollment list
    await Learner.findByIdAndUpdate(
      learnerId,
      { $addToSet: { courseEnrollments: courseId } },
      { session }
    );

    // 3. Increment course enrollment count
    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { enrollmentCount: 1 } },
      { session }
    );

    // 4. Create initial progress record
    await Progress.create([{
      learnerId,
      courseId,
      enrollmentId: enrollment._id,
      progressPercent: 0,
      status: 'not_started'
    }], { session });

    return enrollment;
  });
};
```

### Example 2: Course Withdrawal

```typescript
export const withdrawFromCourse = async (
  learnerId: string,
  courseId: string,
  withdrawnBy: string,
  reason?: string
) => {
  return withTransaction(async (session) => {
    // 1. Update enrollment status
    const enrollment = await Enrollment.findOneAndUpdate(
      { learnerId, courseId, status: { $ne: 'withdrawn' } },
      { 
        status: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawnBy,
        withdrawalReason: reason
      },
      { session, new: true }
    );

    if (!enrollment) {
      throw AppError.notFound('Active enrollment not found');
    }

    // 2. Remove from learner's active enrollments
    await Learner.findByIdAndUpdate(
      learnerId,
      { $pull: { courseEnrollments: courseId } },
      { session }
    );

    // 3. Decrement course enrollment count
    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { enrollmentCount: -1 } },
      { session }
    );

    // 4. Mark progress as withdrawn
    await Progress.findOneAndUpdate(
      { enrollmentId: enrollment._id },
      { status: 'withdrawn', withdrawnAt: new Date() },
      { session }
    );

    return enrollment;
  });
};
```

### Example 3: Department Deletion

```typescript
export const deleteDepartment = async (departmentId: string) => {
  return withTransaction(async (session) => {
    // 1. Verify no active courses
    const activeCourses = await Course.countDocuments({ 
      departmentId, 
      isActive: true 
    });
    if (activeCourses > 0) {
      throw AppError.conflict('Cannot delete department with active courses');
    }

    // 2. Remove department from all staff memberships
    await Staff.updateMany(
      { 'departmentMemberships.departmentId': departmentId },
      { $pull: { departmentMemberships: { departmentId } } },
      { session }
    );

    // 3. Archive associated courses
    await Course.updateMany(
      { departmentId },
      { isActive: false, archivedAt: new Date() },
      { session }
    );

    // 4. Delete the department
    await Department.findByIdAndDelete(departmentId, { session });

    return { deleted: true, departmentId };
  });
};
```

---

## Critical Rules

### 1. Always Pass Session to All Operations

```typescript
// ❌ WRONG - operation outside transaction
await withTransaction(async (session) => {
  await Model1.create([data], { session });
  await Model2.create([data]); // Missing session!
});

// ✅ CORRECT - all operations include session
await withTransaction(async (session) => {
  await Model1.create([data], { session });
  await Model2.create([data], { session });
});
```

### 2. Use Array Syntax for Create with Session

```typescript
// ❌ WRONG - create() with session requires array
await Model.create({ field: 'value' }, { session });

// ✅ CORRECT - wrap document in array
await Model.create([{ field: 'value' }], { session });
```

### 3. Validate Before Transaction When Possible

```typescript
// ✅ BETTER - validate outside transaction (faster abort)
export const enrollLearner = async (learnerId: string, courseId: string) => {
  // Validate first (no session needed for reads)
  const learner = await Learner.findById(learnerId);
  if (!learner) throw AppError.notFound('Learner not found');

  const course = await Course.findById(courseId);
  if (!course) throw AppError.notFound('Course not found');
  if (!course.isActive) throw AppError.badRequest('Course is not active');

  const existing = await Enrollment.findOne({ learnerId, courseId });
  if (existing) throw AppError.conflict('Already enrolled');

  // Now do the transactional work
  return withTransaction(async (session) => {
    // All writes here...
  });
};
```

### 4. Keep Transactions Short

```typescript
// ❌ WRONG - slow operations inside transaction
await withTransaction(async (session) => {
  await Model.create([data], { session });
  await sendEmail(user.email); // Slow! Holds transaction open
  await uploadToS3(file);      // Even slower!
});

// ✅ CORRECT - only database operations in transaction
const result = await withTransaction(async (session) => {
  await Model.create([data], { session });
  return result;
});

// Do slow operations after transaction commits
await sendEmail(user.email);
await uploadToS3(file);
```

---

## Error Handling

### Transaction-Specific Errors

```typescript
import { MongoError } from 'mongodb';

export const withTransaction = async <T>(
  callback: TransactionCallback<T>,
  retries = 3
): Promise<T> => {
  const session = await mongoose.startSession();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      
      // Retry on transient errors (network issues, lock conflicts)
      if (
        error instanceof MongoError &&
        error.hasErrorLabel('TransientTransactionError') &&
        attempt < retries
      ) {
        continue; // Retry
      }
      
      throw error;
    }
  }
  
  session.endSession();
  throw new Error('Transaction failed after retries');
};
```

---

## Testing Transactions

```typescript
// tests/integration/enrollment.test.ts
describe('Course Enrollment', () => {
  it('should rollback all changes if any operation fails', async () => {
    // Arrange
    const learnerId = new mongoose.Types.ObjectId().toString();
    const courseId = new mongoose.Types.ObjectId().toString();
    
    // Create course but NOT learner (will cause failure)
    await Course.create({ _id: courseId, title: 'Test Course' });
    
    const initialCourseCount = await Course.findById(courseId);
    
    // Act & Assert
    await expect(
      enrollLearnerInCourse(learnerId, courseId, 'admin')
    ).rejects.toThrow('Learner not found');
    
    // Verify rollback - course count unchanged
    const courseAfter = await Course.findById(courseId);
    expect(courseAfter.enrollmentCount).toBe(initialCourseCount.enrollmentCount);
    
    // Verify no enrollment was created
    const enrollment = await Enrollment.findOne({ learnerId, courseId });
    expect(enrollment).toBeNull();
  });
});
```

---

## Infrastructure Requirements

### MongoDB Replica Set

Transactions require a replica set. For development:

```bash
# Option 1: Docker with replica set
docker run -d --name mongo-rs \
  -p 27017:27017 \
  mongo:7 --replSet rs0

# Initialize replica set
docker exec -it mongo-rs mongosh --eval "rs.initiate()"

# Option 2: Use MongoDB Atlas (replica set by default)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lms
```

### Connection String

```bash
# .env
MONGODB_URI=mongodb://localhost:27017/lms?replicaSet=rs0
```

---

## Monitoring

### Log Transaction Metrics

```typescript
export const withTransaction = async <T>(
  callback: TransactionCallback<T>,
  operationName: string
): Promise<T> => {
  const startTime = Date.now();
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    
    logger.info('Transaction committed', {
      operation: operationName,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    await session.abortTransaction();
    
    logger.error('Transaction aborted', {
      operation: operationName,
      duration: Date.now() - startTime,
      error: error.message
    });
    
    throw error;
  } finally {
    await session.endSession();
  }
};
```

---

## Related Documentation

- [MongoDB Transactions Guide](https://www.mongodb.com/docs/manual/core/transactions/)
- [Mongoose Transactions](https://mongoosejs.com/docs/transactions.html)
- `src/utils/with-transaction.ts` - Implementation (to be created)
- `devdocs/architecture/error-handling.md` - Error patterns
