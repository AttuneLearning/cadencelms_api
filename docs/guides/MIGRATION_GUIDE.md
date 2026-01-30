# LMS API V2 - Migration Guide

**Version:** 2.0.0  
**Last Updated:** January 7, 2026  

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Framework](#migration-framework)
3. [Writing Migrations](#writing-migrations)
4. [Running Migrations](#running-migrations)
5. [Common Migration Patterns](#common-migration-patterns)
6. [Rollback Strategy](#rollback-strategy)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What are Migrations?

Migrations are versioned, incremental changes to your database schema and data. They allow you to:

- **Track schema changes** over time
- **Apply changes** consistently across environments
- **Rollback changes** if issues occur
- **Collaborate** with team members safely

### When to Use Migrations

✅ **Use migrations for:**
- Adding new collections/models
- Modifying indexes
- Data transformations
- Backfilling data
- Schema updates that affect existing data

❌ **Don't use migrations for:**
- Configuration changes (use Settings model)
- Content updates (use admin interface)
- User-specific data

---

## Migration Framework

### MigrationRunner Class

Located at `src/migrations/MigrationRunner.ts`, this utility provides a complete framework for managing migrations.

**Key Features:**
- ✅ Sequential execution by version
- ✅ Status tracking (pending, running, completed, failed)
- ✅ Execution time monitoring
- ✅ Comprehensive logging
- ✅ Rollback support
- ✅ Duplicate prevention
- ✅ Batch operations

### Migration Interface

```typescript
interface Migration {
  name: string;           // Unique identifier
  version: number;        // Version number (sequential)
  description?: string;   // Human-readable description
  up: () => Promise<void>;    // Forward migration
  down: () => Promise<void>;  // Rollback migration
}
```

### Migration Status

```typescript
interface MigrationStatus {
  name: string;
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt?: Date;
  executionTime?: number;  // milliseconds
  error?: string;
}
```

---

## Writing Migrations

### Basic Migration Template

```typescript
// migrations/001_add_course_index.ts
import { Migration } from '../types/migration';
import Course from '../models/Academic/Course';

const migration: Migration = {
  name: 'add_course_index',
  version: 1,
  description: 'Add compound index on course department and status',
  
  async up() {
    await Course.collection.createIndex(
      { department: 1, status: 1 },
      { name: 'idx_course_department_status' }
    );
    console.log('✓ Created course department-status index');
  },
  
  async down() {
    await Course.collection.dropIndex('idx_course_department_status');
    console.log('✓ Dropped course department-status index');
  }
};

export default migration;
```

### Data Transformation Migration

```typescript
// migrations/002_normalize_enrollment_status.ts
import { Migration } from '../types/migration';
import Enrollment from '../models/Enrollment/Enrollment';

const migration: Migration = {
  name: 'normalize_enrollment_status',
  version: 2,
  description: 'Convert old enrollment statuses to new format',
  
  async up() {
    // Update old 'enrolled' status to 'active'
    const result = await Enrollment.updateMany(
      { status: 'enrolled' },
      { $set: { status: 'active' } }
    );
    console.log(`✓ Updated ${result.modifiedCount} enrollments`);
    
    // Update old 'finished' status to 'completed'
    const result2 = await Enrollment.updateMany(
      { status: 'finished' },
      { $set: { status: 'completed' } }
    );
    console.log(`✓ Updated ${result2.modifiedCount} enrollments`);
  },
  
  async down() {
    // Reverse the changes
    await Enrollment.updateMany(
      { status: 'active' },
      { $set: { status: 'enrolled' } }
    );
    
    await Enrollment.updateMany(
      { status: 'completed' },
      { $set: { status: 'finished' } }
    );
    console.log('✓ Reverted enrollment status changes');
  }
};

export default migration;
```

### Adding New Field Migration

```typescript
// migrations/003_add_course_tags.ts
import { Migration } from '../types/migration';
import Course from '../models/Academic/Course';

const migration: Migration = {
  name: 'add_course_tags',
  version: 3,
  description: 'Add tags field to all courses',
  
  async up() {
    // Add tags field (empty array) to courses that don't have it
    const result = await Course.updateMany(
      { tags: { $exists: false } },
      { $set: { tags: [] } }
    );
    console.log(`✓ Added tags field to ${result.modifiedCount} courses`);
  },
  
  async down() {
    // Remove tags field
    await Course.updateMany(
      { tags: { $exists: true } },
      { $unset: { tags: '' } }
    );
    console.log('✓ Removed tags field from courses');
  }
};

export default migration;
```

### Complex Aggregation Migration

```typescript
// migrations/004_calculate_course_stats.ts
import { Migration } from '../types/migration';
import Course from '../models/Academic/Course';
import Enrollment from '../models/Enrollment/Enrollment';

const migration: Migration = {
  name: 'calculate_course_stats',
  version: 4,
  description: 'Calculate and store enrollment stats for all courses',
  
  async up() {
    const courses = await Course.find();
    
    for (const course of courses) {
      const stats = await Enrollment.aggregate([
        { $match: { courseId: course._id } },
        { 
          $group: {
            _id: null,
            totalEnrollments: { $sum: 1 },
            activeEnrollments: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            completedEnrollments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]);
      
      if (stats.length > 0) {
        await Course.updateOne(
          { _id: course._id },
          { $set: { enrollmentStats: stats[0] } }
        );
      }
    }
    
    console.log(`✓ Calculated stats for ${courses.length} courses`);
  },
  
  async down() {
    await Course.updateMany(
      {},
      { $unset: { enrollmentStats: '' } }
    );
    console.log('✓ Removed enrollment stats from courses');
  }
};

export default migration;
```

---

## Running Migrations

### Using MigrationRunner

```typescript
// scripts/run-migrations.ts
import { MigrationRunner } from '../src/migrations/MigrationRunner';
import connectDB from '../src/config/dbConnect';

// Import all migrations
import migration001 from '../migrations/001_add_course_index';
import migration002 from '../migrations/002_normalize_enrollment_status';
import migration003 from '../migrations/003_add_course_tags';

async function runMigrations() {
  // Connect to database
  await connectDB();
  
  // Create runner
  const runner = new MigrationRunner();
  
  // Register migrations
  runner.register(migration001);
  runner.register(migration002);
  runner.register(migration003);
  
  try {
    // Run all pending migrations
    console.log('Starting migrations...');
    await runner.upAll();
    console.log('✓ All migrations completed successfully');
    
    // Get status
    const migrations = runner.getMigrations();
    migrations.forEach(m => {
      const status = runner.getStatus(m.name);
      console.log(`  ${m.name} (v${m.version}): ${status?.status}`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations();
```

### Running Single Migration

```typescript
// Run specific migration
await runner.register(migration001);
await runner.up('add_course_index');

// Check status
const status = runner.getStatus('add_course_index');
console.log(status);
// {
//   name: 'add_course_index',
//   version: 1,
//   status: 'completed',
//   executedAt: 2026-01-07T...,
//   executionTime: 245
// }
```

### Running Multiple Migrations

```typescript
// Register multiple migrations
runner.register(migration001);
runner.register(migration002);
runner.register(migration003);

// Run all pending
await runner.upAll();

// Get logs
const logs = runner.getLogs('add_course_index');
logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
});
```

---

## Common Migration Patterns

### 1. Adding Indexes

```typescript
const migration: Migration = {
  name: 'add_enrollment_indexes',
  version: 5,
  description: 'Add performance indexes to enrollment collection',
  
  async up() {
    await Enrollment.collection.createIndex(
      { courseId: 1, learnerId: 1 },
      { unique: true, name: 'idx_enrollment_unique' }
    );
    
    await Enrollment.collection.createIndex(
      { status: 1, enrolledAt: -1 },
      { name: 'idx_enrollment_status_date' }
    );
  },
  
  async down() {
    await Enrollment.collection.dropIndex('idx_enrollment_unique');
    await Enrollment.collection.dropIndex('idx_enrollment_status_date');
  }
};
```

### 2. Renaming Fields

```typescript
const migration: Migration = {
  name: 'rename_course_description',
  version: 6,
  description: 'Rename description to courseDescription',
  
  async up() {
    await Course.updateMany(
      { description: { $exists: true } },
      { $rename: { description: 'courseDescription' } }
    );
  },
  
  async down() {
    await Course.updateMany(
      { courseDescription: { $exists: true } },
      { $rename: { courseDescription: 'description' } }
    );
  }
};
```

### 3. Data Type Conversion

```typescript
const migration: Migration = {
  name: 'convert_credits_to_number',
  version: 7,
  description: 'Convert credits from string to number',
  
  async up() {
    const courses = await Course.find({ 
      credits: { $type: 'string' } 
    });
    
    for (const course of courses) {
      await Course.updateOne(
        { _id: course._id },
        { $set: { credits: parseInt(course.credits as any) } }
      );
    }
    console.log(`✓ Converted ${courses.length} courses`);
  },
  
  async down() {
    const courses = await Course.find({ 
      credits: { $type: 'number' } 
    });
    
    for (const course of courses) {
      await Course.updateOne(
        { _id: course._id },
        { $set: { credits: String(course.credits) } }
      );
    }
  }
};
```

### 4. Backfilling Data

```typescript
const migration: Migration = {
  name: 'backfill_department_master',
  version: 8,
  description: 'Ensure master department exists',
  
  async up() {
    const masterDept = await Department.findOne({ 
      name: 'Master Department' 
    });
    
    if (!masterDept) {
      const dept = await Department.create({
        name: 'Master Department',
        description: 'Root department for system',
        status: 'active'
      });
      console.log('✓ Created master department:', dept._id);
    } else {
      console.log('✓ Master department already exists');
    }
  },
  
  async down() {
    // Don't remove master department in rollback
    // as it may have dependencies
    console.log('⚠ Skipping master department removal');
  }
};
```

### 5. Adding Default Permissions

```typescript
const migration: Migration = {
  name: 'add_default_permissions',
  version: 9,
  description: 'Add default system permissions',
  
  async up() {
    const defaultPermissions = [
      {
        resource: 'course',
        action: 'read',
        name: 'View Courses',
        scope: 'all',
        isSystemPermission: true
      },
      {
        resource: 'course',
        action: 'create',
        name: 'Create Courses',
        scope: 'department',
        isSystemPermission: true
      },
      // ... more permissions
    ];
    
    for (const perm of defaultPermissions) {
      await Permission.findOneAndUpdate(
        { resource: perm.resource, action: perm.action },
        perm,
        { upsert: true }
      );
    }
    
    console.log(`✓ Added ${defaultPermissions.length} permissions`);
  },
  
  async down() {
    await Permission.deleteMany({ isSystemPermission: true });
    console.log('✓ Removed system permissions');
  }
};
```

---

## Rollback Strategy

### Rolling Back Single Migration

```typescript
// Rollback specific migration
await runner.down('normalize_enrollment_status');

// Or use alias
await runner.rollback('normalize_enrollment_status');
```

### Rolling Back to Version

```typescript
// Rollback all migrations after version 5
await runner.rollbackTo(5);

// This will rollback migrations in reverse order:
// - version 9 → down
// - version 8 → down
// - version 7 → down
// - version 6 → down
// Stops before version 5
```

### Rollback Script

```typescript
// scripts/rollback-migration.ts
import { MigrationRunner } from '../src/migrations/MigrationRunner';
import connectDB from '../src/config/dbConnect';

async function rollback() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('Usage: npm run rollback <migration-name>');
    process.exit(1);
  }
  
  await connectDB();
  
  const runner = new MigrationRunner();
  // Register migrations...
  
  try {
    console.log(`Rolling back: ${migrationName}`);
    await runner.rollback(migrationName);
    console.log('✓ Rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

rollback();
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested in staging environment
- [ ] Rollback procedures tested
- [ ] Database backup created
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified
- [ ] Monitoring enabled

### Deployment Process

**1. Backup Database:**
```bash
# MongoDB backup
mongodump --uri="mongodb://production-uri" --out=/backups/pre-migration-$(date +%Y%m%d)
```

**2. Run Migrations:**
```bash
# Set production environment
export NODE_ENV=production
export MONGODB_URI=mongodb://production-uri

# Run migrations
npm run migrate

# Verify
npm run migrate:status
```

**3. Verify Application:**
```bash
# Start application
npm start

# Run health checks
curl http://api/health

# Run smoke tests
npm run test:smoke
```

**4. Monitor:**
```bash
# Watch logs
tail -f logs/application.log

# Check error rates
# Monitor database performance
# Verify user reports
```

### Rollback Procedure (if needed)

```bash
# Stop application
pm2 stop lms-api

# Rollback migrations
npm run migrate:rollback -- <migration-name>

# Restore from backup (if necessary)
mongorestore --uri="mongodb://production-uri" /backups/pre-migration-20260107

# Start application
pm2 start lms-api

# Verify
curl http://api/health
```

### Migration NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "migrate": "ts-node scripts/run-migrations.ts",
    "migrate:status": "ts-node scripts/migration-status.ts",
    "migrate:rollback": "ts-node scripts/rollback-migration.ts",
    "migrate:create": "ts-node scripts/create-migration.ts"
  }
}
```

---

## Troubleshooting

### Common Issues

**1. Migration Fails Mid-Execution**

```typescript
// Problem: Migration partially completed, then failed
// Solution: Check status and manually fix or re-run

const status = runner.getStatus('problematic_migration');
console.log(status);
// { status: 'failed', error: '...' }

// Option 1: Fix issue and re-run
await runner.up('problematic_migration');

// Option 2: Rollback and try again
await runner.down('problematic_migration');
// Fix the issue
await runner.up('problematic_migration');
```

**2. Duplicate Migration Name**

```typescript
// Problem: Two migrations with same name
// Solution: MigrationRunner prevents this

try {
  runner.register(migration1);
  runner.register(migration1); // Throws error
} catch (error) {
  console.error('Duplicate migration detected');
}
```

**3. Migration Takes Too Long**

```typescript
// Problem: Large data migration timing out
// Solution: Process in batches

async up() {
  const batchSize = 1000;
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    const courses = await Course.find()
      .skip(skip)
      .limit(batchSize);
    
    if (courses.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process batch
    for (const course of courses) {
      // ... update logic
    }
    
    skip += batchSize;
    console.log(`Processed ${skip} courses...`);
  }
}
```

**4. Rollback Not Possible**

```typescript
// Problem: Data transformation is irreversible
// Solution: Store original data before transformation

async up() {
  // Backup original data first
  const courses = await Course.find();
  await Course.collection.insertMany(
    courses.map(c => ({ _backupOf: c._id, ...c.toObject() })),
    { collection: 'course_backups' }
  );
  
  // Now perform transformation
  await Course.updateMany(...);
}

async down() {
  // Restore from backup
  const backups = await db.collection('course_backups').find();
  for (const backup of backups) {
    await Course.updateOne({ _id: backup._backupOf }, backup);
  }
  
  // Clean up backups
  await db.collection('course_backups').deleteMany({});
}
```

### Logging and Debugging

```typescript
const runner = new MigrationRunner();

// Get all logs for a migration
const logs = runner.getLogs('problematic_migration');
logs.forEach(log => {
  console.log(`[${log.timestamp}] [${log.level}] ${log.message}`);
});

// Get execution details
const status = runner.getStatus('problematic_migration');
console.log({
  status: status.status,
  executionTime: `${status.executionTime}ms`,
  error: status.error
});
```

---

## Best Practices

### ✅ Do:

1. **Always write `down()` method** - Even if you think you'll never rollback
2. **Test migrations locally** - Use dev/staging environments first
3. **Version migrations sequentially** - v1, v2, v3...
4. **Keep migrations small** - One logical change per migration
5. **Add logging** - Help with debugging and monitoring
6. **Backup before production** - Always have a restore point
7. **Process large datasets in batches** - Avoid memory issues
8. **Document complex logic** - Help future maintainers

### ❌ Don't:

1. **Don't modify executed migrations** - Create new migration instead
2. **Don't skip version numbers** - Keep sequential numbering
3. **Don't assume data exists** - Always check before transforming
4. **Don't ignore errors** - Handle or propagate them properly
5. **Don't run migrations manually in production** - Use deployment scripts
6. **Don't delete old migrations** - Keep full history

---

## Migration Checklist Template

Use this template when creating migrations:

```markdown
## Migration: [NAME]

**Version:** [NUMBER]  
**Date:** [DATE]  
**Author:** [NAME]

### Purpose
[Why this migration is needed]

### Changes
- [ ] Schema changes
- [ ] Data transformations
- [ ] Index additions/removals
- [ ] Default data

### Testing
- [ ] Tested locally
- [ ] Tested in staging
- [ ] Rollback tested
- [ ] Performance verified

### Deployment
- [ ] Backup plan documented
- [ ] Downtime estimated: [TIME]
- [ ] Team notified
- [ ] Monitoring configured

### Rollback Plan
[How to rollback if issues occur]

### Notes
[Any additional information]
```

---

**For questions or issues, contact the development team.**

**Version:** 2.0.0  
**Last Updated:** January 7, 2026
