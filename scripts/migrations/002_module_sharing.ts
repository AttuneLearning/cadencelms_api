/**
 * Migration: Module Sharing & Global Completion (API-ISS-016)
 *
 * Transforms modules from being course-owned to department-owned and
 * creates global module completion tracking.
 *
 * Changes:
 * 1. Removes courseId from Module, adds ownerDepartmentId and isShared
 * 2. Creates ModuleCompletion records from existing ModuleAccess completions
 *
 * This migration is:
 * - Idempotent: Safe to run multiple times (checks for existing data)
 * - Logged: Tracks progress and errors
 * - Dry-run capable: Test without making changes
 *
 * Usage:
 *   # Dry run (no changes)
 *   npx ts-node scripts/migrations/002_module_sharing.ts --dry-run
 *
 *   # Live run (migrates data)
 *   npx ts-node scripts/migrations/002_module_sharing.ts
 *
 *   # With custom batch size
 *   npx ts-node scripts/migrations/002_module_sharing.ts --batch-size=50
 *
 * IMPORTANT:
 * - Backup your database before running
 * - Test with --dry-run first
 * - Monitor progress and errors
 *
 * NO backward compatibility - courseId is completely removed from Module.
 *
 * @module scripts/migrations/002_module_sharing
 */

import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  logInterval: number;
}

interface MigrationStats {
  modulesProcessed: number;
  modulesUpdated: number;
  moduleCompletionsCreated: number;
  moduleAccessCompletionsFound: number;
  alreadyMigrated: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// =============================================================================
// RAW MONGODB OPERATIONS (bypassing Mongoose validation)
// =============================================================================

/**
 * Get the modules collection directly (for raw updates)
 */
function getModulesCollection() {
  return mongoose.connection.db.collection('modules');
}

/**
 * Get the modulecompletions collection directly
 */
function getModuleCompletionsCollection() {
  return mongoose.connection.db.collection('modulecompletions');
}

/**
 * Get the moduleaccesses collection directly
 */
function getModuleAccessesCollection() {
  return mongoose.connection.db.collection('moduleaccesses');
}

/**
 * Get the courseversionmodules collection directly
 */
function getCourseVersionModulesCollection() {
  return mongoose.connection.db.collection('courseversionmodules');
}

/**
 * Get the courseversions collection directly
 */
function getCourseVersionsCollection() {
  return mongoose.connection.db.collection('courseversions');
}

/**
 * Get the canonicalcourses collection directly
 */
function getCanonicalCoursesCollection() {
  return mongoose.connection.db.collection('canonicalcourses');
}

// =============================================================================
// MIGRATION LOGIC
// =============================================================================

/**
 * Migrates modules to add ownerDepartmentId and isShared
 *
 * Steps:
 * 1. Find modules that have courseId but no ownerDepartmentId
 * 2. For each module, find the course's department via CourseVersionModule join
 * 3. Update the module with ownerDepartmentId and isShared = false
 * 4. Remove the courseId field
 */
async function migrateModulesToDepartmentOwnership(
  config: MigrationConfig,
  stats: MigrationStats
): Promise<void> {
  logger.info('Starting module ownership migration...');

  const modulesCol = getModulesCollection();
  const cvmCol = getCourseVersionModulesCollection();
  const cvCol = getCourseVersionsCollection();
  const ccCol = getCanonicalCoursesCollection();

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Find modules that still have courseId (need migration)
    // OR modules that don't have ownerDepartmentId yet
    const modules = await modulesCol
      .find({
        $or: [
          { courseId: { $exists: true } },
          { ownerDepartmentId: { $exists: false } }
        ]
      })
      .limit(config.batchSize)
      .skip(skip)
      .toArray();

    if (modules.length === 0) {
      hasMore = false;
      break;
    }

    for (const module of modules) {
      try {
        // Check if already migrated
        if (module.ownerDepartmentId && !module.courseId) {
          stats.alreadyMigrated++;
          stats.modulesProcessed++;
          continue;
        }

        let departmentId: mongoose.Types.ObjectId | null = null;

        // Strategy 1: Get department from courseId if it exists (legacy path)
        if (module.courseId) {
          // First, try to find via CourseVersionModule join
          const cvm = await cvmCol.findOne({ moduleId: module._id });
          if (cvm) {
            const cv = await cvCol.findOne({ _id: cvm.courseVersionId });
            if (cv) {
              const cc = await ccCol.findOne({ _id: cv.canonicalCourseId });
              if (cc) {
                departmentId = cc.departmentId;
              }
            }
          }

          // If still no departmentId, try to find from the old Course collection
          // (in case there's a legacy Course model)
          if (!departmentId) {
            const coursesCol = mongoose.connection.db.collection('courses');
            const course = await coursesCol.findOne({ _id: module.courseId });
            if (course && course.departmentId) {
              departmentId = course.departmentId;
            }
          }
        }

        // Strategy 2: Find any CourseVersionModule that references this module
        if (!departmentId) {
          const cvm = await cvmCol.findOne({ moduleId: module._id });
          if (cvm) {
            const cv = await cvCol.findOne({ _id: cvm.courseVersionId });
            if (cv) {
              const cc = await ccCol.findOne({ _id: cv.canonicalCourseId });
              if (cc) {
                departmentId = cc.departmentId;
              }
            }
          }
        }

        if (!departmentId) {
          logger.warn(`Could not determine department for module ${module._id}, skipping`);
          stats.errors++;
          continue;
        }

        // Update the module
        if (!config.dryRun) {
          await modulesCol.updateOne(
            { _id: module._id },
            {
              $set: {
                ownerDepartmentId: departmentId,
                isShared: false
              },
              $unset: {
                courseId: ''
              }
            }
          );
        }

        stats.modulesUpdated++;
        stats.modulesProcessed++;

        // Log progress
        if (stats.modulesProcessed % config.logInterval === 0) {
          logger.info(`Progress: Processed ${stats.modulesProcessed} modules, ` +
            `updated ${stats.modulesUpdated}, ` +
            `skipped ${stats.alreadyMigrated} already migrated`);
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing module ${module._id}: ${error}`);
      }
    }

    skip += config.batchSize;
  }

  logger.info(`Completed module ownership migration: ${stats.modulesProcessed} processed, ` +
    `${stats.modulesUpdated} updated, ${stats.alreadyMigrated} already migrated`);
}

/**
 * Creates ModuleCompletion records from existing ModuleAccess completions
 *
 * Steps:
 * 1. Find ModuleAccess records with status = 'completed'
 * 2. For each, create a ModuleCompletion record if one doesn't exist
 */
async function createModuleCompletionsFromAccess(
  config: MigrationConfig,
  stats: MigrationStats
): Promise<void> {
  logger.info('Starting ModuleCompletion creation from ModuleAccess...');

  const maCol = getModuleAccessesCollection();
  const mcCol = getModuleCompletionsCollection();
  const cvmCol = getCourseVersionModulesCollection();
  const cvCol = getCourseVersionsCollection();

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Find completed ModuleAccess records
    const completedAccesses = await maCol
      .find({
        status: 'completed',
        completedAt: { $exists: true }
      })
      .limit(config.batchSize)
      .skip(skip)
      .toArray();

    if (completedAccesses.length === 0) {
      hasMore = false;
      break;
    }

    for (const access of completedAccesses) {
      try {
        stats.moduleAccessCompletionsFound++;

        // Check if ModuleCompletion already exists
        const existingCompletion = await mcCol.findOne({
          learnerId: access.learnerId,
          moduleId: access.moduleId
        });

        if (existingCompletion) {
          stats.alreadyMigrated++;
          continue;
        }

        // Find the course version this module was completed in
        let courseVersionId: mongoose.Types.ObjectId | null = null;

        // Try to find via CourseVersionModule
        const cvm = await cvmCol.findOne({ moduleId: access.moduleId });
        if (cvm) {
          // Use the course version from the CourseVersionModule
          courseVersionId = cvm.courseVersionId;
        } else {
          // If no CourseVersionModule, try to find any course version
          // This is a fallback for orphaned modules
          const cv = await cvCol.findOne({});
          if (cv) {
            courseVersionId = cv._id;
          }
        }

        if (!courseVersionId) {
          logger.warn(`Could not determine course version for module ${access.moduleId}, ` +
            `creating completion without it`);
        }

        // Create ModuleCompletion record
        if (!config.dryRun) {
          await mcCol.insertOne({
            learnerId: access.learnerId,
            moduleId: access.moduleId,
            completedInCourseVersionId: courseVersionId || access.courseId,
            completedInEnrollmentId: access.enrollmentId,
            completedAt: access.completedAt,
            score: null,
            isGlobalCompletion: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        stats.moduleCompletionsCreated++;

        // Log progress
        if (stats.moduleCompletionsCreated % config.logInterval === 0) {
          logger.info(`Progress: Created ${stats.moduleCompletionsCreated} ModuleCompletion records`);
        }
      } catch (error) {
        // Skip duplicates (race condition protection)
        if ((error as any).code === 11000) {
          stats.alreadyMigrated++;
          continue;
        }
        stats.errors++;
        logger.error(`Error creating completion for access ${access._id}: ${error}`);
      }
    }

    skip += config.batchSize;
  }

  logger.info(`Completed ModuleCompletion creation: ` +
    `${stats.moduleAccessCompletionsFound} completed accesses found, ` +
    `${stats.moduleCompletionsCreated} completions created, ` +
    `${stats.alreadyMigrated} already existed`);
}

/**
 * Create indexes for the new fields
 */
async function createIndexes(config: MigrationConfig): Promise<void> {
  logger.info('Creating indexes...');

  if (config.dryRun) {
    logger.info('DRY RUN: Would create indexes');
    return;
  }

  const modulesCol = getModulesCollection();
  const mcCol = getModuleCompletionsCollection();

  // Module indexes
  await modulesCol.createIndex({ ownerDepartmentId: 1 });
  await modulesCol.createIndex({ isShared: 1 });
  await modulesCol.createIndex({ ownerDepartmentId: 1, isShared: 1 });

  // ModuleCompletion indexes
  await mcCol.createIndex({ learnerId: 1, moduleId: 1 }, { unique: true });
  await mcCol.createIndex({ learnerId: 1, completedAt: -1 });
  await mcCol.createIndex({ moduleId: 1, completedAt: -1 });
  await mcCol.createIndex({ completedInCourseVersionId: 1 });
  await mcCol.createIndex({ completedInEnrollmentId: 1 });
  await mcCol.createIndex({ isGlobalCompletion: 1 });

  logger.info('Indexes created successfully');
}

/**
 * Main migration function
 */
async function runMigration(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    modulesProcessed: 0,
    modulesUpdated: 0,
    moduleCompletionsCreated: 0,
    moduleAccessCompletionsFound: 0,
    alreadyMigrated: 0,
    errors: 0,
    startTime: new Date()
  };

  logger.info('===============================================');
  logger.info('Migration: Module Sharing & Global Completion');
  logger.info('API-ISS-016');
  logger.info('===============================================');
  logger.info(`Mode: ${config.dryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);
  logger.info(`Batch Size: ${config.batchSize}`);
  logger.info(`Start Time: ${stats.startTime.toISOString()}`);
  logger.info('===============================================');

  if (config.dryRun) {
    logger.warn('DRY RUN MODE: No data will be modified');
  } else {
    logger.warn('LIVE MODE: Data will be migrated!');
  }

  // Run migrations in sequence
  await migrateModulesToDepartmentOwnership(config, stats);
  await createModuleCompletionsFromAccess(config, stats);
  await createIndexes(config);

  stats.endTime = new Date();

  // Log final summary
  const duration = stats.endTime.getTime() - stats.startTime.getTime();
  const durationSeconds = (duration / 1000).toFixed(2);

  logger.info('===============================================');
  logger.info('Migration Complete');
  logger.info('===============================================');
  logger.info(`Duration: ${durationSeconds} seconds`);
  logger.info(`Modules Processed: ${stats.modulesProcessed}`);
  logger.info(`Modules Updated: ${stats.modulesUpdated}`);
  logger.info(`Module Completions Created: ${stats.moduleCompletionsCreated}`);
  logger.info(`Already Migrated (skipped): ${stats.alreadyMigrated}`);
  logger.info(`Errors: ${stats.errors}`);
  logger.info('===============================================');

  if (config.dryRun) {
    logger.warn('This was a DRY RUN. No data was modified.');
    logger.info('To apply changes, run without --dry-run flag');
  }

  return stats;
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

    const config: MigrationConfig = {
      dryRun,
      batchSize,
      logInterval: 10
    };

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock';
    logger.info(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Run migration
    const stats = await runMigration(config);

    // Disconnect
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

    // Exit with appropriate code
    if (stats.errors > 0) {
      logger.error(`Migration completed with ${stats.errors} errors`);
      process.exit(1);
    } else {
      logger.info('Migration completed successfully');
      process.exit(0);
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigration, MigrationConfig, MigrationStats };
