# ADR-DATA-001: Data Architecture

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** Data

## Context

CadenceLMS uses MongoDB as its primary data store. Consistent data modeling patterns are essential for:
- Query performance at scale
- Data integrity across related entities
- Maintainable schema evolution
- Clear boundaries between domains
- Efficient data access patterns

This ADR establishes data architecture patterns for schema design, relationships, indexing, validation, and migrations.

## Decision

### 1. Database Technology

**Primary Database:** MongoDB 6.x+
- Document-oriented storage suits LMS domain (nested content, flexible schemas)
- Horizontal scaling for read-heavy workloads
- Rich query language and aggregation framework

**Secondary Stores:**
- **Redis**: Session cache, permission cache, rate limiting
- **File Storage**: S3-compatible for SCORM packages, uploads

### 2. Collection Naming

#### Conventions

| Convention | Example | Notes |
|------------|---------|-------|
| PascalCase singular | `User`, `Course`, `ClassEnrollment` | Mongoose model name |
| Collection is plural | `users`, `courses`, `classenrollments` | MongoDB auto-pluralizes |

#### LMS Domain Collections

```
├── Auth & Identity
│   ├── users              # Core user accounts
│   ├── staffs             # Staff profiles (shares _id with users)
│   ├── learners           # Learner profiles (shares _id with users)
│   └── globaladmins       # Admin profiles (shares _id with users)
│
├── Organization
│   ├── departments        # Organizational hierarchy
│   └── roledefinitions    # Role catalog
│
├── Academic Structure
│   ├── programs           # Academic programs
│   ├── programlevels      # Levels within programs
│   ├── courses            # Course definitions
│   ├── modules            # Course modules/sections
│   ├── learningunits      # Content items (lessons, activities)
│   └── classes            # Course instances/sections
│
├── Enrollment & Progress
│   ├── classenrollments   # Learner-class relationships
│   ├── enrollments        # Program enrollments
│   ├── assessmentattempts # Exam/quiz attempts
│   └── scormttempts       # SCORM interaction data
│
├── Assessment
│   ├── questions          # Question items
│   ├── questionbanks      # Question collections
│   ├── exercises          # Assessment definitions
│   └── learnerquestionprogress  # Question-level progress
│
├── Content
│   ├── contents           # SCORM packages, files
│   ├── templates          # Certificate templates
│   ├── knowledgenodes     # Adaptive learning nodes
│   └── cognitivedepthlevels  # Bloom's taxonomy levels
│
├── Reporting
│   ├── reporttemplates    # Report definitions
│   ├── reportjobs         # Report execution instances
│   └── reportschedules    # Scheduled reports
│
└── System
    ├── lookupvalues       # Reference data
    ├── auditlogs          # Audit trail
    ├── settings           # System configuration
    └── gradechangelogs    # Grade audit trail
```

### 3. Document Design Patterns

#### Pattern 1: Embedding (Denormalization)

**When to Embed:**
- Data is always accessed together
- Child data doesn't exceed 16MB document limit
- Child data has no independent identity
- One-to-few relationship (< 100 items)
- Updates are infrequent

**Examples in CadenceLMS:**

```typescript
// Staff embeds department memberships (one-to-few, always accessed together)
const staffSchema = {
  _id: ObjectId,
  person: {
    firstName: String,
    lastName: String,
    emails: [{ type: String, address: String, isPrimary: Boolean }],
    phones: [{ type: String, number: String }]
  },
  departmentMemberships: [{
    departmentId: ObjectId,
    roles: [String],
    isPrimary: Boolean,
    joinedAt: Date,
    isActive: Boolean
  }]
};

// ClassEnrollment embeds attendance records (one-to-few, always accessed together)
const classEnrollmentSchema = {
  learnerId: ObjectId,
  classId: ObjectId,
  status: String,
  attendanceRecords: [{
    date: Date,
    status: String,  // present, absent, late, excused
    notes: String
  }]
};

// Question embeds options (always accessed together, not shared)
const questionSchema = {
  stem: String,
  type: String,  // multiple-choice, true-false, etc.
  options: [{
    text: String,
    isCorrect: Boolean,
    feedback: String
  }]
};
```

#### Pattern 2: Referencing (Normalization)

**When to Reference:**
- Data has independent identity
- Data is shared across documents
- One-to-many or many-to-many relationships
- Child documents are large or numerous
- Need to query children independently

**Examples in CadenceLMS:**

```typescript
// Course references Department (many courses per department)
const courseSchema = {
  name: String,
  departmentId: { type: ObjectId, ref: 'Department' },  // Reference
  prerequisites: [{ type: ObjectId, ref: 'Course' }]    // Array of references
};

// ClassEnrollment references Learner and Class (junction table pattern)
const classEnrollmentSchema = {
  learnerId: { type: ObjectId, ref: 'User' },
  classId: { type: ObjectId, ref: 'Class' },
  status: String,
  gradePercentage: Number
};

// LearningUnit references KnowledgeNodes (many-to-many)
const learningUnitSchema = {
  title: String,
  courseId: { type: ObjectId, ref: 'Course' },
  knowledgeNodeIds: [{ type: ObjectId, ref: 'KnowledgeNode' }]
};
```

#### Pattern 3: Shared _id (Profile Pattern)

**Use Case:** Extend User with role-specific profiles without duplicating core data.

```typescript
// User is the core identity
const userSchema = {
  _id: ObjectId,          // Auto-generated
  email: String,
  password: String,
  userTypes: ['learner', 'staff', 'global-admin'],
  isActive: Boolean
};

// Staff shares _id with User
const staffSchema = {
  _id: ObjectId,          // Same as User._id (required, not auto-generated)
  person: PersonSchema,   // Embedded personal info
  departmentMemberships: [...]
};

// Learner shares _id with User
const learnerSchema = {
  _id: ObjectId,          // Same as User._id
  person: PersonSchema,
  accommodations: {...}
};

// Query: Get user with staff profile
const staffMember = await Staff.findById(userId).lean();
const user = await User.findById(userId).lean();
// Or use aggregation with $lookup
```

#### Pattern 4: Polymorphic References

**Use Case:** Reference different document types in a single field.

```typescript
// AuditLog can reference any entity type
const auditLogSchema = {
  action: String,           // create, update, delete
  entityType: String,       // 'Course', 'User', 'Enrollment', etc.
  entityId: ObjectId,       // ID of the referenced document
  changes: Mixed,
  performedBy: ObjectId,
  performedAt: Date
};

// Query: Get all audits for a specific course
const audits = await AuditLog.find({
  entityType: 'Course',
  entityId: courseId
});
```

### 4. Indexing Strategy

#### Index Types

| Type | Use Case | Example |
|------|----------|---------|
| Single field | Equality queries, sorting | `{ status: 1 }` |
| Compound | Multi-field queries | `{ departmentId: 1, status: 1 }` |
| Unique | Enforce uniqueness | `{ email: 1 }` with `unique: true` |
| Compound unique | Unique within scope | `{ departmentId: 1, code: 1 }` |
| Text | Full-text search | `{ name: 'text', description: 'text' }` |
| TTL | Auto-expire documents | `{ expiresAt: 1 }` with `expireAfterSeconds: 0` |

#### Indexing Guidelines

1. **Index fields used in queries**
   ```typescript
   // Query: Find active courses in a department
   Course.find({ departmentId: deptId, status: 'published' });

   // Index to support this query
   courseSchema.index({ departmentId: 1, status: 1 });
   ```

2. **Index fields used in sorting**
   ```typescript
   // Query with sort
   Course.find({ departmentId: deptId }).sort({ name: 1 });

   // Compound index covers both filter and sort
   courseSchema.index({ departmentId: 1, name: 1 });
   ```

3. **Put high-cardinality fields first in compound indexes**
   ```typescript
   // Good: departmentId has higher cardinality than status
   { departmentId: 1, status: 1 }

   // Less optimal: status has low cardinality (few distinct values)
   { status: 1, departmentId: 1 }
   ```

4. **Avoid over-indexing**
   - Each index consumes memory
   - Indexes slow down writes
   - Target: 5-10 indexes per collection max

#### Standard Indexes by Collection Type

**Core Entities (User, Course, Department):**
```typescript
// User
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userTypes: 1 });
userSchema.index({ isActive: 1 });

// Course
courseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
courseSchema.index({ departmentId: 1, status: 1 });
courseSchema.index({ status: 1, isActive: 1 });

// Department
departmentSchema.index({ parentDepartmentId: 1 });
departmentSchema.index({ isActive: 1 });
```

**Junction Tables (Enrollments, Memberships):**
```typescript
// ClassEnrollment
classEnrollmentSchema.index({ learnerId: 1, classId: 1 }, { unique: true });
classEnrollmentSchema.index({ learnerId: 1, status: 1 });
classEnrollmentSchema.index({ classId: 1, status: 1 });
```

**Time-Series Data (Attempts, Logs):**
```typescript
// AuditLog
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1, performedAt: -1 });
auditLogSchema.index({ performedAt: -1 }); // For time-range queries

// AssessmentAttempt
attemptSchema.index({ learnerId: 1, assessmentId: 1 });
attemptSchema.index({ startedAt: -1 });
```

### 5. Schema Validation

#### Mongoose Validation Layers

**Layer 1: Type & Required**
```typescript
const courseSchema = {
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [200, 'Course name cannot exceed 200 characters']
  },
  credits: {
    type: Number,
    required: true,
    min: [0, 'Credits cannot be negative'],
    max: [20, 'Credits cannot exceed 20']
  }
};
```

**Layer 2: Enum Validation**
```typescript
const enrollmentSchema = {
  status: {
    type: String,
    required: true,
    enum: {
      values: ['enrolled', 'active', 'completed', 'withdrawn'],
      message: '{VALUE} is not a valid enrollment status'
    }
  }
};
```

**Layer 3: Custom Validators**
```typescript
const staffSchema = {
  departmentMemberships: {
    type: [departmentMembershipSchema],
    validate: {
      validator: function(memberships) {
        // Ensure at most one primary department
        const primaryCount = memberships.filter(m => m.isPrimary).length;
        return primaryCount <= 1;
      },
      message: 'Staff can have at most one primary department'
    }
  }
};
```

**Layer 4: Pre-Save Hooks (Cross-Collection Validation)**
```typescript
// Validate status against LookupValue collection
courseSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    const validStatus = await LookupValue.findOne({
      category: 'course-status',
      key: this.status,
      isActive: true
    });

    if (!validStatus) {
      return next(new Error(`Invalid course status: ${this.status}`));
    }
  }
  next();
});
```

#### LookupValue Pattern

Use the `LookupValue` collection for extensible enums:

```typescript
// LookupValue schema
const lookupValueSchema = {
  category: String,    // e.g., 'course-status', 'enrollment-status'
  key: String,         // e.g., 'draft', 'published'
  label: String,       // e.g., 'Draft', 'Published'
  sortOrder: Number,
  isActive: Boolean,
  metadata: Mixed
};

// Compound unique index
lookupValueSchema.index({ category: 1, key: 1 }, { unique: true });
```

**Benefits:**
- Add new status values without code changes
- UI can dynamically fetch valid options
- Audit trail for value changes
- Localization support via metadata

### 6. Data Consistency

#### Referential Integrity (Application-Level)

MongoDB doesn't enforce foreign keys. Handle in application:

**Pre-Delete Checks:**
```typescript
// Before deleting a department
async function canDeleteDepartment(deptId: ObjectId): Promise<boolean> {
  const [courses, staff, children] = await Promise.all([
    Course.countDocuments({ departmentId: deptId }),
    Staff.countDocuments({ 'departmentMemberships.departmentId': deptId }),
    Department.countDocuments({ parentDepartmentId: deptId })
  ]);

  return courses === 0 && staff === 0 && children === 0;
}
```

**Cascade Soft Delete:**
```typescript
// Soft delete course and related data
async function archiveCourse(courseId: ObjectId): Promise<void> {
  await Course.updateOne({ _id: courseId }, { status: 'archived', isActive: false });
  await Module.updateMany({ courseId }, { isActive: false });
  await LearningUnit.updateMany({ courseId }, { isActive: false });
  // Don't delete enrollments - preserve for records
}
```

#### Eventual Consistency Patterns

**Denormalized Fields:**
```typescript
// Class stores denormalized enrollment count
const classSchema = {
  courseId: ObjectId,
  enrollmentCount: Number,  // Denormalized for performance
  maxCapacity: Number
};

// Update on enrollment change
async function updateEnrollmentCount(classId: ObjectId): Promise<void> {
  const count = await ClassEnrollment.countDocuments({
    classId,
    status: { $in: ['enrolled', 'active'] }
  });
  await Class.updateOne({ _id: classId }, { enrollmentCount: count });
}
```

**Periodic Reconciliation:**
```typescript
// Scheduled job to reconcile denormalized data
async function reconcileEnrollmentCounts(): Promise<void> {
  const classes = await Class.find({ isActive: true }).select('_id');

  for (const cls of classes) {
    await updateEnrollmentCount(cls._id);
  }
}
```

### 7. Migration Strategy

#### Migration Tool: migrate-mongo

```bash
# Install
npm install -D migrate-mongo

# Initialize
npx migrate-mongo init

# Create migration
npx migrate-mongo create add-course-status-index

# Run migrations
npx migrate-mongo up

# Rollback
npx migrate-mongo down
```

#### Migration File Structure

```
migrations/
├── config.js                           # Database connection config
├── 20260127100000-add-course-status-index.js
├── 20260127110000-add-user-userTypes-field.js
└── 20260127120000-migrate-status-values.js
```

#### Migration Template

```javascript
// migrations/20260127100000-add-course-status-index.js
module.exports = {
  async up(db, client) {
    // Add index for course status queries
    await db.collection('courses').createIndex(
      { departmentId: 1, status: 1 },
      { name: 'departmentId_status_idx' }
    );
  },

  async down(db, client) {
    // Remove the index
    await db.collection('courses').dropIndex('departmentId_status_idx');
  }
};
```

#### Data Migration Template

```javascript
// migrations/20260127110000-add-user-userTypes-field.js
module.exports = {
  async up(db, client) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Add userTypes field to existing users
        await db.collection('users').updateMany(
          { userTypes: { $exists: false } },
          { $set: { userTypes: ['learner'] } },
          { session }
        );

        // Set userTypes based on existing profiles
        const staffIds = await db.collection('staffs')
          .find({}, { projection: { _id: 1 } })
          .toArray();

        await db.collection('users').updateMany(
          { _id: { $in: staffIds.map(s => s._id) } },
          { $addToSet: { userTypes: 'staff' } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    await db.collection('users').updateMany(
      {},
      { $unset: { userTypes: '' } }
    );
  }
};
```

#### Migration Guidelines

1. **Always provide rollback** - `down()` should reverse `up()`
2. **Use transactions** for multi-document updates
3. **Test on copy of production data** before deploying
4. **Batch large updates** to avoid timeout
5. **Add indexes before data migrations** that query by those fields
6. **Backward-compatible changes first** - deploy code that handles both old and new schema

### 8. Query Optimization

#### Use Projections

```typescript
// Bad: Fetches entire document
const courses = await Course.find({ departmentId: deptId });

// Good: Only fetch needed fields
const courses = await Course.find({ departmentId: deptId })
  .select('name code status')
  .lean();
```

#### Use lean() for Read-Only

```typescript
// With Mongoose document overhead
const course = await Course.findById(id);  // Returns Mongoose document

// Without overhead (plain JavaScript object)
const course = await Course.findById(id).lean();  // 2-3x faster
```

#### Pagination with Cursor

```typescript
// Offset pagination (slow for large offsets)
const page2 = await Course.find().skip(20).limit(20);

// Cursor pagination (consistent performance)
const nextPage = await Course.find({ _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(20);
```

#### Aggregation for Complex Queries

```typescript
// Get enrollment counts per course in a department
const stats = await ClassEnrollment.aggregate([
  {
    $lookup: {
      from: 'classes',
      localField: 'classId',
      foreignField: '_id',
      as: 'class'
    }
  },
  { $unwind: '$class' },
  { $match: { 'class.departmentId': departmentId } },
  {
    $group: {
      _id: '$class.courseId',
      totalEnrollments: { $sum: 1 },
      activeEnrollments: {
        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
      }
    }
  }
]);
```

### 9. Data Retention

#### Soft Delete Pattern

```typescript
// All major entities include isActive flag
const baseSchema = {
  isActive: { type: Boolean, default: true },
  deletedAt: Date,
  deletedBy: ObjectId
};

// Soft delete
async function softDelete(Model, id, userId) {
  return Model.updateOne(
    { _id: id },
    { isActive: false, deletedAt: new Date(), deletedBy: userId }
  );
}

// Default query scope
Model.find({ isActive: true });
```

#### TTL Collections

```typescript
// Session tokens expire automatically
const sessionSchema = {
  userId: ObjectId,
  token: String,
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
};

// Temporary upload records
const uploadSchema = {
  filename: String,
  uploadedAt: Date,
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }  // 24 hours
};
```

#### Archive Strategy

| Data Type | Retention | Archive |
|-----------|-----------|---------|
| User accounts | Indefinite | Soft delete |
| Enrollments | Indefinite | Keep for transcripts |
| Audit logs | 7 years | Archive to cold storage |
| Session data | 30 days | TTL auto-delete |
| Temp uploads | 24 hours | TTL auto-delete |
| SCORM attempts | 3 years | Archive after course completion |

## Consequences

### Positive
- Consistent data patterns across all collections
- Optimized query performance with proper indexing
- Clear migration path for schema changes
- Extensible enum values via LookupValue
- Soft delete preserves audit trail

### Negative
- Denormalization requires manual consistency maintenance
- No native referential integrity (application must enforce)
- Migration complexity for large datasets
- Index maintenance overhead on writes

### Neutral
- MongoDB chosen suits document-oriented LMS domain
- Mongoose ODM provides schema validation layer
- Redis supplements for caching (see ADR-API-002)

## Alternatives Considered

### PostgreSQL
- **Rejected**: Document structure fits LMS content better than relational; would require many JOINs for nested content.

### Pure Embedding (No References)
- **Rejected**: Would duplicate data and exceed document size limits for large relationships.

### Strict Normalization (All References)
- **Rejected**: Would require excessive JOINs ($lookup) for simple queries.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-API-002-API-CACHING-STRATEGY]] (Redis caching layer)
  - [[ADR-API-003-REST-CONVENTIONS]] (API resource design)
- Implementation:
  - `src/models/` - Mongoose model definitions
  - `migrations/` - Database migrations (to be created)
  - `src/models/LookupValue.model.ts` - Extensible enum pattern
