/**
 * Seed Question Settings Script
 *
 * Seeds the admin settings for question configuration into the Settings collection.
 * This script is idempotent and can be run multiple times safely using upsert.
 *
 * Seeds:
 * - question.matchThreshold: Default fuzzy match percentage for short_answer questions
 * - question.bulkOperations: Limits for bulk question operations
 *
 * Usage:
 *   npx ts-node scripts/seed-question-settings.ts
 *   npm run seed:question-settings
 *
 * Environment variables:
 *   MONGO_URI - MongoDB connection string (default: mongodb://localhost:27017/lms_mock)
 *
 * Reference: Question Bank System Implementation
 *
 * @module scripts/seed-question-settings
 */

import mongoose from 'mongoose';
import { loadEnv } from './utils/load-env';

// Load environment variables
loadEnv();

// Import Setting model
import Setting from '../src/models/system/Setting.model';

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock'
};

/**
 * Question settings to seed
 */
const QUESTION_SETTINGS = [
  {
    key: 'question.matchThreshold',
    value: {
      default: 80,   // Default fuzzy match % for short_answer
      min: 50,       // Minimum allowed
      max: 100       // Maximum allowed
    },
    category: 'question' as const,
    dataType: 'object' as const,
    description: 'Fuzzy match threshold settings for short answer questions. Default is the initial match percentage, min/max define the allowed range for customization.',
    isPublic: false,
    isEditable: true,
    defaultValue: {
      default: 80,
      min: 50,
      max: 100
    },
    validationRules: {
      min: 0,
      max: 100
    },
    metadata: {
      component: 'questionBank',
      addedVersion: '1.0.0'
    }
  },
  {
    key: 'question.bulkOperations',
    value: {
      maxItems: 500,        // Max questions per bulk link
      maxBanksPerCopy: 10   // Max banks per admin copy
    },
    category: 'question' as const,
    dataType: 'object' as const,
    description: 'Limits for bulk question operations. maxItems limits questions per bulk link operation, maxBanksPerCopy limits target banks for admin copy operations.',
    isPublic: false,
    isEditable: true,
    defaultValue: {
      maxItems: 500,
      maxBanksPerCopy: 10
    },
    validationRules: {
      min: 1,
      max: 1000
    },
    metadata: {
      component: 'questionBank',
      addedVersion: '1.0.0'
    }
  }
];

/**
 * Seed question settings using upsert for idempotency
 */
async function seedQuestionSettings(): Promise<void> {
  console.log('Seeding question settings...');
  console.log('');

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const settingDef of QUESTION_SETTINGS) {
    try {
      // Check if setting exists
      const existing = await Setting.findOne({ key: settingDef.key });

      if (existing) {
        // Check if update is needed by comparing values
        const existingValueStr = JSON.stringify(existing.value);
        const newValueStr = JSON.stringify(settingDef.value);

        if (existingValueStr !== newValueStr ||
            existing.description !== settingDef.description ||
            existing.isEditable !== settingDef.isEditable) {
          // Update existing setting
          await Setting.updateOne(
            { key: settingDef.key },
            {
              $set: {
                value: settingDef.value,
                description: settingDef.description,
                isEditable: settingDef.isEditable,
                defaultValue: settingDef.defaultValue,
                validationRules: settingDef.validationRules,
                metadata: settingDef.metadata
              }
            }
          );
          console.log(`  ↻ Updated: ${settingDef.key}`);
          updated++;
        } else {
          console.log(`  ✓ Unchanged: ${settingDef.key}`);
          unchanged++;
        }
      } else {
        // Create new setting
        await Setting.create(settingDef);
        console.log(`  + Created: ${settingDef.key}`);
        created++;
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${settingDef.key}:`, error instanceof Error ? error.message : error);
      errors++;
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  if (errors > 0) {
    console.log(`  Errors: ${errors}`);
  }
}

/**
 * Display current question settings
 */
async function displaySettings(): Promise<void> {
  console.log('');
  console.log('Current Question Settings:');

  const settings = await Setting.find({ category: 'question' }).lean();

  if (settings.length === 0) {
    console.log('  No question settings found.');
    return;
  }

  for (const setting of settings) {
    console.log(`  ${setting.key}:`);
    console.log(`    Value: ${JSON.stringify(setting.value, null, 2).split('\n').join('\n    ')}`);
    console.log(`    Description: ${setting.description}`);
    console.log(`    Editable: ${setting.isEditable}`);
  }
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   LMS - Seed Question Settings Script            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('Reference: Question Bank System Implementation');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Seed question settings
    await seedQuestionSettings();

    // Display current settings
    await displaySettings();

    // Success message
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Seed Complete!                                 ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('Question settings have been seeded successfully.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║   Error During Seeding                           ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');

    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.error('');
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for use in combined seed scripts
export { seedQuestionSettings, QUESTION_SETTINGS };

// Run the script if executed directly
if (require.main === module) {
  main();
}
