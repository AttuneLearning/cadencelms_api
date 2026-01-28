/**
 * Migration: Add Knowledge Node Fields to Questions
 *
 * This migration adds indexes for the new adaptive learning fields:
 * - knowledgeNodeId: Optional reference to KnowledgeNode
 * - cognitiveDepth: Optional cognitive depth slug
 *
 * No data migration is needed - these fields are optional enhancements.
 *
 * IMPORTANT: Test on staging environment before running in production!
 *
 * Usage:
 *   npx ts-node src/migrations/add-knowledge-fields-to-questions.ts
 *   npx ts-node src/migrations/add-knowledge-fields-to-questions.ts down
 *
 * @module migrations/add-knowledge-fields-to-questions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock'
};

interface MigrationStats {
  indexesCreated: number;
  errors: string[];
}

/**
 * Apply migration UP
 * Creates indexes for knowledgeNodeId and cognitiveDepth fields
 */
export async function up(): Promise<MigrationStats> {
  console.log('Starting Knowledge Fields Migration (UP)...');
  console.log('');

  const stats: MigrationStats = {
    indexesCreated: 0,
    errors: []
  };

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    const collection = db.collection('questions');

    // Get existing indexes
    let existingIndexes: any[] = [];
    try {
      existingIndexes = await collection.indexes();
    } catch (error) {
      console.log('  Questions collection may not exist yet, will create indexes');
    }
    const existingIndexNames = existingIndexes.map((idx) => idx.name);

    // Define indexes to create
    const indexes: Array<{
      key: Record<string, 1 | -1>;
      name: string;
      options: { sparse: boolean };
    }> = [
      // Single field indexes (sparse - only index documents that have the field)
      {
        key: { knowledgeNodeId: 1 },
        name: 'knowledgeNodeId_1',
        options: { sparse: true }
      },
      {
        key: { cognitiveDepth: 1 },
        name: 'cognitiveDepth_1',
        options: { sparse: true }
      },

      // Compound indexes for adaptive learning queries
      {
        key: { knowledgeNodeId: 1, cognitiveDepth: 1 },
        name: 'knowledge_depth_idx',
        options: { sparse: true }
      },
      {
        key: { departmentId: 1, knowledgeNodeId: 1 },
        name: 'dept_knowledge_idx',
        options: { sparse: true }
      },
      {
        key: { departmentId: 1, cognitiveDepth: 1 },
        name: 'dept_depth_idx',
        options: { sparse: true }
      },

      // For adaptive selection (questions by node, depth, and banks)
      {
        key: { knowledgeNodeId: 1, cognitiveDepth: 1, questionBankIds: 1 },
        name: 'adaptive_selection_idx',
        options: { sparse: true }
      }
    ];

    // Create each index
    for (const index of indexes) {
      if (!existingIndexNames.includes(index.name)) {
        try {
          const indexOptions: any = {
            name: index.name,
            background: true,
            ...index.options
          };
          await collection.createIndex(index.key, indexOptions);
          stats.indexesCreated++;
          console.log(`  Created index: ${index.name}`);
        } catch (error) {
          console.log(`  Skipping index ${index.name}: ${error}`);
          stats.errors.push(`Index ${index.name}: ${error}`);
        }
      } else {
        console.log(`  Index already exists: ${index.name}`);
      }
    }

    console.log('');
    console.log('Migration UP completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Indexes created: ${stats.indexesCreated}`);
    console.log(`  - Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('');
      console.log('Errors encountered:');
      stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Migration UP failed:', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

/**
 * Rollback migration DOWN
 * Removes indexes created by this migration
 */
export async function down(): Promise<void> {
  console.log('Rolling back Knowledge Fields Migration (DOWN)...');
  console.log('');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    const collection = db.collection('questions');
    const indexNames = [
      'knowledgeNodeId_1',
      'cognitiveDepth_1',
      'knowledge_depth_idx',
      'dept_knowledge_idx',
      'dept_depth_idx',
      'adaptive_selection_idx'
    ];

    let existingIndexes: any[] = [];
    try {
      existingIndexes = await collection.indexes();
    } catch (error) {
      console.log('  Questions collection may not exist, skipping');
      return;
    }
    const existingIndexNames = existingIndexes.map((idx) => idx.name);

    for (const indexName of indexNames) {
      if (existingIndexNames.includes(indexName)) {
        try {
          await collection.dropIndex(indexName);
          console.log(`  Dropped index: ${indexName}`);
        } catch (error) {
          console.log(`  Could not drop index ${indexName}: ${error}`);
        }
      } else {
        console.log(`  Index not found: ${indexName}`);
      }
    }

    console.log('');
    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Validate migration results
 */
async function validateMigration(): Promise<void> {
  console.log('');
  console.log('Validating migration...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    const indexes = await db.collection('questions').indexes();
    console.log(`  Questions collection indexes: ${indexes.length}`);

    // Check for our specific indexes
    const knowledgeIndexes = indexes.filter(
      (idx) =>
        idx.name?.includes('knowledge') ||
        idx.name?.includes('depth') ||
        idx.name?.includes('adaptive')
    );
    console.log(`  Knowledge-related indexes: ${knowledgeIndexes.length}`);

    // Count questions with knowledge fields
    const withKnowledgeNode = await db.collection('questions').countDocuments({
      knowledgeNodeId: { $ne: null }
    });
    const withCognitiveDepth = await db.collection('questions').countDocuments({
      cognitiveDepth: { $ne: null }
    });
    const totalQuestions = await db.collection('questions').countDocuments();

    console.log(`  Total questions: ${totalQuestions}`);
    console.log(`  Questions with knowledgeNodeId: ${withKnowledgeNode}`);
    console.log(`  Questions with cognitiveDepth: ${withCognitiveDepth}`);
  } catch (error) {
    console.log('  Validation skipped - collection may not exist');
  }

  console.log('  Validation complete');
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const isRollback = command === 'down';

  console.log('='.repeat(60));
  console.log('  Knowledge Node Fields Migration');
  console.log('  Phase 3: Question Integration');
  console.log('='.repeat(60));
  console.log('');

  if (isRollback) {
    console.log('Mode: ROLLBACK (down)');
  } else {
    console.log('Mode: APPLY (up)');
  }
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  Connected to ${config.mongoUri}`);
    console.log('');

    if (isRollback) {
      await down();
    } else {
      await up();
      await validateMigration();
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('  Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('');
    console.error('Migration failed:', error);
    console.error('');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export { validateMigration };

// Run the script if executed directly
if (require.main === module) {
  main();
}
